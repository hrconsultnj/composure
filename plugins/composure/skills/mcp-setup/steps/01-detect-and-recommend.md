# Step 1: Detect Stack and Recommend Servers

## 1a. Read Detected Stack

Read `.claude/no-bandaids.json` from the project root. Extract:
- `frameworks.*.frontend` — frontend framework value (vite, nextjs, expo, angular, null)
- `frameworks.*.backend` — backend framework value (supabase, express, fastapi, null)
- `frameworks.*.infra` — infra tool value (kubernetes, terraform, docker, null)

If `.claude/no-bandaids.json` doesn't exist:
- Warn: "No stack detected. Run `/composure:initialize` for stack-aware recommendations."
- Proceed without filtering — show all servers.

If `--stack` argument provided, use that instead of detected values.

## 1b. Load Registry

Read `data/mcp-registry.json` from this skill's directory.

Parse the `servers` array. Each entry has:
```json
{
  "name": "server-name",
  "displayName": "Human-Readable Name",
  "description": "What this server does",
  "package": "@scope/package-name",
  "command": "npx",
  "args": ["-y", "@scope/package-name"],
  "requiredEnvVars": [
    { "name": "API_KEY", "description": "Your API key from..." }
  ],
  "optionalEnvVars": [],
  "compatibleStacks": ["*"] | ["nextjs", "vite", "kubernetes"],
  "tags": ["docs", "reference"],
  "category": "development"
}
```

## 1c. Filter and Rank

Apply filters in order:

1. **Search query** (if provided as argument):
   - Match against `name`, `displayName`, `description`, `tags`
   - Case-insensitive partial match

2. **Stack compatibility** (if stack detected):
   - Servers with `"*"` in `compatibleStacks` → compatible with all stacks
   - Servers whose `compatibleStacks` includes a detected value → stack match
   - Servers with no match → still shown, just ranked lower

3. **Rank results**:
   - **Tier 1**: Stack-matched servers (compatibleStacks includes detected frontend/backend/infra)
   - **Tier 2**: Universal servers (compatibleStacks: ["*"])
   - **Tier 3**: All other servers (available but not specifically recommended)

If `--list` flag: skip filtering, show all servers grouped by category.

## 1d. Present Recommendations

Use **AskUserQuestion** with `multiSelect: true`:

Group by tier for clarity:

> "Based on your stack ([detected values]), here are recommended MCP servers:"
>
> **Recommended for your stack:**
> 1. **kubernetes** — Kubectl operations, pod management, log reading
> 2. **docker** — Container management, image operations
>
> **General purpose (useful for any project):**
> 3. **context7** — Library documentation lookup
> 4. **sequential-thinking** — Structured problem solving
> 5. **memory** — Persistent knowledge graph
>
> **Also available:**
> 6. **postgres** — PostgreSQL database operations
> 7. **shadcn** — UI component library browsing
>
> Select the servers you want to install (multiple allowed):

If no servers match the search query, report: "No servers found matching '[query]'. Use `--list` to see all available servers."

**BLOCKING** — wait for user selection.

---

**Next:** Read `steps/02-select-and-configure.md`
