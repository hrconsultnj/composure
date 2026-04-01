# Step 4: Report

Output the analysis in this format:

```
Security Header Analysis: https://example.com

Overall Grade: B (78%)

  PASS     Content-Security-Policy
           Strong CSP with no unsafe directives.

  PASS     Strict-Transport-Security
           max-age=63072000; includeSubDomains; preload

  PASS     X-Frame-Options
           DENY

  PASS     X-Content-Type-Options
           nosniff

  PARTIAL  Referrer-Policy
           Not set. Browsers default to strict-origin-when-cross-origin
           which is reasonable, but explicit policy is better.
           Fix: Referrer-Policy: strict-origin-when-cross-origin

  MISSING  Permissions-Policy
           Not critical — browsers require user consent anyway — but
           prevents embedded iframes from requesting sensitive features.
           Fix: Permissions-Policy: camera=(), microphone=(), geolocation=()

  PASS     X-XSS-Protection
           Correctly set to 0 (deprecated auditor disabled).

Recommendations (by impact):
  1. Add Referrer-Policy header (low effort, reduces info leakage)
  2. Add Permissions-Policy header (low effort, defense in depth)
```

## Platform-Specific Fix Instructions

If the URL appears to be hosted on a known platform, include platform-specific fix instructions:

### Vercel

Detected via `vercel.app` domain or `x-vercel-id` header.

```js
// next.config.js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  }
}
```

### Cloudflare

Detected via `cf-ray` header or `server: cloudflare`.

```
Configure in Cloudflare Dashboard > SSL/TLS > Edge Certificates > HSTS
Or use Cloudflare Workers for custom headers.
```

### Netlify

Detected via `x-nf-request-id` header or `server: Netlify`.

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
```
