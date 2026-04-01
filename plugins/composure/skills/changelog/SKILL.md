---
name: changelog
description: Auto-generate a structured changelog from git history and code graph entity mapping.
argument-hint: "[--from <ref>] [--to <ref>] [--format md|json]"
---

# Changelog

Generate a structured changelog from git history, enriched with code graph entity mapping. Groups commits by type, maps changes to business entities, and produces human-readable release notes.

## Arguments

- `--from <ref>` — Starting reference (default: latest tag, or first commit if no tags)
- `--to <ref>` — Ending reference (default: HEAD)
- `--format md|json` — Output format (default: md)

## Prerequisites

- Git repository with commit history
- Composure graph MCP (optional but recommended — enables entity mapping)

## Workflow

**Read each step file in order. Do NOT skip steps.**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-gather-commits.md` | Parse git log between refs, group by conventional commit type |
| 2 | `steps/02-entity-mapping.md` | Map changed files to graph entities for context |
| 3 | `steps/03-generate-output.md` | Format changelog with entity context and statistics |

**Start by reading:** `steps/01-gather-commits.md`

## Notes

- Follows conventional commit prefixes: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`
- If commits don't use conventional prefixes, the skill infers the type from the diff content
- Entity mapping is optional — if the graph is not available, the changelog still works (just without entity context)
- The JSON format is useful for piping to other tools or generating HTML release notes
