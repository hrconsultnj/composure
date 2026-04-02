/**
 * Helper functions for tree-sitter AST extraction.
 *
 * Pure functions that extract names, params, return types, bases,
 * imports, and call targets from tree-sitter syntax nodes.
 * Also includes module resolution for relative imports.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import type { Node } from "web-tree-sitter";

// ── AST node type constants ────────────────────────────────────────

export const CLASS_TYPES = new Set(["class_declaration", "class"]);
export const FUNCTION_TYPES = new Set([
  "function_declaration",
  "method_definition",
  "arrow_function",
]);
export const IMPORT_TYPES = new Set(["import_statement"]);
export const CALL_TYPES = new Set(["call_expression", "new_expression"]);
export const TYPE_TYPES = new Set([
  "type_alias_declaration",
  "interface_declaration",
  "enum_declaration",
]);

// ── Test detection ─────────────────────────────────────────────────

const TEST_FILE_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /__tests__\//,
  /\/tests?\//,
];

const TEST_FUNCTION_NAMES = new Set([
  "describe", "it", "test",
  "beforeEach", "afterEach", "beforeAll", "afterAll",
]);

export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}

export function isTestFunction(name: string, filePath: string): boolean {
  if (isTestFile(filePath)) {
    if (TEST_FUNCTION_NAMES.has(name)) return true;
    if (name.startsWith("test")) return true;
  }
  return false;
}

// ── Qualified name helper ──────────────────────────────────────────

export function qualify(
  name: string,
  filePath: string,
  enclosingClass: string | null,
): string {
  if (enclosingClass) return `${filePath}::${enclosingClass}.${name}`;
  return `${filePath}::${name}`;
}

// ── Node text ──────────────────────────────────────────────────────

export function getNodeText(node: Node): string {
  return node.text;
}

// ── Name extraction ────────────────────────────────────────────────

export function getName(
  node: Node,
  _kind: "class" | "function" | "type",
): string | null {
  for (const child of node.children) {
    if (
      child.type === "identifier" ||
      child.type === "type_identifier" ||
      child.type === "property_identifier"
    ) {
      return getNodeText(child);
    }
  }
  return null;
}

export function getArrowFunctionName(node: Node): string | null {
  const parent = node.parent;
  if (!parent) return null;
  if (parent.type === "variable_declarator") {
    const nameNode = parent.childForFieldName("name");
    if (nameNode) return getNodeText(nameNode);
  }
  return null;
}

export function getParams(node: Node): string | null {
  for (const child of node.children) {
    if (child.type === "formal_parameters" || child.type === "parameters") {
      return getNodeText(child);
    }
  }
  return null;
}

export function getReturnType(node: Node): string | null {
  for (const child of node.children) {
    if (child.type === "type_annotation" || child.type === "return_type") {
      return getNodeText(child);
    }
  }
  return null;
}

export function getBases(node: Node): string[] {
  const bases: string[] = [];
  for (const child of node.children) {
    if (child.type === "extends_clause" || child.type === "implements_clause") {
      for (const sub of child.children) {
        if (
          sub.type === "identifier" ||
          sub.type === "type_identifier" ||
          sub.type === "nested_identifier"
        ) {
          bases.push(getNodeText(sub));
        }
      }
    }
  }
  return bases;
}

// ── Import extraction ──────────────────────────────────────────────

export function extractImportTarget(node: Node): string | null {
  for (const child of node.children) {
    if (child.type === "string" || child.type === "string_fragment") {
      return getNodeText(child).replace(/^['"]|['"]$/g, "");
    }
  }
  return null;
}

export function collectJsImportNames(
  clauseNode: Node,
  module: string,
  importMap: Map<string, string>,
): void {
  for (const child of clauseNode.children) {
    if (child.type === "identifier") {
      importMap.set(getNodeText(child), module);
    } else if (child.type === "named_imports") {
      for (const spec of child.children) {
        if (spec.type === "import_specifier") {
          const names: string[] = [];
          for (const s of spec.children) {
            if (s.type === "identifier" || s.type === "property_identifier") {
              names.push(getNodeText(s));
            }
          }
          if (names.length > 0) {
            importMap.set(names[names.length - 1], module);
          }
        }
      }
    } else if (child.type === "namespace_import") {
      for (const sub of child.children) {
        if (sub.type === "identifier") {
          importMap.set(getNodeText(sub), module);
        }
      }
    }
  }
}

// ── Call name extraction ───────────────────────────────────────────

export function getCallName(node: Node): string | null {
  const fn = node.childForFieldName("function") ?? node.children[0];
  if (!fn) return null;
  if (fn.type === "identifier") return getNodeText(fn);
  if (fn.type === "member_expression") {
    const prop = fn.childForFieldName("property");
    if (prop) return getNodeText(prop);
  }
  return null;
}

// ── Module resolution ──────────────────────────────────────────────

// ── Path alias resolution ─────────────────────────────────────────

interface PathAlias {
  prefix: string;   // e.g., "@/" or "~/"
  targets: string[]; // e.g., ["./src/*"]
}

// Cache: projectRoot → aliases (avoids re-reading tsconfig per file)
const aliasCache = new Map<string, PathAlias[]>();

function loadPathAliases(projectRoot: string): PathAlias[] {
  const cached = aliasCache.get(projectRoot);
  if (cached) return cached;

  const aliases: PathAlias[] = [];
  const candidates = ["tsconfig.json", "tsconfig.base.json", "jsconfig.json"];

  for (const name of candidates) {
    const configPath = join(projectRoot, name);
    if (!existsSync(configPath)) continue;

    try {
      const raw = readFileSync(configPath, "utf-8");
      // Strip comments (tsconfig allows them)
      const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const config = JSON.parse(cleaned);
      const paths = config?.compilerOptions?.paths as Record<string, string[]> | undefined;
      if (!paths) continue;

      for (const [pattern, targets] of Object.entries(paths)) {
        // Convert "pattern/*" → prefix "pattern/"
        const prefix = pattern.replace(/\*$/, "");
        aliases.push({ prefix, targets: targets.map((t) => t.replace(/\*$/, "")) });
      }
      break; // Use first tsconfig found
    } catch {
      continue;
    }
  }

  aliasCache.set(projectRoot, aliases);
  return aliases;
}

/** Clear the alias cache (call between full rebuilds if needed). */
export function clearAliasCache(): void {
  aliasCache.clear();
}

function resolveAlias(module: string, callerFilePath: string): string | null {
  // Walk up from caller to find project root (has tsconfig.json or package.json)
  let dir = dirname(callerFilePath);
  let projectRoot: string | null = null;
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, "tsconfig.json")) || existsSync(join(dir, "package.json"))) {
      projectRoot = dir;
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!projectRoot) return null;

  const aliases = loadPathAliases(projectRoot);
  for (const { prefix, targets } of aliases) {
    if (module.startsWith(prefix)) {
      const rest = module.slice(prefix.length);
      for (const target of targets) {
        const resolved = resolve(projectRoot, target, rest);
        // Try with extensions
        const extensions = [".ts", ".tsx", ".js", ".jsx"];
        if (existsSync(resolved) && !isDirectory(resolved)) return resolved;
        for (const ext of extensions) {
          if (existsSync(resolved + ext)) return resolved + ext;
        }
        for (const ext of extensions) {
          const indexPath = resolve(resolved, `index${ext}`);
          if (existsSync(indexPath)) return indexPath;
        }
      }
    }
  }
  return null;
}

export function resolveModuleToFile(
  module: string,
  callerFilePath: string,
): string | null {
  // Relative imports: ./foo, ../bar
  if (module.startsWith(".")) {
    const callerDir = dirname(callerFilePath);
    const base = resolve(callerDir, module);
    const extensions = [".ts", ".tsx", ".js", ".jsx"];

    if (existsSync(base) && !isDirectory(base)) return base;
    for (const ext of extensions) {
      const target = base + ext;
      if (existsSync(target)) return target;
    }
    // TypeScript ESM: imports use .js/.jsx extensions that map to .ts/.tsx source files
    const strippedBase = base.replace(/\.jsx?$/, "");
    if (strippedBase !== base) {
      for (const ext of extensions) {
        const target = strippedBase + ext;
        if (existsSync(target)) return target;
      }
    }
    for (const ext of extensions) {
      const target = resolve(base, `index${ext}`);
      if (existsSync(target)) return target;
    }
    return null;
  }

  // Non-relative imports: check path aliases (@/, ~/, etc.)
  return resolveAlias(module, callerFilePath);
}

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
