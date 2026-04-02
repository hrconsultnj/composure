# Sentinel Security References — Index

> **Barrel index.** Load docs based on detected stack from `.claude/no-bandaids.json` or `.claude/sentinel.json`.

## Always Load

| File | Contains |
|------|----------|
| [general/owasp-top-10.md](general/owasp-top-10.md) | OWASP Top 10 mapped to Semgrep rules and hook patterns |
| [general/secret-patterns.md](general/secret-patterns.md) | All secret detection patterns with regex and examples |
| [general/header-security.md](general/header-security.md) | HTTP security headers — context-aware grading rules |

## Load by Language/Framework

| Detected | Load | Contains |
|----------|------|----------|
| TypeScript/JavaScript | [typescript/security-patterns.md](typescript/security-patterns.md) | XSS, eval, innerHTML, Server Component CVEs, CSP |
| Python | [python/security-patterns.md](python/security-patterns.md) | Injection, CORS, pickle, yaml, FastAPI-specific |
| Go | [go/security-patterns.md](go/security-patterns.md) | SQL injection, TLS, memory exhaustion |
| Rust | [rust/security-patterns.md](rust/security-patterns.md) | unsafe, Command injection, SQL formatting |
| Supabase | [supabase/security-patterns.md](supabase/security-patterns.md) | RLS bypass, service_role exposure, auth helpers |

**Load ONLY what matches the detected stack.** Don't load Python docs for a TypeScript-only project.

## Context7 Refresh

These docs are curated point-in-time snapshots. When staleness thresholds are exceeded (see `.claude/sentinel.json`), the `/sentinel:assess --force` skill queries Context7 to verify and update these patterns. The staleness thresholds are:

- TypeScript: 30 days
- Python: 60 days
- Go: 90 days
- Rust: 90 days
