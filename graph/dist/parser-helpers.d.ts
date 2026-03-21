/**
 * Helper functions for tree-sitter AST extraction.
 *
 * Pure functions that extract names, params, return types, bases,
 * imports, and call targets from tree-sitter syntax nodes.
 * Also includes module resolution for relative imports.
 */
import type { Node } from "web-tree-sitter";
export declare const CLASS_TYPES: Set<string>;
export declare const FUNCTION_TYPES: Set<string>;
export declare const IMPORT_TYPES: Set<string>;
export declare const CALL_TYPES: Set<string>;
export declare const TYPE_TYPES: Set<string>;
export declare function isTestFile(filePath: string): boolean;
export declare function isTestFunction(name: string, filePath: string): boolean;
export declare function qualify(name: string, filePath: string, enclosingClass: string | null): string;
export declare function getNodeText(node: Node): string;
export declare function getName(node: Node, _kind: "class" | "function" | "type"): string | null;
export declare function getArrowFunctionName(node: Node): string | null;
export declare function getParams(node: Node): string | null;
export declare function getReturnType(node: Node): string | null;
export declare function getBases(node: Node): string[];
export declare function extractImportTarget(node: Node): string | null;
export declare function collectJsImportNames(clauseNode: Node, module: string, importMap: Map<string, string>): void;
export declare function getCallName(node: Node): string | null;
export declare function resolveModuleToFile(module: string, callerFilePath: string): string | null;
