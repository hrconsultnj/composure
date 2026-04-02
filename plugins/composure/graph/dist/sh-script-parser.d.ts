/**
 * Shell script (.sh) parser for hook and script indexing.
 *
 * Parses .sh files using regex (no tree-sitter needed) to extract:
 * - Function definitions (function_name() { ... } or function name { ... })
 * - Source/dot-source imports (source ./path or . ./path)
 * - External command executions (node, python, npx, bash, etc.)
 * - File path references (explicit paths in the script)
 *
 * Split from sh-parser.ts which handles routing and hooks.json parsing.
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function parseShellScript(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
