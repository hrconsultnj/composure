/**
 * Markdown content-level parser for documentation indexing.
 *
 * Parses markdown files at the CONTENT level — not just file existence,
 * but sections, rules, conventions, and references within them.
 *
 * Supports:
 * - CLAUDE.md → rules, conventions, architecture decisions
 * - README.md → project description, setup steps
 * - ADR files (docs/decisions/, docs/adr/) → decision records
 * - Any *.md in docs/, appendices/, or at root
 *
 * Node types emitted:
 * - File (the markdown file itself)
 * - Type (sections, conventions — reuses Type for searchability)
 *
 * Edge types:
 * - CONTAINS (File → Section)
 * - REFERENCES (Section → file path mentioned in content)
 */

import { readFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import type { EdgeInfo, NodeInfo } from "./types.js";

// ── Detection ─────────────────────────────────────────────────────

const MD_EXTENSIONS = new Set([".md", ".mdx"]);

const INDEXED_MD_NAMES = new Set([
  "claude.md", "readme.md", "changelog.md", "contributing.md",
  "architecture.md", "design.md", "decisions.md",
]);

const INDEXED_MD_DIRS = [
  "/docs/", "/doc/", "/documentation/",
  "/decisions/", "/adr/", "/adrs/",
  "/appendices/", "/appendix/",
  "/specs/", "/spec/",
  "/tasks-plans/",
  "/.claude/",
];

export function isMdParseable(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  if (!MD_EXTENSIONS.has(ext)) return false;

  const name = basename(filePath).toLowerCase();
  const lowerPath = filePath.toLowerCase();

  // Always index known doc files
  if (INDEXED_MD_NAMES.has(name)) return true;

  // Index files in documentation directories
  for (const dir of INDEXED_MD_DIRS) {
    if (lowerPath.includes(dir)) return true;
  }

  // Index root-level .md files (not in node_modules, .git, etc.)
  const rel = lowerPath;
  if (!rel.includes("node_modules") && !rel.includes(".git/") && !rel.includes("dist/")) {
    // Count path depth — only index shallow .md files (root or 1 level deep)
    const parts = filePath.split("/");
    const mdIndex = parts.findIndex(p => p.toLowerCase().endsWith(".md"));
    // Allow files up to 3 dirs deep from a recognizable project structure
    if (mdIndex >= 0 && mdIndex <= parts.length - 1) {
      return true;
    }
  }

  return false;
}

// ── Helpers ───────────────────────────────────────────────────────

function qualify(name: string, filePath: string, parent: string | null): string {
  return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}

function lineCount(content: string): number {
  return content.split("\n").length;
}

// ── Section type detection ────────────────────────────────────────

type SectionType =
  | "rule"       // imperative statements: MUST, NEVER, ALWAYS
  | "convention" // patterns: "we use X", "prefer Y"
  | "decision"   // ADR-style: status, context, decision
  | "reference"  // links to external resources
  | "setup"      // installation/setup instructions
  | "overview"   // project description
  | "api"        // API documentation
  | "section";   // generic section

function classifySection(heading: string, body: string): SectionType {
  const h = heading.toLowerCase();
  const b = body.toLowerCase().slice(0, 500); // sample first 500 chars

  if (/\b(rule|constraint|must|never|always|critical|important)\b/i.test(h)) return "rule";
  if (/\b(rule|constraint)\b/i.test(h) || (b.includes("must") && b.includes("never"))) return "rule";
  if (/\b(convention|pattern|standard|practice|style)\b/i.test(h)) return "convention";
  if (/\b(decision|adr|status:\s*(accepted|deprecated|proposed))\b/i.test(h + " " + b)) return "decision";
  if (/\b(reference|resource|link|see also)\b/i.test(h)) return "reference";
  if (/\b(setup|install|getting started|quickstart|prerequisite)\b/i.test(h)) return "setup";
  if (/\b(overview|about|introduction|what is|summary)\b/i.test(h)) return "overview";
  if (/\b(api|endpoint|route|method)\b/i.test(h)) return "api";
  return "section";
}

// ── Main parser ───────────────────────────────────────────────────

export function parseMdFile(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }

  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];
  const lines = content.split("\n");
  const totalLines = lines.length;
  const name = basename(filePath);
  const docType = classifyDocType(filePath);

  // Strip YAML frontmatter if present
  let contentStart = 0;
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        contentStart = i + 1;
        break;
      }
    }
  }

  // File node
  nodes.push({
    kind: "File",
    name,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "markdown",
    is_test: false,
    extra: {
      docType,
      sections: 0, // will be updated
      hasRules: false,
      hasConventions: false,
      hasCode: content.includes("```"),
      hasTables: content.includes("| "),
    },
  });

  // Parse sections by headings
  const sections: Array<{
    heading: string;
    level: number;
    lineStart: number;
    lineEnd: number;
    body: string;
  }> = [];

  let currentSection: typeof sections[0] | null = null;
  let inCodeBlock = false;

  for (let i = contentStart; i < lines.length; i++) {
    const line = lines[i];

    // Track code fences — don't parse headings inside code blocks
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Close previous section
      if (currentSection) {
        currentSection.lineEnd = i;
        currentSection.body = lines.slice(currentSection.lineStart, i).join("\n");
        sections.push(currentSection);
      }

      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        lineStart: i + 1,
        lineEnd: totalLines,
        body: "",
      };
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.lineEnd = totalLines;
    currentSection.body = lines.slice(currentSection.lineStart - 1).join("\n");
    sections.push(currentSection);
  }

  // Create nodes for each section
  let ruleCount = 0;
  let conventionCount = 0;

  for (const section of sections) {
    const sectionType = classifySection(section.heading, section.body);
    const sectionName = sanitizeName(section.heading);

    if (sectionType === "rule") ruleCount++;
    if (sectionType === "convention") conventionCount++;

    // Extract key patterns from the section body
    const codeBlocks = (section.body.match(/```[\s\S]*?```/g) ?? []).length;
    const bulletPoints = (section.body.match(/^\s*[-*]\s/gm) ?? []).length;
    const fileRefs = extractFileReferences(section.body);

    nodes.push({
      kind: "Type",
      name: sectionName,
      file_path: filePath,
      line_start: section.lineStart,
      line_end: section.lineEnd,
      language: "markdown",
      parent_name: name,
      modifiers: `h${section.level} ${sectionType}`,
      is_test: false,
      extra: {
        docSection: true,
        sectionType,
        heading: section.heading,
        level: section.level,
        codeBlocks,
        bulletPoints,
        hasImperatives: /\b(MUST|NEVER|ALWAYS|DO NOT|REQUIRED|CRITICAL)\b/.test(section.body),
        contentLength: section.body.length,
      },
    });

    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify(sectionName, filePath, name),
      file_path: filePath,
      line: section.lineStart,
    });

    // Create REFERENCES edges for file paths mentioned in the section
    for (const ref of fileRefs) {
      edges.push({
        kind: "REFERENCES",
        source: qualify(sectionName, filePath, name),
        target: ref.path,
        file_path: filePath,
        line: ref.line,
        extra: { type: "file-reference", raw: ref.raw },
      });
    }
  }

  // Update file node extra with section counts
  const fileNode = nodes[0];
  if (fileNode?.extra) {
    fileNode.extra.sections = sections.length;
    fileNode.extra.hasRules = ruleCount > 0;
    fileNode.extra.hasConventions = conventionCount > 0;
    fileNode.extra.ruleCount = ruleCount;
    fileNode.extra.conventionCount = conventionCount;
  }

  return { nodes, edges };
}

// ── Doc type classification ───────────────────────────────────────

function classifyDocType(filePath: string): string {
  const name = basename(filePath).toLowerCase();
  const dir = dirname(filePath).toLowerCase();

  if (name === "claude.md") return "claude-md";
  if (name === "readme.md") return "readme";
  if (name === "changelog.md") return "changelog";
  if (name === "contributing.md") return "contributing";
  if (dir.includes("/decisions/") || dir.includes("/adr")) return "adr";
  if (dir.includes("/tasks-plans/")) return "task";
  if (dir.includes("/specs/") || dir.includes("/spec/")) return "spec";
  if (dir.includes("/.claude/")) return "claude-config";
  return "documentation";
}

// ── File reference extraction ─────────────────────────────────────

interface FileRef {
  path: string;
  line: number;
  raw: string;
}

function extractFileReferences(body: string): FileRef[] {
  const refs: FileRef[] = [];
  const seen = new Set<string>();
  const lines = body.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match file paths: src/foo/bar.ts, ./lib/auth.ts, components/Button.tsx
    const pathMatches = line.matchAll(
      /(?:^|\s|`|"|')([./]?(?:[\w@.-]+\/)+[\w.-]+\.(?:ts|tsx|js|jsx|json|sql|md|yaml|yml|env|toml|prisma|css|scss))\b/g,
    );

    for (const match of pathMatches) {
      const path = match[1];
      if (!seen.has(path)) {
        seen.add(path);
        refs.push({ path, line: i + 1, raw: match[0].trim() });
      }
    }

    // Match backtick-quoted paths: `package.json`, `CLAUDE.md`
    const backtickMatches = line.matchAll(/`([\w/.-]+\.(?:ts|tsx|js|jsx|json|sql|md|yaml|yml|env|toml|prisma|css|scss))`/g);
    for (const match of backtickMatches) {
      const path = match[1];
      if (!seen.has(path)) {
        seen.add(path);
        refs.push({ path, line: i + 1, raw: match[0] });
      }
    }
  }

  return refs;
}

// ── Name sanitization ─────────────────────────────────────────────

function sanitizeName(heading: string): string {
  return heading
    .replace(/[`*_#[\](){}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80); // Cap at 80 chars for node names
}
