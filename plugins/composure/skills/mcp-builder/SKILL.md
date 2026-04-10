---
name: mcp-builder
description: Build custom MCP servers from API discovery to scaffold.
argument-hint: "[service-name] [--skip-docs] [--quick]"
---

Guided workflow for building custom MCP servers that connect external services to Claude Code. Discovers the target service's API, designs tool definitions, and scaffolds a complete TypeScript project with auth, error handling, and Claude Code configuration.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure mcp-builder {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

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
