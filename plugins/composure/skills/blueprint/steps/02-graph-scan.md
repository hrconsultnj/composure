# Step 2: Graph Pre-Scan and Scope Confirmation

**Skip if `--skip-graph`, `--quick`, or graph MCP unavailable.** If skipping, fall back to asking the full question set (see section 2d) and proceed to step 03.

## 2a. Ensure Graph is Current

Before querying, check when the graph was last updated:

```
list_graph_stats()
```

Check the `last_updated` timestamp:

- **Within the last hour** → graph is fresh (likely from this session or Composure's PostToolUse auto-updates). Skip rebuild, proceed to 2b.
- **Older than 1 hour** → graph may be stale. Rebuild incrementally:
  ```
  build_or_update_graph()
  ```
  This only re-parses files that changed since the last build — takes seconds when few files changed, longer on first build.

A stale graph returns sparse edges and unreliable caller/test relationships. Querying a stale graph defeats the purpose of graph-powered planning.

## 2b. Graph Pre-Scan

Use the code graph to find related code BEFORE asking the user anything.

`semantic_search_nodes` matches against **code entity names** (function names, class names, type names, file names) — NOT natural language. Extract code-relevant keywords from the user's description and run multiple targeted searches:

```
// DON'T: natural language sentences
semantic_search_nodes({ query: "auth signup stripe billing checkout" })  // returns nothing

// DO: individual code-relevant keywords, one search per concept
semantic_search_nodes({ query: "signup" })
semantic_search_nodes({ query: "checkout" })
semantic_search_nodes({ query: "stripe" })
semantic_search_nodes({ query: "auth callback" })
```

Run 3-6 searches using short, specific keywords derived from the user's description. Each search should target one concept (a feature name, a domain term, a framework name). Combine the results.

This eliminates questions the graph can answer:

| Classification | What graph pre-answers | What still needs human input |
|---|---|---|
| `new-feature` | Finds similar existing features (patterns to follow) | New DB tables? Who consumes it? Auth boundaries? |
| `enhancement` | Locates the exact files/functions to modify | Signature changes? Additive or modifying? |
| `refactor` | Maps current dependency structure of the target area | Goal? External consumers? Pure refactor? |
| `bug-fix` | Finds the files involved automatically | Reproduction path? Regression or latent? |
| `migration` | Finds all usages of the thing being migrated | Incremental or big-bang? Breaking changes? |

If graph is unavailable: mention "Code graph not available — run `/composure:build-graph` for smarter pre-scanning." Then fall back to full question set (2d).

## 2c. Read the Files the Graph Found

**Do NOT stop at graph results.** The graph tells you WHERE — now Read the files to understand WHAT and WHY.

1. From the graph results, identify the **key files** (typically 3-8 files most relevant to the task)
2. **Read them directly** — don't spawn agents. Reading costs $0.005/file (~1K tokens). An agent spawn costs $0.15 minimum (30x more). At 10 files that's $0.05 vs $0.15 — Read always wins.
3. **Thresholds**:
   - **<10 files**: ALWAYS Read directly. No exceptions.
   - **10-30 files**: Read directly unless context is already >50% full. 30 files = ~31K tokens = only 3% of context.
   - **30+ files**: Read directly if you need content for implementation. Agents only if you need parallel summaries you won't reference again.
4. When agents ARE needed (30+ files, parallel summaries): give agents EXACT file paths from the graph — never "search broadly for X."

## 2d. Present Findings and Confirm Scope

Present findings from BOTH the graph structure AND the file contents:

"The graph found these related files (I've read them):
- `path/to/file-a.ts` — [what it does, key functions, patterns to follow]
- `path/to/file-b.tsx` — [what it does, how it connects to the task]
- ...

Based on this, the feature touches **[areas: auth, billing, UI, etc.]**.

Is this the right scope? Anything I missed?"

Use **AskUserQuestion** combining scope confirmation with the clarifying questions from 2e below. This keeps it to a single round-trip when scope is clear.

If the user says files are missing, run additional graph queries for the areas they mention, Read the new files, re-present, ask again. If they say wrong direction, re-classify (go back to step 01).

## 2e. Clarifying Questions (only what reading didn't answer)

Include these in the same AskUserQuestion call as 2d. Ask ONLY questions that neither the graph structure NOR the file contents answered — typically 1-2 questions, not a full interrogation.

### Questions by classification:

**new-feature:**
1. Does this need new database tables/columns, or does it use existing data?
2. Who consumes this — end users (UI), other services (API), or both?
3. Are there auth/permission boundaries? (who can see/do this)

**enhancement:**
1. Does this change any function signatures or prop interfaces that other files depend on?
2. Is this additive (new optional behavior) or modifying (changing existing behavior)?

**refactor:**
1. What is the goal — better decomposition, clearer boundaries, performance, or testability?
2. Should behavior stay identical (pure refactor) or are minor behavior changes acceptable?

**bug-fix:**
1. What is the reproduction path? (steps or failing test)
2. Is this a regression (worked before) or a latent bug?

**migration:**
1. Can it be done incrementally (file-by-file) or does it require a big-bang switch?
2. Are there breaking changes in the target version? (check Context7 if needed)

## STOP

Call AskUserQuestion now with scope confirmation + clarifying questions. **Do NOT read step 03 until the user has responded.**

After the user responds:
- Scope confirmed → read `steps/03-impact-analysis.md`
- Files missing → run additional graph queries for the areas they mention, re-present, ask again
- Wrong direction → go back to `steps/01-classify.md`
