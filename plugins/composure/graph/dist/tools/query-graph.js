import { GraphStore, edgeToDict, nodeToDict } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
import { searchReferences } from "./search-references.js";
import { getDependencyChain } from "./get-dependency-chain.js";
import { resolve } from "node:path";
// Common builtins that produce noise for callers_of queries
const BUILTIN_NAMES = new Set([
    "map", "filter", "reduce", "forEach", "find", "some", "every",
    "includes", "push", "pop", "shift", "splice", "slice", "concat",
    "join", "sort", "reverse", "keys", "values", "entries",
    "toString", "valueOf", "hasOwnProperty",
    "console", "log", "warn", "error",
    "JSON", "parse", "stringify", "parseInt", "parseFloat",
    "setTimeout", "setInterval", "clearTimeout", "clearInterval",
    "Promise", "then", "catch", "finally", "require",
]);
const QUERY_DESCRIPTIONS = {
    callers_of: "Find all functions that call a given function",
    callees_of: "Find all functions called by a given function",
    imports_of: "Find all imports of a given file or module",
    importers_of: "Find all files that import a given file or module",
    children_of: "Find all nodes contained in a file or class",
    tests_for: "Find all tests for a given function or class",
    inheritors_of: "Find classes that inherit from a given class",
    file_summary: "Get a summary of all nodes in a file",
    references_of: "Grep for a string pattern with graph context enrichment",
    dependency_chain: "Shortest path between two nodes in the graph",
};
function edgesByTarget(store, qn, edgeKind) {
    const results = [];
    const edges = [];
    for (const e of store.getEdgesByTarget(qn)) {
        if (e.kind === edgeKind) {
            edges.push(edgeToDict(e));
            const node = store.getNode(e.source_qualified);
            if (node)
                results.push(nodeToDict(node));
        }
    }
    return { results, edges };
}
function edgesBySource(store, qn, edgeKind) {
    const results = [];
    const edges = [];
    for (const e of store.getEdgesBySource(qn)) {
        if (e.kind === edgeKind) {
            edges.push(edgeToDict(e));
            const node = store.getNode(e.target_qualified);
            if (node)
                results.push(nodeToDict(node));
        }
    }
    return { results, edges };
}
function callersOf(store, qn, nodeName) {
    const { results, edges } = edgesByTarget(store, qn, "CALLS");
    // Also check by bare name for unresolved edges
    if (nodeName) {
        for (const e of store.searchEdgesByTargetName(nodeName, "CALLS")) {
            if (e.target_qualified !== qn) {
                edges.push(edgeToDict(e));
                const caller = store.getNode(e.source_qualified);
                if (caller)
                    results.push(nodeToDict(caller));
            }
        }
    }
    return { results, edges };
}
function fileSummary(store, filePath) {
    const results = store.getNodesByFile(filePath).map(nodeToDict);
    return { results, edges: [] };
}
function inheritorsOf(store, qn) {
    const results = [];
    const edges = [];
    for (const e of store.getEdgesByTarget(qn)) {
        if (e.kind === "INHERITS" || e.kind === "IMPLEMENTS") {
            edges.push(edgeToDict(e));
            const node = store.getNode(e.source_qualified);
            if (node)
                results.push(nodeToDict(node));
        }
    }
    return { results, edges };
}
// ── Main query function ────────────────────────────────────────────
export function queryGraph(params) {
    const { pattern, target } = params;
    const root = findProjectRoot(params.repo_root);
    const dbPath = getDbPath(root);
    if (!(pattern in QUERY_DESCRIPTIONS)) {
        return {
            status: "error",
            error: `Unknown pattern '${pattern}'. Available: ${Object.keys(QUERY_DESCRIPTIONS).join(", ")}`,
        };
    }
    // ── Delegated patterns (use their own DB connections) ──────────
    if (pattern === "references_of") {
        return searchReferences({
            pattern: target,
            scope: params.scope,
            context_lines: params.context_lines,
            max_results: params.max_results,
            repo_root: params.repo_root,
        });
    }
    if (pattern === "dependency_chain") {
        if (!params.target_to) {
            return {
                status: "error",
                error: "dependency_chain requires target_to (destination node).",
            };
        }
        return getDependencyChain({
            from: target,
            to: params.target_to,
            max_depth: 10,
            repo_root: params.repo_root,
        });
    }
    if (pattern === "callers_of" && BUILTIN_NAMES.has(target) && !target.includes("::")) {
        return {
            status: "ok", pattern, target,
            description: QUERY_DESCRIPTIONS[pattern],
            summary: `'${target}' is a common builtin — callers_of skipped to avoid noise.`,
            results: [], edges: [],
        };
    }
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
        // Resolve target: as-is → absolute path → search
        let node = store.getNode(target);
        let resolvedTarget = target;
        if (!node) {
            const absTarget = resolve(root, target);
            node = store.getNode(absTarget);
            if (node)
                resolvedTarget = absTarget;
        }
        if (!node) {
            const candidates = store.searchNodes(target, 5);
            if (candidates.length === 1) {
                node = candidates[0];
                resolvedTarget = node.qualified_name;
            }
            else if (candidates.length > 1) {
                return {
                    status: "ambiguous",
                    summary: `Multiple matches for '${target}'. Please use a qualified name.`,
                    candidates: candidates.map(nodeToDict),
                };
            }
        }
        if (!node && pattern !== "file_summary") {
            return { status: "not_found", summary: `No node found matching '${target}'.` };
        }
        const qn = node?.qualified_name ?? resolvedTarget;
        // Dispatch to pattern handler
        let result;
        switch (pattern) {
            case "callers_of":
                result = callersOf(store, qn, node?.name ?? null);
                break;
            case "callees_of":
                result = edgesBySource(store, qn, "CALLS");
                break;
            case "imports_of":
                result = edgesBySource(store, qn, "IMPORTS_FROM");
                break;
            case "importers_of":
                result = edgesByTarget(store, qn, "IMPORTS_FROM");
                break;
            case "children_of":
                result = edgesBySource(store, qn, "CONTAINS");
                break;
            case "tests_for":
                result = edgesBySource(store, qn, "TESTED_BY");
                break;
            case "inheritors_of":
                result = inheritorsOf(store, qn);
                break;
            case "file_summary":
                result = fileSummary(store, node?.file_path ?? resolvedTarget);
                break;
            default: result = { results: [], edges: [] };
        }
        return {
            status: "ok", pattern, target,
            description: QUERY_DESCRIPTIONS[pattern],
            summary: `${pattern}(${target}): ${result.results.length} results, ${result.edges.length} edges`,
            results: result.results,
            edges: result.edges,
        };
    }
    finally {
        store.close();
    }
}
//# sourceMappingURL=query-graph.js.map