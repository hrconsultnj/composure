---
name: audit-deps
description: Focused dependency CVE audit — reports vulnerabilities with version info and safe upgrade commands.
argument-hint: "[--fix] [--json]"
---

Run a focused dependency vulnerability audit using the project's detected package manager. Reports CVEs with installed versions, fixed versions, and exact upgrade commands. Cross-references installed packages against the Sentinel banned-packages list.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill sentinel audit-deps {step-filename}
```

Cached content is at `~/.composure/cache/sentinel/skills/audit-deps/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `01-run-audit.md` |
| 2 | `02-parse-and-enrich.md` |
| 3 | `03-report-findings.md` |
| 4 | `04-propose-overrides.md` |
| 5 | `05-summary.md` |
| 6 | `06-auto-fix.md` |
