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

**Preferred (MCP tool):**

Invoke the `composure_fetch_skill` MCP tool with:
- `plugin`: `"composure"`
- `skill`: `"mcp-setup"`
- `step`: the step filename without the `.md` extension (category content uses `"{category}/{filename}"`)


**Fallback (Bash CLI — for sandbox environments where MCP servers are not available):**

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure mcp-setup {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use one of the methods above.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-and-recommend.md` |
| 2 | `02-select-and-configure.md` |
| 3 | `03-install-and-verify.md` |

## Categories

This skill has category-specific content:

- `data/` — 0 files

Fetch category content via the `composure_fetch_skill` MCP tool with `step="{category}/{filename}"`, or fall back to the Bash CLI: `<home>/.composure/bin/composure-fetch.mjs skill composure mcp-setup {category}/{filename}`
