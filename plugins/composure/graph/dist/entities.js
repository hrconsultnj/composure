/**
 * Entity detection and membership assignment.
 *
 * Discovers domain entities from migrations, routes, directories, hooks,
 * and type names. Runs as a post-processing pass after the normal parse
 * phase, reading from the nodes table (fast — no file I/O).
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";
// ── Name normalization ────────────────────────────────────────────
const STRIP_PREFIXES = new Set(["user_", "admin_", "public_", "auth_"]);
export function normalizeEntityName(raw) {
    let name = raw.toLowerCase().trim();
    // Strip common prefixes
    for (const prefix of STRIP_PREFIXES) {
        if (name.startsWith(prefix) && name.length > prefix.length + 2) {
            name = name.slice(prefix.length);
            break;
        }
    }
    // Singularize (simple heuristic — good enough for domain names)
    if (name.endsWith("ies") && name.length > 4) {
        name = name.slice(0, -3) + "y"; // categories → category
    }
    else if (name.endsWith("s") &&
        !name.endsWith("ss") &&
        !name.endsWith("us") &&
        !name.endsWith("is") &&
        name.length > 3) {
        name = name.slice(0, -1); // contacts → contact
    }
    return name;
}
function displayName(normalized) {
    // contact → Contacts (capitalize + pluralize for display)
    const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    if (capitalized.endsWith("y") && !capitalized.endsWith("ey")) {
        return capitalized.slice(0, -1) + "ies";
    }
    return capitalized + "s";
}
// Extract primary entity from compound table name: contact_notes → contact
function primaryEntity(tableName) {
    const normalized = normalizeEntityName(tableName);
    const parts = normalized.split("_");
    return parts[0]; // First segment is the primary entity
}
// ── Route path segments to skip ───────────────────────────────────
const SKIP_ROUTE_SEGMENTS = new Set([
    "app",
    "api",
    "src",
    "pages",
    "(admin)",
    "(auth)",
    "(protected)",
    "(public)",
    "(external)",
    "(internal)",
    "(marketing)",
    "[id]",
    "[slug]",
    "[id_prefix]",
    "layout",
    "loading",
    "error",
    "not-found",
]);
const SKIP_COMPONENT_PREFIXES = new Set([
    "admin",
    "shared",
    "ui",
    "layout",
    "common",
    "portal",
    "service",
    "diy",
]);
// ── Role detection from file path ─────────────────────────────────
function detectRole(filePath, node) {
    const rel = filePath.toLowerCase();
    // SQL-specific node kinds
    if (node.kind === "Table" || node.kind === "Column")
        return "table";
    if (node.kind === "RLSPolicy")
        return "policy";
    if (node.kind === "Index")
        return "index";
    if (node.kind === "DbFunction")
        return "db-function";
    if (node.kind === "Migration")
        return "migration";
    // Standard detection
    if (node.is_test || rel.includes("test") || rel.includes("spec"))
        return "test";
    if (rel.includes("/migrations/") || rel.endsWith(".sql"))
        return "migration";
    if (/\/app\/.*\/(page|layout)\.(tsx?|jsx?)$/.test(rel))
        return "page";
    if (rel.includes("/api/") || /\/route\.(ts|js)x?$/.test(rel))
        return "api";
    if (rel.includes("/hooks/") || /\/use[A-Z]/.test(filePath))
        return "hook";
    if (rel.includes("/components/"))
        return "component";
    if (rel.includes("/types/") || rel.endsWith(".types.ts") || rel.endsWith(".d.ts"))
        return "type";
    if (node.kind === "Type")
        return "type";
    return "lib";
}
export function detectAndStoreEntities(store, repoRoot) {
    // Clear existing entity data
    store.removeEntityData();
    const entities = new Map();
    const allFiles = store.getAllFiles();
    // ── Pass 1: Migrations (confidence 1.0) ─────────────────────
    for (const filePath of allFiles) {
        const rel = relative(repoRoot, filePath);
        if (!rel.includes("migration") && !filePath.endsWith(".sql"))
            continue;
        try {
            const content = readFileSync(filePath, "utf-8");
            // Match CREATE TABLE statements
            const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi);
            for (const match of tableMatches) {
                const tableName = match[1];
                const primary = primaryEntity(tableName);
                if (primary.length < 3)
                    continue; // Skip tiny names (id, etc.)
                if (!entities.has(primary)) {
                    entities.set(primary, {
                        name: primary,
                        display_name: displayName(primary),
                        source: "migration",
                        tables: [tableName],
                    });
                }
                else {
                    entities.get(primary).tables.push(tableName);
                }
            }
            // Prisma model detection
            const prismaMatches = content.matchAll(/model\s+(\w+)\s*\{/g);
            for (const match of prismaMatches) {
                const name = normalizeEntityName(match[1]);
                if (name.length < 3)
                    continue;
                if (!entities.has(name)) {
                    entities.set(name, {
                        name,
                        display_name: displayName(name),
                        source: "migration",
                        tables: [match[1]],
                    });
                }
            }
        }
        catch {
            // Skip unreadable files
        }
    }
    // ── Pass 2: Route directories (confidence 1.0) ──────────────
    for (const filePath of allFiles) {
        const rel = relative(repoRoot, filePath);
        if (!/\/(page|route)\.(tsx?|jsx?)$/.test(rel))
            continue;
        const segments = rel.split("/").filter((s) => !SKIP_ROUTE_SEGMENTS.has(s) && !s.startsWith("[") && !s.startsWith("("));
        // Take the last meaningful segment before the filename
        const routeSegment = segments[segments.length - 2];
        if (!routeSegment || routeSegment.length < 3)
            continue;
        const name = normalizeEntityName(routeSegment);
        if (!entities.has(name)) {
            entities.set(name, {
                name,
                display_name: displayName(name),
                source: "route",
                tables: [],
            });
        }
    }
    // ── Pass 3: Component directories (confidence 0.9) ──────────
    for (const filePath of allFiles) {
        const rel = relative(repoRoot, filePath);
        if (!rel.includes("/components/"))
            continue;
        const afterComponents = rel.split("/components/")[1];
        if (!afterComponents)
            continue;
        const parts = afterComponents.split("/");
        // Skip known layout prefixes
        let dirName = parts[0];
        if (SKIP_COMPONENT_PREFIXES.has(dirName.toLowerCase()) && parts.length > 1) {
            dirName = parts[1];
        }
        if (!dirName || dirName.includes(".") || dirName.length < 3)
            continue;
        const name = normalizeEntityName(dirName);
        if (!entities.has(name)) {
            entities.set(name, {
                name,
                display_name: displayName(name),
                source: "directory",
                tables: [],
            });
        }
    }
    // ── Pass 4: Hook files/directories (confidence 0.9) ─────────
    for (const filePath of allFiles) {
        const rel = relative(repoRoot, filePath);
        if (!rel.includes("/hooks/"))
            continue;
        const afterHooks = rel.split("/hooks/")[1];
        if (!afterHooks)
            continue;
        const parts = afterHooks.split("/");
        // Hook directory: hooks/query/contacts/ → entity "contact"
        if (parts.length > 1) {
            // Skip "query", "mutation" intermediate dirs
            const skipDirs = new Set(["query", "mutation", "mutations", "queries"]);
            for (const p of parts) {
                if (!skipDirs.has(p) && !p.includes(".") && p.length >= 3) {
                    const name = normalizeEntityName(p);
                    if (!entities.has(name)) {
                        entities.set(name, {
                            name,
                            display_name: displayName(name),
                            source: "hook",
                            tables: [],
                        });
                    }
                    break;
                }
            }
        }
    }
    // Now store all discovered entities
    for (const entity of entities.values()) {
        store.upsertEntity(entity.name, entity.display_name, entity.source);
    }
    // ── Membership assignment ───────────────────────────────────
    const entityNames = [...entities.keys()];
    let memberCount = 0;
    for (const filePath of allFiles) {
        const rel = relative(repoRoot, filePath).toLowerCase();
        const nodes = store.getNodesByFile(filePath);
        for (const node of nodes) {
            const role = detectRole(filePath, node);
            for (const entityName of entityNames) {
                const entity = entities.get(entityName);
                let confidence = 0;
                // Check file path contains entity name or a table name
                if (rel.includes(`/${entityName}/`) || rel.includes(`/${entityName}s/`)) {
                    confidence = Math.max(confidence, entity.source === "migration" || entity.source === "route" ? 1.0 : 0.9);
                }
                // Check compound table names in path
                for (const table of entity.tables) {
                    const normalizedTable = table.toLowerCase();
                    if (rel.includes(normalizedTable) || rel.includes(normalizedTable.replace(/_/g, "-"))) {
                        confidence = Math.max(confidence, 0.9);
                    }
                }
                // Check node name contains entity name (for types, hooks)
                if (node.kind !== "File") {
                    const nodeName = node.name.toLowerCase();
                    if (nodeName.includes(entityName) || nodeName.includes(entityName + "s")) {
                        confidence = Math.max(confidence, 0.8);
                    }
                }
                // Hook name matching: useContacts → contact
                if (node.name.startsWith("use")) {
                    const hookTarget = normalizeEntityName(node.name.slice(3));
                    if (hookTarget === entityName) {
                        confidence = Math.max(confidence, 0.9);
                    }
                }
                // Query key factory matching: contactKeys → contact
                if (node.name.endsWith("Keys") || node.name.endsWith("keys")) {
                    const keyTarget = normalizeEntityName(node.name.replace(/[Kk]eys$/, ""));
                    if (keyTarget === entityName) {
                        confidence = Math.max(confidence, 0.9);
                    }
                }
                if (confidence >= 0.5) {
                    store.upsertEntityMember(entityName, node.qualified_name, role, confidence);
                    memberCount++;
                }
            }
        }
    }
    return { entityCount: entities.size, memberCount };
}
//# sourceMappingURL=entities.js.map