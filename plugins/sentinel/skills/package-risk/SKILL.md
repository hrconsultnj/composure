---
name: package-risk
description: Analyze an installed package's source code for suspicious behavior patterns (eval, network calls, env access, obfuscation).
argument-hint: "<package-name> [--ecosystem js|python|rust|go]"
---

# Sentinel Package Risk Analysis

Inspect an installed package's source code for behavioral signals that indicate supply chain risk. Scores the package and reports suspicious patterns with file:line context.

## Arguments

- `<package-name>` (required) — The package to analyze
- `--ecosystem` — Force ecosystem detection (default: auto-detect from project files)

## Prerequisites

The package must already be installed (present in `node_modules`, `site-packages`, `vendor`, or equivalent). This skill does NOT install packages — it inspects what is already on disk.

Read `.claude/sentinel.json` if it exists to determine ecosystem. Otherwise auto-detect from lockfiles.

## Workflow

**Read each step file in order. Do NOT skip steps.**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-locate-package.md` | Find the package in the ecosystem-specific install directory |
| 2 | `steps/02-behavior-scan.md` | Run pattern matching for 15 risk signals across all source files |
| 3 | `steps/03-score-and-report.md` | Compute risk score, generate structured report |

**Start by reading:** `steps/01-locate-package.md`

## Notes

- This skill is intentionally NOT a hook — deep source analysis is too slow for real-time blocking
- Use this to vet unfamiliar packages after installation, especially those not on the popular-packages list
- The 15 signals are inspired by Socket.dev's behavioral analysis, built as our own grep-based checks
- Results are informational — the skill reports risk, it does not block or uninstall
