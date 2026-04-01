---
name: blueprint
description: Graph-powered pre-work assessment with progressive refinement. Classifies work, scans code graph, confirms scope with user, analyzes impact, evaluates approaches, and writes a persistent blueprint with per-file implementation specs.
argument-hint: "[feature description] [--skip-graph] [--quick]"
---

# Blueprint -- Pre-Work Assessment

Structured "think before building" step. Uses the code graph to find related code BEFORE asking questions, so the conversation is informed, not generic. Progressive checkpoints refine the plan through conversation — by the time the blueprint is written, most questions are already resolved.

**When to use**: Before non-trivial work -- new features, multi-file refactors, migrations, complex bug fixes. NOT for single-file fixes, typos, or config changes.

## Arguments

- `--skip-graph` -- Skip all code graph operations (pre-scan and impact analysis)
- `--quick` -- Abbreviated mode: classify + questions + plan stub only (no graph, no doc loading)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

**BLOCKING RULE:** Steps that include AskUserQuestion are **BLOCKING** — do NOT read the next step until the user has responded. Present your findings, call AskUserQuestion, and STOP. Only after the user answers do you read the next step file.

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-classify.md` | Classify work type, checkpoint if ambiguous |
| 2 | `steps/02-graph-scan.md` | Graph pre-scan, present findings, confirm scope with user |
| 3 | `steps/03-impact-analysis.md` | Blast radius + test gaps, present approach options if multiple exist |
| 4a | `steps/04a-load-docs.md` | Load architecture docs based on classification |
| 4b | `steps/04b-write-blueprint.md` | Write blueprint following `BLUEPRINT-TEMPLATE.md` |
| 4c | `steps/04c-handoff.md` | Present summary, ask contextual questions if gaps remain |

**Start by reading:** `steps/01-classify.md`

## Progressive Checkpoints

The blueprint process uses **progressive refinement** — not a pipeline-then-dump:

| After step | Checkpoint | Purpose |
|---|---|---|
| 1 (classify) | Only if ambiguous | Confirm work type |
| 2 (graph scan) | Always | Confirm scope is right, surface areas graph missed |
| 3 (impact) | Only if multiple approaches | User chooses direction before plan is written |
| 4c (handoff) | Always | Final review, surface any gaps from writing |

By step 4, most questions are already resolved through the conversation.

## Conditional Steps

- **Steps 2 and 3**: Skip if `--skip-graph`, `--quick`, or graph MCP unavailable
- **Step 4a (doc loading)**: Skip if `--quick` or classification is `bug-fix`

## Template

The blueprint document structure is defined in `BLUEPRINT-TEMPLATE.md`. Key sections:

- **Implementation Spec** — per-file change specs (replaces vague "Approach" paragraphs)
- **Preservation Boundaries** — explicit "do not touch" guard rails
- **Verification** — concrete test scenarios

## Integration Notes

- **Blueprint files persist across sessions** -- another session can pick them up via `/review-tasks`
- **Checklist items use `- [ ]` format** -- compatible with `/review-tasks verify` and `/commit` gate
- **The commit skill scans `tasks-plans/blueprints/*.md`** -- open blueprint items are visible during commits
- **After blueprint, the architecture docs are already loaded** -- no need to invoke `/app-architecture` separately
