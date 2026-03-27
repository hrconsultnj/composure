---
name: initialize
description: Detect project stack, package managers, and security tooling. Generate .claude/sentinel.json config. Run once per project.
argument-hint: "[--force] [--dry-run]"
---

# Sentinel Initialize

Bootstrap Sentinel project-level configuration by detecting the tech stack, available package managers, system installers, and security tooling.

## Arguments

- `--force` — Overwrite existing `.claude/sentinel.json`
- `--dry-run` — Show what would be generated without writing files

## Workflow

### Step 1: Detect Project Stack

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

### Step 2: Detect Package Managers

Check for installed package managers in priority order:

**JavaScript/TypeScript:**
1. `bun --version` — preferred if available
2. `pnpm --version` — recommended default
3. `yarn --version`
4. `npm --version` — always available with Node

**Python:**
1. `pip --version` or `pip3 --version`
2. `pipenv --version`
3. `poetry --version`
4. `uv --version`

**Go:**
1. `go version` (built-in module system)

**Rust:**
1. `cargo --version`

**System installers:**
1. `brew --version` (macOS)
2. `apt --version` (Debian/Ubuntu)
3. `dnf --version` (Fedora/RHEL)
4. `pacman --version` (Arch)
5. `choco --version` (Windows)
6. `winget --version` (Windows)
7. `nix --version` (NixOS/cross-platform)

Record the detected version for each. Store the **preferred** package manager (first detected in priority order) and all available ones.

### Step 3: npm Migration Check

If the project uses npm (has `package-lock.json` but no other lockfile):

```
NOTE: This project uses npm. Consider migrating to pnpm for:
  - Faster installs (content-addressable storage)
  - Stricter dependency resolution (no phantom dependencies)
  - Better monorepo support
  - Built-in audit with pnpm audit

Migration commands:
  1. npm install -g pnpm
  2. pnpm import           # converts package-lock.json to pnpm-lock.yaml
  3. rm package-lock.json
  4. pnpm install           # verify everything resolves
  5. Update CI scripts to use pnpm

This is a recommendation, not a blocker. Sentinel works with any package manager.
```

### Step 4: Check Security Tooling

#### Semgrep

```bash
semgrep --version 2>/dev/null
```

If Semgrep is installed, record the version. If not:

```
Semgrep is not installed. It provides static analysis with OWASP rulesets.

Install with:
  brew install semgrep          # macOS (Homebrew)
  pip install semgrep           # Python pip
  pipx install semgrep          # Isolated Python install

Semgrep is optional but enables /sentinel:scan for deep static analysis.
```

Use the detected system installer to recommend the appropriate install command.

#### Other tools (record if present, do not require):

```bash
trivy --version 2>/dev/null       # Container/filesystem scanner
grype --version 2>/dev/null       # Vulnerability scanner
syft --version 2>/dev/null        # SBOM generator
pip-audit --version 2>/dev/null   # Python dependency audit
govulncheck -version 2>/dev/null  # Go vulnerability check
```

### Step 5: Generate Config

Create `.claude/sentinel.json`:

```json
{
  "version": "1.0.0",
  "detectedAt": "2026-03-27T12:00:00Z",
  "project": {
    "language": "typescript",
    "framework": "nextjs",
    "lockfileType": "pnpm-lock.yaml"
  },
  "packageManagers": {
    "preferred": "pnpm",
    "available": {
      "pnpm": "10.6.2",
      "npm": "10.9.0",
      "bun": null,
      "yarn": null
    }
  },
  "systemInstallers": {
    "preferred": "brew",
    "available": {
      "brew": "4.5.2",
      "apt": null,
      "choco": null
    }
  },
  "securityTools": {
    "semgrep": "1.108.0",
    "trivy": null,
    "grype": null,
    "pipAudit": null,
    "govulncheck": null
  },
  "composureIntegration": true,
  "staleness": {
    "patternsGeneratedAt": "2026-03-27",
    "thresholdDays": {
      "typescript": 30,
      "python": 60,
      "go": 90,
      "rust": 90
    },
    "note": "Aggressive freshness — max 90 days for any language. In the age of AI, frontend surfaces change monthly, server patterns quarterly. Stale security advice is worse than an extra Context7 query."
  }
}
```

If `--dry-run`, print the JSON to stdout without writing.

If the file already exists and `--force` is not passed, skip generation:

```
.claude/sentinel.json already exists. Use --force to overwrite.
```

### Step 6: Ensure tasks-plans Directory

If `tasks-plans/tasks.md` does not exist, create it (same as Composure format for interoperability):

```markdown
# Security Tasks

> Auto-populated by Sentinel hooks and scans. Process with /sentinel:scan or /sentinel:audit-deps.

## Critical

## High

## Moderate
```

If it already exists (Composure created it), leave it untouched.

### Step 7: Report

```
Sentinel initialized for <project-name>

Stack:
  - TypeScript / Next.js
  - Lockfile: pnpm-lock.yaml

Package managers:
  - Preferred: pnpm 10.6.2
  - Available: pnpm, npm

System installers:
  - Preferred: brew 4.5.2

Security tooling:
  - Semgrep: 1.108.0
  - Trivy: not installed
  - Grype: not installed

Generated:
  - .claude/sentinel.json

Composure integration: yes (.claude/no-bandaids.json found)

Available skills:
  /sentinel:scan        — Full security scan (Semgrep + dependency audit)
  /sentinel:audit-deps  — Focused dependency CVE audit
  /sentinel:headers     — HTTP security header analysis
```

## Notes

- This skill is idempotent — running it again updates detection results
- With `--force`, it overwrites the existing config
- With `--dry-run`, it prints what would be generated without writing
- Composure config is read but never modified — Sentinel is a consumer, not a producer
- If no package manager lockfile is found, dependency audit skills will be limited
