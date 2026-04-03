# Privacy Policy — Composure Plugin

**Effective date:** March 21, 2026
**Plugin:** Composure (Claude Code plugin)
**Author:** Helder Rodrigues / HR Business Consulting

## Summary

Composure runs entirely on your local machine. It does not collect, transmit, or store any user data externally.

## What the plugin does

- Parses your source code locally using tree-sitter (WebAssembly) to build a structural knowledge graph
- Stores the graph in a SQLite database on your machine at `.code-review-graph/graph.db`
- Runs shell scripts locally as Claude Code hooks (no network calls)
- Provides MCP tools that Claude Code queries locally via stdio

## Data collection

**None.** Composure does not:

- Send any data to external servers
- Collect analytics or telemetry
- Track usage patterns
- Make any network requests
- Access any data outside your project directory
- Store data anywhere other than your local filesystem

## Data storage

All data created by Composure stays on your machine:

| Data | Location | Purpose |
|------|----------|---------|
| Code graph | `.code-review-graph/graph.db` | AST-based function/import/call relationships |
| Task queue | `tasks-plans/tasks.md` | Code quality tasks logged by hooks |
| Plugin config | `.composure/no-bandaids.json` (or `.claude/no-bandaids.json`) | Per-project type-safety rules |

All of these are local files in your project directory. Delete them at any time to remove all Composure data.

## Third-party services

Composure does not integrate with or send data to any third-party services. The plugin communicates only with Claude Code via the local MCP stdio protocol.

## Changes to this policy

Updates to this policy will be posted in this file in the Composure repository. The effective date at the top will be updated accordingly.

## Contact

For privacy questions: hrconsultnj@gmail.com
