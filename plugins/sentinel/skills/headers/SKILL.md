---
name: headers
description: HTTP security header analysis — context-aware grading with exploitable-risk focus, not checkbox counting.
argument-hint: "<url>"
---

# Sentinel Headers

Analyze HTTP security headers for a given URL. Grades based on actual exploitable risk rather than checkbox compliance. Provides WHY explanations and exact fix commands.

## Arguments

- `<url>` — Required. The URL to analyze (e.g., `https://example.com`)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-fetch-headers.md` | Fetch headers with curl, follow redirects, handle errors |
| 2 | `steps/02-analyze-headers.md` | Per-header analysis: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection |
| 3 | `steps/03-overall-grade.md` | Weighted scoring and A-F grading scale |
| 4 | `steps/04-report.md` | Formatted report template and platform-specific fix instructions |

**Start by reading:** `steps/01-fetch-headers.md`

## Notes

- This skill analyzes response headers only — it does not scan page content or JavaScript
- Grades are based on exploitable risk, not compliance checkbox counting
- X-XSS-Protection: 0 is correctly graded as PASS (the auditor is deprecated and harmful when enabled)
- CSP Report-Only is graded as PARTIAL (monitoring mode shows intent but does not enforce)
- HSTS preload list check prevents false negatives for preloaded domains
- Platform-specific fix instructions are provided when the hosting platform is detectable
- For comprehensive security testing, combine with `/sentinel:scan` for code-level analysis
