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
| 0 | `steps/00-scope-detection.md` | Detect scope: single project, monorepo, multi-project, or plugin repo |
| 1 | `steps/01-context-health.md` | Plugin/MCP count + threshold check (gates Step 3) |
| 2 | `steps/02-mcp-setup.md` | Verify composure-graph MCP + auto-fix chain |
| 3 | `steps/03-companion-triage.md` | Conditional install: Sentinel always, others by need |
| 4 | `steps/04-detect-stack.md` | Read project files, build framework profile |
| 5 | `steps/05-extensions-skip-patterns.md` | Resolve extensions and skip patterns by framework |
| 6 | `steps/06-context7-setup.md` | Check/install Context7 MCP (only if stack needs docs) |
| 7a | `steps/07a-context7-folders.md` | Freshness check, folder structure, library mapping |
| 7b | `steps/07b-context7-query-loop.md` | Query Context7 and write docs (one at a time) |
| 8 | `steps/08-generate-config.md` | Write `.claude/no-bandaids.json` with detected data |
| 9 | `steps/09-build-graph.md` | Build or update code review graph |
| 10 | `steps/10-task-queue.md` | Create tasks-plans/ directory and tasks.md |
| 11 | `steps/11-report.md` | Print initialization summary |
| 12 | `steps/12-claude-md-offer.md` | Offer self-monitoring lines for global CLAUDE.md |

**Start by reading:** `steps/00-scope-detection.md`

**Multi-project scope:** If Step 0 detects `multi-project`, steps 4-10 are skipped (they're per-project). Only steps 0-3, 11, and 12 run at the parent level. Graphs are built for all child projects in Step 0.

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
