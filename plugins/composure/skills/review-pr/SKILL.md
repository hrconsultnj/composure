---
name: review-pr
description: Comprehensive PR review using code graph, quality audit, verification discipline, framework checks, and Sentinel security crossover.
argument-hint: "[PR number or branch name]"
---

# Review PR

Perform a comprehensive, graph-powered code review of a pull request. Uses verification discipline ("comments with receipts") — every finding is verified against the code graph or source before inclusion.

## Prerequisites

The `composure-graph` MCP server must be running. It auto-registers via the plugin's `.mcp.json` and starts at session startup. If MCP tools are unavailable when you call `build_or_update_graph`, run the diagnostic chain from `/composure:initialize` Step 2. The only fix for a disconnected MCP is restarting Claude Code. Do NOT run `claude mcp add` manually.

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-identify-and-setup.md` | Identify PR changes, resolve linked issues, update graph |
| 2 | `steps/02-context-building.md` | `get_review_context` + `get_impact_radius` — structural picture |
| 3 | `steps/03-walkthrough.md` | Generate changes walkthrough table (file, change type, summary) |
| 4 | `steps/04-quality-audit.md` | `run_audit` on changed directories — objective quality metrics |
| 5 | `steps/05-deep-dive.md` | Core review with verification discipline — every claim verified via graph |
| 6 | `steps/06-framework-checks.md` | Context7 checks for outdated framework patterns (conditional) |
| 7 | `steps/07-security-crossover.md` | Sentinel findings crossover + new dependency detection |
| 8 | `steps/08-generate-output.md` | Assemble structured review with all sections |

**Start by reading:** `steps/01-identify-and-setup.md`

## Conditional Steps

- **Step 6 (framework checks)**: Skip if no known frameworks detected in changed files, or if Context7 MCP is unavailable
- **Step 7 (security crossover)**: Skip if no `tasks-plans/tasks.md` AND no `package.json` changes

## Notes

- For large PRs, the deep-dive prioritizes high-risk files first (most dependents in the graph)
- The verification discipline requires every structural claim to be backed by a graph query — no unverified assertions
- Quality metrics come from `run_audit`, providing objective measurements (function is 147 lines) not subjective opinions (function seems long)
- For quick, token-efficient reviews of local changes, use `/composure:review` instead
