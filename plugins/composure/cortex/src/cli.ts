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
import type { StorageAdapter } from "./adapters/types.js";
import { SupabaseAdapter } from "./adapters/supabase.js";
import { SqliteAdapter } from "./adapters/sqlite.js";
import { syncUp, syncDown, syncStatus } from "./adapters/sync.js";

function createAdapter(): StorageAdapter {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
  }
  return new SqliteAdapter();
}

type CommandHandler = (adapter: StorageAdapter, args: Record<string, unknown>) => Promise<unknown>;

const commands: Record<string, CommandHandler> = {
  // Thinking
  sequential_think: (a, args) => thinking.addThought(a, args as any),
  get_thinking_session: (a, args) => thinking.resumeSession(a, args as any),
  list_thinking_sessions: (a, args) => thinking.listSessions(a, args as any),
  complete_thinking_session: (a, args) => thinking.completeSession(a, args as any),
  summarize_thinking_session: (a, args) => thinking.summarizeSession(a, args as any),
  list_thinking_templates: async () => ({ status: "ok", templates: thinking.listTemplates() }),

  // Memory
  create_memory_node: (a, args) => memory.createNode(a, args as any),
  get_memory_node: (a, args) => memory.getNode(a, args as any),
  update_memory_node: (a, args) => memory.updateNode(a, args as any),
  delete_memory_node: (a, args) => memory.deleteNode(a, args as any),
  create_memory_edge: (a, args) => memory.createEdge(a, args as any),
  get_edges_for_node: (a, args) => memory.getEdgesForNode(a, args as any),
  delete_memory_edge: (a, args) => memory.deleteEdge(a, args as any),
  search_memory: (a, args) => memory.searchMemory(a, args as any),
  search_memory_semantic: (a, args) => memory.searchSemantic(a, args as any),
  search_memory_text: (a, args) => memory.searchWithText(a, args as any),
  traverse_memory_graph: (a, args) => memory.traverseGraph(a, args as any),
  generate_memory_html: (a, args) => memory.generateMemoryHtml(a, args as any),

  // Sync
  sync_up: async (_a, args) => {
    const local = new SqliteAdapter();
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return { status: "error", error: "SUPABASE_URL and key required for sync" };
    const remote = new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
    const result = await syncUp(local, remote, args.agent_id as string);
    local.close();
    remote.close();
    return result;
  },
  sync_down: async (_a, args) => {
    const local = new SqliteAdapter();
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return { status: "error", error: "SUPABASE_URL and key required for sync" };
    const remote = new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
    const result = await syncDown(local, remote, args.agent_id as string);
    local.close();
    remote.close();
    return result;
  },
  sync_status: async (_a, args) => {
    const local = new SqliteAdapter();
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return { status: "error", error: "SUPABASE_URL and key required for sync" };
    const remote = new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
    const result = await syncStatus(local, remote, args.agent_id as string);
    local.close();
    remote.close();
    return result;
  },
};

async function main(): Promise<void> {
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

  let args: Record<string, unknown> = {};
  if (argsJson) {
    try {
      args = JSON.parse(argsJson);
    } catch {
      console.error(`Invalid JSON args: ${argsJson}`);
      process.exit(1);
    }
  }

  const adapter = createAdapter();
  try {
    const result = await handler(adapter, args);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  } finally {
    adapter.close();
  }
}

main();
