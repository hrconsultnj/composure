# Step 4: Report and Task Queue

## Format Results

Aggregate all findings and report with severity levels:

```
CI/CD Validation: .github/workflows/ci.yml

actionlint: passed (0 errors)

Built-in checks:
  Critical (1):
    1. Package manager mismatch -- uses npm ci but project has pnpm-lock.yaml
       Fix: Replace npm ci with pnpm install --frozen-lockfile
       Line: 28

  High (1):
    2. Node.js version mismatch -- workflow uses 18, project requires >=20
       Fix: Update node-version to 22
       Line: 22

  Medium (2):
    3. No concurrency control
       Fix: Add concurrency group at workflow level
    4. Missing timeout-minutes on jobs: [build, deploy]
       Fix: Add timeout-minutes: 15

  Low (0): none

Summary: 1 critical, 1 high, 2 medium, 0 low
```

## Write Critical/High Issues to Task Queue

If any Critical or High severity issues were found, write them to `tasks-plans/tasks.md`:

```markdown
- [ ] **[CI]** Package manager mismatch in ci.yml -- uses npm ci but project has pnpm-lock.yaml. Fix: replace with `pnpm install --frozen-lockfile` (line 28)
- [ ] **[CI]** Node.js version mismatch in ci.yml -- uses 18, project requires >=20. Fix: update `node-version` to 22 (line 22)
```

These integrate with Composure's `/commit` gate -- open Critical/High tasks on staged files block commits.

---

**Done.**
