/**
 * Shell file parser — routing and hooks.json parsing.
 *
 * Routes .sh files to sh-script-parser.ts and hooks.json to the
 * inline hooks parser. Creates edges from hook events → scripts.
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isShParseable(filePath: string): boolean;
export declare function parseShFile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
