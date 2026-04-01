# Step 3: Impact Analysis and Approach Direction

**Skip if `--skip-graph`, `--quick`, or graph MCP unavailable.**

## 3a. Run Impact Queries

Now that we know the exact files (from graph pre-scan + user confirmation), do deep analysis:

1. **Blast radius**: `get_impact_radius({ changed_files: [<confirmed files>] })` — what depends on them
2. **Callers**: `query_graph({ pattern: "callers_of", target: <key function> })` — who calls the functions being changed
3. **Decomposition opportunities**: `find_large_functions({ file_pattern: <affected directory> })` — anything already oversized in the area
4. **Test gaps**: `query_graph({ pattern: "tests_for", target: <component> })` — what's untested

## 3b. Summarize Impact

Present the findings:
- **Direct impact**: N files import from the affected files
- **Indirect impact**: M files are 2 hops away
- **Large functions**: any over 100 lines in the affected area
- **Missing tests**: functions with no test coverage

## 3c. Approach Direction (checkpoint)

If the impact analysis reveals **multiple viable approaches with different tradeoffs**, present them to the user before writing the blueprint.

Use **Sequential Thinking MCP** to evaluate competing approaches when:
- "Should this be a server action or an API route?" (different tradeoffs)
- "Should we extend the existing component or create a new one?" (depends on blast radius)
- "Shared utility vs inline logic?" (depends on reuse likelihood)
- "Modify existing flow vs add parallel flow?" (depends on preservation boundaries)

Then present:

"Based on the impact analysis, I see two approaches:

**Approach A**: [description] — [pros: X, Y] [cons: Z]
**Approach B**: [description] — [pros: X, Y] [cons: Z]

Which direction do you want to go?"

Use **AskUserQuestion** with the approaches as options.

**If the approach is obvious** from the graph scan and impact analysis (no genuine choice), state it and move on:

"Based on the impact analysis, the approach is [X] because [reasoning]. Moving to blueprint."

Do NOT force a question when there's only one sensible path — that wastes a round-trip.

---

**Next:** Read `steps/04a-load-docs.md`
