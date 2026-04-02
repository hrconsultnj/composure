# Step 1: Read Composure Config or Detect Stack

Check if Composure has already profiled the project:

```bash
cat .claude/no-bandaids.json 2>/dev/null
```

If `.claude/no-bandaids.json` exists, extract `frameworks`, `packageManager`, and stack info -- no need to re-detect what Composure already knows.

If it does not exist, detect the stack manually by reading:

| File | What to extract |
|------|----------------|
| `package.json` | Framework, dependencies, scripts, engines, packageManager field |
| `tsconfig.json` | TypeScript presence |
| `requirements.txt` / `pyproject.toml` | Python presence |
| `go.mod` | Go presence |
| `Cargo.toml` | Rust presence |

Build a minimal stack profile:

```json
{
  "framework": "nextjs",
  "packageManager": "pnpm",
  "nodeVersion": "22",
  "hasTypecheck": true,
  "hasLint": true,
  "hasTests": true,
  "testCommand": "pnpm test",
  "buildCommand": "pnpm build"
}
```

Extract `hasTypecheck`, `hasLint`, `hasTests` from `package.json` scripts:
- `hasTypecheck` -- true if scripts contain `tsc`, `typecheck`, or `type-check`
- `hasLint` -- true if scripts contain `lint` or `eslint`
- `hasTests` -- true if scripts contain `test`, `vitest`, `jest`, or `playwright`
- `testCommand` -- the exact script command (e.g., `pnpm test`, `pnpm vitest`)
- `buildCommand` -- the exact build script (e.g., `pnpm build`, `npm run build`)

---

**Next:** Read `steps/02-detect-platform.md`
