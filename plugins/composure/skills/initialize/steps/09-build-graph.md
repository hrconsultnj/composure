# Step 9: Build Code Graph

The composure-graph MCP server was already verified in Step 0a.

1. Call `list_graph_stats` to check if a graph already exists
2. If no graph exists (`last_updated` is null), or if `--force` was passed: call `build_or_update_graph({ full_rebuild: true })`
3. If graph exists and no `--force`: call `build_or_update_graph()` (incremental update)
4. Report: "Graph built: N files, M nodes, K edges" or "Graph updated: N nodes, last updated X"

---

**Next:** Read `steps/10-task-queue.md`
