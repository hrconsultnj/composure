---
name: mcp-builder
description: Build custom MCP servers to connect any service to Claude Code. Discovers the target API, designs tool definitions, and scaffolds a complete TypeScript MCP server project.
argument-hint: "[service-name] [--skip-docs] [--quick]"
---

Guided workflow for building custom MCP servers that connect external services to Claude Code. Discovers the target service's API, designs tool definitions, and scaffolds a complete TypeScript project with auth, error handling, and Claude Code configuration.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure mcp-builder {step-filename}
```

**Read from `~/.composure/cache/composure/skills/mcp-builder/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-identify-service.md` |
| 2 | `02-discover-api.md` |
| 3 | `03-design-tools.md` |
| 4 | `04-scaffold.md` |
| 5 | `05-implement.md` |
| 6 | `06-test-and-register.md` |

## Templates

- `server-template.ts`
- `tool-template.ts`
