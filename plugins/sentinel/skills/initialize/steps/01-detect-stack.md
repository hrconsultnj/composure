# Step 1: Detect Project Stack

Check if Composure has already profiled the project:

```bash
cat .claude/no-bandaids.json 2>/dev/null
```

If `.claude/no-bandaids.json` exists, extract the `frameworks` and `packageManager` fields — no need to re-detect what Composure already knows.

If it does not exist, detect the stack manually by reading:

| File | What to extract |
|------|----------------|
| `package.json` | Framework, dependencies, scripts, engines |
| `requirements.txt` / `pyproject.toml` | Python dependencies |
| `go.mod` | Go modules |
| `Cargo.toml` | Rust crates |
| `Gemfile` / `Gemfile.lock` | Ruby gems |
| `composer.json` | PHP packages |

Build a minimal stack profile:

```json
{
  "language": "typescript",
  "framework": "nextjs",
  "hasLockfile": true,
  "lockfileType": "pnpm-lock.yaml"
}
```

---

**Next:** Read `steps/02-detect-pkg-managers.md`
