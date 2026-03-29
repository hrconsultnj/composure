---
name: deps-check
description: Check dependency health -- known CVEs, outdated packages, unsafe versions. Recommends the highest safe version, not just "latest". Blocks Critical CVEs via Composure commit gate.
argument-hint: "[--fix] [--json]"
---

# Shipyard Deps Check

Audit project dependencies for known vulnerabilities (CVEs), outdated packages, and unsafe version ranges. Unlike basic `npm audit`, this skill determines the **highest safe version** for each vulnerable package -- not just "update to latest" which may itself be vulnerable.

## Arguments

- `--fix` -- Auto-upgrade safe packages (patch/minor only, no major bumps). Re-audits after upgrade to verify.
- `--json` -- Output results as JSON (for CI integration or programmatic consumption)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-detect-pkg-manager.md` | Read shipyard/sentinel config, auto-detect from lockfiles |
| 2 | `steps/02-run-audit.md` | Per-package-manager audit commands |
| 3 | `steps/03-enrich-results.md` | Parse results, determine highest safe version |
| 4 | `steps/04-fix-report-tasks.md` | Auto-fix if --fix, re-audit, write to task queue, report |

**Start by reading:** `steps/01-detect-pkg-manager.md`

## Integration with Sentinel

If Sentinel is installed (`sentinelIntegration: true` in shipyard.json), deps-check complements Sentinel's `/sentinel:audit-deps`:

- **Sentinel audit-deps**: Focused on security -- runs as part of the broader security scan, writes to security task section
- **Shipyard deps-check**: Broader scope -- includes outdated packages, version health, and highest-safe-version analysis

Both write to the same `tasks-plans/tasks.md` and use the same CVE prefix format for deduplication. If both plugins report the same CVE, only one task entry is created.

## Notes

- This skill does NOT require `/shipyard:initialize` -- it auto-detects the package manager if no config exists
- The "highest safe version" logic prevents upgrading from one vulnerability into another
- Major version upgrades are never automatic -- they require manual review of breaking changes
- Transitive dependency vulnerabilities are reported but cannot be directly fixed with `--fix` (the parent dependency must be upgraded)
- For monorepos, audit runs at the root level (pnpm/npm audit covers the workspace)
- Re-audit after `--fix` catches cascading issues where upgrading one package pulls in a vulnerable transitive dependency
- CVE task entries are idempotent -- running deps-check multiple times does not duplicate entries in tasks.md
