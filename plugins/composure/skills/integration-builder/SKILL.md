---
name: integration-builder
description: Scaffold third-party integrations with SDK docs via Context7.
argument-hint: "[service-name] [--skip-docs] [--quick]"
---

Guided workflow for adding third-party service integrations. Detects your project's language and framework, discovers the official SDK, pulls current documentation via Context7, and scaffolds a complete integration with auth, webhooks, error handling, and tests.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure integration-builder {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

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
