---
name: run
description: Run tests -- all, changed files only, or for a specific file. Parse output, show failures with source context.
argument-hint: "[all|changed|<file-path>] [--watch] [--coverage]"
---

# Testbench Run

Run tests and parse the output into actionable failure reports with source context. Supports full suite, changed-files-only, and single-file modes.

## Arguments

- No argument or `all` -- Run the full test suite
- `changed` -- Run tests only for files changed since last commit
- `<file-path>` -- Run tests for a specific source or test file
- `--watch` -- Start tests in watch mode (framework must support it)
- `--coverage` -- Run with coverage reporting, analyze uncovered functions

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-load-config.md` | Read testbench.json, bail if missing |
| 2 | `steps/02-determine-scope.md` | Three modes: all, changed, single-file. Convention lookup tables, find test files |
| 3 | `steps/03-execute.md` | Run command, handle watch mode, timeouts table |
| 4 | `steps/04-parse-output.md` | Framework-specific parsing: vitest, jest, pytest, go, cargo |
| 5 | `steps/05-report-and-store.md` | Format results, read source for failure context, store to testbench-state.json |
| 6 | `steps/06-coverage.md` | Coverage commands, graph integration, threshold analysis (--coverage only) |

**Start by reading:** `steps/01-load-config.md`

## Notes

- This skill reads config but never modifies `testbench.json` -- only `testbench-state.json` is written
- Test output parsing is best-effort -- framework output formats vary between versions. If parsing fails, show the raw output
- The `--watch` flag starts a background process -- use `run_in_background` to avoid blocking
- For monorepos, scope detection uses the `testDir` from config. If the project has workspace-level test commands, prefer those
- Coverage analysis with Composure graph is opportunistic -- if the graph MCP is unavailable, coverage still works without caller analysis
- The state file is ephemeral -- it's meant for session-level tracking, not version control. Add `.claude/testbench-state.json` to `.gitignore`
- When reporting failures, always read the source file to provide context. Raw test output is noise without understanding what the code does
