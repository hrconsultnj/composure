---
name: integration-builder
description: Stack-agnostic third-party integration scaffolding. Detects project language, pulls latest SDK docs via Context7, chooses integration tier, scaffolds client/auth/webhooks with proper error handling and test patterns. Works across TypeScript, Python, Go, Rust, and Ruby.
argument-hint: "[service-name] [--skip-docs] [--quick]"
---

Guided workflow for adding third-party service integrations. Detects your project's language and framework, discovers the official SDK, pulls current documentation via Context7, and scaffolds a complete integration with auth, webhooks, error handling, and tests.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure integration-builder {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-identify.md` |
| 2 | `02-discover.md` |
| 3 | `03-decide.md` |
| 4 | `04-scaffold.md` |
| 5 | `05-implement.md` |
| 6 | `06-test.md` |

## References

- `auth-patterns.md`
- `error-handling.md`
- `integration-tiers.md`
- `monorepo-patterns.md`
- `testing-patterns.md`
- `webhook-patterns.md`
