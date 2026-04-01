# Step 4b: Filter Findings to Changed Files

The audit covers the entire repo. You only care about findings in `CHANGED_FILES`.

For each finding in the audit response:

1. Read the finding's `file` path
2. Check: is this file in `CHANGED_FILES`?
   - **Yes** → keep this finding
   - **No** → discard it (pre-existing issue, not this PR's concern)

After filtering, write down:
- How many findings remain (these are the PR-relevant ones)
- If zero remain, note: "No quality violations in changed files" — still proceed to 4c

---

**Next:** Read `04c-classify-findings.md`
