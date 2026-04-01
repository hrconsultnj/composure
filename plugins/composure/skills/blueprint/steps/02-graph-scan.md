# Step 2: Graph Pre-Scan and Scope Confirmation

**Skip if `--skip-graph`, `--quick`, or graph MCP unavailable.** If skipping, fall back to asking the full question set (see section 2c) and proceed to step 03.

## 2a. Graph Pre-Scan

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

If graph is unavailable: mention "Code graph not available — run `/composure:build-graph` for smarter pre-scanning." Then fall back to full question set (2c).

## 2b. Present Findings and Confirm Scope

Present graph findings to the user with a scope confirmation:

"The graph found these related files:
- `path/to/file-a.ts` — [why it's relevant]
- `path/to/file-b.tsx` — [why it's relevant]
- ...

Based on this, the feature touches **[areas: auth, billing, UI, etc.]**.

Is this the right scope? Anything the graph missed that you know about?"

Use **AskUserQuestion** combining scope confirmation with the clarifying questions from 2c below. This keeps it to a single round-trip when scope is clear.

If the user says files are missing, run additional graph queries for the areas they mention. If they say wrong direction, re-classify (go back to step 01).

## 2c. Clarifying Questions (only what the graph didn't answer)

Include these in the same AskUserQuestion call as 2b. Ask ONLY questions the graph couldn't answer — typically 1-3 questions, not a full interrogation.

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

---

**Next:** Read `steps/03-impact-analysis.md`
