# Step 2: Run Dependency Audit

Execute the appropriate audit command based on detected package manager:

## JavaScript/TypeScript

```bash
# pnpm
pnpm audit --json 2>/dev/null

# npm
npm audit --json 2>/dev/null

# yarn (v1)
yarn audit --json 2>/dev/null

# bun (check if audit subcommand exists)
bun audit 2>/dev/null || echo '{"note": "bun audit not available, falling back to npm audit"}'
```

If `bun audit` is not available, fall back to running `npm audit --json` against the project (bun is npm-compatible for audit purposes).

## Python

```bash
# pip-audit (preferred)
pip-audit --format json 2>/dev/null

# safety (alternative)
safety check --json 2>/dev/null
```

If neither is available:

```
No Python audit tool found. Install one:
  pip install pip-audit     # Recommended
  pip install safety        # Alternative
```

## Go

```bash
# govulncheck
govulncheck -json ./... 2>/dev/null
```

If not available:

```
govulncheck not installed. Install with:
  go install golang.org/x/vuln/cmd/govulncheck@latest
```

## Rust

```bash
# cargo-audit
cargo audit --json 2>/dev/null
```

If not available:

```
cargo-audit not installed. Install with:
  cargo install cargo-audit
```

---

**Next:** Read `steps/03-enrich-results.md`
