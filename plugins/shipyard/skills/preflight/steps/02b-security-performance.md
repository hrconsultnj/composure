# Step 2b: Checks -- Security & Performance

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

**Next:** Read `steps/02c-database-dns.md`
