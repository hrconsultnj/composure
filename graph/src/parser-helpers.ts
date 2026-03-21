/**
 * Helper functions for tree-sitter AST extraction.
 *
 * Pure functions that extract names, params, return types, bases,
 * imports, and call targets from tree-sitter syntax nodes.
 * Also includes module resolution for relative imports.
 */

import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

export function resolveModuleToFile(
  module: string,
  callerFilePath: string,
): string | null {
  if (!module.startsWith(".")) return null;

  const callerDir = dirname(callerFilePath);
  const base = resolve(callerDir, module);
  const extensions = [".ts", ".tsx", ".js", ".jsx"];

  if (existsSync(base) && !isDirectory(base)) return base;
  for (const ext of extensions) {
    const target = base + ext;
    if (existsSync(target)) return target;
  }
  for (const ext of extensions) {
    const target = resolve(base, `index${ext}`);
    if (existsSync(target)) return target;
  }
  return null;
}

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
