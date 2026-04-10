#!/usr/bin/env node
/**
 * CLI transport for Composure Cortex — Door 4.
 *
 * Usage: node cli.js <command> [json-args]
 *
 * Examples:
 *   node cli.js sequential_think '{"thought":"Step 1","agent_id":"..."}'
 *   node cli.js get_thinking_session '{"session_id":"..."}'
 *   node cli.js search_memory '{"agent_id":"...","query":"auth"}'
 *   node cli.js create_memory_node '{"agent_id":"...","content":"..."}'
 *
 * Output: JSON to stdout. Errors to stderr. Exit 0 = ok, 1 = error.
 */
import { thinking, memory } from "./index.js";
import { SupabaseAdapter } from "./adapters/supabase.js";
import { SqliteAdapter } from "./adapters/sqlite.js";
import { syncUp, syncDown, syncStatus } from "./adapters/sync.js";
/**
 * Routes writes/reads to the global DB when the agent_id is a system or
 * cross-project namespace. Prevents cross-session traffic from getting
 * trapped in a project-local cortex.db.
 *
 * Rules:
 *   - agent_id === "global" → global DB
 *   - agent_id starts with "__" (e.g. "__system__") → global DB
 *   - Otherwise → local-preferred (existing behavior)
 */
function isGlobalAgent(agentId) {
    if (typeof agentId !== "string")
        return false;
    return agentId === "global" || agentId.startsWith("__");
}
function createAdapter(opts) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
        return new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
    }
    // Env override for manual global routing (e.g. cleanup scripts)
    const envForceGlobal = process.env.COMPOSURE_CORTEX_DB_MODE === "global";
    const forceGlobal = opts?.forceGlobal || envForceGlobal;
    const dbPath = forceGlobal ? SqliteAdapter.globalDbPath() : undefined;
    return new SqliteAdapter(dbPath);
}
const commands = {
    // Thinking
    sequential_think: (a, args) => thinking.addThought(a, args),
    get_thinking_session: (a, args) => thinking.resumeSession(a, args),
    list_thinking_sessions: (a, args) => thinking.listSessions(a, args),
    complete_thinking_session: (a, args) => thinking.completeSession(a, args),
    summarize_thinking_session: (a, args) => thinking.summarizeSession(a, args),
    list_thinking_templates: async () => ({ status: "ok", templates: thinking.listTemplates() }),
    capture_thought: (a, args) => thinking.captureExternalThought(a, args),
    // Memory
    create_memory_node: (a, args) => memory.createNode(a, args),
    get_memory_node: (a, args) => memory.getNode(a, args),
    update_memory_node: (a, args) => memory.updateNode(a, args),
    delete_memory_node: (a, args) => memory.deleteNode(a, args),
    create_memory_edge: (a, args) => memory.createEdge(a, args),
    get_edges_for_node: (a, args) => memory.getEdgesForNode(a, args),
    delete_memory_edge: (a, args) => memory.deleteEdge(a, args),
    search_memory: (a, args) => memory.searchMemory(a, args),
    search_memory_semantic: (a, args) => memory.searchSemantic(a, args),
    search_memory_text: (a, args) => memory.searchWithText(a, args),
    traverse_memory_graph: (a, args) => memory.traverseGraph(a, args),
    generate_memory_html: (a, args) => memory.generateMemoryHtml(a, args),
    // Graph ↔ Memory Links
    create_graph_link: (a, args) => memory.createGraphLink(a, args),
    search_by_graph_entity: (a, args) => memory.searchByGraphEntity(a, args),
    delete_graph_links_for_node: (a, args) => memory.deleteGraphLinksForNode(a, args),
    // Sync
    sync_up: async (_a, args) => {
        const local = new SqliteAdapter();
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey)
            return { status: "error", error: "SUPABASE_URL and key required for sync" };
        const remote = new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
        const result = await syncUp(local, remote, args.agent_id);
        local.close();
        remote.close();
        return result;
    },
    sync_down: async (_a, args) => {
        const local = new SqliteAdapter();
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey)
            return { status: "error", error: "SUPABASE_URL and key required for sync" };
        const remote = new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
        const result = await syncDown(local, remote, args.agent_id);
        local.close();
        remote.close();
        return result;
    },
    sync_status: async (_a, args) => {
        const local = new SqliteAdapter();
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey)
            return { status: "error", error: "SUPABASE_URL and key required for sync" };
        const remote = new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
        const result = await syncStatus(local, remote, args.agent_id);
        local.close();
        remote.close();
        return result;
    },
};
async function main() {
    const command = process.argv[2];
    const argsJson = process.argv[3];
    if (!command || command === "--help" || command === "-h") {
        console.error("Usage: cortex-cli <command> [json-args]");
        console.error("\nCommands:");
        for (const cmd of Object.keys(commands)) {
            console.error(`  ${cmd}`);
        }
        process.exit(command ? 0 : 1);
    }
    const handler = commands[command];
    if (!handler) {
        console.error(`Unknown command: ${command}`);
        console.error(`Available: ${Object.keys(commands).join(", ")}`);
        process.exit(1);
    }
    let args = {};
    if (argsJson) {
        try {
            args = JSON.parse(argsJson);
        }
        catch {
            console.error(`Invalid JSON args: ${argsJson}`);
            process.exit(1);
        }
    }
    // Route to global DB when agent_id is a system/cross-project namespace.
    // This fixes the bug where __system__ writes from a project session were
    // trapped in the project-local cortex.db instead of the global one.
    const forceGlobal = isGlobalAgent(args.agent_id);
    const adapter = createAdapter({ forceGlobal });
    try {
        const result = await handler(adapter, args);
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
    catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
    finally {
        adapter.close();
    }
}
main();
//# sourceMappingURL=cli.js.map