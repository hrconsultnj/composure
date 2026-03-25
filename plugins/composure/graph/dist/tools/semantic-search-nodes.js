import { GraphStore, nodeToDict } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
export function semanticSearchNodes(params) {
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
        let nodes = store.searchNodes(params.query, params.limit ?? 20);
        // Filter by kind if specified
        if (params.kind) {
            nodes = nodes.filter((n) => n.kind === params.kind);
        }
        const results = nodes.map((n) => nodeToDict(n));
        const summary = `Found ${results.length} nodes matching "${params.query}"`;
        return {
            status: "ok",
            summary,
            query: params.query,
            search_mode: "keyword",
            results,
        };
    }
    finally {
        store.close();
    }
}
//# sourceMappingURL=semantic-search-nodes.js.map