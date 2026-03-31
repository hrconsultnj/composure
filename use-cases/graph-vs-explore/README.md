# Code Graph vs Explore Agents

**Scenario**: Building a new feature in a large monorepo
**Stack**: Monorepo (web + mobile + shared packages), 500+ pages, 70+ database migrations
**Plugin feature**: Code review graph (`composure-graph` MCP server)

---

## The Problem

When Claude Code needs to understand a large codebase before building a feature, it defaults to spawning Explore agents — sub-agents that read files broadly across the repo to map out what exists.

This works, but it's expensive:
- Each agent loads its own system prompt, CLAUDE.md, and hook context before doing any work
- Agents do internal grep/glob/read cycles — all billed tokens invisible to the parent
- Broad exploration misses specific things that a targeted search would catch
- Multiple agents can overlap, reading the same files

In a 500+ page monorepo with shared packages, this exploration can consume the majority of your context window before any code is written.

---

## What Happened

**Task**: Build a goal tracking system that integrates with existing nutrition, fitness, and body composition data.

**Critical requirement**: Find all existing goal-related code (enums, types, constants, hooks, UI) before planning — to build on what exists, not reinvent it.

### Without the Graph

Three parallel Explore agents searched the codebase:

| Agent | Focus | Time | Context Cost |
|-------|-------|------|-------------|
| Agent 1 | Database schema & patterns | ~45s | ~3,000 words |
| Agent 2 | Route structure & components | ~45s | ~3,500 words |
| Agent 3 | Shared types & constants | ~45s | ~2,500 words |

**Result**: ~9,000 words consumed in parent context. 34+ file reads. Still **missed 8 existing goal-related systems** — enums, types, constants, and UI components that already existed in the codebase.

The resulting plan would have reinvented code that was already there.

### With the Graph

Five targeted graph queries:

| Query | Time | Result |
|-------|------|--------|
| `semantic_search("goal")` | <1s | 30 nodes — every goal-related file, function, and type |
| `semantic_search("assignment")` | <1s | 20 nodes — all related assignment code |
| `file_summary(key-factory.ts)` | <1s | 6 nodes — all exports with exact line numbers |
| `importers_of(config.ts)` | <1s | Precise dependency chain |
| `imports_of(types.ts)` | <1s | Confirmed shared package dependency |

**Result**: ~500 words of structured output. 5 queries, each under 1 second. Found everything the Explore agents found **plus** the 8 systems they missed.

---

## Token Economics

The word counts above only show what lands in parent context. The real cost includes agent overhead — tokens consumed behind the scenes that never surface but are still billed.

### Explore Agent — True Cost Per Agent

| Phase | What happens | Tokens |
|-------|-------------|--------|
| Startup | System prompt, CLAUDE.md, hooks, skills injected | ~4,000-6,000 |
| Task prompt | Parent describes what to find | ~200-500 |
| Internal work | Agent's own grep/glob/read cycles + reasoning | ~10,000-19,000 |
| Response | Summary returned to parent | ~1,500-2,500 |
| **Per agent total** | | **~16,000-28,000** |

**3 agents × ~20,000 avg = ~60,000 tokens consumed**

Of that, only ~6,000 tokens (the summaries) are useful in parent context. The other ~54,000 tokens are invisible overhead.

### Graph Query — True Cost Per Query

| Phase | What happens | Tokens |
|-------|-------------|--------|
| Request | Function name + parameters | ~30-80 |
| Response | Structured node data | ~100-800 |
| **Per query total** | | **~130-880** |

**5 queries × ~400 avg = ~2,000 tokens consumed**

ALL 2,000 tokens are directly useful in main context. No overhead, no agent startup, no re-reading CLAUDE.md.

### True Ratio

| Metric | Explore (3 agents) | Graph (5 queries) | Ratio |
|--------|-------------------|-------------------|-------|
| **Total tokens consumed** | ~60,000 | ~2,000 | **30x** |
| **Tokens visible to parent** | ~6,000 | ~2,000 | 3x |
| **Invisible overhead** | ~54,000 | 0 | ∞ |
| **Wall clock** | ~45s | <5s | **9x** |
| **Completeness** | Missed 8 systems | Found all | — |

---

## Real Session Validation (2026-03-30)

During a plugin maintenance session, the difference showed up even for lightweight exploration:

| Task | Approach used | Tokens consumed |
|------|--------------|-----------------|
| Map sentinel plugin structure | 1 Explore agent | ~20,000 |
| Find graph tool names | 3 Grep calls | ~1,200 |
| Verify graph file path | 3 Grep calls (iterative) | ~1,200 |
| Find semgrep references | 2 Grep calls | ~800 |
| **Total** | Mixed (agent + direct) | **~23,200** |

If the graph had been built for the plugin repo:

| Task | Graph approach | Tokens consumed |
|------|---------------|-----------------|
| Map sentinel plugin structure | `semantic_search("sentinel")` + `file_summary` | ~800 |
| Find graph tool names | `semantic_search("query_graph")` | ~400 |
| Verify graph file path | `query_graph({ pattern: "imports_of" })` | ~400 |
| Find semgrep references | `semantic_search("semgrep")` | ~400 |
| **Total** | All graph | **~2,000** |

**Session savings: ~23,200 → ~2,000 tokens (11.6x more efficient)**

And this was a *light* session — no feature build, no multi-file planning. For complex feature work (the goal tracking scenario), the savings compound to 30x.

---

## Impact Summary

| Metric | Without Graph | With Graph | Improvement |
|--------|--------------|------------|-------------|
| Discovery time | ~45 seconds | <5 seconds | **9x faster** |
| Total tokens consumed | ~60,000 | ~2,000 | **30x less** |
| Visible context cost | ~9,000 words | ~500 words | **18x less** |
| Invisible overhead | ~54,000 tokens | 0 | **Eliminated** |
| Completeness | Missed 8 systems | Found all | **No blind spots** |
| Plan accuracy | Would reinvent existing code | Correct from the start | **Zero rework** |

---

## How Composure Prevents This

Session hooks detect when the graph is stale and instruct Claude to rebuild before exploring:

```
[composure:action-required] Code graph is stale or missing.
BEFORE any feature work, rebuild using build_or_update_graph.
Do NOT fall back to Explore agents.
The 15-second graph build saves minutes of exploration sprawl.
```

**Ideal workflow**:
1. **Graph first** — inventory and relationship mapping (<5s)
2. **Explore agents** — only for understanding intent and conventions (not structure)
3. **Read specific files** — implementation details for the files the graph identified

---

## What You'd Need Without Composure

Without the code graph, you'd either:
- Accept the ~60,000-token overhead on every major task
- Manually tell Claude which files to look at (defeating the purpose of an AI assistant)
- Hope that broad exploration catches everything (it won't)

The graph builds in ~15 seconds and persists across sessions. It's updated incrementally after every edit via PostToolUse hooks. Once built, every future task benefits.

---

*Composure v1.2.74 · Claude Opus 4.6 · Updated 2026-03-30*
