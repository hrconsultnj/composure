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

## Step 1: Classify the Work

If the user provided a description as an argument, classify it. Otherwise, ask what they want to build.

Classify into exactly ONE category:

| Classification | Signal | Typical scope |
|---|---|---|
| `new-feature` | New capability, new page/route, new API endpoint | 3-15 files, new folders |
| `enhancement` | Extending existing feature, adding options/modes | 2-8 files, mostly edits |
| `refactor` | Restructuring without behavior change | 5-20 files, moves + edits |
| `bug-fix` | Broken behavior with known reproduction | 1-5 files, targeted edits |
| `migration` | Version upgrade, dependency swap, API migration | 5-50 files, pattern replacement |

If ambiguous, use **AskUserQuestion** to confirm. Do NOT guess.

## Step 2: Graph Pre-Scan

**Skip if `--skip-graph`, `--quick`, or graph MCP unavailable.**

Use the code graph to find related code BEFORE asking the user anything:

```
semantic_search_nodes({ query: "<user's description>" })
```

This eliminates questions the graph can answer:

| Classification | What graph pre-answers | What still needs human input |
|---|---|---|
| `new-feature` | Finds similar existing features (patterns to follow) | New DB tables? Who consumes it? Auth boundaries? |
| `enhancement` | Locates the exact files/functions to modify | Signature changes? Additive or modifying? |
| `refactor` | Maps current dependency structure of the target area | Goal? External consumers? Pure refactor? |
| `bug-fix` | Finds the files involved automatically | Reproduction path? Regression or latent? |
| `migration` | Finds all usages of the thing being migrated | Incremental or big-bang? Breaking changes? |

If graph is unavailable: fall back to asking all questions (skip to Step 3 with full question set). Mention: "Code graph not available -- run `/composure:build-graph` for smarter pre-scanning."

## Step 3: Confirm + Ask Remaining Questions

Present graph findings AND remaining questions in a **single AskUserQuestion** call:

"I found these related files: [list from graph]. Is this the right area?

Also:
1. [Remaining question 1]
2. [Remaining question 2]
3. [Remaining question 3]"

### Questions by classification (ask ONLY what the graph didn't answer):

**new-feature:**
1. What existing feature is this most similar to in this codebase? _(skip if graph found a clear match)_
2. Does this need new database tables/columns, or does it use existing data?
3. Who consumes this -- end users (UI), other services (API), or both?
4. Are there auth/permission boundaries? (who can see/do this)

**enhancement:**
1. Which existing file(s) does this modify? _(skip if graph located them)_
2. Does this change any function signatures or prop interfaces that other files depend on?
3. Is this additive (new optional behavior) or modifying (changing existing behavior)?

**refactor:**
1. What is the goal -- better decomposition, clearer boundaries, performance, or testability?
2. Are there consumers outside this repo (published package, API contract)?
3. Should behavior stay identical (pure refactor) or are minor behavior changes acceptable?

**bug-fix:**
1. What is the reproduction path? (steps or failing test)
2. Is this a regression (worked before) or a latent bug?
3. Does the fix require changing a shared interface, or is it contained to one module? _(skip if graph shows it's contained)_

**migration:**
1. What is being migrated? (dependency version, framework, API pattern)
2. Can it be done incrementally (file-by-file) or does it require a big-bang switch?
3. Are there breaking changes in the target version? (check Context7 if needed)

## Step 4: Full Impact Analysis

**Skip if `--skip-graph`, `--quick`, or graph MCP unavailable.**

Now that we know the exact files (from graph pre-scan + user confirmation), do deep analysis:

1. **Blast radius**: `get_impact_radius({ changed_files: [<confirmed files>] })` -- what depends on them
2. **Callers**: `query_graph({ pattern: "callers_of", target: <key function> })` -- who calls the functions being changed
3. **Decomposition opportunities**: `find_large_functions({ file_pattern: <affected directory> })` -- anything already oversized in the area
4. **Test gaps**: `query_graph({ pattern: "tests_for", target: <component> })` -- what's untested

Summarize:
- **Direct impact**: N files import from the affected files
- **Indirect impact**: M files are 2 hops away
- **Large functions**: any over 100 lines in the affected area
- **Missing tests**: functions with no test coverage

## Step 5: Load Architecture Docs

**Skip if `--quick` or classification is `bug-fix`.**

Read `.claude/no-bandaids.json` for stack info. Load docs selectively:

| Classification | What to load |
|---|---|
| `new-feature` | Full `/app-architecture` skill (all phases) |
| `enhancement` | Only the category matching affected files (frontend/ or backend/) |
| `refactor` | `frontend/core.md` for decomposition rules + affected category |
| `migration` | Query Context7 for the target version's migration guide |

## Step 6: Write Blueprint File

Create `tasks-plans/blueprints/` directory if needed. Write the blueprint:

**Path**: `tasks-plans/blueprints/{slug}-{YYYY-MM-DD}.md`

Where `{slug}` is 2-3 word kebab-case summary (e.g., `user-roles-2026-03-28.md`).

**Template**:

```markdown
# Blueprint: {Title}

**Classification**: {new-feature|enhancement|refactor|bug-fix|migration}
**Date**: {YYYY-MM-DD}
**Stack**: {from no-bandaids.json}

## Related Code

{From Step 2 graph pre-scan, or "Graph not available" if skipped}

- `path/to/similar-feature.tsx` -- similar pattern to follow
- `path/to/affected-file.ts` -- will be modified

## Decisions

- {Key decision 1 from Q&A}
- {Key decision 2}
- {Key decision 3}

## Impact Analysis

{From Step 4, or "Skipped" if --skip-graph/--quick}

- **Files affected**: {N direct, M indirect}
- **High-risk areas**: {files with many dependents}
- **Large functions in area**: {any over 100 lines}
- **Missing test coverage**: {functions without tests}

## Files to Touch

| # | File | Action | Why |
|---|------|--------|-----|
| 1 | `path/to/file.ts` | Create | New hook for feature |
| 2 | `path/to/existing.tsx` | Edit | Add prop for new mode |

## Approach

1. {Step 1 -- what to build first and why}
2. {Step 2}
3. {Step 3}

## Risks

- {Risk 1}
- {Risk 2}

## Checklist

- [ ] {First concrete task}
- [ ] {Second task}
- [ ] Run typecheck after changes
- [ ] Verify no decomposition violations
```

## Step 7: Handoff

Present a brief summary of the blueprint, then use **AskUserQuestion**:

"Blueprint written at `tasks-plans/blueprints/{slug}-{date}.md`. Review it, then tell me to start -- or adjust anything first."

The user's response is the approval gate. When they say go, begin with the first checklist item.

## Integration Notes

- **Blueprint files persist across sessions** -- another session can pick them up via `/review-tasks`
- **Checklist items use `- [ ]` format** -- compatible with `/review-tasks verify` and `/commit` gate
- **The commit skill scans `tasks-plans/blueprints/*.md`** -- open blueprint items are visible during commits
- **After blueprint, the architecture docs are already loaded** -- no need to invoke `/app-architecture` separately
- **If Superpowers is also installed**: no conflict. Different name (`/blueprint` vs `/brainstorm`), different mechanism (graph-powered + native tools vs passive markdown), different output (persistent file vs session instructions)
