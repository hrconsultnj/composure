/**
 * AST node handler functions for the CodeParser.
 *
 * Extracted from parser.ts to keep the class focused on orchestration
 * (init, walk, scope scan). Handlers are standalone functions that push
 * to the shared nodes/edges arrays and take a WalkFn callback for recursion.
 */

import type { Node } from "web-tree-sitter";
import type { EdgeInfo, NodeInfo } from "./types.js";
import {
  getName,
  getNodeText,
  getParams,
  getReturnType,
  getBases,
  qualify,
  getArrowFunctionName,
  extractImportTarget,
  resolveModuleToFile,
  isTestFunction,
  getCallName,
} from "./parser-helpers.js";

// ── Callback types ────────────────────────────────────────────────

export type WalkFn = (
  root: Node, language: string, filePath: string,
  nodes: NodeInfo[], edges: EdgeInfo[],
  enclosingClass: string | null, enclosingFunc: string | null,
  importMap: Map<string, string>, definedNames: Set<string>, depth: number,
) => void;

export type CallResolverFn = (
  callName: string, filePath: string,
  importMap: Map<string, string>, definedNames: Set<string>,
) => string;

// ── JSDoc extraction ──────────────────────────────────────────────

/**
 * Extract the first sentence of a JSDoc comment preceding a node.
 * Only for exported functions — internal helpers don't need searchable summaries.
 */
export function extractJsDocSummary(node: Node): string | undefined {
  const parent = node.parent;
  const isExported = parent?.type === "export_statement"
    || (parent?.type === "lexical_declaration" && parent?.parent?.type === "export_statement");
  if (!isExported) return undefined;

  const exportNode = parent?.type === "export_statement" ? parent : parent?.parent;
  const commentNode = exportNode?.previousNamedSibling ?? node.previousNamedSibling;
  if (!commentNode || commentNode.type !== "comment") return undefined;

  const text = getNodeText(commentNode);
  if (!text.startsWith("/**")) return undefined;

  const content = text
    .replace(/^\/\*\*\s*/, "")
    .replace(/\s*\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line && !line.startsWith("@"))
    .join(" ")
    .trim();

  if (!content) return undefined;

  const firstSentence = content.match(/^(.+?\.)\s/)?.[1] ?? content;
  return firstSentence.length > 150 ? firstSentence.slice(0, 147) + "..." : firstSentence;
}

// ── Heuristic summary from name ───────────────────────────────────

/**
 * Split camelCase/PascalCase name into a lowercase search-friendly summary.
 * Only for exported functions — internal helpers don't need indexing.
 */
export function heuristicSummary(node: Node, name: string, params?: string | null): string | undefined {
  const parent = node.parent;
  const isExported = parent?.type === "export_statement"
    || (parent?.type === "lexical_declaration" && parent?.parent?.type === "export_statement");
  if (!isExported) return undefined;

  const words = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/);

  if (words.length <= 1) return undefined;

  let summary = words.join(" ");
  if (words[0] === "use" && words.length <= 3) {
    summary += " hook";
  }

  return summary;
}

// ── Node handlers ─────────────────────────────────────────────────

export function handleClass(
  walk: WalkFn, child: Node, language: string, filePath: string,
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

  walk(child, language, filePath, nodes, edges, name, null, importMap, definedNames, depth + 1);
  return true;
}

export function handleType(
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

export function handleFunction(
  walk: WalkFn, child: Node, nodeType: string, language: string,
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

  const params = getParams(child) ?? undefined;
  const summary = isTest ? undefined
    : (extractJsDocSummary(child) ?? heuristicSummary(child, name, params));
  nodes.push({
    kind: isTest ? "Test" : "Function", name, file_path: filePath,
    line_start: child.startPosition.row + 1,
    line_end: child.endPosition.row + 1,
    language, parent_name: enclosingClass ?? undefined,
    params,
    return_type: getReturnType(child) ?? undefined,
    summary,
    is_test: isTest,
  });

  const container = enclosingClass
    ? qualify(enclosingClass, filePath, null)
    : filePath;
  edges.push({
    kind: "CONTAINS", source: container, target: qualified,
    file_path: filePath, line: child.startPosition.row + 1,
  });

  walk(child, language, filePath, nodes, edges, enclosingClass, name, importMap, definedNames, depth + 1);
  return true;
}

export function handleLexicalDeclaration(
  walk: WalkFn, child: Node, language: string, filePath: string,
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

    const arrowParams = getParams(valueNode) ?? undefined;
    const summary = isTest ? undefined
      : (extractJsDocSummary(child) ?? heuristicSummary(child, name, arrowParams));
    nodes.push({
      kind: isTest ? "Test" : "Function", name, file_path: filePath,
      line_start: valueNode.startPosition.row + 1,
      line_end: valueNode.endPosition.row + 1,
      language, parent_name: enclosingClass ?? undefined,
      params: arrowParams,
      return_type: getReturnType(valueNode) ?? undefined,
      summary,
      is_test: isTest,
    });

    const container = enclosingClass
      ? qualify(enclosingClass, filePath, null)
      : filePath;
    edges.push({
      kind: "CONTAINS", source: container, target: qualified,
      file_path: filePath, line: valueNode.startPosition.row + 1,
    });

    walk(valueNode, language, filePath, nodes, edges, enclosingClass, name, importMap, definedNames, depth + 1);
  }
}

export function handleImport(
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

export function handleCall(
  resolveTarget: CallResolverFn, child: Node, filePath: string,
  enclosingClass: string | null, enclosingFunc: string | null,
  importMap: Map<string, string>, definedNames: Set<string>,
  edges: EdgeInfo[],
): void {
  const callName = getCallName(child);
  if (!callName || !enclosingFunc) return;
  const caller = qualify(enclosingFunc, filePath, enclosingClass);
  const target = resolveTarget(callName, filePath, importMap, definedNames);
  edges.push({
    kind: "CALLS", source: caller, target,
    file_path: filePath, line: child.startPosition.row + 1,
  });
}

// ── Post-processing ───────────────────────────────────────────────

export function resolveCallTargets(nodes: NodeInfo[], edges: EdgeInfo[], filePath: string): void {
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

export function generateTestEdges(nodes: NodeInfo[], edges: EdgeInfo[]): void {
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
