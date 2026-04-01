---
name: scan
description: Exposure-aware security scan — Semgrep static analysis, dependency audit, and Composure graph-based exposure prioritization. Writes prioritized findings to tasks-plans/tasks.md.
argument-hint: "[--semgrep-only] [--deps-only] [--path <dir>]"
---

# Sentinel Scan

Run a comprehensive security scan combining static analysis (Semgrep), dependency vulnerability auditing, and exposure-aware prioritization via the Composure code graph. Findings are classified by both severity AND reachability (public, authenticated, internal, dead code) to produce actionable priority rankings. Results are written to `tasks-plans/tasks.md` using Composure's severity format.

## Arguments

- `--semgrep-only` — Skip dependency audit, run only Semgrep
- `--deps-only` — Skip Semgrep, run only dependency audit
- `--path <dir>` — Scan a specific directory instead of project root

## Prerequisites

- `.claude/sentinel.json` - **Recommended.** If missing, the scan auto-detects language, package manager, and framework from project files. Run `/sentinel:initialize` for persistent config with custom exposure boundaries.
- Composure code graph - **Recommended.** Enables graph-based exposure analysis. If unavailable, the scan falls back to path-based heuristic exposure classification. Run `/composure:build-graph` for full accuracy.
- Semgrep - **Optional.** When installed, provides deep static analysis. When unavailable, the scan falls back to manual code review (secrets scan, OWASP pattern matching, broad exception detection). Install with `brew install semgrep`.

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-prerequisites.md` | Verify graph availability, load sentinel.json, exposure boundaries, data files |
| 2 | `steps/02-semgrep-analysis.md` | Semgrep static analysis + secrets scan + manual code review fallback |
| 3 | `steps/03-dependency-audit.md` | Dependency CVE audit per package manager + banned package check |
| 4 | `steps/04-exposure-analysis.md` | Graph-based exposure classification for all findings |
| 5 | `steps/05-severity-mapping.md` | Two-axis priority mapping: Severity x Exposure = Priority |
| 6 | `steps/06-known-cve-check.md` | Framework-specific CVEs that scanners miss |
| 7 | `steps/07-write-to-tasks.md` | Write prioritized findings to tasks-plans/tasks.md |
| 8 | `steps/08-report-summary.md` | Print exposure-aware summary with top priorities |

**Start by reading:** `steps/01-prerequisites.md`

## Notes

- Findings are appended to `tasks-plans/tasks.md`, never overwritten — existing tasks are preserved
- Duplicate findings (same rule + same file + same line) are skipped
- Low-severity dependency vulnerabilities are omitted to reduce noise
- The known CVE list (Step 6) is a point-in-time snapshot — Context7 queries keep it current based on staleness thresholds
- If neither Semgrep nor a package manager audit is available, the scan still runs secrets detection and manual code review
- The scan is read-only - it does not modify any project source files
- For CI integration, the JSON output from Semgrep can be piped to other tools
- Without the Composure graph, exposure analysis falls back to path-based heuristics
- The scan operates in three modes: **full** (all tools available), **degraded** (missing graph or Semgrep), **minimal** (secrets scan + manual review only)
