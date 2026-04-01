/**
 * Shell script parser for hook and script indexing.
 *
 * Parses .sh files using regex (no tree-sitter needed) to extract:
 * - Function definitions (function_name() { ... } or function name { ... })
 * - Source/dot-source imports (source ./path or . ./path)
 * - External command executions (node, python, npx, bash, etc.)
 * - File path references (explicit paths in the script)
 * - Environment variable reads ($VAR, ${VAR})
 *
 * Also parses hooks.json files to create edges from hook events → scripts.
 *
 * Node types emitted:
 * - File (the script itself, language: "bash")
 * - Function (shell functions defined in the script)
 * - Script (external commands/scripts called)
 *
 * Edge types:
 * - CONTAINS (File → Function)
 * - CALLS (Function → external command, or File → external command)
 * - IMPORTS_FROM (source/dot-source → another script)
 * - REFERENCES (script → file paths, env vars)
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isShParseable(filePath: string): boolean;
export declare function parseShFile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
