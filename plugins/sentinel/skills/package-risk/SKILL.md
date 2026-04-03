---
name: package-risk
description: Analyze an installed package's source code for suspicious behavior patterns (eval, network calls, env access, obfuscation).
argument-hint: "<package-name> [--ecosystem js|python|rust|go]"
---

Inspect an installed package's source code for behavioral signals that indicate supply chain risk. Scores the package and reports suspicious patterns with file:line context.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill sentinel package-risk {step-filename}
```

Cached content is at `~/.composure/cache/sentinel/skills/package-risk/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `01-locate-package.md` |
| 2 | `02-behavior-scan.md` |
| 3 | `03-score-and-report.md` |
