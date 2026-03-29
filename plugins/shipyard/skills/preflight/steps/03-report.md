# Step 3: Report

Format the results of all checks into a summary report. Use the following template:

```
Production Readiness: <project-name>

Environment & Secrets:
  [PASS] .env.example exists
  [WARN] 2 env vars referenced in code but missing from .env.example:
         - DATABASE_URL (lib/db.ts:4)
         - REDIS_URL (lib/cache.ts:8)
  [PASS] .env is gitignored, no env files tracked
  [WARN] No production env documentation found

Health & Monitoring:
  [PASS] Health endpoint: app/api/health/route.ts
  [PASS] Error monitoring: Sentry (@sentry/nextjs)
  [WARN] 14 console.log calls in production code (consider pino or winston)

Security:
  [PASS] Delegated to Sentinel (run /sentinel:headers for full analysis)

Performance:
  [PASS] Build output: 3.2MB (.next/)
  [PASS] Using next/image (0 raw <img> tags)
  [PASS] Production install excludes devDependencies

Database:
  [PASS] Migration step in CI (prisma migrate deploy)
  [WARN] No connection pooling detected
  [SKIP] Backup verification (manual check required)

DNS & SSL:
  [SKIP] No --url provided (pass --url https://example.com for live checks)

Summary: 8 passed, 4 warnings, 0 failed, 2 skipped
  Ready for production (warnings are recommendations, not blockers)
```

---

**Next:** Read `steps/04-write-tasks.md`
