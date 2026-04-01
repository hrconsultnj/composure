# Step 7: Write Findings to Task Queue

Append all non-Ignored findings to `tasks-plans/tasks.md` under the appropriate severity section, using the priority and exposure data computed in Steps 4-6.

## 7a. Entry Format

Each finding is written as a task entry with priority, exposure zone, and actionable details:

```markdown
## Critical

- [ ] **[P0:Public] [SECURITY]** SQL Injection in `src/api/users.ts:45` — user input concatenated into query string (CWE-89). Exposed via 3 public API routes. Fix: use parameterized queries. [semgrep:typescript.express.security.audit.express-sql-injection]

## High

- [ ] **[P1:Auth] [CVE-2024-XXXXX]** `lodash@4.17.20` — Prototype Pollution. Imported by 5 authenticated routes. Fix: `pnpm update lodash` or add override `"lodash": ">=4.17.21"`.

## Moderate

- [ ] **[P2:Public] [SECURITY]** Missing rate limiting on `/api/login` (CWE-307). Consider express-rate-limit.
```

## 7b. Format Rules

- **Priority tag:** `[P0:Public]`, `[P1:Auth]`, `[P2:Internal]`, `[P3:Dead]` — priority level + exposure zone abbreviation
- **Finding type:** `[SECURITY]` for Semgrep findings, `[CVE-XXXX]` for dependency vulnerabilities, `[BANNED]` for banned packages, `[KNOWN-CVE]` for framework-specific CVEs from Step 6
- **File location:** Include file path and line number for code findings
- **CWE and OWASP references:** Include when available
- **Exposure context:** Include caller count and zone (e.g., "Exposed via 3 public API routes")
- **Fix command:** Include the exact fix command for dependency issues (e.g., `pnpm update lodash`)
- **Rule ID:** Include the Semgrep rule ID in brackets at the end for code findings
- **Banned package alternatives:** List alternatives from the banned-packages.json entry

## 7c. Section Mapping

Write findings to sections based on their Composure severity (from Step 5):

| Priority | Composure Severity | Section |
|----------|-------------------|---------|
| P0 | Critical | `## Critical` |
| P1 | High | `## High` |
| P2 | Moderate | `## Moderate` |
| P3 | Low | `## Low` |

If a section does not exist in `tasks-plans/tasks.md`, create it. If it already exists, append under it.

## 7d. Deduplication

Before writing, check existing entries in `tasks-plans/tasks.md`. Skip any finding where the same combination of:
- Rule ID (or CVE/GHSA ID)
- File path
- Line number

already exists as a task entry. This prevents duplicate entries on repeat scans.

## 7e. Preservation

Findings are **appended** to `tasks-plans/tasks.md`, never overwritten. Existing tasks (security or otherwise) are always preserved.

---

**Next:** Read `steps/08-report-summary.md`
