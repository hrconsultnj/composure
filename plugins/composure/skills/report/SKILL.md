---
name: report
description: Generate a self-contained HTML audit report orchestrating all installed plugins. Produces a visual report with letter grades, tabbed sections, and prioritized recommendations.
argument-hint: "[--url <deployment-url>] [--open] [--no-sentinel] [--no-testbench] [--no-shipyard]"
---

# Project Audit

Generate a professional, self-contained HTML audit report by orchestrating all installed plugins. Letter grades, tabbed detail sections, prioritized recommendations, and zero source code exposure.

## Arguments

- `--url <url>` — Pass to Sentinel for HTTP header analysis and Shipyard for SSL checks
- `--open` — Auto-open HTML in browser (default: true)
- `--no-sentinel` / `--no-testbench` / `--no-shipyard` — Skip that plugin even if installed

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 0 | `steps/00-prerequisites.md` | Check plugins, offer to initialize missing ones |
| 1 | `steps/01-gather-data.md` | Collect data from each plugin |
| 2 | `steps/02-scoring.md` | Calculate grades (honesty rules, CVE framing rules) |
| 3 | `steps/03-generate-html.md` | Spawn background agent for HTML report |
| 4 | `steps/04-summary-and-remediation.md` | Show summary + MANDATORY remediation offer |

**Start by reading:** `steps/00-prerequisites.md`

## Key Constraints

- **No source code in report.** File paths, line counts, function names, dependency names — yes. Code snippets, variable values, string literals — never.
- **Self-contained HTML.** One file, zero dependencies. Works offline.
- **Honest grading.** Zero tests = F. Critical CVE = F. Do NOT rationalize poor grades.
- **Privacy-safe.** No env vars, secrets, API keys, or user data.
- **Use template files.** Read `templates/audit-header.html`, `templates/audit-tabs.html`, `templates/audit-footer.html` verbatim. Do NOT reconstruct CSS, JS, or branding from memory.

## Error Handling

- Command fails: log the error, skip that subsection, do not abort
- Plugin config exists but tools unavailable: mark "tools unavailable", score as 0
- Graph not built: fall back to Bash file scanning
- No package.json: report stack as "Unknown", score Code Quality on file sizes only

## Recommendation Priority

Generate 5-15 recommendations sorted by severity:

1. Critical CVEs — "Upgrade {pkg} to {version} ({CVE-ID})"
2. Semgrep ERROR findings
3. Zero test coverage — "Add coverage reporting"
4. Files over 800 lines — "Decompose {file}"
5. FAIL preflight checks
6. High CVEs
7. Missing security headers
8. Files over 600 lines
9. Semgrep WARNING findings
10. Low test coverage
11. WARN preflight checks
12. Open task backlog
