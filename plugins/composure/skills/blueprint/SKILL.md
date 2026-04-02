---
name: blueprint
description: Graph-powered pre-work assessment with progressive refinement. Classifies work, scans code graph, confirms scope with user, analyzes impact, evaluates approaches, and writes a persistent blueprint with per-file implementation specs.
argument-hint: "[feature description] [--skip-graph] [--quick]"
---

# Blueprint -- Pre-Work Assessment

Structured "think before building" step — from requirements discovery through implementation planning. Like building a house: the architect surveys the land and gathers requirements (Phase 0), then draws the blueprint with structural specs (Phase 1). One skill, two phases.

**When to use**: Before non-trivial work -- new features, multi-file refactors, migrations, complex bug fixes, greenfield projects. NOT for single-file fixes, typos, or config changes.

## Arguments

- `--skip-graph` -- Skip all code graph operations (pre-scan and impact analysis)
- `--quick` -- Abbreviated mode: classify + questions + plan stub only (no graph, no doc loading, no discovery)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

**BLOCKING RULE:** Steps that include AskUserQuestion are **BLOCKING** — do NOT read the next step until the user has responded. Present your findings, call AskUserQuestion, and STOP. Only after the user answers do you read the next step file.

### Phase 0: Discovery (The Architect)

Runs ONLY for greenfield/empty projects or when the user needs help deciding what to build. Existing initialized projects skip directly to Phase 1. This phase uses `templates/` for structured presentation.

| Step | File | What it does |
|------|------|-------------|
| 0a | `steps/00a-preflight.md` | Check project state, route to discovery or planning |
| 0b | `steps/00b-intent-analysis.md` | Parse user description for signals, identify concerns and complexity |
| 0c | `steps/00c-ecosystem-research.md` | Surface-level web search for target services (API, auth, SDK, MCP) |
| 0d | `steps/00d-stack-options.md` | Present framework/DB/hosting/auth options with trade-offs |
| 0e | `steps/00e-requirements-confirm.md` | Confirm choices as structured mini-PRD |
| 0f | `steps/00f-scaffold.md` | Scaffold from packages + run initialize |

### Phase 1: Planning (The Blueprint)

The core blueprint flow. Runs for ALL blueprint invocations after Phase 0 resolves.

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-classify.md` | Classify work type, checkpoint if ambiguous |
| 2 | `steps/02-graph-scan.md` | Graph pre-scan, present findings, confirm scope with user |
| 3 | `steps/03-impact-analysis.md` | Blast radius + test gaps, present approach options if multiple exist |
| 4a | `steps/04a-load-docs.md` | Load architecture docs based on classification |
| 4b | `steps/04b-write-blueprint.md` | Write blueprint following `templates/04b-blueprint-document.md` |
| 4c | `steps/04c-handoff.md` | Present summary, ask contextual questions if gaps remain |

**Start by reading:** `steps/00a-preflight.md`

## Progressive Checkpoints

The blueprint process uses **progressive refinement** — not a pipeline-then-dump:

| After step | Checkpoint | Purpose |
|---|---|---|
| 0b (intent) | Only if description is vague | Clarify what they're building |
| 0d (options) | Always (when discovery runs) | User chooses their stack |
| 0e (confirm) | Always (when discovery runs) | Final alignment before scaffolding |
| 1 (classify) | Only if ambiguous | Confirm work type |
| 2 (graph scan) | Always | Confirm scope is right, surface areas graph missed |
| 3 (impact) | Only if multiple approaches | User chooses direction before plan is written |
| 4c (handoff) | Always | Final review, surface any gaps from writing |

By step 4, most questions are already resolved through the conversation.

## Conditional Steps

- **Step 0a (preflight)**: Always runs. Routes to discovery or planning based on project state.
- **Steps 0b-0f (discovery)**: Only for empty projects or explicit discovery requests. Skipped for existing initialized projects (the 90% case).
- **Steps 2 and 3**: Skip if `--skip-graph`, `--quick`, or graph MCP unavailable
- **Step 4a (doc loading)**: Skip if `--quick` or classification is `bug-fix`

## Templates (`templates/`)

All templates live in one folder, prefixed with the step that uses them. Read order matches workflow order.

| Template | Used by | Purpose |
|----------|---------|---------|
| `00c-ecosystem-research.md` | Step 0c | How to present service research (API/auth/SDK/MCP cards) |
| `00d-stack-options.md` | Step 0d | How to present framework/DB/hosting comparisons with trade-offs |
| `00e-requirements-summary.md` | Step 0e | Mini-PRD format organized by concern, not technology |
| `04b-blueprint-document.md` | Step 4b | The main blueprint output — per-file specs, preservation, verification |

The `04b-blueprint-document.md` template is the most critical. Key sections:

- **Implementation Spec** — per-file change specs (replaces vague "Approach" paragraphs)
- **Preservation Boundaries** — explicit "do not touch" guard rails
- **Verification** — concrete test scenarios

## Integration Notes

- **Blueprint files persist across sessions** -- another session can pick them up via `/backlog`
- **Checklist items use `- [ ]` format** -- compatible with `/backlog verify` and `/commit` gate
- **The commit skill scans `tasks-plans/blueprints/*.md`** -- open blueprint items are visible during commits
- **After blueprint, the architecture docs are already loaded** -- no need to invoke `/app-architecture` separately
- **Phase 0 delegates scaffolding to Initialize** -- Initialize runs in delegated mode (skips Q&A, uses Blueprint's confirmed choices)
- **Integration routing** -- if integrations were identified in 0b, the blueprint notes them for the integration-builder skill during implementation
