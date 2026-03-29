# Step 1: Detect Stack Configuration

Read Composure config for framework detection:

```bash
cat .claude/no-bandaids.json 2>/dev/null
```

If not available, read `.claude/shipyard.json`:

```bash
cat .claude/shipyard.json 2>/dev/null
```

If neither exists, detect the framework manually from `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.

Extract:
- Framework (nextjs, vite, fastapi, go, rust, etc.)
- Package manager (pnpm, npm, bun, pip, etc.)
- Node version (from `.nvmrc`, `.node-version`, `package.json` engines, or default to 22)
- Build command (from `package.json` scripts)
- Output directory (`.next` for Next.js, `dist` for Vite, `build` for CRA, etc.)

---

**Next:** Read `steps/02-generate.md` (if `--generate` mode) or `steps/03-validate.md` (if `--validate` mode).
