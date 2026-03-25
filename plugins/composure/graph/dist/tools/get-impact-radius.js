import { GraphStore, edgeToDict, nodeToDict } from "../store.js";
import { findProjectRoot, getChangedFiles, getDbPath, getStagedAndUnstaged, } from "../incremental.js";
import { getImpactRadius } from "../bfs.js";
import { relative } from "node:path";
export function getImpactRadiusTool(params) {
    const root = findProjectRoot(params.repo_root);
    const dbPath = getDbPath(root);
    const base = params.base ?? "HEAD~1";
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
        // Auto-detect changed files if not provided
        let changedFiles = params.changed_files;
        if (!changedFiles || changedFiles.length === 0) {
            changedFiles = [
                ...new Set([
                    ...getChangedFiles(root, base),
                    ...getStagedAndUnstaged(root),
                ]),
            ];
        }
        if (changedFiles.length === 0) {
            return {
                status: "ok",
                summary: "No changed files detected.",
                changed_files: [],
                changed_nodes: [],
                impacted_nodes: [],
                impacted_files: [],
                edges: [],
            };
        }
        const result = getImpactRadius(store, changedFiles, params.max_depth ?? 2);
        const summary = [
            `${result.changed_nodes.length} changed nodes`,
            `${result.impacted_nodes.length} impacted nodes`,
            `${result.impacted_files.length} impacted files`,
            result.truncated ? "(truncated)" : "",
        ]
            .filter(Boolean)
            .join(", ");
        return {
            status: "ok",
            summary,
            changed_files: changedFiles.map((f) => relative(root, f)),
            changed_nodes: result.changed_nodes.map(nodeToDict),
            impacted_nodes: result.impacted_nodes.map(nodeToDict),
            impacted_files: result.impacted_files.map((f) => relative(root, f)),
            edges: result.edges.map(edgeToDict),
            truncated: result.truncated,
            total_impacted: result.total_impacted,
        };
    }
    finally {
        store.close();
    }
}
//# sourceMappingURL=get-impact-radius.js.map