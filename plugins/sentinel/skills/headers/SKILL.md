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

### Step 1: Fetch Headers

```bash
curl -sI -L -o /dev/null -D - "<url>" 2>/dev/null | head -50
```

Use `-L` to follow redirects. Capture the final response headers (after all redirects).

If the URL does not include a protocol, prepend `https://`.

If curl fails (timeout, DNS resolution, etc.), report the error and stop.

### Step 2: Extract and Analyze Headers

Check each security header. For each, determine: present/absent, value, and risk assessment.

#### Content-Security-Policy (CSP)

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| Full CSP with restrictive directives | PASS | Strong XSS mitigation in place |
| CSP with `unsafe-inline` or `unsafe-eval` | PARTIAL | CSP present but weakened — `unsafe-inline` allows inline scripts, reducing XSS protection |
| `Content-Security-Policy-Report-Only` header only | PARTIAL | CSP is in monitoring mode (report-only). Not enforcing yet, but shows intent. Deploy enforcing CSP when ready. |
| No CSP header at all | FAIL | No XSS mitigation via CSP. Primary defense against cross-site scripting is missing. |

**Fix:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

#### Strict-Transport-Security (HSTS)

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| HSTS with `max-age >= 31536000` and `includeSubDomains` | PASS | Strong HSTS configuration |
| HSTS with short `max-age` (< 31536000) | PARTIAL | HSTS present but max-age is too short. Browsers forget the policy quickly. |
| No HSTS header but domain is on HSTS preload list | PASS | Domain is preloaded in browsers — HSTS header is redundant. Verify at hstspreload.org. |
| No HSTS header and not preloaded | FAIL | No HTTPS enforcement. Users accessing via HTTP are vulnerable to SSL stripping attacks. |

To check the preload list:
```bash
curl -s "https://hstspreload.org/api/v2/status?domain=<domain>" 2>/dev/null
```

If the status is `"preloaded"`, grade as PASS even without the header.

**Fix:**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

#### X-Frame-Options

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| `DENY` or `SAMEORIGIN` | PASS | Clickjacking protection active |
| Not present but CSP has `frame-ancestors 'none'` or `frame-ancestors 'self'` | PASS | CSP frame-ancestors supersedes X-Frame-Options. Both is ideal but CSP alone is sufficient. |
| Not present and no CSP frame-ancestors | FAIL | Page can be embedded in iframes on any domain — vulnerable to clickjacking attacks. |

**Fix:**
```
X-Frame-Options: DENY
```
Or via CSP: `frame-ancestors 'none'`

#### X-Content-Type-Options

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| `nosniff` | PASS | MIME-type sniffing prevented |
| Not present | FAIL | Browsers may interpret files as a different MIME type than declared, enabling attacks via content type confusion. |

**Fix:**
```
X-Content-Type-Options: nosniff
```

#### Referrer-Policy

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| `no-referrer`, `same-origin`, `strict-origin`, `strict-origin-when-cross-origin` | PASS | Referrer information properly restricted |
| `origin`, `origin-when-cross-origin` | PARTIAL | Sends origin on cross-origin requests — acceptable but `strict-origin-when-cross-origin` is better |
| `unsafe-url` or `no-referrer-when-downgrade` | FAIL | Leaks full URL (including path, query params) to external sites |
| Not present | PARTIAL | Browsers default to `strict-origin-when-cross-origin` which is reasonable, but explicit is better |

**Fix:**
```
Referrer-Policy: strict-origin-when-cross-origin
```

#### Permissions-Policy

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| Present with restricted features | PASS | Browser features (camera, mic, geolocation) explicitly controlled |
| Not present | PARTIAL | Not a direct vulnerability — browsers require user consent for sensitive features anyway. But setting this prevents embedded iframes from requesting permissions. |

**Fix:**
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
```

#### X-XSS-Protection

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| `0` | PASS | Correct. The XSS auditor is disabled. Modern browsers have removed it because it introduced vulnerabilities (XSS via auditor bypass). Setting `0` explicitly prevents older browsers from enabling a broken feature. |
| `1` or `1; mode=block` | PARTIAL | The XSS auditor is a legacy feature that was removed from all modern browsers because it could be exploited to CREATE XSS vulnerabilities. Set to `0` or remove entirely. |
| Not present | PASS | Absence is fine — the feature is deprecated and disabled by default in all current browsers. |

**This is the most commonly misjudged header.** Many scanners grade `X-XSS-Protection: 0` as a failure. That is wrong. The correct value IS `0` (or absent). Grading it as a failure demonstrates the scanner does not understand the header's history.

### Step 3: Overall Grade

Calculate an overall grade based on weighted risk:

| Header | Weight | Rationale |
|--------|--------|-----------|
| CSP | 30% | Primary XSS defense |
| HSTS | 25% | HTTPS enforcement, SSL stripping prevention |
| X-Frame-Options / frame-ancestors | 15% | Clickjacking prevention |
| X-Content-Type-Options | 15% | MIME confusion prevention |
| Referrer-Policy | 10% | Information leakage |
| Permissions-Policy | 5% | Feature restriction (low direct risk) |
| X-XSS-Protection | 0% | Deprecated — only flag if set to `1` |

**Grading scale:**
- **A** (90-100%) — Strong security posture
- **B** (70-89%) — Good with minor gaps
- **C** (50-69%) — Significant gaps, action needed
- **D** (30-49%) — Weak, multiple critical headers missing
- **F** (0-29%) — Minimal security headers

### Step 4: Report

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

### For deployment platforms:

If the URL appears to be hosted on a known platform, include platform-specific fix instructions:

**Vercel** (`vercel.app` or detected via `x-vercel-id`):
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

**Cloudflare** (detected via `cf-ray` or `server: cloudflare`):
```
Configure in Cloudflare Dashboard > SSL/TLS > Edge Certificates > HSTS
Or use Cloudflare Workers for custom headers.
```

**Netlify** (detected via `x-nf-request-id` or `server: Netlify`):
```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
```

## Notes

- This skill analyzes response headers only — it does not scan page content or JavaScript
- Grades are based on exploitable risk, not compliance checkbox counting
- X-XSS-Protection: 0 is correctly graded as PASS (the auditor is deprecated and harmful when enabled)
- CSP Report-Only is graded as PARTIAL (monitoring mode shows intent but does not enforce)
- HSTS preload list check prevents false negatives for preloaded domains
- Platform-specific fix instructions are provided when the hosting platform is detectable
- For comprehensive security testing, combine with `/sentinel:scan` for code-level analysis
