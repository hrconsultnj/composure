# Code Review Graph

MCP server that builds a code knowledge graph from tree-sitter ASTs. Provides 11 tools for querying, auditing, and visualizing codebases.

## How it works

1. **Build**: Tree-sitter parses source files into AST nodes (functions, classes, types, imports)
2. **Store**: Nodes and edges go into a SQLite database (`.composure/graph/graph.db`)
3. **Query**: MCP tools run SQL queries against the graph for instant structural answers

Incremental by default — only re-parses changed files (via `git diff`). Full rebuild takes ~15s for a 500-file project.

## Tools

### Building
| Tool | Purpose |
|------|---------|
| `build_or_update_graph` | Build or incrementally update the graph |

### Querying (`query_graph` — 10 patterns)
| Pattern | Purpose | Key params |
|---------|---------|------------|
| `callers_of` | Who calls this function? | `target` |
| `callees_of` | What does this function call? | `target` |
| `imports_of` | What does this file import? | `target` |
| `importers_of` | What files import this? | `target` |
| `children_of` | What's inside this file/class? | `target` |
| `tests_for` | What tests cover this? | `target` |
| `inheritors_of` | What classes extend this? | `target` |
| `file_summary` | All nodes in a file | `target` |
| `references_of` | Grep + graph context enrichment | `target` (search string), `scope`, `context_lines`, `max_results` |
| `dependency_chain` | Shortest path between two nodes | `target`, `target_to` |

### Analysis
| Tool | Purpose |
|------|---------|
| `semantic_search_nodes` | Find code entities by name or JSDoc summary |
| `get_impact_radius` | Blast radius of changed files |
| `get_review_context` | Token-efficient review context for PRs |
| `find_large_functions` | Oversized functions/classes |
| `entity_scope` | All code related to a business entity |

### Audit
| Tool | Purpose |
|------|---------|
| `run_audit` | Code quality + security + test coverage audit with letter grades |
| `generate_audit_html` | Shareable HTML audit report |

### Visualization
| Tool | Purpose |
|------|---------|
| `list_graph_stats` | Node/edge counts, languages, last update |
| `generate_graph_html` | Interactive dependency graph visualization |

## Search indexing

`semantic_search_nodes` searches three fields for every node:
- **name** — function/class/type name
- **qualified_name** — `file.ts#ClassName.methodName`
- **summary** — JSDoc or heuristic summary

### JSDoc extraction
Exported functions with `/** ... */` comments get their first sentence stored as the summary. Real documentation always takes priority.

### Heuristic summaries (auto-generated)
Exported functions WITHOUT JSDoc get a search-friendly summary from camelCase splitting:
- `getWorkspaceProvider` -> `"get workspace provider"`
- `useBulkTagEntities` -> `"bulk tag entities hook"`
- `TaxDashboardClient` -> `"tax dashboard client"`

This means searching "workspace" finds `getWorkspaceProvider` even without documentation. Coverage is typically 50-60% of functions (exported, multi-word names).

## Database schema

### Nodes
Files, functions, classes, types, tests, packages, scripts, migrations, tables, columns, RLS policies.

Key columns: `kind`, `name`, `qualified_name`, `file_path`, `line_start`, `line_end`, `language`, `summary`, `params`, `return_type`.

### Edges
`CALLS`, `IMPORTS_FROM`, `CONTAINS`, `TESTED_BY`, `INHERITS`, `IMPLEMENTS`, `REFERENCES`, `DEPENDS_ON`.

### Audit tables
`audit_findings` (findings with severity + score impact), `test_coverage`, `audit_scores` (letter grades per category).

## Parsers

| Parser | Languages | Features |
|--------|-----------|----------|
| TypeScript/TSX | `.ts`, `.tsx`, `.js`, `.jsx` | Functions, classes, types, imports, calls, JSDoc |
| SQL | `.sql` | Tables, columns, indexes, RLS policies, functions |
| Bash | `.sh` | Functions, variable assignments |
| Markdown | `.md` | Headings as types (for skill/doc structure) |
| JSON | `package.json` | Package dependencies |
| Config | `.json` configs | Framework detection |

## Used by

- **Composure hooks**: `resume-check.sh` (rebuild on stale), `decomposition-check.sh` (function sizes via SQLite)
- **Composure skills**: `/audit`, `/blueprint`, `/review`, `/review-pr`, `/code-organizer`, `/changelog`
- **Other plugins**: Sentinel (exposure prioritization via graph), Testbench (coverage analysis)
