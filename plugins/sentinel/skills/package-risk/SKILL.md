---
name: package-risk
description: Analyze an installed package's source code for suspicious behavior patterns (eval, network calls, env access, obfuscation).
argument-hint: "<package-name> [--ecosystem js|python|rust|go]"
---

Inspect an installed package's source code for behavioral signals that indicate supply chain risk. Scores the package and reports suspicious patterns with file:line context.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"~/.composure/bin/composure-fetch.mjs" skill sentinel package-risk {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-locate-package.md` |
| 2 | `02-behavior-scan.md` |
| 3 | `03-score-and-report.md` |
