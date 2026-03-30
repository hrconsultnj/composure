/**
 * Configuration file parser for project config indexing.
 *
 * Extracts key settings from:
 * - tsconfig.json — paths, strict mode, target, module resolution
 * - next.config.* — experimental flags, redirects
 * - tailwind.config.* — theme extensions, plugins, content paths
 * - .env.example / .env.local — environment variable names (never values)
 * - vercel.json — deployment config
 *
 * Returns NodeInfo/EdgeInfo for graph storage.
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isConfigParseable(filePath: string): boolean;
export declare function parseConfigFile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
