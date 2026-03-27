---
name: deps-check
description: Check dependency health -- known CVEs, outdated packages, unsafe versions. Recommends the highest safe version, not just "latest". Blocks Critical CVEs via Composure commit gate.
argument-hint: "[--fix] [--json]"
---

# Shipyard Deps Check

Audit project dependencies for known vulnerabilities (CVEs), outdated packages, and unsafe version ranges. Unlike basic `npm audit`, this skill determines the **highest safe version** for each vulnerable package -- not just "update to latest" which may itself be vulnerable.

## Arguments

- `--fix` -- Auto-upgrade safe packages (patch/minor only, no major bumps). Re-audits after upgrade to verify.
- `--json` -- Output results as JSON (for CI integration or programmatic consumption)

## Workflow

### Step 1: Determine Package Manager

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

### Step 2: Run Dependency Audit

Execute the appropriate audit command based on detected package manager:

**JavaScript/TypeScript:**

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

**Python:**

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

**Go:**

```bash
# govulncheck
govulncheck -json ./... 2>/dev/null
```

If not available:

```
govulncheck not installed. Install with:
  go install golang.org/x/vuln/cmd/govulncheck@latest
```

**Rust:**

```bash
# cargo-audit
cargo audit --json 2>/dev/null
```

If not available:

```
cargo-audit not installed. Install with:
  cargo install cargo-audit
```

### Step 3: Parse and Enrich Results

For each vulnerability found, extract:

| Field | Description |
|-------|-------------|
| Package name | The vulnerable dependency |
| Current version | Version currently installed |
| CVE ID | e.g., CVE-2024-48930 (or GHSA ID if no CVE) |
| Severity | Critical / High / Medium / Low |
| Vulnerable range | e.g., `<3.0.1` |
| First patched version | The minimum version that fixes this CVE |
| Advisory URL | Link to the advisory for details |

**Determine the highest safe version** -- this is the key differentiator:

Do NOT just recommend "latest." The latest version may itself have vulnerabilities, or may be a major version bump that breaks the project.

For JavaScript packages:

```bash
# Get all published versions
npm view {package} versions --json 2>/dev/null
```

Then:

1. Filter to versions >= the first patched version
2. Cross-reference with the advisory data -- exclude versions in ANY vulnerable range for this package
3. Prefer the highest version within the current major (e.g., if on 2.x, recommend highest safe 2.x)
4. If no safe version exists in the current major, note that a major upgrade is required

```json
{
  "package": "example-lib",
  "current": "2.3.1",
  "vulnerable": "<2.3.5",
  "firstPatched": "2.3.5",
  "highestSafe": "2.4.2",
  "latestMajor": "3.1.0",
  "recommendation": "upgrade to 2.4.2 (patch/minor, safe)",
  "note": "3.1.0 exists but is a major version bump -- review changelog before upgrading"
}
```

For packages where the advisory affects ALL versions (no patch available):

```
WARNING: No patched version available for {package} ({CVE}).
  Consider: alternative package, or accept risk with documentation.
```

### Step 4: Auto-Fix (if --fix passed)

If `--fix` is requested, auto-upgrade packages that meet ALL of these criteria:

1. The upgrade is patch or minor (NOT a major version bump)
2. The highest safe version is known
3. The package is a direct dependency (not transitive-only)

Execute the upgrade:

```bash
# pnpm
pnpm update {package}@{highestSafe}

# npm
npm install {package}@{highestSafe}

# yarn
yarn upgrade {package}@{highestSafe}
```

After upgrading, **re-audit** to verify the fix:

```bash
pnpm audit --json 2>/dev/null
```

If the re-audit shows new vulnerabilities introduced by the upgrade:

1. Roll back the upgrade: `git checkout -- package.json pnpm-lock.yaml`
2. Report: "Upgrade of {package} to {version} introduced new vulnerability {CVE}. Rolled back."

If `--fix` is not passed but vulnerabilities are found, show the exact fix commands:

```
Fix commands (copy-paste ready):
  pnpm update example-lib@2.4.2
  pnpm update another-pkg@1.5.8
```

### Step 5: Write Critical/High CVEs to Task Queue

For each Critical or High severity vulnerability, write an entry to `tasks-plans/tasks.md`:

```markdown
- [ ] **[CVE-2024-48930]** example-lib@2.3.1 -- Prototype pollution in deep merge. Fix: upgrade to example-lib@2.4.2. Run: `pnpm update example-lib@2.4.2`
- [ ] **[GHSA-xxxx-yyyy]** another-pkg@1.2.0 -- ReDoS in URL parser. Fix: upgrade to another-pkg@1.5.8. Run: `pnpm update another-pkg@1.5.8`
```

These entries integrate with Composure's `/commit` gate:
- The commit skill reads `tasks-plans/tasks.md` for open tasks
- Open Critical/High tasks on staged files block commits
- Tasks are auto-cleaned when marked `[x]` (resolved)

The `**[CVE-...]**` prefix makes these entries grep-able and distinguishes them from code quality tasks (`**[DECOMPOSE]**`) and CI tasks (`**[CI]**`).

### Step 6: Report

**Standard output:**

```
Dependency Audit: <project-name>

Package manager: pnpm
Packages scanned: 847
Vulnerable: 3
Up-to-date: 844

Critical (1):
  example-lib@2.3.1
    CVE-2024-48930 -- Prototype pollution in deep merge
    Vulnerable: <2.3.5
    Highest safe: 2.4.2 (patch bump)
    Fix: pnpm update example-lib@2.4.2
    Advisory: https://github.com/advisories/GHSA-xxxx-yyyy

High (1):
  another-pkg@1.2.0
    GHSA-xxxx-yyyy -- ReDoS in URL parser
    Vulnerable: <1.5.0
    Highest safe: 1.5.8 (minor bump)
    Fix: pnpm update another-pkg@1.5.8

Medium (1):
  some-dep@3.0.0
    CVE-2024-55555 -- Information disclosure via timing attack
    Vulnerable: <3.0.3
    Highest safe: 3.0.3 (patch bump)
    Fix: pnpm update some-dep@3.0.3

Summary: 1 critical, 1 high, 1 medium
  Written to tasks-plans/tasks.md: 2 tasks (critical + high)
  Fix all: pnpm update example-lib@2.4.2 another-pkg@1.5.8 some-dep@3.0.3
```

**JSON output (--json):**

```json
{
  "packageManager": "pnpm",
  "packagesScanned": 847,
  "vulnerable": 3,
  "findings": [
    {
      "package": "example-lib",
      "current": "2.3.1",
      "severity": "critical",
      "cve": "CVE-2024-48930",
      "title": "Prototype pollution in deep merge",
      "vulnerableRange": "<2.3.5",
      "firstPatched": "2.3.5",
      "highestSafe": "2.4.2",
      "upgradeType": "patch",
      "fixCommand": "pnpm update example-lib@2.4.2",
      "advisory": "https://github.com/advisories/GHSA-xxxx-yyyy"
    }
  ],
  "fixAllCommand": "pnpm update example-lib@2.4.2 another-pkg@1.5.8 some-dep@3.0.3"
}
```

## Integration with Sentinel

If Sentinel is installed (`sentinelIntegration: true` in shipyard.json), deps-check complements Sentinel's `/sentinel:audit-deps`:

- **Sentinel audit-deps**: Focused on security -- runs as part of the broader security scan, writes to security task section
- **Shipyard deps-check**: Broader scope -- includes outdated packages, version health, and highest-safe-version analysis

Both write to the same `tasks-plans/tasks.md` and use the same CVE prefix format for deduplication. If both plugins report the same CVE, only one task entry is created.

## Notes

- This skill does NOT require `/shipyard:initialize` -- it auto-detects the package manager if no config exists
- The "highest safe version" logic prevents upgrading from one vulnerability into another
- Major version upgrades are never automatic -- they require manual review of breaking changes
- Transitive dependency vulnerabilities are reported but cannot be directly fixed with `--fix` (the parent dependency must be upgraded)
- For monorepos, audit runs at the root level (pnpm/npm audit covers the workspace)
- Re-audit after `--fix` catches cascading issues where upgrading one package pulls in a vulnerable transitive dependency
- CVE task entries are idempotent -- running deps-check multiple times does not duplicate entries in tasks.md
