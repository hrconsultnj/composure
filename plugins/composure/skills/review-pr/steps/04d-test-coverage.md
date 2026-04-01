# Step 4d: Check for Regressions vs Improvements

Determine whether this PR made quality better or worse.

## Regressions (this PR introduced new violations)

For each oversized function finding (bucket 1 from step 4c), check if the function existed before this PR:

```
query_graph({ pattern: "file_summary", target: "<file_path>" })
```

Look at the function in the graph. If the function is new (added in this PR) and exceeds the threshold, that's a regression:
- "This PR introduces a 156-line function `processOrder` in `src/api/orders.ts`. Consider decomposing."

If the function existed before and was already oversized, that's pre-existing — mention but don't blame the PR:
- "Pre-existing: `processOrder` was already 142 lines. This PR added 14 lines (now 156). Consider decomposing as a follow-up."

## Improvements (this PR fixed existing violations)

If `run_audit` shows fewer findings than the last audit run (if available in the graph DB), note:
- "This PR resolved N pre-existing quality violations."

---

**Next:** Read `04e-quality-delta.md`
