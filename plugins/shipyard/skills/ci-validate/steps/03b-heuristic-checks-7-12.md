# Step 3b: Heuristic Checks 7-12

**You MUST run ALL 6 checks in this file. Do NOT skip any. These checks are equally important as checks 1-6.**

## Check 7: No Timeout

Check for `timeout-minutes:` on each job:

```
ISSUE: Missing timeout-minutes
  Jobs without timeout can hang indefinitely and consume CI minutes.
  Jobs missing timeout: [build, deploy]
  Suggestion: Add timeout-minutes: 15 to each job.
  Severity: Medium
```

## Check 8: Deprecated Actions

Check for outdated action versions:

| Pattern | Issue |
|---------|-------|
| `actions/checkout@v2` or `@v3` | Use `@v4` |
| `actions/setup-node@v2` or `@v3` | Use `@v4` |
| `actions/cache@v2` or `@v3` | Use `@v4` |
| `actions/upload-artifact@v2` or `@v3` | Use `@v4` |

```
ISSUE: Deprecated action version
  actions/checkout@v3 is outdated (latest stable: v4).
  Suggestion: Update to actions/checkout@v4
  Severity: Medium
```

## Check 9: Missing Permissions Block

Check if the workflow has a top-level `permissions:` block:

```
ISSUE: Missing permissions block
  Without explicit permissions, the workflow runs with the default token permissions
  (which may be overly broad depending on repo settings).
  Suggestion: Add permissions: { contents: read } at the workflow level.
  Severity: Medium
```

## Check 10: Overly Broad Triggers

Check the `on:` trigger configuration:

```
ISSUE: Overly broad trigger
  Workflow triggers on push to ALL branches. This runs CI on every push to every branch.
  Suggestion: Restrict to push on main + pull_request events.
  Severity: Low
```

## Check 11: No Test Step

If `.claude/shipyard.json` shows `hasTests: true` but no test step exists in the workflow:

```
ISSUE: Missing test step
  Project has a test suite (pnpm test) but the CI workflow does not run tests.
  Suggestion: Add a test job that runs after install.
  Severity: High
```

## Check 12: npm install instead of npm ci

If the workflow uses `npm install` instead of `npm ci`:

```
ISSUE: Using npm install instead of npm ci
  npm install can modify package-lock.json, leading to inconsistent builds.
  Suggestion: Replace npm install with npm ci for reproducible installs.
  Severity: High
```

---

**Next:** Read `steps/04-report-and-tasks.md`
