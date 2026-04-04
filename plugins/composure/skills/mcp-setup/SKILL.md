---
name: mcp-setup
description: Discover and configure existing MCP servers for your project. Stack-aware recommendations from a curated registry with full setup — install, configure, and verify.
argument-hint: "[search-query] [--list] [--stack <override>]"
---

Discover and install MCP servers that enhance Claude Code for your project. Reads your detected stack to recommend relevant servers, then handles the full setup — package installation, config writing, env var prompts, and verification.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure mcp-setup {step-filename}
```

**Read from `~/.composure/cache/composure/skills/mcp-setup/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-and-recommend.md` |
| 2 | `02-select-and-configure.md` |
| 3 | `03-install-and-verify.md` |

## Categories

This skill has category-specific content:

- `data/` — 0 files

Fetch category content: `"~/.composure/bin/composure-fetch.mjs" skill composure mcp-setup {category}/{filename}`
