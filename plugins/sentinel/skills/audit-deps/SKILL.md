---
name: audit-deps
description: Focused dependency CVE audit — reports vulnerabilities with version info and safe upgrade commands.
argument-hint: "[--fix] [--json]"
---

# Sentinel Audit Dependencies

Run a focused dependency vulnerability audit using the project's detected package manager. Reports CVEs with installed versions, fixed versions, and exact upgrade commands. Cross-references installed packages against the Sentinel banned-packages list.

## Arguments

- `--fix` — Automatically apply safe upgrades (patch/minor only, no major version bumps) and auto-append safe pnpm overrides for transitive deps
- `--json` — Output raw JSON from the audit tool instead of formatted report

## Prerequisites

Read `.claude/sentinel.json` for the preferred package manager. If it does not exist, detect the package manager from lockfiles:

1. `bun.lockb` or `bun.lock` — bun
2. `pnpm-lock.yaml` — pnpm
3. `yarn.lock` — yarn
4. `package-lock.json` — npm
5. `requirements.txt` / `pyproject.toml` — pip-audit
6. `go.mod` — govulncheck
7. `Cargo.lock` — cargo-audit

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-run-audit.md` | Execute audit command per ecosystem, cross-reference banned-packages.json |
| 2 | `steps/02-parse-and-enrich.md` | Parse JSON output, determine highest safe version (patch > minor > major) |
| 3 | `steps/03-report-findings.md` | Formatted findings with severity prefixes, CVE IDs, version info, fix commands |
| 4 | `steps/04-propose-overrides.md` | Generate pnpm.overrides for vulnerable transitive deps |
| 5 | `steps/05-summary.md` | Aggregate stats, quick fix commands, override proposal count |
| 6 | `steps/06-auto-fix.md` | Apply safe upgrades if --fix, re-audit verification, report results |

**Start by reading:** `steps/01-run-audit.md`

## Notes

- This skill focuses exclusively on dependency vulnerabilities — use `/sentinel:scan` for code-level issues
- The "highest safe version" logic prevents recommending upgrades that introduce new breaking changes
- Major version upgrades are flagged but never auto-applied
- For monorepos, the audit runs at the workspace root and reports per-workspace vulnerabilities
- Results are also appended to `tasks-plans/tasks.md` if the file exists
- The 24h cache from the SessionStart hook is invalidated after running this skill
- Banned package detection uses `$CLAUDE_PLUGIN_ROOT/data/banned-packages.json` — packages on this list are flagged regardless of CVE status
