---
name: audit-deps
description: Focused dependency CVE audit — reports vulnerabilities with version info and safe upgrade commands.
argument-hint: "[--fix] [--json]"
---

# Sentinel Audit Dependencies

Run a focused dependency vulnerability audit using the project's detected package manager. Reports CVEs with installed versions, fixed versions, and exact upgrade commands.

## Arguments

- `--fix` — Automatically apply safe upgrades (patch/minor only, no major version bumps)
- `--json` — Output raw JSON from the audit tool instead of formatted report

## Prerequisites

Read `.claude/sentinel.json` for the preferred package manager. If it does not exist, detect the package manager from lockfiles:

1. `bun.lockb` or `bun.lock` — bun
2. `pnpm-lock.yaml` — pnpm
3. `yarn.lock` — yarn
4. `package-lock.json` — npm
5. `requirements.txt` / `pyproject.toml` — pip-audit
6. `go.mod` — govulncheck
7. `Cargo.lock` — cargo-audit

## Workflow

### Step 1: Run Audit

Execute the appropriate audit command:

```bash
# JavaScript/TypeScript
pnpm audit --json 2>/dev/null
npm audit --json 2>/dev/null
yarn audit --json 2>/dev/null

# Python
pip-audit --format=json 2>/dev/null

# Go
govulncheck -json ./... 2>/dev/null

# Rust
cargo audit --json 2>/dev/null
```

### Step 2: Parse and Enrich Results

For each vulnerability found, determine the **highest safe version** — not just "latest":

**For npm/pnpm/yarn packages:**

```bash
# Get all available versions
npm view <package> versions --json 2>/dev/null
```

Then determine the safe upgrade target:

1. **If a patched version exists in the same major.minor**: recommend that (e.g., `4.17.20` -> `4.17.21`)
2. **If no patch exists but a minor bump has the fix**: recommend the minor (e.g., `4.17.20` -> `4.18.0`)
3. **If only a major version has the fix**: flag it as a breaking change and recommend with a warning
4. **Never blindly recommend "latest"** — it may introduce breaking changes unrelated to the CVE

**For Python packages:**

```bash
pip index versions <package> 2>/dev/null
```

**For Go modules:**

```bash
go list -m -versions <module> 2>/dev/null
```

### Step 3: Report Findings

Format each finding with actionable details:

```
CRITICAL  CVE-2024-XXXXX  lodash@4.17.20
  Prototype Pollution — attacker can inject properties via crafted input
  Fixed in: 4.17.21 (patch, safe upgrade)
  Command:  pnpm update lodash

HIGH  CVE-2024-YYYYY  express@4.18.2
  Path Traversal — static file serving allows directory escape
  Fixed in: 4.19.2 (minor bump, review changelog)
  Command:  pnpm update express

HIGH  GHSA-XXXX-YYYY  next@14.1.0
  SSRF in Server Actions — requires major version upgrade
  Fixed in: 14.1.4 (patch, safe upgrade)
  Command:  pnpm update next

MODERATE  CVE-2024-ZZZZZ  postcss@8.4.31
  ReDoS in CSS parsing — low exploitability in server context
  Fixed in: 8.4.32 (patch, safe upgrade)
  Command:  pnpm update postcss
```

### Step 4: Summary

```
Dependency Audit Summary

Scanned: 342 packages via pnpm
Vulnerable: 11 packages

  Critical: 1 (1 auto-fixable)
  High:     3 (2 auto-fixable, 1 requires major upgrade)
  Moderate: 7 (7 auto-fixable)

Quick fix (patch/minor only — no breaking changes):
  pnpm update lodash postcss express next semver

Manual review needed:
  webpack@4.46.0 -> 5.x (major version, breaking changes)
    CVE-2024-AAAAA: Code injection via loader configuration
    Review: https://github.com/webpack/webpack/releases/tag/v5.0.0
```

### Step 5: Auto-fix (if --fix)

If `--fix` is passed, apply only safe upgrades:

```bash
# Only patch and minor updates — never auto-apply major bumps
pnpm update lodash postcss express next semver
```

Then re-run the audit to verify:

```bash
pnpm audit --json 2>/dev/null
```

Report what was fixed and what remains:

```
Auto-fix applied:
  - lodash 4.17.20 -> 4.17.21 (CVE-2024-XXXXX resolved)
  - express 4.18.2 -> 4.19.2 (CVE-2024-YYYYY resolved)
  - postcss 8.4.31 -> 8.4.32 (CVE-2024-ZZZZZ resolved)

Remaining (requires manual intervention):
  - webpack@4.46.0 — major upgrade needed (4.x -> 5.x)
```

## Notes

- This skill focuses exclusively on dependency vulnerabilities — use `/sentinel:scan` for code-level issues
- The "highest safe version" logic prevents recommending upgrades that introduce new breaking changes
- Major version upgrades are flagged but never auto-applied
- For monorepos, the audit runs at the workspace root and reports per-workspace vulnerabilities
- Results are also appended to `tasks-plans/tasks.md` if the file exists
- The 24h cache from the SessionStart hook is invalidated after running this skill
