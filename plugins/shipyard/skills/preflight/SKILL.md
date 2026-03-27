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

### Step 1: Load Configuration

Read stack from Composure config:

```bash
cat .claude/no-bandaids.json 2>/dev/null
```

Read security config from Sentinel (if installed):

```bash
cat .claude/sentinel.json 2>/dev/null
```

Read deployment config from Shipyard:

```bash
cat .claude/shipyard.json 2>/dev/null
```

If none exist, detect the framework manually from `package.json`.

### Step 2: Run the Checklist

Each check produces one of four results:
- **PASS** -- Requirement met
- **FAIL** -- Requirement not met (blocks deployment in `--strict` mode)
- **WARN** -- Not ideal but not a hard blocker
- **SKIP** -- Check not applicable to this stack

---

#### Category 1: Environment and Secrets

**1.1: .env.example exists**

```bash
ls .env.example .env.sample 2>/dev/null
```

Check that an example env file exists so developers and CI know which environment variables are needed.

- PASS: `.env.example` or `.env.sample` exists
- FAIL: Neither exists

**1.2: All referenced env vars are documented**

Scan source code for `process.env.`, `import.meta.env.`, `os.environ`, or `os.Getenv` references:

```bash
grep -rn "process\.env\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ app/ 2>/dev/null | grep -oP 'process\.env\.(\w+)' | sort -u
```

Compare against entries in `.env.example`. Report any env vars referenced in code but missing from `.env.example`:

- PASS: All referenced vars are documented
- WARN: Missing entries listed (with file:line references)

**1.3: No secrets committed to git**

Check that `.env` is in `.gitignore`:

```bash
grep -q "^\.env$\|^\.env\.\|^\.env\.local$" .gitignore 2>/dev/null
```

Also check if any `.env` file (not `.env.example`) is tracked by git:

```bash
git ls-files --cached .env .env.local .env.production .env.development 2>/dev/null
```

- PASS: `.env` is gitignored and no env files are tracked
- FAIL: `.env` files are tracked in git (potential secret leak)

**1.4: Production env vars documented**

Check for a deployment/environment section in README, `.env.example` comments, or a dedicated `docs/` file that lists production-required env vars:

- PASS: Production env documentation found
- WARN: No obvious production env documentation

---

#### Category 2: Health and Monitoring

**2.1: Health endpoint exists**

Search for a health check endpoint in the codebase:

```bash
# Next.js API routes
ls app/api/health/route.ts pages/api/health.ts 2>/dev/null

# Express/Fastify/Hono
grep -rn "'/health'\|'/healthz'\|'/api/health'" --include="*.ts" --include="*.js" src/ app/ 2>/dev/null
```

If `--url` is provided, also hit the endpoint:

```bash
curl -s -o /dev/null -w "%{http_code}" {url}/api/health 2>/dev/null
curl -s -o /dev/null -w "%{http_code}" {url}/health 2>/dev/null
curl -s -o /dev/null -w "%{http_code}" {url}/healthz 2>/dev/null
```

- PASS: Health endpoint found (and returns 200 if URL provided)
- FAIL: No health endpoint detected
- WARN: Endpoint exists in code but returns non-200 on live URL

**2.2: Error monitoring configured**

Check for error monitoring SDK in dependencies:

| Package | Service |
|---------|---------|
| `@sentry/nextjs`, `@sentry/node`, `@sentry/react` | Sentry |
| `@logrocket/react`, `logrocket` | LogRocket |
| `@datadog/browser-rum`, `dd-trace` | Datadog |
| `@bugsnag/js`, `@bugsnag/plugin-react` | Bugsnag |
| `@honeybadger-io/js` | Honeybadger |
| `newrelic` | New Relic |

Also check for the corresponding env var (e.g., `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`):

- PASS: Error monitoring SDK installed and DSN configured
- WARN: SDK installed but no DSN env var found
- FAIL: No error monitoring detected

**2.3: Structured logging (not just console.log)**

Check if the project uses a logging library:

| Package | Library |
|---------|---------|
| `pino`, `pino-http` | Pino |
| `winston` | Winston |
| `bunyan` | Bunyan |
| `@logtail/node` | Logtail |

Check for bare `console.log` in production code (excluding test files):

```bash
grep -rn "console\.log(" --include="*.ts" --include="*.tsx" --include="*.js" src/ app/ lib/ 2>/dev/null | grep -v "test\|spec\|__test" | wc -l
```

- PASS: Logging library installed
- WARN: No logging library, and console.log found in production code

---

#### Category 3: Security

**3.1: Delegate to Sentinel (if installed)**

If Sentinel is installed (`sentinelIntegration: true`), delegate security checks:

```
Security checks delegated to Sentinel.
Run /sentinel:headers for HTTP security header analysis.
Run /sentinel:scan for full security audit.
```

If `--url` is provided and Sentinel is installed, suggest running `/sentinel:headers --url {url}`.

**3.2: CORS configuration (if no Sentinel)**

If Sentinel is NOT installed, check CORS configuration:

- Search for CORS middleware or headers in the codebase
- Check for `Access-Control-Allow-Origin: *` (overly permissive)

- PASS: CORS configured with specific origins
- WARN: CORS set to `*` (allow all origins)
- FAIL: No CORS configuration found for API routes

**3.3: Rate limiting on API routes**

Check for rate limiting middleware:

| Package | Library |
|---------|---------|
| `express-rate-limit` | Express rate limiter |
| `@upstash/ratelimit` | Upstash rate limiter |
| `rate-limiter-flexible` | Generic rate limiter |

Also check for Vercel/Cloudflare edge rate limiting config.

- PASS: Rate limiting detected
- WARN: No rate limiting found on API routes

**3.4: CSRF protection**

Check for CSRF middleware or tokens on mutation routes:

- PASS: CSRF protection detected (token middleware, SameSite cookies)
- WARN: No CSRF protection detected on form/mutation endpoints

---

#### Category 4: Performance

**4.1: Build output size**

If a build exists, check its size:

```bash
du -sh .next/ dist/ build/ out/ 2>/dev/null
```

- PASS: Build output under 5MB (SPAs) or under 50MB (SSR with pages)
- WARN: Build output exceeds threshold
- SKIP: No build output found (run build first)

**4.2: Image optimization**

For Next.js, check if `next/image` is used instead of raw `<img>`:

```bash
grep -rn "<img " --include="*.tsx" --include="*.jsx" src/ app/ 2>/dev/null | wc -l
```

Check for `sharp` in dependencies (Next.js image optimization):

- PASS: Using framework image optimization
- WARN: Raw `<img>` tags found without optimization

**4.3: No dev dependencies in production**

Check the Dockerfile (if exists) for `--production` or `--prod` flag on install:

- For pnpm: `--prod` or `--frozen-lockfile` (pnpm defaults to prod in NODE_ENV=production)
- For npm: `npm ci --omit=dev`

Also check if `devDependencies` packages are imported in production code:

- PASS: Production install excludes devDependencies
- WARN: Potential devDependency in production code
- SKIP: No Dockerfile (not containerized)

---

#### Category 5: Database

**5.1: Migrations in CI**

Check if the CI workflow includes a migration step:

```bash
grep -n "migrate\|db:push\|prisma migrate\|drizzle.*push\|supabase.*push" .github/workflows/*.yml 2>/dev/null
```

- PASS: Migration step found in CI
- WARN: No migration step in CI (manual migration risk)
- SKIP: No database detected

**5.2: Connection pooling**

Check for connection pooling configuration:

| Pattern | Pooling |
|---------|---------|
| `?pgbouncer=true` in connection string | PgBouncer |
| `connection_limit` in Prisma schema | Prisma pool |
| `pool` in drizzle config | Drizzle pool |
| Supabase uses built-in pooler (port 6543) | Supabase pooler |

- PASS: Connection pooling configured
- WARN: No connection pooling detected (may exhaust connections under load)
- SKIP: No database detected

**5.3: Backups configured**

This is documentation-only (cannot detect from code):

- WARN: Verify database backups are configured and tested
- SKIP: No database detected

---

#### Category 6: DNS and SSL (requires --url)

If `--url` is not provided, SKIP this entire category.

**6.1: SSL certificate valid**

```bash
echo | openssl s_client -connect {host}:443 -servername {host} 2>/dev/null | openssl x509 -noout -dates 2>/dev/null
```

Parse the `notAfter` date and check:

- PASS: SSL valid, expires in > 30 days
- WARN: SSL valid but expires in < 30 days
- FAIL: SSL expired or invalid

**6.2: HSTS enabled**

```bash
curl -sI {url} 2>/dev/null | grep -i "strict-transport-security"
```

- PASS: HSTS header present with `max-age` >= 31536000 (1 year)
- WARN: HSTS header present but `max-age` < 31536000
- FAIL: No HSTS header

**6.3: HTTP to HTTPS redirect**

```bash
curl -sI http://{host} 2>/dev/null | grep -i "location"
```

- PASS: HTTP redirects to HTTPS (301/302 with `Location: https://`)
- FAIL: HTTP does not redirect to HTTPS

---

### Step 3: Report

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

### Step 4: Write Failures to Task Queue

**Default mode:** Write only FAIL results to `tasks-plans/tasks.md`:

```markdown
- [ ] **[Preflight]** No health endpoint -- create /api/health route that returns 200
- [ ] **[Preflight]** .env files tracked in git -- add .env to .gitignore and remove from tracking
```

**Strict mode (--strict):** Write FAIL and WARN results:

```markdown
- [ ] **[Preflight]** No health endpoint -- create /api/health route
- [ ] **[Preflight]** Missing env vars in .env.example: DATABASE_URL, REDIS_URL
- [ ] **[Preflight]** 14 console.log calls -- replace with structured logging (pino recommended)
- [ ] **[Preflight]** No connection pooling -- configure for production load
```

Tasks use `**[Preflight]**` prefix for grep-ability and to distinguish from other Shipyard tasks (`**[CI]**`, `**[Docker]**`, `**[CVE-...]**`).

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
