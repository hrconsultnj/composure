import { GraphStore } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
export function listGraphStats(params) {
    const root = findProjectRoot(params.repo_root);
    const dbPath = getDbPath(root);
    let store;
    try {
        store = new GraphStore(dbPath);
    }
    catch (err) {
        return {
            status: "error",
            error: `Cannot open graph database: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
    try {
        const stats = store.getStats();
        const summary = [
            `Graph: ${stats.total_nodes} nodes, ${stats.total_edges} edges`,
            `Files: ${stats.files_count}`,
            `Languages: ${stats.languages.join(", ") || "none"}`,
            `Last updated: ${stats.last_updated ?? "never"}`,
        ].join(". ");
        return {
            status: "ok",
            summary,
            ...stats,
        };
    }
    finally {
        store.close();
    }
}
//# sourceMappingURL=list-graph-stats.js.map