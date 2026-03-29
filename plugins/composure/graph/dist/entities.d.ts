/**
 * Entity detection and membership assignment.
 *
 * Discovers domain entities from migrations, routes, directories, hooks,
 * and type names. Runs as a post-processing pass after the normal parse
 * phase, reading from the nodes table (fast — no file I/O).
 */
import type { GraphStore } from "./store.js";
export declare function normalizeEntityName(raw: string): string;
export declare function detectAndStoreEntities(store: GraphStore, repoRoot: string): {
    entityCount: number;
    memberCount: number;
};
