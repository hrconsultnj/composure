---
name: preflight
description: Production readiness checklist. Checks environment variables, health endpoints, error monitoring, CORS, rate limiting, and security headers.
argument-hint: "[--strict] [--url <deployment-url>]"
---

Run a production readiness checklist before deploying. Checks environment variables, health endpoints, error monitoring, CORS, rate limiting, security headers, performance, database, and DNS/SSL configuration. Catches the things that work in dev but break in prod.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"~/.composure/bin/composure-fetch.mjs" skill shipyard preflight {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-load-config.md` |
| 2 | `02a-environment-health.md` |
| 3 | `02b-security-performance.md` |
| 4 | `02c-database-dns.md` |
| 5 | `03-report.md` |
| 6 | `04-write-tasks.md` |
