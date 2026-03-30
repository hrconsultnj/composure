/**
 * Package.json parser for dependency graph indexing.
 *
 * Extracts structural information from package.json files:
 * - Package identity (name, version)
 * - Dependencies (prod, dev, peer) as DEPENDS_ON edges
 * - Scripts as Script nodes
 * - Workspace definitions (monorepo detection)
 *
 * Also handles pnpm-workspace.yaml and turbo.json for monorepo mapping.
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isPkgParseable(filePath: string): boolean;
export declare function parsePkgFile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
