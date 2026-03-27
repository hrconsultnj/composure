# HTTP Security Headers

Reference for the `/sentinel:headers` skill. Defines expected headers, scoring weights, context-aware grading, and platform-specific fix instructions.

## Scoring Model

Total score: 100 points. Weighted by impact.

| Header | Weight | Missing Penalty |
|--------|--------|----------------|
| Content-Security-Policy | 30% | -30 |
| Strict-Transport-Security | 25% | -25 |
| X-Frame-Options | 15% | -15 |
| X-Content-Type-Options | 10% | -10 |
| Referrer-Policy | 10% | -10 |
| Permissions-Policy | 10% | -10 |

**X-XSS-Protection** is evaluated but does not contribute to score. See below.

Grading thresholds:
- **A** (90-100): Production-ready. All critical headers present.
- **B** (70-89): Mostly secure. Minor gaps.
- **C** (50-69): Significant gaps. Address before production.
- **D** (30-49): Major issues. Immediate action needed.
- **F** (0-29): Critically insecure. Do not deploy.

## Header Definitions

### Strict-Transport-Security (HSTS)
- **Weight:** 25%
- **Required value:** `max-age=31536000; includeSubDomains`
- **Ideal value:** `max-age=63072000; includeSubDomains; preload`
- **Risk if missing:** Downgrade attacks, SSL stripping, cookie theft over HTTP
- **Context rule:** If domain is on the HSTS preload list (hstspreload.org), a missing header is NOT a failure. The browser enforces HTTPS regardless. Score: full marks.
- **Partial credit:** `max-age` under 31536000 gets 50% of weight. `max-age=0` is explicitly disabling HSTS and gets 0%.

### Content-Security-Policy (CSP)
- **Weight:** 30%
- **Minimum viable:** `default-src 'self'`
- **Recommended:** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`
- **Risk if missing:** XSS exploitation, data injection, clickjacking via inline frames
- **Context rules:**
  - `Content-Security-Policy-Report-Only` = partial credit (50% of weight). The policy exists but is not enforced.
  - `unsafe-eval` in production = -10 points. Acceptable in development (`NODE_ENV=development`).
  - `unsafe-inline` for scripts in production = -10 points. Use nonces or hashes instead.
  - `unsafe-inline` for styles only = acceptable (many CSS-in-JS frameworks require it).
- **Note:** CSP is the most complex header to implement correctly. A restrictive CSP that breaks functionality is worse than a permissive one. Grade progressively.

### X-Frame-Options
- **Weight:** 15%
- **Accepted values:** `DENY` or `SAMEORIGIN`
- **Risk if missing:** Clickjacking — attacker embeds site in an iframe and overlays invisible controls
- **Context rule:** If CSP includes `frame-ancestors` directive, `X-Frame-Options` is redundant. Still recommended for older browser support. Score: full marks if either is present.
- **Note:** `ALLOW-FROM` is deprecated and not supported by modern browsers. Flag it.

### X-Content-Type-Options
- **Weight:** 10%
- **Required value:** `nosniff`
- **Risk if missing:** MIME type sniffing — browser reinterprets content type (e.g., treats JSON as HTML, enabling XSS)
- **Context rule:** No partial credit. Either `nosniff` is present or it is not.

### Referrer-Policy
- **Weight:** 10%
- **Recommended:** `strict-origin-when-cross-origin`
- **Acceptable:** `no-referrer`, `same-origin`, `strict-origin`, `origin-when-cross-origin`
- **Risk if missing:** URL leakage — query parameters (tokens, session IDs) sent to third-party sites via Referer header
- **Context rule:** `no-referrer` is the most secure but can break analytics. `unsafe-url` gets 0%.

### Permissions-Policy
- **Weight:** 10%
- **Recommended:** `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- **Risk if missing:** Embedded third-party scripts can access browser APIs (camera, mic, location) without user consent
- **Context rule:** Only flag features relevant to the app. A video conferencing app legitimately needs `camera` and `microphone`.
- **Note:** Formerly known as `Feature-Policy`. Accept either header name but recommend `Permissions-Policy`.

### X-XSS-Protection
- **Correct value:** `0`
- **Outdated value:** `1; mode=block`
- **Scoring:** Not scored. Informational only.
- **Reason:** The XSS Auditor (which this header controlled) has been removed from all modern browsers. Setting `1; mode=block` can actually introduce vulnerabilities in older browsers (information leakage via the auditor's behavior). The modern replacement is Content-Security-Policy.
- **Recommendation:** Set `X-XSS-Protection: 0` explicitly to disable the auditor in any remaining legacy browsers. Then rely on CSP.

## Platform Fix Instructions

### Vercel
```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "X-XSS-Protection", "value": "0" }
      ]
    }
  ]
}
```

### Next.js
```javascript
// next.config.js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-XSS-Protection', value: '0' },
]

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

### Netlify
```
# _headers (in publish directory)
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-XSS-Protection: 0
```

### Cloudflare
Cloudflare does not set security headers by default. Options:
1. **Transform Rules** (recommended): Dashboard > Rules > Transform Rules > Modify Response Header
2. **Workers:** Intercept response and add headers
3. **Page Rules:** Limited header support, prefer Transform Rules

```javascript
// Cloudflare Worker example
addEventListener('fetch', event => {
  event.respondWith(addSecurityHeaders(event.request))
})

async function addSecurityHeaders(request) {
  const response = await fetch(request)
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  newResponse.headers.set('Content-Security-Policy', "default-src 'self'")
  newResponse.headers.set('X-Frame-Options', 'DENY')
  newResponse.headers.set('X-Content-Type-Options', 'nosniff')
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  newResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  newResponse.headers.set('X-XSS-Protection', '0')
  return newResponse
}
```

## Edge Cases

- **localhost / development:** Do not flag missing HSTS or CSP in development. Check `NODE_ENV` or URL.
- **API-only endpoints:** X-Frame-Options and CSP are less relevant for JSON-only APIs. Reduce weight but still recommend X-Content-Type-Options (prevents MIME sniffing of JSON as HTML).
- **CDN-served assets:** Static assets behind a CDN may have headers set at the CDN level, not the origin. Check both.
- **Multiple CSP headers:** Browsers intersect multiple CSP headers (most restrictive wins). This is valid but hard to debug. Flag as informational.
