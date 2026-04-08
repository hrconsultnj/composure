---
name: headers
description: HTTP security header analysis with exploitable-risk grading.
argument-hint: "<url>"
---

Analyze HTTP security headers for a given URL. Grades based on actual exploitable risk rather than checkbox compliance. Provides WHY explanations and exact fix commands.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill sentinel headers {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-fetch-headers.md` |
| 2 | `02-analyze-headers.md` |
| 3 | `03-overall-grade.md` |
| 4 | `04-report.md` |
