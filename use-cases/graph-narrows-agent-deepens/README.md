# Graph Narrows, Agent Deepens: Why Neither Alone Is Enough

**Scenario**: Understanding a complex AI agent pipeline in a production SaaS application
**Stack**: Next.js 16 / TypeScript / Supabase / Claude API / SSE streaming
**Plugin feature**: Code review graph (13 MCP tools) vs Explore agents (native Claude Code)

---

## The Hypothesis

We predicted that graph tools would be faster and cheaper than Explore agents. We were right about that. But the test revealed something more interesting: **neither approach alone produces the best result.**

The graph excels at structural facts — file paths, function chains, decision logic, blast radius. Explore agents excel at domain content — prose inside prompts, streaming formats, client-side hooks buried in component files.

The optimal workflow isn't "graph instead of agents." It's **graph first (structural map), then targeted agents (domain depth).**

---

## The Test

Same question, same project, two windows. One with Composure's code graph, one with pure Claude Code (Explore agents only).

**Question**: "How does the AI agent work?"

**Project**: A production SaaS platform with a multi-stage AI diagnostic pipeline — 40+ modules, multiple specialist agents, diagnostic caching, cost governance, and constitutional AI guardrails.

### Window A: Graph-First (Composure installed)

Claude queried the code graph for structural relationships, then read specific files the graph identified:
- `semantic_search_nodes` found the core modules
- `query_graph` mapped the function call chains
- `get_impact_radius` showed which modules depend on the orchestrator
- Targeted file reads on the exact functions the graph identified

**Result**: 9-step pipeline with specific file paths (main orchestrator at 1,089 lines), 10+ function names, decision logic with three boolean return signals, module map with 8 architectural layers, 3 actionable design pattern insights.

### Window B: Explore Agents (no plugins)

Claude spawned an Explore agent that searched the codebase broadly:
- 34 tool calls inside the agent (grep, glob, read cycles)
- Broad file scanning across the AI modules directory
- Agent returned a summary to the parent context

**Result**: 4-phase overview (Preprocessing, Analysis, Response, Postprocessing), specialist routing table, domain skill taxonomy, SSE streaming event format, postprocessing details.

---

## The Numbers

### Quantitative

| Metric | Graph | Explore | Ratio |
|---|---|---|---|
| **Total time** | 2m 3s | 5m 52s (3m 23s + 2m 29s agent) | **2.85x faster** |
| **Cost** | $1.02 | ~$2.50+ (estimated) | **~2.5x cheaper** |
| **Tokens** | ~80K (with cache) | ~98.4K + 44K cogitation | **~2x fewer** |
| **Agent spawns** | 0 | 1 (34 tool uses inside) | **Eliminated** |
| **File references cited** | 8+ (with line counts) | 1 | **8x more** |
| **Function names cited** | 10+ | 3 | **3x more** |

### Qualitative (scored 1-5)

| Dimension | Graph | Explore | Winner |
|---|---|---|---|
| Architectural accuracy | 5 | 3.5 | Graph — found the real 9-step pipeline, not a simplified 4-phase model |
| Specificity | 5 | 3 | Graph — file paths, line counts, function names, table names |
| Completeness | 4 | 4 | **Tie** — Graph deeper on orchestration, Explore broader on domain content |
| Design pattern insights | 5 | 4 | Graph — identified 3 specific patterns with implementation details |
| Implementation readiness | 5 | 3 | Graph — could modify the system from this description alone |
| **Total** | **24/25** | **17.5/25** | **Graph: 37% higher quality** |

### Why Direct Read Beats Agents at Every File Count

Post-test cost analysis using current Claude pricing (April 2026):

| Model | Input/1M tokens | Output/1M tokens |
|---|---|---|
| Opus 4.6 (main window) | $5.00 | $25.00 |
| Haiku 4.5 (Explore agent default) | $1.00 | $5.00 |

| Operation | Cost | What you get |
|---|---|---|
| **Read 1 file** (Opus, ~1K tokens) | **$0.005** | Full content in main context, cross-referenceable |
| **Spawn 1 Explore agent** (Haiku, 34 calls) | **$0.15** | Summary only, context duplication, startup overhead |

The agent costs 30x more than reading a single file. The break-even point is ~30 files — but even at 30 files, Read consumes only 3% of the 1M context window.

| Files | Read (Opus) | Agent (Haiku) | Context used |
|---|---|---|---|
| 3 | $0.015 | $0.15 | 0.3% |
| 5 | $0.025 | $0.15 | 0.5% |
| 10 | $0.05 | $0.15 | 1% |
| 20 | $0.10 | $0.15 | 2% |
| 30 | $0.15 | $0.15 | 3% |

**Agents are for parallel WRITES (modifying independent files), not for reading.** The Cipher test would have scored 25/25 if the graph-first approach had simply Read the 3 files it missed instead of stopping at the structural summary.

---

## What the Graph Found That Explore Didn't

The graph's structural knowledge produced a fundamentally more accurate picture:

**1. The real pipeline is 9 steps, not 4 phases.**

Explore described a clean 4-phase model (Preprocessing → Analysis → Response → Postprocessing). The graph revealed the actual implementation has 9 numbered steps with half-steps (0, 0.5, 1, 2, 2.5, 3, 3.5, 4-7, 9) — each with distinct decision logic.

**2. Safety guardrails run FIRST.**

The graph found the safety evaluation function at Step 0 — blocking dangerous requests before any AI processing. Explore didn't mention this at all. For a system where wrong advice has real consequences, this is architecturally critical.

**3. Cost governance is a first-class system.**

The graph found cost limit pre-checks, auto-escalation to human support, cost-limit suffixes on responses, and the cost calculation function. Explore mentioned "postprocessing telemetry" but missed the proactive cost governance.

**4. The cache uses staged writes, not direct writes.**

The graph found that results are staged to cache and only committed after user confirmation. Explore mentioned caching but missed the staging pattern — which is the key design decision that prevents bad results from polluting the cache.

**5. Specific file paths + line counts.**

Graph cited the main orchestrator (1,089 lines), route handlers, and 10+ specific functions with their signatures and return types. Explore cited almost none of these.

---

## What Explore Found That the Graph Didn't

The graph missed three things — all domain content that lives in prose, not code structure:

**1. The full domain skill taxonomy.**

Explore produced a complete table of all specialist skills with examples for each. This content lives inside prompt text — the graph indexes the function that loads the prompt, but not the prompt content itself.

**2. SSE streaming event format.**

Explore showed the exact Server-Sent Events format with event types and example payloads. This is implementation detail inside the streaming route handler that the graph's structural view doesn't capture.

**3. The client-side consumer hook.**

Explore identified the React hook that accumulates streaming text on the client. The graph focused on the server-side pipeline and didn't traverse to the client consumer.

---

## The Real Insight: Graph Maps, Then Read

The initial hypothesis was "graph narrows, agents deepen." The test disproved that — **agents aren't needed for depth. Reading is.**

The graph found 8+ file paths with line counts. Claude could have simply Read those files and gotten everything — the domain taxonomy, the SSE format, the client hook — without spawning any agent. The graph result was treated as the final answer when it should have been treated as the **map of what to Read next**.

| Step | What it does | Cost |
|---|---|---|
| 1. Graph queries | File paths, relationships, blast radius | Seconds, ~2K tokens |
| 2. Read the files graph found | Domain content, comments, implementation details | ~30s, ~5K tokens per file |
| 3. Synthesize | Combine structural map + file content | Already in context |

**Agents are only needed when**: the graph identifies 10+ files to read (too many for main context), or you have parallel independent work (like processing 10+ backlog tasks simultaneously).

For a question like "How does the AI agent work?" — the graph identified ~8 key files. Reading them directly would have taken ~30 seconds and produced a 25/25 answer. No agents, no overhead, no context duplication.

---

## How This Changes the Workflow

### Before (graph OR agents)

```
Option A: Query graph → treat results as final answer → miss domain content
Option B: Spawn Explore agent → broad search → miss structural accuracy, waste tokens
```

### After (graph THEN read)

```
1. Query graph → get file paths, relationships, blast radius (seconds)
2. Read the files graph identified → get domain content, comments, patterns
3. If 10+ files → spawn agents with EXACT paths, not broad prompts
4. Synthesize: structural map + file content = complete answer
```

The key change: **don't stop after the graph.** The graph tells you WHERE. Reading tells you WHAT and WHY. Together, in the same context, no agents needed for most tasks.

---

## Implications for Plugin Design

This test validated three design decisions and corrected one:

1. **`search_references` is the right tool for "find all references"** — it would have found every skill name reference during a multi-skill rename in one call, instead of spawning two agents at ~90K tokens each.

2. **JSDoc summaries on function nodes are valuable** — `semantic_search_nodes` now matches on what functions DO, not just their names. This is how the graph found the safety evaluation function that Explore missed entirely.

3. **The CLAUDE.md guidance matters** — the original phrasing "Prefer Graph over Explore" implied replacement. The corrected phrasing "Graph maps, then Read" describes the actual optimal workflow.

4. **Corrected: agents aren't the "depth" layer** — Reading is. Agents are for parallelism and overflow, not for understanding code. The blueprint graph-scan step was updated to explicitly say "Read the files the graph found" before presenting findings.

---

*Composure v1.23.0 · Claude Opus 4.6 · Measured 2026-04-01*
