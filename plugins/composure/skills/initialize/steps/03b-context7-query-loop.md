# Step 3b: Context7 — Query and Write Loop

> **Why not subagents?** MCP tool permissions are session-scoped and NOT delegated to
> subagents — even with `bypassPermissions` or `auto` mode. Subagents can discover
> tools via `ToolSearch` but cannot call them. Each agent also inherits ~80-100K tokens
> of context overhead. The main conversation already has Context7 loaded and permitted,
> making it both cheaper and reliable.

**Read the template first**: Read `skills/app-architecture/GENERATED-DOC-TEMPLATE.md` — it defines
the exact structure, frontmatter, sections, and rules for generated docs.

**CRITICAL: Process one library at a time. Do NOT batch reads then batch writes.**

For each library in the task list (from 3a), if it passed the freshness check:

1. **Resolve**: Call `resolve-library-id` with `libraryName="{library}"` — pick the highest benchmark score with "High" reputation. If a version-specific ID exists, prefer it.
2. **Query (BROAD)**: Call `query-docs` — setup, key patterns, breaking changes. Focus areas: `{focusAreas}`
3. **Query (TARGETED)**: Call `query-docs` — specifically for focus areas the first query didn't fully cover (anti-patterns, migration steps, advanced config)
4. If results are still sparse, try a DIFFERENT library ID from the resolve results (e.g., /websites/ variant instead of /org/repo) and query again
5. **Validate** before writing:
   - If Context7 returned no data after 3+ attempts — skip, report as "no Context7 data available"
   - If `resolve-library-id` returned no results — skip, report as "library not found in Context7"
   - If `context7_library_id` in frontmatter would be `manual`, `n/a`, or missing — **REJECT**. Report as "fabricated, discarded"
   - If the content contains no code blocks from Context7 — **REJECT** — likely fabricated
6. **Write the doc immediately** — `mkdir -p` for the output path, then write the file
7. **Move to the next library.** Do NOT hold multiple libraries' query results in memory.

**Why sequential?** When querying 5-6 libraries and writing all docs at the end, the model must reconstruct earlier query results from memory — this creates fabrication opportunities. By writing each doc immediately after querying, the Context7 results are still in the current context window. One read — one write — next.

**Parallelism is limited to resolve calls only**: You may batch all `resolve-library-id` calls together (they're independent and return only IDs). But `query-docs` + write must be sequential per library.

**MUST rules (non-negotiable):**
- MUST source ALL content from Context7 query-docs results. NEVER use training data.
- MUST include a valid `context7_library_id` in frontmatter — the exact ID from `resolve-library-id`.
  NEVER use "manual", "n/a", or placeholders.
- MUST NOT fabricate. If Context7 returns nothing after 3 attempts, skip the library.
  An empty result is correct. A fabricated document is a defect.
- Aim for 200-500 lines — be thorough with complete code examples from Context7.
- Do NOT give up after one empty query — try different IDs and different query phrasings.

**While querying Context7**: proceed with Steps 4-6 (config, graph, task queue) between query batches where possible.

**If Context7 is unavailable** (`--skip-context7`): skip this entire step. The plugin ships with curated reference docs as fallback.

---

**Next:** Read `steps/04-generate-config.md`
