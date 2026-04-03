---
name: preflight
description: Production readiness checklist. Checks environment variables, health endpoints, error monitoring, CORS, rate limiting, and security headers.
argument-hint: "[--strict] [--url <deployment-url>]"
---

Run a production readiness checklist before deploying. Checks environment variables, health endpoints, error monitoring, CORS, rate limiting, security headers, performance, database, and DNS/SSL configuration. Catches the things that work in dev but break in prod.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill shipyard preflight {step-filename}
```

Cached content is at `~/.composure/cache/shipyard/skills/preflight/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `01-load-config.md` |
| 2 | `02a-environment-health.md` |
| 3 | `02b-security-performance.md` |
| 4 | `02c-database-dns.md` |
| 5 | `03-report.md` |
| 6 | `04-write-tasks.md` |

