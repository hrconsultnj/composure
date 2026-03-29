---
name: initialize
description: Detect project stack and generate Composure config (.claude/no-bandaids.json, task queue, framework reference docs). Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

# Composure Initialize

Bootstrap Composure project-level configuration by detecting the tech stack, querying up-to-date framework patterns, and generating appropriate configs.

## Arguments

- `--force` — Overwrite existing `.claude/no-bandaids.json`, force full graph rebuild, and regenerate framework docs older than 7 days
- `--dry-run` — Show what would be generated without writing files
- `--skip-context7` — Skip Context7 queries (for offline/CI use)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 0a | `steps/00a-mcp-setup.md` | Verify composure-graph MCP + auto-fix chain |
| 0b | `steps/00b-context7-setup.md` | Check/install Context7 MCP |
| 1 | `steps/01-detect-stack.md` | Read project files, build framework profile |
| 2 | `steps/02-extensions-skip-patterns.md` | Resolve extensions and skip patterns by framework |
| 3a | `steps/03a-context7-folders.md` | Freshness check, folder structure, library mapping |
| 3b | `steps/03b-context7-query-loop.md` | Query Context7 and write docs (one at a time) |
| 4 | `steps/04-generate-config.md` | Write `.claude/no-bandaids.json` with detected data |
| 5 | `steps/05-build-graph.md` | Build or update code review graph |
| 6 | `steps/06-task-queue.md` | Create tasks-plans/ directory and tasks.md |
| 7 | `steps/07-report.md` | Print initialization summary |
| 8 | `steps/08-companion-plugins.md` | Install + initialize sentinel, testbench, shipyard |
| 9 | `steps/09-context-health.md` | Plugin/MCP count, threshold advisory |
| 10 | `steps/10-claude-md-offer.md` | Offer self-monitoring lines for global CLAUDE.md |

**Start by reading:** `steps/00a-mcp-setup.md`

## Key Constraints

- This skill is idempotent — running it again updates the config based on current stack
- With `--force`, it overwrites config, force-rebuilds the graph, and regenerates framework docs older than 7 days (fresh docs are still skipped)
- With `--dry-run`, it prints what would be generated without writing files
- The skill does NOT modify CLAUDE.md — that's the project's responsibility
- If the project already has a `.claude/no-bandaids.json`, skip generation unless `--force`

## Notes

- Generated framework docs are `.gitignored` by default — users can `git add -f` to commit them
- Project-level generated docs go to `.claude/frameworks/{category}/{framework}/generated/`
- Users can also add hand-written project-specific patterns at `.claude/frameworks/{category}/*.md` which layer on top of plugin refs
- To contribute patterns back to the plugin: move from project `generated/` to plugin `references/` and submit a PR
