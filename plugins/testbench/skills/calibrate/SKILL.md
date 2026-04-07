---
name: calibrate
description: Calibrate test bench — detect test framework, read existing test conventions, generate .claude/testbench.json config. Query Context7 for test framework reference docs. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Calibrate the test bench by detecting the test framework, learning conventions from existing tests, querying up-to-date test framework docs, and generating the config.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill testbench calibrate {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-framework.md` |
| 2 | `02-detect-conventions.md` |
| 3 | `03-context7-queries.md` |
| 4 | `04-config-and-report.md` |
