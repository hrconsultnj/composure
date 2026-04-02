---
name: mcp-builder
description: Build custom MCP servers to connect any service to Claude Code. Discovers the target API, designs tool definitions, and scaffolds a complete TypeScript MCP server project.
argument-hint: "[service-name] [--skip-docs] [--quick]"
---

# MCP Builder

Guided workflow for building custom MCP servers that connect external services to Claude Code. Discovers the target service's API, designs tool definitions, and scaffolds a complete TypeScript project with auth, error handling, and Claude Code configuration.

**Not a config tool** — this skill creates NEW MCP server projects. To discover and install existing MCP servers, use `/composure:mcp-setup`.

## When to Use

- "Build an MCP server for Airtable"
- "I want Claude Code to read/write my Notion databases"
- "Create an MCP server that connects to our internal API"
- "Build an MCP tool for Jira ticket management"
- Any scenario where a user wants Claude Code to interact with an external service via MCP

## Arguments

- `[service-name]` — Target service (e.g., "airtable", "notion", "my-api"). If omitted, the skill asks.
- `--skip-docs` — Skip Context7 documentation pull (use when offline or Context7 unavailable)
- `--quick` — Abbreviated mode: identify + design tools + scaffold only (skip detailed implementation guidance)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-identify-service.md` | Identify target service, check for existing MCP server, confirm direction |
| 2 | `steps/02-discover-api.md` | Pull Context7 docs, analyze API surface, extract auth/endpoints/models |
| 3 | `steps/03-design-tools.md` | Design MCP tool definitions from API surface, confirm with user |
| 4 | `steps/04-scaffold.md` | Create project structure, install MCP SDK + target SDK |
| 5 | `steps/05-implement.md` | Generate server code, tool handlers, API client, auth |
| 6 | `steps/06-test-and-register.md` | Build, test, generate Claude Code config, register |

**Start by reading:** `steps/01-identify-service.md`

## Key Constraints

- **Always pull latest MCP SDK docs** — Context7 for `@modelcontextprotocol/server` current API (v2 uses `registerTool`, not `tool`)
- **Scaffold from packages** — `npm init -y` + `npm install`, never write package.json from scratch
- **TypeScript only** (v1) — MCP SDK is TypeScript-native
- **Reuse integration-builder references** — auth patterns, error handling, webhook patterns are directly applicable
- **One tool per file** — keeps handlers focused and testable

## Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| `/composure:mcp-setup` | Complementary — setup installs EXISTING servers, builder creates NEW ones |
| `/composure:integration-builder` | Shares reference docs (auth, error handling). Builder is MCP-specific. |
| `/composure:blueprint` | If classified as `integration`, blueprint loads integration-builder references which are also used here |

## Reference Docs (loaded on demand by steps)

| Reference | Used by step | Contents |
|-----------|-------------|----------|
| `templates/server-template.ts` | Step 5 | MCP server v2 setup pattern (registerTool, StdioServerTransport) |
| `templates/tool-template.ts` | Step 5 | Per-tool handler pattern (Zod input schema, error handling) |
| `../integration-builder/references/auth-patterns.md` | Step 5 | OAuth 2.0, API key, Bearer token flows |
| `../integration-builder/references/error-handling.md` | Step 5 | Retry with backoff, circuit breaker |
