# Step 2: Verify composure-graph MCP

The `composure-graph` MCP server is **bundled with the Composure plugin** — it auto-registers via `.mcp.json` and starts automatically at session startup. No manual registration needed.

The dist is self-contained (esbuild-bundled) — no `node_modules` required at runtime.

1. Check if it's available by calling `list_graph_stats`
2. **If available**: report "composure-graph MCP: ready" and move to the next step.
3. **If NOT available**, diagnose using the chain below. Do NOT stop and ask the user — diagnose it yourself:

   **Check A — Node version:**
   ```bash
   node --version
   ```
   If Node < 22.5.0: "composure-graph requires Node 22.5+ (for built-in SQLite). You have Node {version}. Update Node, then restart Claude Code." — **STOP.**

   **Check B — Server file exists:**
   ```bash
   ls "${CLAUDE_PLUGIN_ROOT}/graph/dist/server.js" 2>/dev/null
   ```
   If the file exists but MCP isn't connected: the MCP process failed to start or crashed mid-session. Tell user: "Restart Claude Code to reconnect the graph server." — **STOP.**

   If the file doesn't exist: "The graph server hasn't been built. Run:
   ```bash
   cd "${CLAUDE_PLUGIN_ROOT}/graph" && pnpm install && pnpm build
   ```
   Then restart Claude Code." — **STOP.**

   **Check C — Plugin not installed:**
   If `CLAUDE_PLUGIN_ROOT` is empty or the composure directory doesn't exist: "Composure plugin is not installed. Install it with: `claude plugin add composure from my-claude-plugins`" — **STOP.**

> **Note:** Do NOT run `claude mcp add` manually — the plugin's `.mcp.json` handles registration automatically. If the server disconnects mid-session, the only fix is restarting Claude Code (MCP processes don't survive reconnection attempts).

---

**Next:** Read `steps/03-companion-triage.md`
