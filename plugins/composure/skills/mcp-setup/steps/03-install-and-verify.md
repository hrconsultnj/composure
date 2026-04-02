# Step 3: Install and Verify

## 3a. Write Configuration

For each selected server, write the config entry to the chosen location.

### Project-level (`.mcp.json`)

Read existing `.mcp.json` at project root if it exists. If not, create it.

**Merge rules:**
- If `mcpServers` key exists: add new entries, preserve existing ones
- If a server with the same name already exists: warn and skip (do NOT overwrite)
- Write the file with proper JSON formatting (2-space indent)

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "CONTEXT7_API_KEY": "your-value-here"
      }
    }
  }
}
```

### Global (`~/.claude/settings.json`)

Read existing settings file. Add to the `mcpServers` key.

**Same merge rules**: add new entries, preserve existing, warn on conflicts.

## 3b. Verify Each Server

For each configured server, attempt a quick smoke test:

```bash
# Test that the server process starts and responds to MCP initialize
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | timeout 10 npx -y @package/name 2>/dev/null
```

**Interpret results:**
- **Got JSON response with `serverInfo`**: Server works. Mark as success.
- **Timeout (10s)**: Server may work but is slow to start. Mark as warning: "Server started but slow to initialize — may work fine in Claude Code."
- **Error exit**: Server failed. Mark as error with the error message.
- **Missing env var error**: Expected if user chose "set later". Mark as pending: "Will work once you set [VAR_NAME]."

**If verification fails and env vars are the likely cause**, don't mark as broken — the user said they'd set them later.

## 3c. Print Summary

```
MCP Setup Complete
═══════════════════

  ✓ context7         (project-level)   — Library documentation
  ✓ sequential-thinking (project-level) — Structured problem solving
  ⚠ kubernetes        (global)          — Pending: set KUBECONFIG
  ✗ postgres          (project-level)   — Error: connection refused

Config written to:
  - .mcp.json (2 servers)
  - ~/.claude/settings.json (1 server)

Next steps:
  1. Set any pending env vars (marked ⚠ above)
  2. Restart Claude Code to load the new MCP servers
  3. Try: "Use context7 to look up the Express.js docs"
```

## 3d. Offer Follow-Up

If any servers failed verification:

> "Some servers need attention. Want me to help troubleshoot, or will you handle it?"

Do NOT use AskUserQuestion — just offer. If the user asks for help, debug the specific failure (missing env var, wrong package version, network issue).

---

**Done.** The MCP servers are configured and verified. Next: `/composure:review` to review changes, then `/composure:commit` to commit.
