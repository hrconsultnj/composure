---
name: ci-validate
description: Validate CI/CD workflow files. Runs actionlint for GitHub Actions, checks for common mistakes, and reports issues with fix suggestions.
argument-hint: "[workflow-file]"
---

# Shipyard CI Validate

Validate CI/CD workflow files for syntax errors, common mistakes, and best practice violations. Combines external linters (actionlint) with built-in heuristic checks that catch issues linters miss.

## Arguments

- `[workflow-file]` -- Path to a specific workflow file to validate. If omitted, validates ALL detected CI config files.

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-find-ci-files.md` | Find CI config files |
| 2 | `steps/02-external-linter.md` | Run actionlint if available |
| 3a | `steps/03a-heuristic-checks-1-6.md` | Built-in checks 1-6 (node version, pkg manager, caching, secrets, concurrency) |
| 3b | `steps/03b-heuristic-checks-7-12.md` | Built-in checks 7-12 (timeout, deprecated actions, permissions, triggers, tests, npm ci) |
| 4 | `steps/04-report-and-tasks.md` | Format results, write critical/high to task queue |

**Start by reading:** `steps/01-find-ci-files.md`

## Notes

- This skill is called automatically by `/shipyard:ci-generate` after generating a workflow
- It can also be called standalone to validate existing workflows
- actionlint provides deep GitHub Actions validation (expression syntax, action inputs, etc.) -- the built-in checks supplement it with project-context awareness
- For GitLab CI and Bitbucket Pipelines, only built-in heuristic checks run (no external linter)
- Jenkinsfile is Groovy-based and has limited static validation -- only basic checks apply
- Issues written to task queue use `**[CI]**` prefix to distinguish from Composure code quality tasks and Sentinel security tasks
