/**
 * Memory edge CRUD — create, read, delete on ai_memory_edges.
 */
export async function createEdge(adapter, params) {
    try {
        const edge = await adapter.createEdge(params);
        return {
            status: "ok",
            edge_id: edge.id,
            relationship_type: edge.relationship_type,
            from_node_id: edge.from_node_id,
            to_node_id: edge.to_node_id,
            message: "Memory edge created",
        };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to create edge: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function getEdgesForNode(adapter, params) {
    try {
        const edges = await adapter.getEdgesForNode(params.node_id);
        return {
            status: "ok",
            count: edges.length,
            edges: edges.map((e) => ({
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
            error: `Failed to get edges: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function deleteEdge(adapter, params) {
    try {
        const deleted = await adapter.deleteEdge(params.edge_id);
        if (!deleted) {
            return { status: "not_found", error: `Edge ${params.edge_id} not found` };
        }
        return { status: "ok", message: "Edge deleted" };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to delete edge: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
//# sourceMappingURL=relations.js.map