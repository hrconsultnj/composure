---
name: initialize
description: Detect project stack, package managers, and security tooling. Generate .claude/sentinel.json config. Run once per project.
argument-hint: "[--force] [--dry-run]"
---

# Sentinel Initialize

Bootstrap Sentinel project-level configuration by detecting the tech stack, available package managers, system installers, and security tooling.

## Arguments

- `--force` — Overwrite existing `.claude/sentinel.json`
- `--dry-run` — Show what would be generated without writing files

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-detect-stack.md` | Read Composure config or detect stack manually |
| 2 | `steps/02-detect-pkg-managers.md` | Package manager detection (JS, Python, Go, Rust) + system installers, npm migration check |
| 3 | `steps/03-check-security-tools.md` | Semgrep, trivy, grype, syft, pip-audit, govulncheck |
| 4 | `steps/04-detect-integrations.md` | 20+ integration patterns (Stripe, Supabase, OpenAI, etc.), write integrations.json, Context7 security docs |
| 5 | `steps/05-config-and-report.md` | Generate sentinel.json, ensure task queue, print report |

**Start by reading:** `steps/01-detect-stack.md`

## Key Constraints

- This skill is idempotent — running it again updates detection results
- With `--force`, it overwrites the existing config and regenerates stale security docs
- With `--dry-run`, it prints what would be generated without writing
- Composure config is read but never modified — Sentinel is a consumer, not a producer
- If no package manager lockfile is found, dependency audit skills will be limited
- Integration detection scans dependencies — only detected integrations get security docs generated
- `.claude/security/project/` is for team-written overrides (allowed patterns, custom secret patterns) — never auto-generated

## Error Handling

- Command fails: log the error, continue to next check
- Missing lockfile: note limitation, do not abort
- Composure not initialized: fall back to manual stack detection (Step 1)
