/**
 * AST node handler functions for the CodeParser.
 *
 * Extracted from parser.ts to keep the class focused on orchestration
 * (init, walk, scope scan). Handlers are standalone functions that push
 * to the shared nodes/edges arrays and take a WalkFn callback for recursion.
 */
import type { Node } from "web-tree-sitter";
import type { EdgeInfo, NodeInfo } from "./types.js";
export type WalkFn = (root: Node, language: string, filePath: string, nodes: NodeInfo[], edges: EdgeInfo[], enclosingClass: string | null, enclosingFunc: string | null, importMap: Map<string, string>, definedNames: Set<string>, depth: number) => void;
export type CallResolverFn = (callName: string, filePath: string, importMap: Map<string, string>, definedNames: Set<string>) => string;
/**
 * Extract the first sentence of a JSDoc comment preceding a node.
 * Only for exported functions — internal helpers don't need searchable summaries.
 */
export declare function extractJsDocSummary(node: Node): string | undefined;
/**
 * Split camelCase/PascalCase name into a lowercase search-friendly summary.
 * Only for exported functions — internal helpers don't need indexing.
 */
export declare function heuristicSummary(node: Node, name: string, params?: string | null): string | undefined;
export declare function handleClass(walk: WalkFn, child: Node, language: string, filePath: string, nodes: NodeInfo[], edges: EdgeInfo[], enclosingClass: string | null, importMap: Map<string, string>, definedNames: Set<string>, depth: number): boolean;
export declare function handleType(child: Node, filePath: string, nodes: NodeInfo[], edges: EdgeInfo[], enclosingClass: string | null, language: string): boolean;
export declare function handleFunction(walk: WalkFn, child: Node, nodeType: string, language: string, filePath: string, nodes: NodeInfo[], edges: EdgeInfo[], enclosingClass: string | null, importMap: Map<string, string>, definedNames: Set<string>, depth: number): boolean;
export declare function handleLexicalDeclaration(walk: WalkFn, child: Node, language: string, filePath: string, nodes: NodeInfo[], edges: EdgeInfo[], enclosingClass: string | null, importMap: Map<string, string>, definedNames: Set<string>, depth: number): void;
export declare function handleImport(child: Node, filePath: string, edges: EdgeInfo[]): void;
export declare function handleCall(resolveTarget: CallResolverFn, child: Node, filePath: string, enclosingClass: string | null, enclosingFunc: string | null, importMap: Map<string, string>, definedNames: Set<string>, edges: EdgeInfo[]): void;
export declare function resolveCallTargets(nodes: NodeInfo[], edges: EdgeInfo[], filePath: string): void;
export declare function generateTestEdges(nodes: NodeInfo[], edges: EdgeInfo[]): void;
