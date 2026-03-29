# Step 3: Full Impact Analysis

**Skip if `--skip-graph`, `--quick`, or graph MCP unavailable.**

Now that we know the exact files (from graph pre-scan + user confirmation), do deep analysis:

1. **Blast radius**: `get_impact_radius({ changed_files: [<confirmed files>] })` -- what depends on them
2. **Callers**: `query_graph({ pattern: "callers_of", target: <key function> })` -- who calls the functions being changed
3. **Decomposition opportunities**: `find_large_functions({ file_pattern: <affected directory> })` -- anything already oversized in the area
4. **Test gaps**: `query_graph({ pattern: "tests_for", target: <component> })` -- what's untested

Summarize:
- **Direct impact**: N files import from the affected files
- **Indirect impact**: M files are 2 hops away
- **Large functions**: any over 100 lines in the affected area
- **Missing tests**: functions with no test coverage

---

**Next:** Read `steps/04-write-blueprint.md`
