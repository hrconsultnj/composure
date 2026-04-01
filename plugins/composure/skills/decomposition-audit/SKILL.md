---
name: decomposition-audit
description: Full codebase health audit — architecture, security, code quality, dependencies, test coverage. Produces a scored report with letter grades and prioritized remediation. Use when walking into an existing codebase or before major releases.
argument-hint: "[path or glob pattern] [--threshold N] [--quick]"
---

# Codebase Health Audit

Comprehensive codebase assessment that produces a scored health report with letter grades across 5 categories: Architecture, Security, Code Quality, Dependencies, and Test Coverage.

**When to use**: Walking into an existing codebase, onboarding to a new project, before major releases, or periodic health check-ins.

## Arguments

- **No arguments**: Full audit of the entire project (all categories)
- **Path**: Audit only files matching the path (e.g., `src/components/`)
- **`--threshold N`**: Change the minimum line count for reporting (default: 200)
- **`--quick`**: Fast health snapshot — runs only size/structure (Step 1) + architecture (Step 3, if graph available) + score (Step 7). Skips decomposition deep-dive, security, quality census, and dependency audit. Good for walking into existing projects or quick check-ins. ~30 seconds vs ~3 minutes for full audit.

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 0 | `steps/00-bootstrap.md` | Verify graph, call `run_audit`, determine mode |
| 1 | `steps/01-size-structure.md` | File sizes, large functions, size distribution histogram |
| 2 | `steps/02-decomposition.md` | Mixed concerns, inline types, ghosts, route thickness |
| 3 | `steps/03-architecture.md` | Circular deps, fan-out, dead exports, barrel bloat (graph) |
| 4 | `steps/04-security.md` | Suppression census, dependency CVEs, hardcoded secrets |
| 5 | `steps/05-quality.md` | TODO/FIXME census, test coverage gaps |
| 6 | `steps/06-dependencies.md` | Outdated packages, framework version gap |
| 7 | `steps/07-score-report.md` | Calculate grades, write plan file, create tasks, output report |

**Start by reading:** `steps/00-bootstrap.md`

## Conditional Steps

- **`--quick` mode**: Run only Steps 0 → 1 → 3 → 7. Skip Steps 2, 4, 5, 6. Produces a focused health snapshot with size distribution + architecture grades. Security and dependency checks are handled by Sentinel and Shipyard separately.
- **Step 3 (architecture)**: Skip if `--skip-graph` or graph MCP unavailable (but NOT skipped for `--quick` — architecture is the most valuable check for walking into a project)
- **Step 2 ghost detection**: Skip graph parts if no graph, use file-name heuristic fallback
- **Step 5 test coverage**: Uses TESTED_BY graph edges if available, bash fallback otherwise

## Integration Notes

- **Plan files persist across sessions** — another session can pick them up via `/review-tasks`
- **HTML report**: After the audit, call `generate_audit_html()` for a shareable visual report
- **Combines with other skills**: Sentinel `/scan` for deeper security, `/shipyard:deps-check` for CVE details
- **Audit files go in `tasks-plans/audits/`** — gitignored or tracked, your choice
- **TaskCreate entries** for Critical/High items make findings actionable in the current session
