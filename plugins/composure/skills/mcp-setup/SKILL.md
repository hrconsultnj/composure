---
name: mcp-setup
description: Discover and configure MCP servers for your project.
argument-hint: "[search-query] [--list] [--stack <override>]"
---

Discover and install MCP servers that enhance Claude Code for your project. Reads your detected stack to recommend relevant servers, then handles the full setup — package installation, config writing, env var prompts, and verification.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure mcp-setup {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-and-recommend.md` |
| 2 | `02-select-and-configure.md` |
| 3 | `03-install-and-verify.md` |

## Categories

This skill has category-specific content:

- `data/` — 0 files

Fetch category content: `"$HOME/.composure/bin/composure-fetch.mjs" skill composure mcp-setup {category}/{filename}`
