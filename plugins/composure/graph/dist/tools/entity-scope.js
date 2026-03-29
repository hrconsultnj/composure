/**
 * entity_scope MCP tool — query domain entities in the code graph.
 *
 * Without arguments: lists all discovered entities with member counts.
 * With entity name: returns all members grouped by role + shared entities.
 */
import { GraphStore, nodeToDict } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
export function entityScope(params) {
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
        const minConfidence = params.min_confidence ?? 0.5;
        // List all entities mode
        if (!params.entity) {
            const entities = store.getAllEntities();
            if (entities.length === 0) {
                return {
                    status: "ok",
                    summary: "No entities detected. Run build_or_update_graph with full_rebuild=true first.",
                    entities: [],
                };
            }
            const entitiesWithRoles = entities.map((e) => ({
                ...e,
                roles: store.getEntityRoleCounts(e.name),
            }));
            return {
                status: "ok",
                summary: `${entities.length} entities discovered`,
                entities: entitiesWithRoles,
            };
        }
        // Scope a specific entity
        const entityName = params.entity.toLowerCase().trim();
        const allEntities = store.getAllEntities();
        const entity = allEntities.find((e) => e.name === entityName);
        if (!entity) {
            // Try partial match
            const candidates = allEntities.filter((e) => e.name.includes(entityName));
            if (candidates.length > 0) {
                return {
                    status: "ambiguous",
                    summary: `Entity "${entityName}" not found. Did you mean one of these?`,
                    candidates: candidates.map((c) => c.name),
                };
            }
            return {
                status: "not_found",
                summary: `Entity "${entityName}" not found. Run entity_scope() with no arguments to list all entities.`,
            };
        }
        const members = store.getEntityMembers(entityName, minConfidence);
        const roles = store.getEntityRoleCounts(entityName);
        // Group members by role
        const membersByRole = {};
        for (const m of members) {
            if (!membersByRole[m.role])
                membersByRole[m.role] = [];
            membersByRole[m.role].push({
                ...nodeToDict(m.node),
                confidence: m.confidence,
            });
        }
        // Find shared entities (other entities that share members)
        const sharedWith = new Set();
        for (const m of members) {
            const otherEntities = store.getEntitiesForNode(m.node.qualified_name);
            for (const oe of otherEntities) {
                if (oe.entity_name !== entityName) {
                    sharedWith.add(oe.entity_name);
                }
            }
        }
        return {
            status: "ok",
            summary: `entity "${entityName}": ${members.length} members across ${Object.keys(roles).length} roles`,
            entity: entityName,
            display_name: entity.display_name,
            source: entity.source,
            roles,
            members_by_role: membersByRole,
            shared_with: [...sharedWith].sort(),
        };
    }
    finally {
        store.close();
    }
}
//# sourceMappingURL=entity-scope.js.map