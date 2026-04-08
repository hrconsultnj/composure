---
name: audit-deps
description: Dependency CVE audit with safe upgrade commands.
argument-hint: "[--fix] [--json]"
---

Run a focused dependency vulnerability audit using the project's detected package manager. Reports CVEs with installed versions, fixed versions, and exact upgrade commands. Cross-references installed packages against the Sentinel banned-packages list.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill sentinel audit-deps {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-run-audit.md` |
| 2 | `02-parse-and-enrich.md` |
| 3 | `03-report-findings.md` |
| 4 | `04-propose-overrides.md` |
| 5 | `05-summary.md` |
| 6 | `06-auto-fix.md` |
