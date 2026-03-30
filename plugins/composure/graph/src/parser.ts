/**
 * Tree-sitter parser for TypeScript, TSX, JavaScript, and JSX.
 *
 * The CodeParser class orchestrates parsing: reads files, runs tree-sitter,
 * walks the AST to extract structural nodes/edges, and resolves call targets.
 * Helper functions for AST extraction live in parser-helpers.ts.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EdgeInfo, NodeInfo } from "./types.js";

import { Parser, Language, type Node } from "web-tree-sitter";

import {
  CLASS_TYPES,
  FUNCTION_TYPES,
  IMPORT_TYPES,
  CALL_TYPES,
  TYPE_TYPES,
  isTestFile,
  isTestFunction,
  qualify,
  getNodeText,
  getName,
  getArrowFunctionName,
  getParams,
  getReturnType,
  getBases,
  extractImportTarget,
  collectJsImportNames,
  getCallName,
  resolveModuleToFile,
} from "./parser-helpers.js";

// ── Language detection ─────────────────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
};

const PARSEABLE_EXTENSIONS = new Set(Object.keys(EXT_TO_LANG));

/** Extensions handled by the SQL parser (not tree-sitter). */
const SQL_EXTENSIONS = new Set([".sql", ".prisma"]);

/** Files handled by the package.json parser (by filename, not extension). */
const PKG_FILENAMES = new Set(["package.json", "pnpm-workspace.yaml", "turbo.json"]);

// Config file detection is imported at the call site (config-parser.ts)
// to avoid circular deps. This is a lightweight filename check.
const CONFIG_FILENAMES_QUICK = new Set([
  "tsconfig.json", "tsconfig.base.json", "tsconfig.app.json",
  ".env.example", ".env.local.example", ".env.template",
  "vercel.json",
]);
const CONFIG_PREFIXES = ["next.config", "tailwind.config"];

function isConfigFile(filePath: string): boolean {
  const name = basename(filePath);
  if (CONFIG_FILENAMES_QUICK.has(name)) return true;
  for (const prefix of CONFIG_PREFIXES) {
    if (name.startsWith(prefix)) return true;
  }
  if (/^\.env\.(example|template|local\.example|sample)$/.test(name)) return true;
  return false;
}

const MD_EXTENSIONS = new Set([".md", ".mdx"]);

export function isParseable(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  if (PARSEABLE_EXTENSIONS.has(ext) || SQL_EXTENSIONS.has(ext)) return true;
  if (PKG_FILENAMES.has(basename(filePath))) return true;
  if (isConfigFile(filePath)) return true;
  if (MD_EXTENSIONS.has(ext)) return true; // md-parser does its own filtering
  return false;
}

export function isTreeSitterParseable(filePath: string): boolean {
  return PARSEABLE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function detectLanguage(filePath: string): string | null {
  return EXT_TO_LANG[extname(filePath).toLowerCase()] ?? null;
}

// ── File hash ──────────────────────────────────────────────────────

export function fileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

// ── CodeParser ─────────────────────────────────────────────────────

// Resolve WASM file paths relative to this module's location.
// After esbuild bundles into dist/, the .wasm files sit alongside the JS.
const __dirname = typeof import.meta.url !== "undefined"
  ? fileURLToPath(new URL(".", import.meta.url))
  : process.cwd();

const WASM_PATHS: Record<string, string> = {
  typescript: join(__dirname, "tree-sitter-typescript.wasm"),
  tsx: join(__dirname, "tree-sitter-tsx.wasm"),
  javascript: join(__dirname, "tree-sitter-javascript.wasm"),
  jsx: join(__dirname, "tree-sitter-javascript.wasm"),
};

let parserInitialized = false;

export class CodeParser {
  private languages = new Map<string, Language>();
  private moduleCache = new Map<string, string | null>();

  /**
   * Initialize web-tree-sitter runtime and load grammars.
   * Must be called once before parseFile/parseBytes.
   */
  async init(): Promise<void> {
    if (!parserInitialized) {
      await Parser.init();
      parserInitialized = true;
    }

    for (const [lang, wasmPath] of Object.entries(WASM_PATHS)) {
      if (!this.languages.has(lang)) {
        try {
          const language = await Language.load(wasmPath);
          this.languages.set(lang, language);
        } catch {
          // WASM file not found — skip this language
        }
      }
    }
  }

  private getParser(language: string): Parser | null {
    const lang = this.languages.get(language);
    if (!lang) return null;

    const parser = new Parser();
    parser.setLanguage(lang);
    return parser;
  }

  parseFile(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
    let source: Buffer;
    try {
      source = readFileSync(filePath);
    } catch {
      return { nodes: [], edges: [] };
    }
    return this.parseBytes(filePath, source);
  }

  parseBytes(
    filePath: string,
    source: Buffer,
  ): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
    const language = detectLanguage(filePath);
    if (!language) return { nodes: [], edges: [] };

    const parser = this.getParser(language);
    if (!parser) return { nodes: [], edges: [] };

    const tree = parser.parse(source.toString());
    if (!tree) return { nodes: [], edges: [] };
    const nodes: NodeInfo[] = [];
    const edges: EdgeInfo[] = [];
    const testFile = isTestFile(filePath);

    // File node
    const lineCount = source.toString().split("\n").length;
    nodes.push({
      kind: "File",
      name: basename(filePath),
      file_path: filePath,
      line_start: 1,
      line_end: lineCount,
      language,
      is_test: testFile,
    });

    // Pre-scan for import map and defined names
    const importMap = new Map<string, string>();
    const definedNames = new Set<string>();
    this.collectFileScope(tree.rootNode, importMap, definedNames);

    // Walk the AST
    this.extractFromTree(
      tree.rootNode, language, filePath, nodes, edges,
      null, null, importMap, definedNames, 0,
    );

    // Post-process: resolve bare call targets
    this.resolveCallTargets(nodes, edges, filePath);

    // Generate TESTED_BY edges
    if (testFile) {
      this.generateTestEdges(nodes, edges);
    }

    return { nodes, edges };
  }

  // ── File scope pre-scan ──────────────────────────────────────────

  private collectFileScope(
    root: Node,
    importMap: Map<string, string>,
    definedNames: Set<string>,
  ): void {
    for (const child of root.children) {
      const nodeType = child.type;

      let target = child;
      if (nodeType === "export_statement") {
        for (const inner of child.children) {
          if (
            CLASS_TYPES.has(inner.type) ||
            FUNCTION_TYPES.has(inner.type) ||
            TYPE_TYPES.has(inner.type) ||
            inner.type === "lexical_declaration"
          ) {
            target = inner;
            break;
          }
        }
      }

      if (CLASS_TYPES.has(target.type) || FUNCTION_TYPES.has(target.type)) {
        const name = getName(target, CLASS_TYPES.has(target.type) ? "class" : "function");
        if (name) definedNames.add(name);
      }

      if (target.type === "lexical_declaration") {
        for (const decl of target.children) {
          if (decl.type === "variable_declarator") {
            const nameNode = decl.childForFieldName("name");
            const valueNode = decl.childForFieldName("value");
            if (nameNode && valueNode?.type === "arrow_function") {
              definedNames.add(getNodeText(nameNode));
            }
          }
        }
      }

      if (TYPE_TYPES.has(target.type)) {
        const name = getName(target, "type");
        if (name) definedNames.add(name);
      }

      if (IMPORT_TYPES.has(nodeType)) {
        const module = extractImportTarget(child);
        if (module) {
          for (const c of child.children) {
            if (c.type === "import_clause") {
              collectJsImportNames(c, module, importMap);
            }
          }
        }
      }
    }
  }

  // ── Recursive AST walk ───────────────────────────────────────────

  private static readonly MAX_DEPTH = 180;

  private extractFromTree(
    root: Node,
    language: string,
    filePath: string,
    nodes: NodeInfo[],
    edges: EdgeInfo[],
    enclosingClass: string | null,
    enclosingFunc: string | null,
    importMap: Map<string, string>,
    definedNames: Set<string>,
    depth: number,
  ): void {
    if (depth > CodeParser.MAX_DEPTH) return;

    for (const child of root.children) {
      const nodeType = child.type;

      if (nodeType === "export_statement") {
        this.extractFromTree(
          child, language, filePath, nodes, edges,
          enclosingClass, enclosingFunc, importMap, definedNames, depth + 1,
        );
        continue;
      }

      if (CLASS_TYPES.has(nodeType)) {
        if (this.handleClass(child, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth)) continue;
      }

      if (TYPE_TYPES.has(nodeType)) {
        if (this.handleType(child, filePath, nodes, edges, enclosingClass, language)) continue;
      }

      if (FUNCTION_TYPES.has(nodeType)) {
        if (this.handleFunction(child, nodeType, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth)) continue;
      }

      if (nodeType === "lexical_declaration") {
        this.handleLexicalDeclaration(child, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth);
      }

      if (IMPORT_TYPES.has(nodeType)) {
        this.handleImport(child, filePath, edges);
        continue;
      }

      if (CALL_TYPES.has(nodeType)) {
        this.handleCall(child, filePath, enclosingClass, enclosingFunc, importMap, definedNames, edges);
      }

      this.extractFromTree(
        child, language, filePath, nodes, edges,
        enclosingClass, enclosingFunc, importMap, definedNames, depth + 1,
      );
    }
  }

  // ── Node handlers (called from extractFromTree) ──────────────────

  private handleClass(
    child: Node, language: string, filePath: string,
    nodes: NodeInfo[], edges: EdgeInfo[], enclosingClass: string | null,
    importMap: Map<string, string>, definedNames: Set<string>, depth: number,
  ): boolean {
    const name = getName(child, "class");
    if (!name) return false;

    nodes.push({
      kind: "Class", name, file_path: filePath,
      line_start: child.startPosition.row + 1,
      line_end: child.endPosition.row + 1,
      language, parent_name: enclosingClass ?? undefined, is_test: false,
    });

    edges.push({
      kind: "CONTAINS", source: filePath,
      target: qualify(name, filePath, enclosingClass),
      file_path: filePath, line: child.startPosition.row + 1,
    });

    for (const base of getBases(child)) {
      edges.push({
        kind: "INHERITS",
        source: qualify(name, filePath, enclosingClass),
        target: base, file_path: filePath, line: child.startPosition.row + 1,
      });
    }

    this.extractFromTree(
      child, language, filePath, nodes, edges,
      name, null, importMap, definedNames, depth + 1,
    );
    return true;
  }

  private handleType(
    child: Node, filePath: string,
    nodes: NodeInfo[], edges: EdgeInfo[], enclosingClass: string | null,
    language: string,
  ): boolean {
    const name = getName(child, "type");
    if (!name) return false;

    nodes.push({
      kind: "Type", name, file_path: filePath,
      line_start: child.startPosition.row + 1,
      line_end: child.endPosition.row + 1,
      language, parent_name: enclosingClass ?? undefined, is_test: false,
    });

    const container = enclosingClass
      ? qualify(enclosingClass, filePath, null)
      : filePath;
    edges.push({
      kind: "CONTAINS", source: container,
      target: qualify(name, filePath, enclosingClass),
      file_path: filePath, line: child.startPosition.row + 1,
    });
    return true;
  }

  private handleFunction(
    child: Node, nodeType: string, language: string,
    filePath: string, nodes: NodeInfo[], edges: EdgeInfo[],
    enclosingClass: string | null, importMap: Map<string, string>,
    definedNames: Set<string>, depth: number,
  ): boolean {
    const name = nodeType === "arrow_function"
      ? getArrowFunctionName(child)
      : getName(child, "function");
    if (!name) return false;

    const isTest = isTestFunction(name, filePath);
    const qualified = qualify(name, filePath, enclosingClass);

    nodes.push({
      kind: isTest ? "Test" : "Function", name, file_path: filePath,
      line_start: child.startPosition.row + 1,
      line_end: child.endPosition.row + 1,
      language, parent_name: enclosingClass ?? undefined,
      params: getParams(child) ?? undefined,
      return_type: getReturnType(child) ?? undefined,
      is_test: isTest,
    });

    const container = enclosingClass
      ? qualify(enclosingClass, filePath, null)
      : filePath;
    edges.push({
      kind: "CONTAINS", source: container, target: qualified,
      file_path: filePath, line: child.startPosition.row + 1,
    });

    this.extractFromTree(
      child, language, filePath, nodes, edges,
      enclosingClass, name, importMap, definedNames, depth + 1,
    );
    return true;
  }

  private handleLexicalDeclaration(
    child: Node, language: string, filePath: string,
    nodes: NodeInfo[], edges: EdgeInfo[], enclosingClass: string | null,
    importMap: Map<string, string>, definedNames: Set<string>, depth: number,
  ): void {
    for (const decl of child.children) {
      if (decl.type !== "variable_declarator") continue;
      const nameNode = decl.childForFieldName("name");
      const valueNode = decl.childForFieldName("value");
      if (!nameNode || valueNode?.type !== "arrow_function") continue;

      const name = getNodeText(nameNode);
      const isTest = isTestFunction(name, filePath);
      const qualified = qualify(name, filePath, enclosingClass);

      nodes.push({
        kind: isTest ? "Test" : "Function", name, file_path: filePath,
        line_start: valueNode.startPosition.row + 1,
        line_end: valueNode.endPosition.row + 1,
        language, parent_name: enclosingClass ?? undefined,
        params: getParams(valueNode) ?? undefined,
        return_type: getReturnType(valueNode) ?? undefined,
        is_test: isTest,
      });

      const container = enclosingClass
        ? qualify(enclosingClass, filePath, null)
        : filePath;
      edges.push({
        kind: "CONTAINS", source: container, target: qualified,
        file_path: filePath, line: valueNode.startPosition.row + 1,
      });

      this.extractFromTree(
        valueNode, language, filePath, nodes, edges,
        enclosingClass, name, importMap, definedNames, depth + 1,
      );
    }
  }

  private handleImport(
    child: Node, filePath: string, edges: EdgeInfo[],
  ): void {
    const module = extractImportTarget(child);
    if (!module) return;
    const resolved = resolveModuleToFile(module, filePath);
    edges.push({
      kind: "IMPORTS_FROM", source: filePath,
      target: resolved ?? module,
      file_path: filePath, line: child.startPosition.row + 1,
    });
  }

  private handleCall(
    child: Node, filePath: string,
    enclosingClass: string | null, enclosingFunc: string | null,
    importMap: Map<string, string>, definedNames: Set<string>,
    edges: EdgeInfo[],
  ): void {
    const callName = getCallName(child);
    if (!callName || !enclosingFunc) return;
    const caller = qualify(enclosingFunc, filePath, enclosingClass);
    const target = this.resolveCallTarget(callName, filePath, importMap, definedNames);
    edges.push({
      kind: "CALLS", source: caller, target,
      file_path: filePath, line: child.startPosition.row + 1,
    });
  }

  // ── Call target resolution ───────────────────────────────────────

  private resolveCallTarget(
    callName: string, filePath: string,
    importMap: Map<string, string>, definedNames: Set<string>,
  ): string {
    if (definedNames.has(callName)) return qualify(callName, filePath, null);
    if (importMap.has(callName)) {
      const resolved = this.resolveModuleCached(importMap.get(callName)!, filePath);
      if (resolved) return qualify(callName, resolved, null);
    }
    return callName;
  }

  private resolveModuleCached(module: string, callerFilePath: string): string | null {
    const cacheKey = `${dirname(callerFilePath)}:${module}`;
    if (this.moduleCache.has(cacheKey)) return this.moduleCache.get(cacheKey)!;
    const resolved = resolveModuleToFile(module, callerFilePath);
    if (this.moduleCache.size > 15000) this.moduleCache.clear();
    this.moduleCache.set(cacheKey, resolved);
    return resolved;
  }

  private resolveCallTargets(nodes: NodeInfo[], edges: EdgeInfo[], filePath: string): void {
    const symbols = new Map<string, string>();
    for (const node of nodes) {
      if (node.kind === "Function" || node.kind === "Class" || node.kind === "Type" || node.kind === "Test") {
        const qn = qualify(node.name, filePath, node.parent_name ?? null);
        if (!symbols.has(node.name)) symbols.set(node.name, qn);
      }
    }
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (edge.kind === "CALLS" && !edge.target.includes("::")) {
        const resolved = symbols.get(edge.target);
        if (resolved) edges[i] = { ...edge, target: resolved };
      }
    }
  }

  private generateTestEdges(nodes: NodeInfo[], edges: EdgeInfo[]): void {
    const testQNames = new Set<string>();
    for (const n of nodes) {
      if (n.is_test) testQNames.add(qualify(n.name, n.file_path, n.parent_name ?? null));
    }
    const newEdges: EdgeInfo[] = [];
    for (const edge of edges) {
      if (edge.kind === "CALLS" && testQNames.has(edge.source)) {
        newEdges.push({
          kind: "TESTED_BY", source: edge.target, target: edge.source,
          file_path: edge.file_path, line: edge.line,
        });
      }
    }
    edges.push(...newEdges);
  }
}
