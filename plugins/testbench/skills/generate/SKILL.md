---
name: generate
description: Generate tests for a file or function. Convention-aware -- reads existing test files first to match project style. One file at a time.
argument-hint: "<file-path> [--function <name>] [--e2e]"
---

# Testbench Generate

Generate a test file for a given source file. The generated test matches the project's existing conventions -- import style, mock patterns, assertion style, file placement, and naming.

## Arguments

- `<file-path>` -- **Required.** Path to the source file to test
- `--function <name>` -- Generate tests for a specific exported function only
- `--e2e` -- Generate a Playwright/Cypress E2E test instead of a unit test

## Workflow

**Read each step file in order. Do NOT skip steps. Steps 3 and 5 are MANDATORY -- agents that skip them produce useless output.**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-load-config.md` | Read testbench.json, bail if missing |
| 2 | `steps/02-analyze-source.md` | Read source file, analyze exports, dependencies, complexity |
| 3 | `steps/03-read-existing-tests.md` | **MANDATORY**: Read 2-3 existing test files to learn conventions |
| 4 | `steps/04-generate-test.md` | Read framework reference docs, generate test file following conventions |
| 5 | `steps/05-run-and-fix.md` | **MANDATORY**: Run the test, fix failures (max 3 attempts) |

**Start by reading:** `steps/01-load-config.md`

## Rules (MUST -- non-negotiable)

1. **NEVER generate a test without reading existing tests first.** Convention context is what makes generated tests useful. Without it, you produce generic tests that get deleted.

2. **One file at a time.** Do not batch test generation across multiple source files. Each file needs focused analysis.

3. **Acknowledge limitations honestly.** Pure functions get great tests. Complex stateful components, real-time subscriptions, and multi-step UI flows get mediocre tests. Say so.

4. **Do NOT mock everything.** Mock external services (DB, API, filesystem). Do NOT mock internal functions -- that creates tests that pass but verify nothing.

5. **Follow Composure decomposition limits.** Test files max 150 lines. Split if needed.

6. **If the source file has no testable exports, say so.** Do NOT generate a useless test for a config file or type-only module.

7. **Run the test before declaring done.** A test that doesn't pass is not a deliverable -- it's a draft.

8. **Match the project's style exactly.** The test should be indistinguishable from one written by the team. If the project uses `it('should ...')`, don't use `test('...')`. If the project uses factory functions for test data, don't use inline objects.

9. **If a test file already exists, extend it -- do NOT overwrite.** Read the existing file, identify untested exports, add tests for those only.
