---
name: calibrate
description: Calibrate test bench — detect test framework, read existing test conventions, generate .claude/testbench.json config. Query Context7 for test framework reference docs. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

# Testbench Calibrate

Calibrate the test bench by detecting the test framework, learning conventions from existing tests, querying up-to-date test framework docs, and generating the config.

## Arguments

- `--force` -- Overwrite existing `.claude/testbench.json`, regenerate test framework docs older than 7 days
- `--dry-run` -- Show what would be generated without writing files
- `--skip-context7` -- Skip Context7 queries (for offline/CI use)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-detect-framework.md` | Detect unit + E2E test frameworks from config files and dependencies |
| 2 | `steps/02-detect-conventions.md` | Find test files, read 2-3, extract 8 convention types, detect test directory |
| 3 | `steps/03-context7-queries.md` | Create .claude/testing/ structure, freshness check, query Context7 for framework docs |
| 4 | `steps/04-config-and-report.md` | Generate testbench.json with all fields, print summary report |

**Start by reading:** `steps/01-detect-framework.md`

## Key Constraints

- This skill is idempotent -- running it again updates the config based on current state
- With `--force`, it overwrites config and regenerates framework docs older than 7 days (fresh docs still skipped)
- With `--dry-run`, it prints what would be generated without writing files
- With `--skip-context7`, it skips Context7 queries (framework docs not generated)
- Composure and Sentinel configs are read but never modified -- Testbench is a consumer, not a producer
- Convention detection reads EXISTING test files only -- it never invents conventions
- If no test files exist yet, defaults are chosen based on the framework's community norms
- `.claude/testing/project/` is for team-written test conventions -- never auto-generated
- Generated test framework docs are `.gitignore`d by default
