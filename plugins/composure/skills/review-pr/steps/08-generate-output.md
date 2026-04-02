# Step 8: Generate Review Output

Assemble all findings from steps 01-07 into a structured, comprehensive review.

## Output Template

```markdown
## PR Review: <PR_TITLE>

### Walkthrough

(From step 03)

| File | Change | Summary |
|------|--------|---------|
| `<file>` | Modified | <one-line summary> |
| ... | ... | ... |

**X files changed** (Y added, Z modified, W deleted) across N commits

### Quality Metrics

(From step 04 — omit section if run_audit returned no findings for changed files)

- **Quality grade**: <A/B/C/D/F> (for changed files only)
- **Functions over limit**: <N> functions exceed 100-line threshold
- **Test coverage**: <N>/<M> changed functions have tests
- **New dependencies**: <N> new imports added
- **Regressions**: <any new quality violations introduced by this PR>

### Security Context

(From step 07 — omit section entirely if no findings)

Open Sentinel findings affecting files in this PR:
- **[P0:Public] [CVE-2024-XXXXX]** `lodash@4.17.20` in `src/api/users.ts` — Prototype Pollution
- **[P1:Auth] [SECURITY]** SQL injection in `src/api/orders.ts:45` — CWE-89

New dependencies detected:
- `new-package@1.0.0` — Run `/sentinel:audit-deps` to check for CVEs
- `another-dep@2.3.0` — Run `/sentinel:package-risk another-dep` to inspect behavior

### Risk Assessment

- **Overall risk**: Low / Medium / High
  - Low: <5 files, no high-risk nodes, good test coverage
  - Medium: 5-15 files OR changes to widely-depended code OR test gaps
  - High: >15 files OR breaking interface changes OR security findings
- **Blast radius**: <X> files, <Y> functions directly impacted
- **Test coverage**: <N>/<M> changed functions covered

### File-by-File Review

(From step 05 — one section per significantly changed file, in priority order)

#### `<file_path>`
- **Changes**: <what was modified>
- **Impact**: <who depends on this — verified via callers_of>
- **Quality**: <run_audit findings for this file, if any>
- **Issues**:
  - <bug or concern — verified against source/graph>
  - <another issue — verified>

### Framework Notes

(From step 06 — omit section if no framework findings or step was skipped)

- **[Next.js]** Pattern in `src/app/api/route.ts:15` uses Pages Router convention. Current Next.js 15 recommends Route Handlers in App Router.
- **[Supabase]** Missing `.select()` after `.insert()` in `src/lib/db.ts:42`. Current supabase-js returns no data without explicit select.

### Missing Tests

(From steps 04 and 05 — verified via tests_for)

- `<function_name>` in `<file>` — no test coverage found
- `<another_function>` in `<file>` — new function, tests recommended

### Linked Issues

(From step 01 — omit section if no linked issues)

- PR addresses **#123** (<issue title>): <Yes — the changes implement the requested feature / Partially — X is addressed but Y is not / No — the changes do not appear related to this issue>

### Recommendations

1. <actionable, verified suggestion — highest priority first>
2. <next suggestion>
3. <next suggestion>
```

## Section Inclusion Rules

Not every section appears in every review. Follow these rules:

| Section | Include when |
|---------|-------------|
| Walkthrough | Always |
| Quality Metrics | run_audit returned findings for changed files |
| Security Context | Sentinel findings match changed files OR new deps detected |
| Risk Assessment | Always |
| File-by-File Review | Always (but may be brief for small PRs) |
| Framework Notes | Step 06 found outdated patterns |
| Missing Tests | Untested changed functions exist |
| Linked Issues | PR references issues in title/body |
| Recommendations | Always (at least 1 recommendation) |

## Tone

- Be direct and specific — "Function X at line Y has no null check for parameter Z" not "consider adding null checks"
- Every finding must cite its verification method (callers_of, tests_for, source read, run_audit)
- Acknowledge what the PR does well — don't only list problems
- If the PR is clean, say so: "No issues found. Quality metrics are within thresholds. Test coverage is adequate."

---

**Done.** If HIGH/CRITICAL findings were identified, persist them to `tasks-plans/tasks.md` as backlog items for follow-up.
