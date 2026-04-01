# Step 2: Analyze Headers

Check each security header. For each, determine: present/absent, value, and risk assessment.

## Content-Security-Policy (CSP)

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

## Strict-Transport-Security (HSTS)

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

## X-Frame-Options

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

## X-Content-Type-Options

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| `nosniff` | PASS | MIME-type sniffing prevented |
| Not present | FAIL | Browsers may interpret files as a different MIME type than declared, enabling attacks via content type confusion. |

**Fix:**
```
X-Content-Type-Options: nosniff
```

## Referrer-Policy

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

## Permissions-Policy

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| Present with restricted features | PASS | Browser features (camera, mic, geolocation) explicitly controlled |
| Not present | PARTIAL | Not a direct vulnerability — browsers require user consent for sensitive features anyway. But setting this prevents embedded iframes from requesting permissions. |

**Fix:**
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
```

## X-XSS-Protection

| Scenario | Grade | Explanation |
|----------|-------|-------------|
| `0` | PASS | Correct. The XSS auditor is disabled. Modern browsers have removed it because it introduced vulnerabilities (XSS via auditor bypass). Setting `0` explicitly prevents older browsers from enabling a broken feature. |
| `1` or `1; mode=block` | PARTIAL | The XSS auditor is a legacy feature that was removed from all modern browsers because it could be exploited to CREATE XSS vulnerabilities. Set to `0` or remove entirely. |
| Not present | PASS | Absence is fine — the feature is deprecated and disabled by default in all current browsers. |

**This is the most commonly misjudged header.** Many scanners grade `X-XSS-Protection: 0` as a failure. That is wrong. The correct value IS `0` (or absent). Grading it as a failure demonstrates the scanner does not understand the header's history.

---

**Next:** Read `steps/03-overall-grade.md`
