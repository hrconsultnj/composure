# Step 6: Test and Register

## 6a. Build the Project

```bash
cd {project-path}
npm run build
```

**If build fails:**
- Read the TypeScript errors
- Fix type issues in the generated code
- Common issues: missing type imports, Zod schema mismatches, import path extensions
- Rebuild until clean

## 6b. Test the Server

### Quick smoke test

Start the server and verify it responds to MCP initialization:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js
```

**Expected**: JSON response with server info and capabilities. If it hangs or errors, debug:
- Missing env vars → check `.env` is loaded or vars are exported
- Import errors → check `.js` extensions in import paths
- SDK errors → verify `@modelcontextprotocol/sdk` version

### Tool listing test

```bash
# After initialize, send tools/list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node dist/index.js
```

**Expected**: JSON with the list of registered tools matching Step 3 design.

### Live API test (optional)

If the user has provided API credentials:

> "Want to test a tool with a live API call? This will make a real request to [service]."
>
> 1. **Yes** — Test `list_[resources]` with real credentials
> 2. **Skip** — I'll test manually later

If yes, test the simplest read operation (list/get) to verify auth and data flow work end-to-end.

## 6c. Generate Claude Code Config

Generate the MCP server configuration entry:

```json
{
  "mcp-[service]": {
    "command": "node",
    "args": ["{absolute-path}/dist/index.js"],
    "env": {
      "[SERVICE]_API_KEY": "your-api-key"
    }
  }
}
```

Use **AskUserQuestion**:

> "Where should this MCP server be registered?"
>
> 1. **Project-level** (`.mcp.json`) — Only available in this project (Recommended)
> 2. **Global** (`~/.claude/settings.json`) — Available in all projects

**BLOCKING** — wait for response.

## 6d. Write Config

### Project-level (`.mcp.json`)

Read existing `.mcp.json` if it exists. Merge the new server entry — never overwrite existing servers.

```json
{
  "mcpServers": {
    // ... existing servers preserved ...
    "mcp-[service]": {
      "command": "node",
      "args": ["{absolute-path}/dist/index.js"],
      "env": {
        "[SERVICE]_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Global (`~/.claude/settings.json`)

Read existing settings. Add to the `mcpServers` key — merge, never overwrite.

## 6e. Summary

Print the final summary:

```
MCP Server: [Service Name]
  Location: {project-path}
  Tools: N registered
  Config: [project-level / global]

Build:   npm run build
Start:   npm run start
Dev:     npm run dev (watch mode)

Tools available:
  - list_records — List records from a table
  - get_record — Get a single record by ID
  - create_record — Create a new record
  ...

Next steps:
  1. Fill in your API key in .env (or the config env block)
  2. Restart Claude Code to load the new MCP server
  3. Try: "Use the [service] MCP to list my records"

To publish to npm (optional):
  npm publish
```

---

**Done.** The MCP server is built, tested, and registered.
