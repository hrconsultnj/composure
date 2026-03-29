# Step 2: External Linter (actionlint)

For GitHub Actions workflows, check if `actionlint` is available:

```bash
actionlint --version 2>/dev/null
```

If available, run it on each GitHub Actions workflow:

```bash
actionlint .github/workflows/ci.yml
```

Parse the output. Each error includes file, line number, column, and message. Record all findings.

If `actionlint` is not available, note it:

```
actionlint not available -- using built-in checks only.
Install for deeper validation: brew install actionlint
```

---

**Next:** Read `steps/03a-heuristic-checks-1-6.md`
