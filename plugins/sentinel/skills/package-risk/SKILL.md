---
name: package-risk
description: Analyze an installed package's source code for suspicious behavior patterns (eval, network calls, env access, obfuscation).
argument-hint: "<package-name> [--ecosystem js|python|rust|go]"
---

Inspect an installed package's source code for behavioral signals that indicate supply chain risk. Scores the package and reports suspicious patterns with file:line context.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill sentinel package-risk {step-filename}
```

**Read from `~/.composure/cache/sentinel/skills/package-risk/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-locate-package.md` |
| 2 | `02-behavior-scan.md` |
| 3 | `03-score-and-report.md` |
