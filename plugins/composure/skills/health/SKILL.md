---
name: health
description: Comprehensive health check — reports plugin version, auth, hook integrity, project initialization, graph freshness, companion plugins, and open tasks in a single diagnostic view.
argument-hint: "[--json]"
---

Run a full diagnostic of the Composure installation and project setup. This skill is self-contained — no API calls needed.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure health {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | Purpose |
|---|------|---------|
| 01 | `01-plugin-manifests.md` | Plugin version + manifest validation |
| 02 | `02-hook-integrity.md` | SHA-256 verification of installed hooks |
| 03 | `03-fetch-binaries.md` | Verify CLI binaries present + executable |
| 04 | `04-cortex-state.md` | Cortex + graph database state (includes Decision 19 path detection) |
| 05 | `05-auth-state.md` | Authentication status (read-only, never prompts) |
| 06 | `06-remediate.md` | Present fix-up commands for any detected drift |

Execute all 6 steps in order. Do NOT skip checks — run all of them even if earlier ones fail. After all steps, present results in the standard status table format. If `--json` is provided, output JSON instead.
