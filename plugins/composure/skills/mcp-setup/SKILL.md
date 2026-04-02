---
name: mcp-setup
description: Discover and configure existing MCP servers for your project. Stack-aware recommendations from a curated registry with full setup — install, configure, and verify.
argument-hint: "[search-query] [--list] [--stack <override>]"
---

# MCP Setup

Discover and install MCP servers that enhance Claude Code for your project. Reads your detected stack to recommend relevant servers, then handles the full setup — package installation, config writing, env var prompts, and verification.

**Not a builder** — this skill installs EXISTING MCP servers. To create a custom MCP server for your own service, use `/composure:mcp-builder`.

## When to Use

- "What MCP servers should I install for my K8s project?"
- "Set up the Context7 MCP server"
- "Show me available MCP servers"
- "Add database tools to Claude Code"
- Any time a user wants to discover or install MCP servers

## Arguments

- `[search-query]` — Filter servers by name, description, or tags (e.g., "database", "kubernetes")
- `--list` — Show all available servers without filtering
- `--stack <value>` — Override detected stack for recommendations (e.g., `--stack kubernetes`)

## Workflow

**Read each step file in order. Do NOT skip steps.**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-detect-and-recommend.md` | Read stack, load registry, present ranked recommendations |
| 2 | `steps/02-select-and-configure.md` | User selects servers, prompt for env vars, choose scope |
| 3 | `steps/03-install-and-verify.md` | Install packages, write config, verify servers start |

**Start by reading:** `steps/01-detect-and-recommend.md`

## Key Constraints

- **Curated registry only** — all servers are vetted. No arbitrary package execution.
- **Merge, never overwrite** — existing MCP config entries are always preserved
- **Ask before writing** — user confirms scope (project vs global) per server
- **Verify after install** — smoke-test each server to confirm it starts

## Registry

The curated registry lives at `data/mcp-registry.json`. Each entry includes:
- Package name and install command
- Required and optional env vars
- Compatible stacks (for recommendations)
- Category and tags (for search)

To add a server to the registry, edit `data/mcp-registry.json` directly.

## Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| `/composure:mcp-builder` | Complementary — builder creates NEW servers, setup installs EXISTING ones |
| `/composure:initialize` | Initialize detects stack → mcp-setup reads that stack for recommendations |
