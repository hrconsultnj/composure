# Skill Decomposition Plan

**Date:** 2026-03-28

## Why

Skills over ~200 lines get steps skipped. The agent reads 700 lines at once, loses track, and drops mandatory steps (remediation offer, template reading, etc.). Smaller files = better follow-through.

The project-audit decomposition proved this: 964 → 61 line router + 4 step files. Each step is self-contained and ends with "Next: read step X."

## Principles

1. **SKILL.md becomes a thin router** — frontmatter + description + step table + constraints. Under 80 lines.
2. **Steps are focused files** — one responsibility per file, 50-150 lines max. Ends with "Next: read step X."
3. **Conditional branching via steps** — step-1a.md vs step-1b.md based on what's installed/detected. The agent reads ONLY the path that applies. No if/else blocks spanning 200 lines.
4. **Templates for generated output** — HTML, YAML, Dockerfile templates live in `templates/`. The agent reads and fills placeholders, never reconstructs from memory.
5. **Sub-agents read step files directly** — the main agent tells the sub-agent "read steps/03-generate.md and follow it." The main agent doesn't relay 300 lines of instructions.
6. **No micromanagement in prompts** — tell the agent WHAT to do and WHERE to read, not HOW to think. Small focused files guide better than long instructions.

## Priority Order

Based on line count and step-skip risk:

### Tier 1: Must decompose (500+ lines, steps get skipped)

| Skill | Lines | Plugin | Why |
|-------|-------|--------|-----|
| `initialize` | 744 | Composure | 10 steps, MCP setup, Context7 queries, config gen, graph build, companion install. Most complex skill. |
| `ux-researcher` | 524 | Design Forge | Multi-phase research workflow with web search + report generation. |
| `dockerfile` | 510 | Shipyard | Template-heavy — Dockerfile patterns should be in templates/, not inline. |

### Tier 2: Should decompose (300-500 lines, some steps skipped)

| Skill | Lines | Plugin | Why |
|-------|-------|--------|-----|
| `run` | 416 | Testbench | Test runner with framework-specific branches (vitest/jest/pytest/playwright). Conditional branching = step files. |
| `preflight` | 403 | Shipyard | 15+ checks — each check could be a step or grouped by category. |
| `code-organizer` | 361 | Composure | Multi-phase: analyze → plan → execute → verify. Natural step split. |
| `initialize` | 344 | Shipyard | Stack detection + config gen + template selection. |
| `initialize` | 340 | Sentinel | Stack detection + tool install + config gen. |
| `initialize` | 323 | Testbench | Framework detection + convention learning + config gen. |
| `ci-generate` | 316 | Shipyard | Template-heavy — CI workflow YAML should be in templates/. |
| `deps-check` | 302 | Shipyard | Multi-package-manager branches. |

### Tier 3: Fine as-is or light cleanup (under 300 lines)

| Skill | Lines | Notes |
|-------|-------|-------|
| `ci-validate` | 283 | Borderline — could benefit from templates for check patterns |
| `headers` | 234 | Lookup table heavy — could move header specs to reference file |
| `generate` | 214 | Template-heavy — test templates should be in templates/ |
| `blueprint` | 204 | Small but METICULOUS step-by-step. Would benefit from step files even though it's not long. The steps are the value. |
| Everything else | <200 | Leave as-is |

## Pattern: How to Decompose

### Before (monolithic)
```
skills/initialize/
  SKILL.md          ← 744 lines, 10 steps, if/else branches
```

### After (decomposed)
```
skills/initialize/
  SKILL.md          ← ~60 lines: router with step table
  steps/
    00-mcp-setup.md
    01-detect-stack.md
    02-context7-queries.md      ← only if Context7 available
    02-skip-context7.md         ← fallback if offline
    03-generate-config.md
    04-build-graph.md
    05-task-queue.md
    06-summary.md
    07-companion-plugins.md
    08-context-health.md
    09-claude-md-offer.md
  templates/                    ← if skill generates output
    config-template.json
```

### Conditional Branching
```
Step 2 in SKILL.md router:

| 2 | Context7 available? | `steps/02-context7-queries.md` |
| 2 | Context7 unavailable | `steps/02-skip-context7.md` |

The agent reads ONE file, not a 200-line if/else block.
```

### Sub-Agent Delegation
```
Main agent: "Spawn a background agent. Tell it to read steps/03-generate.md and follow it."
Sub-agent reads 80 lines of focused instructions.
Main agent does NOT relay 300 lines of instructions in the prompt.
```

## Execution Approach

**Worktrees for parallel decomposition.** Each skill is independent — no file overlaps between `composure/initialize/`, `design-forge/ux-researcher/`, and `shipyard/dockerfile/`. Three agents can work simultaneously.

**One commit per skill.** Each decomposed skill is a self-contained commit: "refactor: decompose {skill} into step files (N → M lines)".

**Test after each.** Run the skill after decomposition to verify steps are followed correctly.

## What's Already Done

- [x] `project-audit` — 964 → 61 router + 4 step files + 4 templates (2026-03-28)
- [x] `composure/initialize` — 744 → 52 router + 12 steps (2026-03-28)
- [x] `design-forge/ux-researcher` — 524 → 61 router + 5 steps + 4 refs (2026-03-28)
- [x] `shipyard/dockerfile` — 510 → 49 router + 3 steps + 7 templates (2026-03-28)
- [x] `testbench/run` — 416 → 42 router + 6 steps (2026-03-28)
- [x] `shipyard/preflight` — 403 → 41 router + 6 steps (2026-03-28)
- [x] `composure/code-organizer` — 361 → 45 router + 6 steps (2026-03-28)
- [x] `shipyard/initialize` — 344 → 39 router + 5 steps (2026-03-28)
- [x] `sentinel/initialize` — 340 → 45 router + 5 steps (2026-03-28)
- [x] `testbench/initialize` — 323 → router + 4 steps (2026-03-28)
- [x] `shipyard/ci-generate` — 316 → 38 router + 4 steps (2026-03-28)
- [x] `shipyard/deps-check` — 302 → 46 router + 4 steps (2026-03-28)
- [x] `shipyard/ci-validate` — 283 → 36 router + 5 steps (2026-03-28, step compliance)
- [x] `testbench/generate` — 214 → router + 5 steps (2026-03-28, step compliance)
- [x] `composure/blueprint` — 204 → router + 4 steps (2026-03-28, step compliance)

## Composure Pro Config Note

The `references/private` submodule (now composure-pro plugin) should require `.claude/composure-pro.json` to activate — same as every other plugin. Even the code owner needs the config file. This is handled by the schema-guard.sh gate (exits 0 if config missing), but should be verified during testing.
