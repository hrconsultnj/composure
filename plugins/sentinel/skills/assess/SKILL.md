---
name: assess
description: Assess project security surface — detect stack, package managers, security tooling, and integrations. Generate .claude/sentinel.json config. Run once per project.
argument-hint: "[--force] [--dry-run]"
---

Assess the project's security surface and bootstrap Sentinel configuration by detecting the tech stack, available package managers, system installers, and security tooling.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill sentinel assess {step-filename}
```

**Read from `~/.composure/cache/sentinel/skills/assess/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-stack.md` |
| 2 | `02-detect-pkg-managers.md` |
| 3 | `03-check-security-tools.md` |
| 4 | `04-detect-integrations.md` |
| 5 | `05-config-and-report.md` |
