---
name: preflight
description: Production readiness checklist. Checks environment variables, health endpoints, error monitoring, CORS, rate limiting, and security headers.
argument-hint: "[--strict] [--url <deployment-url>]"
---

# Shipyard Preflight

Run a production readiness checklist before deploying. Checks environment variables, health endpoints, error monitoring, CORS, rate limiting, security headers, performance, database, and DNS/SSL configuration. Catches the things that work in dev but break in prod.

## Arguments

- `--strict` -- Write ALL failures (not just Critical) to `tasks-plans/tasks.md` as blockers
- `--url <deployment-url>` -- Test a live deployment URL for health endpoint, headers, and SSL. Without this, only local/static checks run.

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-load-config.md` | Read composure/sentinel/shipyard configs |
| 2a | `steps/02a-environment-health.md` | Check environment vars, secrets, health endpoint, monitoring, logging |
| 2b | `steps/02b-security-performance.md` | Check CORS, rate limiting, CSRF, build size, images, dev deps |
| 2c | `steps/02c-database-dns.md` | Check migrations, pooling, backups, SSL, HSTS, redirects |
| 3 | `steps/03-report.md` | Format pass/warn/fail/skip results into summary |
| 4 | `steps/04-write-tasks.md` | Write failures to task queue (default vs strict mode) |

**Start by reading:** `steps/01-load-config.md`

## Notes

- This skill is designed to run before a production deployment, not during development
- Local/static checks run without any network access -- only DNS/SSL checks require `--url`
- Security checks are delegated to Sentinel when installed to avoid duplication
- The checklist is framework-aware -- Next.js gets image optimization checks, SPAs get bundle size checks, etc.
- Database checks adapt to the ORM/database detected (Prisma, Drizzle, Supabase, raw pg)
- `--strict` mode is useful in CI to fail the pipeline on any non-passing check
- Items written to `tasks-plans/tasks.md` integrate with Composure's commit gate
- Re-running preflight after fixing issues will show updated PASS/FAIL status
- For live deployment validation, combine with `/sentinel:headers --url` for comprehensive coverage
