# Step 4: Write Blueprint and Handoff

## 4a. Load Architecture Docs

**Skip if `--quick` or classification is `bug-fix`.**

Read `.claude/no-bandaids.json` for stack info. Load docs selectively:

| Classification | What to load |
|---|---|
| `new-feature` | Full `/app-architecture` skill (all phases) |
| `enhancement` | Only the category matching affected files (frontend/ or backend/) |
| `refactor` | `frontend/core.md` for decomposition rules + affected category |
| `migration` | Query Context7 for the target version's migration guide |

## 4b. Write Blueprint File

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

{From Step 3, or "Skipped" if --skip-graph/--quick}

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

## 4c. Handoff

Present a brief summary of the blueprint, then use **AskUserQuestion**:

"Blueprint written at `tasks-plans/blueprints/{slug}-{date}.md`. Review it, then tell me to start -- or adjust anything first."

The user's response is the approval gate. When they say go, begin with the first checklist item.

## Integration Notes

- **Blueprint files persist across sessions** -- another session can pick them up via `/review-tasks`
- **Checklist items use `- [ ]` format** -- compatible with `/review-tasks verify` and `/commit` gate
- **The commit skill scans `tasks-plans/blueprints/*.md`** -- open blueprint items are visible during commits
- **After blueprint, the architecture docs are already loaded** -- no need to invoke `/app-architecture` separately
- **If Superpowers is also installed**: no conflict. Different name (`/blueprint` vs `/brainstorm`), different mechanism (graph-powered + native tools vs passive markdown), different output (persistent file vs session instructions)

**Done.**
