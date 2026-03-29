---
name: initialize
description: Detect deployment targets, CI/CD platforms, container configs, and generate .claude/shipyard.json. Query Context7 for CI/CD reference docs. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

# Shipyard Initialize

Bootstrap Shipyard project-level configuration by detecting CI/CD platforms, deployment targets, container configs, and available DevOps tooling.

## Arguments

- `--force` -- Overwrite existing `.claude/shipyard.json`, regenerate CI docs older than 7 days
- `--dry-run` -- Show what would be generated without writing files
- `--skip-context7` -- Skip Context7 queries (for offline/CI use)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-detect-stack.md` | Read Composure config or detect stack manually |
| 2 | `steps/02-detect-platform.md` | CI platform detection, deployment target detection |
| 3 | `steps/03-detect-tools.md` | Check CLI tools, system installer detection, suggest missing |
| 4 | `steps/04-context7-queries.md` | Freshness check, .claude/ci/ structure, query plan, sequential query+write |
| 5 | `steps/05-config-and-report.md` | Generate shipyard.json, ensure task queue, print report |

**Start by reading:** `steps/01-detect-stack.md`

## Notes

- This skill is idempotent -- running it again updates detection results
- With `--force`, it overwrites the existing config and regenerates stale CI docs
- With `--dry-run`, it prints what would be generated without writing
- With `--skip-context7`, it skips Context7 queries (CI docs not generated)
- Composure and Sentinel configs are read but never modified -- Shipyard is a consumer, not a producer
- `.claude/ci/project/` is for team-written CI/CD conventions -- never auto-generated
- Tool suggestions are platform-aware: only suggest tools relevant to detected CI/deployment targets
