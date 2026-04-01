/**
 * get_dependency_chain — shortest path between two nodes in the graph.
 *
 * Uses BFS to find how two code entities are connected through
 * imports, calls, and other edges. Returns the path with full
 * node details and connecting edges.
 */
import { GraphStore, nodeToDict, edgeToDict } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
import { getShortestPath } from "../bfs.js";
export function getDependencyChain(params) {
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
        // Resolve "from" — could be a name, qualified name, or file path
        const fromNode = resolveTarget(store, params.from);
        const toNode = resolveTarget(store, params.to);
        if (!fromNode) {
            const candidates = store.searchNodes(params.from, 5);
            if (candidates.length > 0) {
                return {
                    status: "ambiguous",
                    summary: `Multiple matches for '${params.from}'. Please use a qualified name.`,
                    candidates: candidates.map(nodeToDict),
                };
            }
            return {
                status: "not_found",
                summary: `No node found matching '${params.from}'`,
            };
        }
        if (!toNode) {
            const candidates = store.searchNodes(params.to, 5);
            if (candidates.length > 0) {
                return {
                    status: "ambiguous",
                    summary: `Multiple matches for '${params.to}'. Please use a qualified name.`,
                    candidates: candidates.map(nodeToDict),
                };
            }
            return {
                status: "not_found",
                summary: `No node found matching '${params.to}'`,
            };
        }
        const result = getShortestPath(store, fromNode.qualified_name, toNode.qualified_name, params.max_depth ?? 10);
        if (!result.found) {
            return {
                status: "ok",
                summary: `No path found between '${fromNode.name}' and '${toNode.name}' within ${params.max_depth ?? 10} hops`,
                from: nodeToDict(fromNode),
                to: nodeToDict(toNode),
                path: [],
                edges: [],
                connected: false,
            };
        }
        const pathNames = result.path.map((n) => n.name);
        const summary = `${pathNames.join(" → ")} (${result.depth} hop${result.depth === 1 ? "" : "s"})`;
        return {
            status: "ok",
            summary,
            from: nodeToDict(fromNode),
            to: nodeToDict(toNode),
            path: result.path.map(nodeToDict),
            edges: result.edges.map(edgeToDict),
            depth: result.depth,
            connected: true,
        };
    }
    finally {
        store.close();
    }
}
function resolveTarget(store, target) {
    // Try exact qualified name first
    let node = store.getNode(target);
    if (node)
        return node;
    // Try as file path
    const fileNodes = store.getNodesByFile(target);
    const fileNode = fileNodes.find((n) => n.kind === "File");
    if (fileNode)
        return fileNode;
    // Try name search — take only if exactly 1 result
    const candidates = store.searchNodes(target, 2);
    if (candidates.length === 1)
        return candidates[0];
    return null;
}
//# sourceMappingURL=get-dependency-chain.js.map