/**
 * Memory graph traversal — BFS through ai_memory_edges.
 *
 * Walks the memory graph from a starting node, collecting all
 * connected nodes within a given depth. Useful for context
 * expansion ("give me everything related to X").
 */
export async function traverseGraph(adapter, params) {
    const depth = params.depth ?? 2;
    try {
        const result = await adapter.traverseGraph(params.start_node_id, depth, params.relationship_types);
        return {
            status: "ok",
            start_node_id: params.start_node_id,
            depth,
            nodes_found: result.nodes.length,
            edges_found: result.edges.length,
            nodes: result.nodes.map((n) => ({
                id: n.id,
                id_prefix: n.id_prefix,
                content: n.content.substring(0, 200),
                content_type: n.content_type,
                metadata: n.metadata,
            })),
            edges: result.edges.map((e) => ({
                id: e.id,
                from_node_id: e.from_node_id,
                to_node_id: e.to_node_id,
                relationship_type: e.relationship_type,
                weight: e.weight,
            })),
        };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to traverse graph: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
//# sourceMappingURL=traverse.js.map