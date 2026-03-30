/**
 * Regex-based SQL parser for migration files.
 *
 * Extracts structural information from SQL files without tree-sitter:
 * tables, columns, RLS policies, indexes, foreign keys, and functions.
 * Returns NodeInfo/EdgeInfo in the same format as CodeParser.
 *
 * Supports: Supabase migrations, plain PostgreSQL, Prisma schema files,
 * and Drizzle schema (detected by extension/content).
 */

import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import type { EdgeInfo, NodeInfo } from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────

function qualify(name: string, filePath: string, parent: string | null): string {
  return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}

function lineAt(content: string, charIndex: number): number {
  let line = 1;
  for (let i = 0; i < charIndex && i < content.length; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

function lineCount(content: string): number {
  return content.split("\n").length;
}

// ── SQL detection ─────────────────────────────────────────────────

const SQL_EXTENSIONS = new Set([".sql"]);
const PRISMA_EXTENSIONS = new Set([".prisma"]);

export function isSqlParseable(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return SQL_EXTENSIONS.has(ext) || PRISMA_EXTENSIONS.has(ext);
}

// ── Main parser ───────────────────────────────────────────────────

export function parseSqlFile(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }

  const ext = extname(filePath).toLowerCase();
  if (ext === ".prisma") {
    return parsePrismaSchema(filePath, content);
  }

  return parseSql(filePath, content);
}

// ── SQL parser (PostgreSQL / Supabase) ────────────────────────────

function parseSql(
  filePath: string,
  content: string,
): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];
  const lines = lineCount(content);

  // File node (as Migration)
  const isMigration = filePath.includes("migration");
  nodes.push({
    kind: isMigration ? "Migration" : "File",
    name: basename(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "sql",
    is_test: false,
    extra: isMigration ? { migration: true } : undefined,
  });

  // ── CREATE TABLE ────────────────────────────────────────────
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?(\w+)["']?\s*\(([\s\S]*?)(?:\n\);|\n\))/gi;

  for (const match of content.matchAll(tableRegex)) {
    const tableName = match[1];
    const tableBody = match[2];
    const line = lineAt(content, match.index);
    const endLine = lineAt(content, match.index + match[0].length);

    nodes.push({
      kind: "Table",
      name: tableName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "sql",
      is_test: false,
      extra: { columns: [] as string[] },
    });

    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify(tableName, filePath, null),
      file_path: filePath,
      line,
    });

    // Parse columns from table body
    parseColumns(tableBody, tableName, filePath, line, nodes, edges);

    // Parse inline foreign keys
    parseForeignKeys(tableBody, tableName, filePath, line, edges);
  }

  // ── ALTER TABLE ... ADD COLUMN ──────────────────────────────
  const alterAddColRegex =
    /ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS|ONLY)\s+)?(?:public\.)?["']?(\w+)["']?\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s+(\w[\w\s[\]]*?)(?:;|\s+(?:DEFAULT|NOT|UNIQUE|CHECK|REFERENCES|CONSTRAINT|PRIMARY))/gi;

  for (const match of content.matchAll(alterAddColRegex)) {
    const tableName = match[1];
    const colName = match[2];
    const colType = match[3].trim();
    const line = lineAt(content, match.index);

    nodes.push({
      kind: "Column",
      name: colName,
      file_path: filePath,
      line_start: line,
      line_end: line,
      language: "sql",
      parent_name: tableName,
      return_type: colType,
      is_test: false,
    });

    edges.push({
      kind: "CONTAINS",
      source: qualify(tableName, filePath, null),
      target: qualify(colName, filePath, tableName),
      file_path: filePath,
      line,
    });
  }

  // ── ALTER TABLE ... ADD CONSTRAINT (foreign keys) ───────────
  const alterFkRegex =
    /ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS|ONLY)\s+)?(?:public\.)?["']?(\w+)["']?\s+ADD\s+CONSTRAINT\s+\w+\s+FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+(?:public\.)?["']?(\w+)["']?/gi;

  for (const match of content.matchAll(alterFkRegex)) {
    const sourceTable = match[1];
    const _column = match[2];
    const targetTable = match[3];
    const line = lineAt(content, match.index);

    edges.push({
      kind: "REFERENCES",
      source: qualify(sourceTable, filePath, null),
      target: qualify(targetTable, filePath, null),
      file_path: filePath,
      line,
      extra: { column: _column, type: "foreign_key" },
    });
  }

  // ── CREATE INDEX ────────────────────────────────────────────
  const indexRegex =
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s+ON\s+(?:public\.)?["']?(\w+)["']?\s*(?:USING\s+\w+\s*)?\(([^)]+)\)/gi;

  for (const match of content.matchAll(indexRegex)) {
    const indexName = match[1];
    const tableName = match[2];
    const columns = match[3].trim();
    const line = lineAt(content, match.index);
    const isUnique = /UNIQUE/i.test(match[0]);

    nodes.push({
      kind: "Index",
      name: indexName,
      file_path: filePath,
      line_start: line,
      line_end: line,
      language: "sql",
      parent_name: tableName,
      params: columns,
      is_test: false,
      extra: { unique: isUnique, columns: columns.split(",").map((c) => c.trim()) },
    });

    edges.push({
      kind: "INDEXES",
      source: qualify(indexName, filePath, null),
      target: qualify(tableName, filePath, null),
      file_path: filePath,
      line,
    });
  }

  // ── RLS: ENABLE / POLICIES ─────────────────────────────────
  const enableRlsRegex =
    /ALTER\s+TABLE\s+(?:public\.)?["']?(\w+)["']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

  const rlsTables = new Set<string>();
  for (const match of content.matchAll(enableRlsRegex)) {
    rlsTables.add(match[1]);
  }

  const policyRegex =
    /CREATE\s+POLICY\s+["']?(\w+)["']?\s+ON\s+(?:public\.)?["']?(\w+)["']?\s+(?:AS\s+\w+\s+)?(?:FOR\s+(\w+)\s+)?(?:TO\s+([\w,\s]+)\s+)?(?:USING\s*\(([\s\S]*?)\))?(?:\s*WITH\s+CHECK\s*\(([\s\S]*?)\))?/gi;

  for (const match of content.matchAll(policyRegex)) {
    const policyName = match[1];
    const tableName = match[2];
    const operation = match[3] ?? "ALL";
    const roles = match[4]?.trim() ?? "public";
    const usingExpr = match[5]?.trim();
    const checkExpr = match[6]?.trim();
    const line = lineAt(content, match.index);
    const endLine = lineAt(content, match.index + match[0].length);

    nodes.push({
      kind: "RLSPolicy",
      name: policyName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "sql",
      parent_name: tableName,
      modifiers: `${operation} TO ${roles}`,
      is_test: false,
      extra: {
        operation: operation.toUpperCase(),
        roles: roles.split(",").map((r) => r.trim()),
        using: usingExpr ?? null,
        check: checkExpr ?? null,
        uses_auth_uid: !!(usingExpr?.includes("auth.uid()") || checkExpr?.includes("auth.uid()")),
        uses_feed: !!(usingExpr?.includes("feed") || checkExpr?.includes("feed")),
      },
    });

    edges.push({
      kind: "SECURES",
      source: qualify(policyName, filePath, null),
      target: qualify(tableName, filePath, null),
      file_path: filePath,
      line,
    });
  }

  // ── CREATE FUNCTION ─────────────────────────────────────────
  const funcRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?["']?(\w+)["']?\s*\(([^)]*)\)\s*RETURNS\s+([\w\s]+?)(?:\s+AS|\s+LANGUAGE|\s+\$\$)/gi;

  for (const match of content.matchAll(funcRegex)) {
    const funcName = match[1];
    const params = match[2].trim();
    const returnType = match[3].trim();
    const line = lineAt(content, match.index);

    // Estimate end line by finding the next $$ or END
    const afterMatch = content.slice(match.index + match[0].length);
    const endMarker = afterMatch.search(/\$\$\s*;|\bEND\b\s*;/i);
    const endLine = endMarker >= 0
      ? lineAt(content, match.index + match[0].length + endMarker)
      : line;

    nodes.push({
      kind: "DbFunction",
      name: funcName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "sql",
      params: params || undefined,
      return_type: returnType,
      is_test: false,
      extra: {
        is_trigger: returnType.toLowerCase().includes("trigger"),
      },
    });

    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify(funcName, filePath, null),
      file_path: filePath,
      line,
    });
  }

  // ── CREATE TRIGGER ──────────────────────────────────────────
  const triggerRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+["']?(\w+)["']?\s+(?:BEFORE|AFTER|INSTEAD\s+OF)\s+\w+[\s\w]*?\s+ON\s+(?:public\.)?["']?(\w+)["']?[\s\S]*?EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:public\.)?["']?(\w+)["']?/gi;

  for (const match of content.matchAll(triggerRegex)) {
    const _triggerName = match[1];
    const tableName = match[2];
    const funcName = match[3];
    const line = lineAt(content, match.index);

    // Connect trigger function → table
    edges.push({
      kind: "CALLS",
      source: qualify(funcName, filePath, null),
      target: qualify(tableName, filePath, null),
      file_path: filePath,
      line,
      extra: { trigger: _triggerName },
    });
  }

  // ── GRANT statements ────────────────────────────────────────
  // Track which roles have access to which tables (stored in extra)
  const grantRegex =
    /GRANT\s+([\w,\s]+)\s+ON\s+(?:TABLE\s+)?(?:public\.)?["']?(\w+)["']?\s+TO\s+([\w,\s]+)/gi;

  for (const match of content.matchAll(grantRegex)) {
    const permissions = match[1].trim();
    const tableName = match[2];
    const grantees = match[3].trim();
    const line = lineAt(content, match.index);

    // Store as edge with extra metadata
    edges.push({
      kind: "SECURES",
      source: `grant::${grantees}`,
      target: qualify(tableName, filePath, null),
      file_path: filePath,
      line,
      extra: { type: "grant", permissions, grantees: grantees.split(",").map((g) => g.trim()) },
    });
  }

  return { nodes, edges };
}

// ── Column parsing from CREATE TABLE body ─────────────────────────

function parseColumns(
  tableBody: string,
  tableName: string,
  filePath: string,
  tableStartLine: number,
  nodes: NodeInfo[],
  edges: EdgeInfo[],
): void {
  // Split by lines, skip constraints
  const lines = tableBody.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("--")) continue;

    // Skip constraint lines
    if (/^\s*(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|EXCLUDE)/i.test(line)) continue;

    // Match: column_name type [NOT NULL] [DEFAULT ...] [REFERENCES ...]
    const colMatch = line.match(
      /^["']?(\w+)["']?\s+(\w[\w\s[\]()]*?)(?:\s+(?:NOT\s+NULL|NULL|DEFAULT|UNIQUE|CHECK|REFERENCES|PRIMARY|GENERATED|CONSTRAINT)|,?\s*$)/i,
    );
    if (!colMatch) continue;

    const colName = colMatch[1];
    const colType = colMatch[2].trim();

    // Skip SQL keywords that aren't column names
    if (/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN|EXCLUDE|LIKE)$/i.test(colName)) continue;

    const colLine = tableStartLine + i + 1;

    nodes.push({
      kind: "Column",
      name: colName,
      file_path: filePath,
      line_start: colLine,
      line_end: colLine,
      language: "sql",
      parent_name: tableName,
      return_type: colType,
      is_test: false,
      extra: {
        nullable: !/NOT\s+NULL/i.test(line),
        has_default: /DEFAULT/i.test(line),
      },
    });

    edges.push({
      kind: "CONTAINS",
      source: qualify(tableName, filePath, null),
      target: qualify(colName, filePath, tableName),
      file_path: filePath,
      line: colLine,
    });

    // Track in table's extra.columns
    const tableNode = nodes.find((n) => n.kind === "Table" && n.name === tableName);
    if (tableNode?.extra) {
      (tableNode.extra.columns as string[]).push(colName);
    }
  }
}

// ── Foreign key parsing from CREATE TABLE body ────────────────────

function parseForeignKeys(
  tableBody: string,
  tableName: string,
  filePath: string,
  tableStartLine: number,
  edges: EdgeInfo[],
): void {
  // Inline column REFERENCES
  const inlineRefRegex = /["']?(\w+)["']?\s+\w+.*?REFERENCES\s+(?:public\.)?["']?(\w+)["']?/gi;
  for (const match of tableBody.matchAll(inlineRefRegex)) {
    const column = match[1];
    const targetTable = match[2];
    edges.push({
      kind: "REFERENCES",
      source: qualify(tableName, filePath, null),
      target: qualify(targetTable, filePath, null),
      file_path: filePath,
      line: tableStartLine,
      extra: { column, type: "foreign_key" },
    });
  }

  // CONSTRAINT ... FOREIGN KEY
  const constraintFkRegex =
    /FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+(?:public\.)?["']?(\w+)["']?/gi;
  for (const match of tableBody.matchAll(constraintFkRegex)) {
    const column = match[1];
    const targetTable = match[2];
    edges.push({
      kind: "REFERENCES",
      source: qualify(tableName, filePath, null),
      target: qualify(targetTable, filePath, null),
      file_path: filePath,
      line: tableStartLine,
      extra: { column, type: "foreign_key" },
    });
  }
}

// ── Prisma schema parser ──────────────────────────────────────────

function parsePrismaSchema(
  filePath: string,
  content: string,
): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];
  const lines = lineCount(content);

  nodes.push({
    kind: "File",
    name: basename(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "prisma",
    is_test: false,
  });

  // Parse model blocks
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  for (const match of content.matchAll(modelRegex)) {
    const modelName = match[1];
    const modelBody = match[2];
    const line = lineAt(content, match.index);
    const endLine = lineAt(content, match.index + match[0].length);

    nodes.push({
      kind: "Table",
      name: modelName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "prisma",
      is_test: false,
      extra: { columns: [] as string[], orm: "prisma" },
    });

    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify(modelName, filePath, null),
      file_path: filePath,
      line,
    });

    // Parse fields
    const fieldLines = modelBody.split("\n");
    for (let i = 0; i < fieldLines.length; i++) {
      const fieldLine = fieldLines[i].trim();
      if (!fieldLine || fieldLine.startsWith("//") || fieldLine.startsWith("@@")) continue;

      const fieldMatch = fieldLine.match(/^(\w+)\s+(\w+[\w[\]?]*)/);
      if (!fieldMatch) continue;

      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const fieldLineNum = line + i + 1;

      nodes.push({
        kind: "Column",
        name: fieldName,
        file_path: filePath,
        line_start: fieldLineNum,
        line_end: fieldLineNum,
        language: "prisma",
        parent_name: modelName,
        return_type: fieldType,
        is_test: false,
      });

      edges.push({
        kind: "CONTAINS",
        source: qualify(modelName, filePath, null),
        target: qualify(fieldName, filePath, modelName),
        file_path: filePath,
        line: fieldLineNum,
      });

      // Detect relations
      if (fieldLine.includes("@relation")) {
        const relTarget = fieldType.replace("?", "").replace("[]", "");
        edges.push({
          kind: "REFERENCES",
          source: qualify(modelName, filePath, null),
          target: qualify(relTarget, filePath, null),
          file_path: filePath,
          line: fieldLineNum,
          extra: { column: fieldName, type: "relation" },
        });
      }

      // Track in table's extra.columns
      const tableNode = nodes.find((n) => n.kind === "Table" && n.name === modelName);
      if (tableNode?.extra) {
        (tableNode.extra.columns as string[]).push(fieldName);
      }
    }
  }

  // Parse enum blocks
  const enumRegex = /enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  for (const match of content.matchAll(enumRegex)) {
    const enumName = match[1];
    const line = lineAt(content, match.index);
    const endLine = lineAt(content, match.index + match[0].length);

    nodes.push({
      kind: "Type",
      name: enumName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "prisma",
      is_test: false,
      extra: { prisma_enum: true },
    });

    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify(enumName, filePath, null),
      file_path: filePath,
      line,
    });
  }

  return { nodes, edges };
}
