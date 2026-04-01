# Step 8: Report Summary

Print a comprehensive summary to the conversation with exposure breakdown and top priorities.

## 8a. Summary Format

```
Sentinel Security Scan Complete

Static Analysis (Semgrep):
  Critical: 2 findings
  High:     5 findings
  Moderate: 8 findings
  Rules:    p/owasp-top-ten, p/typescript, p/nextjs

Dependency Audit (pnpm):
  Critical: 1 CVE (+ 2 banned packages)
  High:     3 CVEs
  Moderate: 7 CVEs
  Packages: 342 scanned, 11 vulnerable

Exposure Analysis (Composure graph):
  Public:        3 findings (fix immediately)
  Authenticated: 8 findings (fix this sprint)
  Internal:      12 findings (schedule)
  Dead Code:     4 findings (consider removing)

Priority Summary:
  P0 (Critical + Public):  2 — fix NOW
  P1 (High + Public, Critical + Auth): 5 — fix this sprint
  P2 (Moderate + Public, High + Auth): 8 — schedule
  P3 (Internal/Dead): 12 — backlog

Top priorities:
  1. [P0] SQL Injection in src/api/users.ts:45 — publicly exposed, 3 routes
  2. [P0] CVE-2024-XXXXX in lodash — publicly exposed via src/app/api/public/search
  3. [P1] Hardcoded JWT secret in src/auth/config.ts — authenticated routes only
```

## 8b. Adapting the Summary

The example above is illustrative. Adapt it to actual results:

- **Semgrep section:** Only show if Semgrep was run. List the actual rulesets used.
- **Dependency section:** Show the actual package manager name. Include banned package counts separately from CVE counts.
- **Exposure section:** Show actual counts per exposure zone.
- **Priority section:** Show actual counts per priority level. Only show priority levels that have findings.
- **Top priorities:** List up to 5 top-priority findings, starting from P0. Include the exposure context (which routes, how many callers).

## 8c. Edge Cases

- **No findings:** Report a clean scan. Still show what was scanned.
- **Semgrep not installed:** Note it was skipped, show only dependency results.
- **No dependency audit available:** Note it was skipped, show only Semgrep results.
- **All findings are Ignore-priority:** Report that all findings are low-risk and no task queue entries were created.
- **Known CVE staleness:** If the staleness warning was triggered in Step 6, repeat it here.

## 8d. Final Line

End with the total count written to the task queue:

```
Total: 27 findings written to tasks-plans/tasks.md
  Skipped: 4 (Ignore priority), 2 (duplicates)
```
