/**
 * Memory node CRUD — create, read, update, delete on ai_memory_nodes.
 */
export async function createNode(adapter, params) {
    try {
        const node = await adapter.createNode(params);
        return {
            status: "ok",
            node_id: node.id,
            id_prefix: node.id_prefix,
            content_type: node.content_type,
            message: "Memory node created",
        };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to create node: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function getNode(adapter, params) {
    try {
        const node = await adapter.getNode(params.node_id);
        if (!node) {
            return { status: "not_found", error: `Node ${params.node_id} not found` };
        }
        return { status: "ok", node };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to get node: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function updateNode(adapter, params) {
    try {
        const { node_id, ...updates } = params;
        const node = await adapter.updateNode(node_id, updates);
        if (!node) {
            return { status: "not_found", error: `Node ${node_id} not found` };
        }
        return { status: "ok", node };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to update node: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function deleteNode(adapter, params) {
    try {
        const deleted = await adapter.deleteNode(params.node_id);
        if (!deleted) {
            return { status: "not_found", error: `Node ${params.node_id} not found` };
        }
        return { status: "ok", message: "Node deleted" };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to delete node: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
//# sourceMappingURL=entities.js.map