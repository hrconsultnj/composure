# Step 2: Graph Pre-Scan and Questions

## 2a. Graph Pre-Scan

**Skip graph scan if `--skip-graph`, `--quick`, or graph MCP unavailable.**

Use the code graph to find related code BEFORE asking the user anything:

```
semantic_search_nodes({ query: "<user's description>" })
```

This eliminates questions the graph can answer:

| Classification | What graph pre-answers | What still needs human input |
|---|---|---|
| `new-feature` | Finds similar existing features (patterns to follow) | New DB tables? Who consumes it? Auth boundaries? |
| `enhancement` | Locates the exact files/functions to modify | Signature changes? Additive or modifying? |
| `refactor` | Maps current dependency structure of the target area | Goal? External consumers? Pure refactor? |
| `bug-fix` | Finds the files involved automatically | Reproduction path? Regression or latent? |
| `migration` | Finds all usages of the thing being migrated | Incremental or big-bang? Breaking changes? |

If graph is unavailable: fall back to asking all questions (use full question set below). Mention: "Code graph not available -- run `/composure:build-graph` for smarter pre-scanning."

## 2b. Confirm + Ask Remaining Questions

Present graph findings AND remaining questions in a **single AskUserQuestion** call:

"I found these related files: [list from graph]. Is this the right area?

Also:
1. [Remaining question 1]
2. [Remaining question 2]
3. [Remaining question 3]"

### Questions by classification (ask ONLY what the graph didn't answer):

**new-feature:**
1. What existing feature is this most similar to in this codebase? _(skip if graph found a clear match)_
2. Does this need new database tables/columns, or does it use existing data?
3. Who consumes this -- end users (UI), other services (API), or both?
4. Are there auth/permission boundaries? (who can see/do this)

**enhancement:**
1. Which existing file(s) does this modify? _(skip if graph located them)_
2. Does this change any function signatures or prop interfaces that other files depend on?
3. Is this additive (new optional behavior) or modifying (changing existing behavior)?

**refactor:**
1. What is the goal -- better decomposition, clearer boundaries, performance, or testability?
2. Are there consumers outside this repo (published package, API contract)?
3. Should behavior stay identical (pure refactor) or are minor behavior changes acceptable?

**bug-fix:**
1. What is the reproduction path? (steps or failing test)
2. Is this a regression (worked before) or a latent bug?
3. Does the fix require changing a shared interface, or is it contained to one module? _(skip if graph shows it's contained)_

**migration:**
1. What is being migrated? (dependency version, framework, API pattern)
2. Can it be done incrementally (file-by-file) or does it require a big-bang switch?
3. Are there breaking changes in the target version? (check Context7 if needed)

---

**Next:** Read `steps/03-impact-analysis.md`
