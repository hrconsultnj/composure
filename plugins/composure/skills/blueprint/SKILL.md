---
name: blueprint
description: Structured pre-work assessment for non-trivial features. Classifies work, pre-scans code graph for related files, asks targeted questions, analyzes impact, loads architecture docs, and produces a persistent plan file. Use before starting multi-file work.
argument-hint: "[feature description] [--skip-graph] [--quick]"
---

# Blueprint -- Pre-Work Assessment

Structured "think before building" step. Uses the code graph to find related code BEFORE asking questions, so the conversation is informed, not generic.

**When to use**: Before non-trivial work -- new features, multi-file refactors, migrations, complex bug fixes. NOT for single-file fixes, typos, or config changes.

## Arguments

- `--skip-graph` -- Skip all code graph operations (pre-scan and impact analysis)
- `--quick` -- Abbreviated mode: classify + questions + plan stub only (no graph, no doc loading)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-classify.md` | Classify work into one of 5 types, ask if ambiguous |
| 2 | `steps/02-graph-scan-and-questions.md` | Graph pre-scan + targeted questions in single AskUserQuestion call |
| 3 | `steps/03-impact-analysis.md` | Blast radius, callers, decomposition, test gaps |
| 4 | `steps/04-write-blueprint.md` | Load architecture docs, write blueprint file, handoff |

**Start by reading:** `steps/01-classify.md`

## Conditional Steps

- **Steps 2 (graph scan) and 3 (impact analysis)**: Skip if `--skip-graph`, `--quick`, or graph MCP unavailable
- **Step 4 (architecture doc loading)**: Skip doc loading if `--quick` or classification is `bug-fix`

## Integration Notes

- **Blueprint files persist across sessions** -- another session can pick them up via `/review-tasks`
- **Checklist items use `- [ ]` format** -- compatible with `/review-tasks verify` and `/commit` gate
- **The commit skill scans `tasks-plans/blueprints/*.md`** -- open blueprint items are visible during commits
- **After blueprint, the architecture docs are already loaded** -- no need to invoke `/app-architecture` separately
- **If Superpowers is also installed**: no conflict. Different name (`/blueprint` vs `/brainstorm`), different mechanism (graph-powered + native tools vs passive markdown), different output (persistent file vs session instructions)
