# OWASP Top 10 (2021) — Sentinel Mapping

Maps each OWASP 2021 category to the Sentinel hooks, skills, and Semgrep rules that detect it. Used by `/sentinel:scan` for coverage reporting.

## A01: Broken Access Control

- **Description:** Users act outside their intended permissions. Most common web vulnerability.
- **Sentinel detection:**
  - RLS policy checks on Supabase tables (see `supabase/security-patterns.md`)
  - Auth verification in Next.js Server Actions and API routes
  - `service_role` key exposure in client code
  - Missing `getUser()` calls before data mutations
- **Semgrep rulesets:** `p/owasp-top-ten`, `p/nextjs`
- **Hook:** `insecure-pattern-guard.sh` — flags `getSession()` in server-side auth paths
- **Skill:** `/sentinel:scan` — checks RLS status on all detected tables

## A02: Cryptographic Failures

- **Description:** Failures related to cryptography leading to sensitive data exposure.
- **Sentinel detection:**
  - `secret-guard.sh` — detects hardcoded keys, tokens, and credentials in source
  - Deprecated crypto API detection: `MD5`, `SHA1` for password hashing, `DES`, `RC4`
  - Weak random number generators (`Math.random()`, `math/rand`, `random.random()`)
  - Missing HTTPS / HSTS header checks
- **Semgrep rulesets:** `p/secrets`, `p/owasp-top-ten`
- **Hook:** `secret-guard.sh` (PreToolUse — runs on every file write)
- **Skill:** `/sentinel:headers` — checks HSTS enforcement

## A03: Injection

- **Description:** User-supplied data is sent to an interpreter as part of a command or query.
- **Sentinel detection:**
  - `eval()`, `new Function()`, `exec()`, `execSync()` — JavaScript/TypeScript
  - `os.system()`, `subprocess.call(shell=True)` — Python
  - `exec.Command("sh", "-c", ...)` with user input — Go
  - `std::process::Command` with user input — Rust
  - SQL concatenation: `"SELECT * FROM " + table`, `f"SELECT ... {var}"`, `fmt.Sprintf` in queries
  - `innerHTML`, `dangerouslySetInnerHTML` — DOM injection / XSS
- **Semgrep rulesets:** `p/command-injection`, `p/sql-injection`, `p/xss`
- **Hook:** `insecure-pattern-guard.sh` (PreToolUse — blocks writes containing these patterns)

## A04: Insecure Design

- **Description:** Missing or ineffective security controls in the design itself.
- **Sentinel detection:**
  - `/sentinel:headers` — architectural security headers assessment
  - `/sentinel:scan` — checks for missing rate limiting, CSRF protection, input validation patterns
  - Missing auth middleware on route groups
  - Absence of error handling patterns in API routes
- **Semgrep rulesets:** `p/owasp-top-ten`
- **Note:** Insecure design is harder to detect via static analysis. Sentinel flags common indicators but cannot substitute for threat modeling.

## A05: Security Misconfiguration

- **Description:** Missing hardening, default configurations, open cloud storage, verbose error messages.
- **Sentinel detection:**
  - CORS wildcard: `Access-Control-Allow-Origin: *` with credentials
  - Missing CSP header or `unsafe-eval` / `unsafe-inline` in production
  - Default credentials in configuration files
  - Debug mode enabled in production (`DEBUG=True`, `NODE_ENV=development` in prod configs)
  - Open Supabase storage buckets without intentional public access
- **Semgrep rulesets:** `p/security-audit`, `p/owasp-top-ten`
- **Hook:** `insecure-pattern-guard.sh` — flags CORS wildcard with credentials
- **Skill:** `/sentinel:headers` — comprehensive misconfiguration check

## A06: Vulnerable and Outdated Components

- **Description:** Using components with known vulnerabilities or that are no longer maintained.
- **Sentinel detection:**
  - `/sentinel:audit-deps` — runs `npm audit`, `pip-audit`, `cargo audit` based on detected stack
  - `dep-freshness-check.sh` — checks dependency age, flags unmaintained packages
  - Known CVE patterns in lock files
  - Deprecated package detection (e.g., `request`, `node-uuid`, `crypto-js` < 4.2)
- **Semgrep rulesets:** Not applicable (CVE databases, not static analysis)
- **Skill:** `/sentinel:audit-deps` — full dependency tree analysis with severity scoring

## A07: Identification and Authentication Failures

- **Description:** Authentication weaknesses allowing unauthorized access.
- **Sentinel detection:**
  - Supabase `getUser()` vs `getSession()` misuse (see `supabase/security-patterns.md`)
  - Missing auth checks in Server Actions and API routes
  - Hardcoded credentials or tokens in source
  - Weak session configuration (missing `httpOnly`, `secure`, `sameSite` on cookies)
  - JWT verification skipped or token used without expiry check
- **Semgrep rulesets:** `p/jwt`, `p/owasp-top-ten`
- **Hook:** `insecure-pattern-guard.sh` — flags `getSession()` for server-side auth
- **Skill:** `/sentinel:scan` — checks auth patterns across the codebase

## A08: Software and Data Integrity Failures

- **Description:** Code and infrastructure that does not protect against integrity violations.
- **Sentinel detection:**
  - Unsafe deserialization: `pickle.loads()`, `yaml.load()` (without `SafeLoader`), `JSON.parse()` on untrusted data without validation
  - Missing CSRF protection on state-changing endpoints
  - `dangerouslySetInnerHTML` with unsanitized content
  - Unvalidated redirects (`redirect(userInput)`)
- **Semgrep rulesets:** `p/deserialization`, `p/owasp-top-ten`
- **Hook:** `insecure-pattern-guard.sh` — flags `pickle.loads`, `yaml.load`, `dangerouslySetInnerHTML`

## A09: Security Logging and Monitoring Failures

- **Description:** Insufficient logging, detection, monitoring, and active response.
- **Sentinel detection:** Phase 2 — not yet implemented
- **Planned:**
  - Detect missing audit logging on auth events
  - Check for structured logging configuration
  - Validate error monitoring integration (Sentry, LogRocket)
  - Verify rate limiting and brute-force protection
- **Semgrep rulesets:** Limited static analysis coverage. Primarily runtime concern.

## A10: Server-Side Request Forgery (SSRF)

- **Description:** Web application fetches a remote resource without validating the user-supplied URL.
- **Sentinel detection:** Phase 2 — not yet implemented
- **Planned:**
  - Detect `fetch()`, `axios()`, `http.get()` with user-controlled URLs
  - Flag missing URL validation / allowlist patterns
  - Check for internal network access restrictions (cloud metadata endpoints: `169.254.169.254`)
- **Semgrep rulesets:** `p/ssrf`

## Coverage Summary

| OWASP Category | Sentinel Coverage | Primary Tool |
|----------------|------------------|--------------|
| A01: Broken Access Control | Full | `/sentinel:scan`, RLS checks |
| A02: Cryptographic Failures | Full | `secret-guard.sh`, `/sentinel:headers` |
| A03: Injection | Full | `insecure-pattern-guard.sh` |
| A04: Insecure Design | Partial | `/sentinel:headers`, `/sentinel:scan` |
| A05: Security Misconfiguration | Full | `/sentinel:headers`, `insecure-pattern-guard.sh` |
| A06: Vulnerable Components | Full | `/sentinel:audit-deps`, `dep-freshness-check.sh` |
| A07: Auth Failures | Full | `/sentinel:scan`, `insecure-pattern-guard.sh` |
| A08: Data Integrity Failures | Partial | `insecure-pattern-guard.sh` |
| A09: Logging Failures | Phase 2 | Not yet implemented |
| A10: SSRF | Phase 2 | Not yet implemented |

**Current OWASP coverage: 8/10 categories (6 full, 2 partial). 2 categories planned for Phase 2.**
