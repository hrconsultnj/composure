# Step 4c: Categorize Findings into Buckets

Sort the filtered findings (from step 4b) into three buckets:

## Bucket 1 — Oversized Functions

Functions exceeding the 100-line threshold.

For each:
- Record the function name, file path, and line count
- Example: `processOrder` in `src/api/orders.ts` — 156 lines

## Bucket 2 — Untested Code

Functions/classes without `TESTED_BY` edges in the graph.

For each:
- Record the function name and file path
- Cross-reference with `CHANGED_FILES`: is this a NEW function added by this PR, or a pre-existing function that was modified?
  - New function without tests → flag as "New function, tests recommended"
  - Modified function without tests → flag as "Modified function, no existing tests"

## Bucket 3 — Oversized Files

Files exceeding line count thresholds.

For each:
- Record the file path and line count
- Check: did this PR make the file larger? Compare against the base branch:
  ```bash
  git diff <BASE_BRANCH>...HEAD --stat -- <file_path>
  ```
  - If the PR added significant lines → flag as "PR increased file size"
  - If the file was already oversized before this PR → note but don't flag as a PR issue

---

**Next:** Read `04d-test-coverage.md`
