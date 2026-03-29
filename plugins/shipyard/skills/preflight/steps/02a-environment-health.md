# Step 2a: Checks -- Environment & Health

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

**Next:** Read `steps/02b-security-performance.md`
