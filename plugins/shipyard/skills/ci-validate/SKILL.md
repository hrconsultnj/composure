---
name: ci-validate
description: Validate CI/CD workflow files. Runs actionlint for GitHub Actions, checks for common mistakes, and reports issues with fix suggestions.
argument-hint: "[workflow-file]"
---

Validate CI/CD workflow files for syntax errors, common mistakes, and best practice violations. Combines external linters (actionlint) with built-in heuristic checks that catch issues linters miss.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill shipyard ci-validate {step-filename}
```

**Read from `~/.composure/cache/shipyard/skills/ci-validate/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-find-ci-files.md` |
| 2 | `02-external-linter.md` |
| 3 | `03a-heuristic-checks-1-6.md` |
| 4 | `03b-heuristic-checks-7-12.md` |
| 5 | `04-report-and-tasks.md` |
