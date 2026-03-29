# Step 0a: Ensure composure-graph MCP

The `composure-graph` MCP server is **bundled with the Composure plugin** — it is NOT an npm package. Do NOT try to install it via npm/pip/cargo. It is declared in the plugin's `plugin.json` and auto-registered when the plugin is installed.

1. Check if it's available by calling `list_graph_stats`
2. **If available**: report "composure-graph MCP: ready"
3. **If NOT available**, run the auto-fix chain below. Do NOT stop and ask the user — fix it yourself:

   **Step A — Check Node version:**
   ```bash
   node --version
   ```
   If Node < 22.5.0: "composure-graph requires Node 22.5+ (for built-in SQLite). You have Node {version}. Update Node, then exit Claude Code (Ctrl+C) and reopen it with `claude`." — **STOP** (can't auto-fix this).

   **Step B — Find the plugin install path and register the MCP server:**

   The plugin system caches composure under `~/.claude/plugins/cache/` but does NOT always auto-register the bundled MCP server. Fix this by registering a **launcher script** that dynamically resolves the latest cached version at startup — so it survives plugin updates without re-registration.

   ```bash
   # Find the composure plugin install path
   COMPOSURE_PATH=$(claude plugin list --json 2>/dev/null | node -e "
     const plugins = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
     const c = plugins.find(p => p.id.startsWith('composure') && p.enabled);
     if (c) console.log(c.installPath);
   ")

   # Copy the launcher to a stable location (outside versioned cache)
   LAUNCHER_DIR="${HOME}/.claude/plugins"
   mkdir -p "$LAUNCHER_DIR"
   cp "$COMPOSURE_PATH/scripts/launch-graph-server.sh" "$LAUNCHER_DIR/composure-graph-launcher.sh"
   chmod +x "$LAUNCHER_DIR/composure-graph-launcher.sh"
   ```

   Then register the MCP server using the stable launcher path:
   ```bash
   claude mcp add composure-graph -- bash "${HOME}/.claude/plugins/composure-graph-launcher.sh"
   ```

   **Why a launcher?** Registering `claude mcp add` with a versioned path like `composure/1.2.38/graph/dist/server.js` breaks on plugin update (the old version directory is replaced). The launcher resolves the latest version at startup, so `claude plugin update composure` + restart just works — no re-registration needed.

   Report: "Registered composure-graph MCP server (launcher at ~/.claude/plugins/composure-graph-launcher.sh)."

   **Then tell the user**: "The composure-graph MCP server has been registered. Exit Claude Code (Ctrl+C) and reopen it with `claude` for it to start."
   — **STOP** (restart needed for MCP to connect).

   **Step C — Plugin not installed at all:**
   If `claude plugin list --json` has no composure entry: "Composure plugin is not installed. Install it with: `claude plugin install composure@my-claude-plugins`" — **STOP.**

   **After restart**, the MCP server will be available. This registration only needs to happen once — subsequent sessions will find it via `claude mcp list`.

---

**Next:** Read `steps/00b-context7-setup.md`
