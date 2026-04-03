---
name: generate
description: Generate tests for a file or function. Convention-aware -- reads existing test files first to match project style. One file at a time.
argument-hint: "<file-path> [--function <name>] [--e2e]"
---

Generate a test file for a given source file. The generated test matches the project's existing conventions -- import style, mock patterns, assertion style, file placement, and naming.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill testbench generate {step-filename}
```

Cached content is at `~/.composure/cache/testbench/skills/generate/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `01-load-config.md` |
| 2 | `02-analyze-source.md` |
| 3 | `03-read-existing-tests.md` |
| 4 | `04-generate-test.md` |
| 5 | `05-run-and-fix.md` |

