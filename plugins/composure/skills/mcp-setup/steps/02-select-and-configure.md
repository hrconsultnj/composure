# Step 2: Select and Configure

## 2a. Process Selected Servers

For each server the user selected in Step 1:

1. Look up the full entry in the registry
2. Collect configuration requirements:
   - Required env vars (must be set for the server to work)
   - Optional env vars (enhance functionality but not required)
   - Install command (npx vs npm install -g vs other)

## 2b. Prompt for Environment Variables

For each selected server that has `requiredEnvVars`:

Use **AskUserQuestion** for each server:

> "**[Server Name]** requires the following credentials:"
>
> `API_KEY` — [description from registry]
>
> 1. **Enter now** — I'll include it in the config
> 2. **Set later** — I'll add a placeholder, you fill it in after
> 3. **Use .env** — I already have it in my environment

**BLOCKING** — wait for response.

If user chooses "Enter now": ask for the value (they'll type it).
If user chooses "Set later": use placeholder `"your-value-here"` in config.
If user chooses "Use .env": omit from config `env` block (the server reads from process environment).

**Security note**: If the user pastes a key, do NOT echo it back or log it. Just confirm: "Key received, will be added to config."

For `optionalEnvVars`: mention they exist but don't prompt unless the user asks.

## 2c. Choose Config Scope

Use **AskUserQuestion**:

> "Where should the MCP server(s) be configured?"
>
> 1. **Project-level** (`.mcp.json`) — Only available in this project (Recommended)
> 2. **Global** (`~/.claude/settings.json`) — Available in all projects
> 3. **Per-server** — Let me choose for each one individually

**BLOCKING** — wait for response.

If "Per-server": for each selected server, ask project vs global individually.

## 2d. Summarize Configuration Plan

Before writing anything, present a summary:

```
Configuration plan:

  1. context7
     Package: @upstash/context7-mcp (via npx)
     Env vars: CONTEXT7_API_KEY (set later)
     Scope: project-level (.mcp.json)

  2. kubernetes
     Package: @kubemcp/server (via npx)
     Env vars: KUBECONFIG (use .env)
     Scope: global (~/.claude/settings.json)

Proceed with installation?
```

Do NOT use AskUserQuestion here — just proceed. The user already made all decisions. If they want to change something, they'll say so.

---

**Next:** Read `steps/03-install-and-verify.md`
