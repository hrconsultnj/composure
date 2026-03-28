---
name: scan
description: Full security scan — Semgrep static analysis with OWASP rulesets plus dependency audit. Writes structured findings to tasks-plans/tasks.md.
argument-hint: "[--semgrep-only] [--deps-only] [--path <dir>]"
---

# Sentinel Scan

Run a comprehensive security scan combining static analysis (Semgrep) and dependency vulnerability auditing. Results are written to `tasks-plans/tasks.md` using Composure's severity format for interoperability.

## Arguments

- `--semgrep-only` — Skip dependency audit, run only Semgrep
- `--deps-only` — Skip Semgrep, run only dependency audit
- `--path <dir>` — Scan a specific directory instead of project root

## Prerequisites

Read `.claude/sentinel.json` to determine:
- Which package manager to use for dependency audit
- Whether Semgrep is installed
- Project language and framework

If `.claude/sentinel.json` does not exist, run `/sentinel:initialize` first.

## Workflow

### Step 1: Semgrep Static Analysis

If Semgrep is installed:

```bash
# Run with OWASP Top 10 and language-specific rulesets
semgrep scan --config=auto --config=p/owasp-top-ten --json --quiet <target_path> 2>/dev/null
```

**Ruleset selection based on detected stack:**

| Language | Additional Rulesets |
|----------|-------------------|
| TypeScript/JavaScript | `p/javascript`, `p/typescript`, `p/react`, `p/nextjs` |
| Python | `p/python`, `p/django`, `p/flask` |
| Go | `p/golang` |
| Rust | `p/rust` |
| Ruby | `p/ruby` |
| Java | `p/java` |

Only include rulesets matching the detected framework. Do not add `p/django` for a Flask project.

Parse the JSON output. For each finding, extract:
- `check_id` — the rule that matched
- `path` — file path
- `start.line` / `end.line` — location
- `extra.message` — description
- `extra.severity` — ERROR, WARNING, INFO
- `extra.metadata.cwe` — CWE identifier if available
- `extra.metadata.owasp` — OWASP category if available

If Semgrep is not installed:

```
Semgrep is not installed — skipping static analysis.
Install with: brew install semgrep (or pip install semgrep)
Run /sentinel:initialize to update tooling detection.
```

### Step 2: Dependency Audit

Determine the audit command from the detected package manager:

| Package Manager | Audit Command |
|----------------|--------------|
| pnpm | `pnpm audit --json` |
| npm | `npm audit --json` |
| yarn | `yarn audit --json` |
| bun | (not yet supported — skip with note) |
| pip/pip3 | `pip-audit --format=json` (if pip-audit installed) |
| poetry | `poetry audit` (if available) or `pip-audit` |
| go | `govulncheck ./...` (if installed) |
| cargo | `cargo audit --json` (if cargo-audit installed) |

Parse the output for each vulnerability:
- Package name and installed version
- Vulnerability ID (CVE, GHSA, etc.)
- Severity (critical, high, moderate, low)
- Fixed version (if available)
- Description

**Enrich Critical and High findings with WebFetch:** For each Critical or High CVE, use WebFetch to pull additional context:
- `https://github.com/advisories/{GHSA-ID}` for GitHub Advisory details
- Or `https://www.cve.org/CVERecord?id={CVE-ID}` for CVE database
- Extract: exploit status (known exploited?), patch availability, affected version ranges, CVSS score
- Include this context in the task queue entry so the fix is actionable, not just an ID

### Step 3: Severity Mapping

Map findings to Composure's severity levels for `tasks-plans/tasks.md`:

| Source Severity | Composure Severity |
|----------------|-------------------|
| Semgrep ERROR | Critical |
| Semgrep WARNING | High |
| Semgrep INFO | Moderate |
| CVE Critical | Critical |
| CVE High | High |
| CVE Moderate | Moderate |
| CVE Low | (omit — not actionable enough) |

### Step 4: Write Findings to Task Queue

Append findings to `tasks-plans/tasks.md` under the appropriate severity section:

```markdown
## Critical

- [ ] **[SECURITY]** SQL Injection in `src/api/users.ts:45` — user input concatenated into query string (CWE-89, OWASP A03). Fix: use parameterized queries. [semgrep:typescript.express.security.audit.express-sql-injection]
- [ ] **[CVE-2024-XXXXX]** `lodash@4.17.20` — Prototype Pollution (Critical). Fix: upgrade to `lodash@4.17.21`. Run: `pnpm update lodash`

## High

- [ ] **[SECURITY]** Hardcoded JWT secret in `src/auth/config.ts:12` (CWE-798). Fix: move to environment variable. [semgrep:javascript.jwt.security.jwt-hardcoded-secret]
- [ ] **[CVE-2024-YYYYY]** `express@4.18.2` — Path Traversal (High). Fix: upgrade to `express@4.19.0`. Run: `pnpm update express`

## Moderate

- [ ] **[SECURITY]** Missing rate limiting on `/api/login` endpoint (CWE-307, OWASP A07). Consider adding express-rate-limit. [semgrep:javascript.express.security.audit.express-brute-force]
```

**Format rules:**
- Prefix with `**[SECURITY]**` for Semgrep findings or `**[CVE-XXXX]**` for dependency vulnerabilities
- Include file path and line number for code findings
- Include CWE and OWASP references when available
- Include the exact fix command for dependency issues
- Include the Semgrep rule ID in brackets at the end

### Step 5: Report Summary

Print a summary to the conversation:

```
Sentinel Security Scan Complete

Static Analysis (Semgrep):
  Critical: 2 findings
  High:     5 findings
  Moderate: 8 findings
  Rules:    p/owasp-top-ten, p/typescript, p/nextjs

Dependency Audit (pnpm):
  Critical: 1 CVE
  High:     3 CVEs
  Moderate: 7 CVEs
  Packages: 342 scanned, 11 vulnerable

Total: 26 findings written to tasks-plans/tasks.md
  - 3 Critical (fix immediately)
  - 8 High (fix this sprint)
  - 15 Moderate (schedule fix)

Top priorities:
  1. SQL Injection in src/api/users.ts:45 — exploitable, fix now
  2. CVE-2024-XXXXX in lodash@4.17.20 — known exploit, upgrade available
  3. Hardcoded JWT secret in src/auth/config.ts:12 — credential exposure
```

### Step 6: Known Critical CVE Check (framework-specific)

After the Semgrep + dependency audit, check for known critical CVEs that scanners may miss because they affect framework runtime, not dependencies:

**React Server Components (if react >= 19.0.0 detected):**
- CVE-2025-55182 (CVSS 10.0): Unauthenticated RCE via payload decoding in Server Functions. Fixed in react 19.0.1, 19.1.2, 19.2.1.
- CVE-2025-XXXXX (CVSS High): DoS + source code exposure in Server Components. Fixed in 19.0.4, 19.1.5, 19.2.4.
- Check: `grep -r "react.*19\.[0-2]\.[0-3]" package.json pnpm-lock.yaml` — if vulnerable version found, report as Critical.

**Supabase (if @supabase/supabase-js detected):**
- Check for `service_role` key usage in client-side code (not Edge Functions or server-only files). Bypasses ALL RLS.
- Check for `.rpc()` calls without RLS policies on the underlying function.

**This list should be refreshed via Context7 when staleness thresholds are exceeded** (see `.claude/sentinel.json` staleness config). Query Context7 for `{framework} security vulnerabilities CVE` to discover new entries.

## Notes

- Findings are appended to `tasks-plans/tasks.md`, never overwritten — existing tasks are preserved
- Duplicate findings (same rule + same file + same line) are skipped
- Low-severity dependency vulnerabilities are omitted to reduce noise
- The known CVE list (Step 6) is a point-in-time snapshot — Context7 queries keep it current based on staleness thresholds
- If neither Semgrep nor a package manager audit is available, report what was skipped and why
- The scan is read-only — it does not modify any project source files
- For CI integration, the JSON output from Semgrep can be piped to other tools
