# Step 1: Determine Package Manager

Read `.claude/shipyard.json` for the package manager:

```bash
cat .claude/shipyard.json 2>/dev/null
```

If Shipyard is not initialized, fall back to Sentinel config:

```bash
cat .claude/sentinel.json 2>/dev/null
```

If neither exists, auto-detect from lockfiles:

| Lockfile | Package Manager |
|----------|----------------|
| `pnpm-lock.yaml` | pnpm |
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `bun.lockb` or `bun.lock` | bun |
| `requirements.txt` / `pyproject.toml` | pip |
| `go.sum` | go |
| `Cargo.lock` | cargo |

---

**Next:** Read `steps/02-run-audit.md`
