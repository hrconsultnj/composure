# How Composure Works

*The AI doesn't follow instructions — it follows rules it can't break.*

---

## The Problem

AI coding agents are powerful, but they cut corners. Every developer using Claude Code, Cursor, or Copilot has seen it:

| Problem | What Happens | Real Cost |
|---------|-------------|-----------|
| **Band-aid fixes** | Agent writes `as any`, `@ts-ignore`, `!` assertions instead of fixing the type | Tech debt compounds. You inherit fragile code that breaks silently. |
| **Monolithic files** | Agent dumps 1,200 lines into one file because it's faster | Unreadable, untestable, impossible to review. Context window fills up on future edits. |
| **Sub-agent race conditions** | Agent A builds the database. Agent B builds components that need the database. Both run in parallel. | Agent B fails, retries, or writes wrong types. You spend time cleaning up. |
| **One-shot cleanup debt** | You ask for a feature. Agent builds it in one shot — works, but the code is messy. | You now spend 2x the time refactoring what it just wrote. |
| **Ignored instructions** | You write detailed SOPs and architecture docs. Agent skips them under pressure. | Your patterns drift. Consistency erodes. |
| **Context window bloat** | Monolithic files eat tokens. Agent loses context mid-task. | Hallucinations, repeated work, lost progress. |

**Instructions tell the AI what to do. Composure makes sure it actually does it.**

---

## The Architecture: Three Layers

```
┌─────────────────────────────────────────────────────┐
│                   LAYER 3: SKILLS                    │
│  /app-architecture  /commit  /review-tasks  /init    │
│  Architecture guides, reference docs, workflows      │
│  ─── "Here's HOW to build things right" ───          │
├─────────────────────────────────────────────────────┤
│                   LAYER 2: HOOKS                     │
│  PreToolUse: Block bad code BEFORE it's written      │
│  PostToolUse: Track quality AFTER every edit          │
│  SessionStart: Load context, verify tasks on resume  │
│  ─── "You CANNOT cut corners" ───                    │
├─────────────────────────────────────────────────────┤
│                   LAYER 1: GRAPH                     │
│  Tree-sitter AST → SQLite knowledge graph            │
│  Exact function sizes, call chains, blast radius     │
│  ─── "We KNOW what the code actually looks like" ─── │
└─────────────────────────────────────────────────────┘
```

### Layer 1: The Knowledge Graph (The Brain)

A persistent SQLite database built from tree-sitter AST parsing. Not guessing — measuring.

| What It Tracks | Why It Matters |
|---------------|---------------|
| Every function, its exact line count | No more "this file seems big" — it's 847 lines, 3 functions over 150. |
| Import/export relationships | Change `auth.ts` → know exactly which 14 files are affected. |
| Call chains (who calls what) | Before you refactor, see the blast radius. |
| Auto-updates on every edit | Never stale. The PostToolUse hook re-parses changed files in real-time. |

**7 MCP tools** let Claude query the graph during reviews, commits, and decomposition — no manual lookup needed.

### Layer 2: The Hooks (The Enforcer)

This is what makes Composure different from "just writing better instructions." Hooks intercept Claude's actions at the tool level — before code is written, after code is written, and when sessions start.

#### Before Code Is Written (PreToolUse)

```
Claude tries to write code
        │
        ▼
┌─ No Band-Aids (shell script) ────────────────────┐
│  Blocks: as any, @ts-ignore, !. assertions,      │
│  _unused vars, as Type returns, double casts      │
│                                                    │
│  ✗ BLOCKED → Claude must fix root cause            │
│  ✓ PASSED → continues to next gate                 │
└──────────────────────────────────────────────────┘
        │
        ▼
┌─ Type Safety Review (LLM prompt) ────────────────┐
│  Catches what regex can't:                         │
│  Record<string, any>, Promise<any>, Function type, │
│  unnecessary assertions where satisfies works       │
│                                                    │
│  ✗ DENIED → Claude must use proper types            │
│  ✓ ALLOWED → code is written                        │
└──────────────────────────────────────────────────┘
```

**Two-layer gate.** The shell script catches the obvious shortcuts (fast, <5s). The LLM review catches the subtle ones (semantic analysis, <10s). Both must pass.

#### After Code Is Written (PostToolUse)

```
Code is written successfully
        │
        ▼
┌─ Code Quality Guard ────────────────────────────┐
│  Checks file size (400/600/800 thresholds)       │
│  Finds large functions (>150 lines via graph DB) │
│  Detects inline types that should be extracted   │
│  Flags route files over 50 lines                 │
│  Detects shared-type duplication in monorepos    │
│                                                   │
│  → Logs tasks to tasks-plans/tasks.md             │
│  → Severity: 🔴 Critical, 🟡 High, 🟢 Moderate  │
│  → Non-blocking (doesn't stop work)               │
└──────────────────────────────────────────────────┘
        │
        ▼
┌─ Graph Update ──────────────────────────────────┐
│  Re-parses the changed file via tree-sitter      │
│  Updates function sizes, imports, call chains    │
│  → Knowledge graph stays current in real-time     │
└──────────────────────────────────────────────────┘
```

#### On Session Start/Resume

```
Session starts or resumes
        │
        ▼
┌─ Architecture Loader ───────────────────────────┐
│  Loads the full /app-architecture skill          │
│  → Patterns, size limits, conventions always     │
│    available — even after context compaction      │
└──────────────────────────────────────────────────┘
        │
        ▼ (resume only)
┌─ Task Verifier Agent ───────────────────────────┐
│  Reads open tasks, checks actual file sizes      │
│  Auto-marks completed items                      │
│  Checks graph staleness                          │
│  → Pick up exactly where you left off             │
└──────────────────────────────────────────────────┘
```

### Layer 3: The Skills (The Playbook)

8 slash commands that encode workflows, not just instructions.

| Skill | What It Does | When To Use |
|-------|-------------|-------------|
| `/init` | Detects your stack, generates config, builds graph, creates task queue | Once per project |
| `/app-architecture` | Decision trees for rendering, data fetching, multi-tenant patterns. 25+ reference docs. | Auto-loaded every session |
| `/commit` | Commits with task queue hygiene — auto-cleans resolved tasks, blocks if staged files have open quality issues | Every commit |
| `/decomposition-audit` | Full codebase scan. Reports every file over limits with extraction instructions. | Periodically |
| `/review-tasks` | Process task queue: summarize, batch fix, delegate to parallel sub-agents, verify, archive | When tasks pile up |
| `/build-graph` | Build/update the code knowledge graph | After major changes |
| `/review-pr` | PR review with blast-radius analysis from the knowledge graph | Before merge |
| `/review-delta` | Token-efficient review of only what changed since last commit | Before commit |

---

## The Sub-Agent Problem (And How Composure Solves It)

When you ask Claude to build a feature, it often spawns sub-agents to work in parallel. This is powerful — but creates real problems:

### Without Composure

```
Main Agent: "Build user settings page"
    │
    ├─ Sub-Agent A: Generate database migration
    ├─ Sub-Agent B: Build React components (needs DB types!)
    ├─ Sub-Agent C: Create API routes (needs DB types!)
    │
    ▼
Sub-Agent B fails: types don't exist yet
Sub-Agent C fails: schema not generated
Main Agent retries, or does it itself
    │
    ▼
Everything eventually works, but:
  - 800-line monolithic component
  - as any scattered everywhere
  - No type safety on API responses
  - You spend hours cleaning up
```

### With Composure

```
Main Agent: "Build user settings page"
    │
    ├─ Sub-Agent A: Generate database migration
    │   └─ PostToolUse: Graph updated, types tracked
    │
    ├─ Sub-Agent B: Build React components
    │   ├─ PreToolUse: No Band-Aids blocks "as any" on DB types
    │   │   └─ Agent forced to wait for types or generate them first
    │   ├─ PreToolUse: Type Safety catches Record<string, any>
    │   └─ PostToolUse: File at 450 lines → 🟡 DECOMPOSE task logged
    │
    ├─ Sub-Agent C: Create API routes
    │   ├─ PreToolUse: Blocks @ts-ignore on missing schema
    │   └─ PostToolUse: Route file at 200 lines → task logged
    │
    ▼
The enforcing agent (Composure) creates proper blockers:
  - Sub-agents can't use band-aids to skip dependencies
  - Decomposition tasks are auto-logged for anything oversized
  - /review-tasks delegate sends parallel sub-agents to fix them
  - The code ships clean THE FIRST TIME
```

**The key insight:** When sub-agents can't use `as any` or `@ts-ignore` to bypass missing types, they're forced to either:
1. Create proper task dependencies (wait for the DB migration)
2. Generate the types themselves
3. Ask the main agent for coordination

**The hooks turn sloppy parallel execution into disciplined parallel execution.**

---

## Routing vs. Enforcement: The Full Picture

| | Prompt Routing | Composure Hooks | Best When Used Together |
|---|---|---|---|
| **Mechanism** | Instructions in claude.md, skills, SOPs | Shell scripts + LLM gates that intercept tool calls | Routing provides context; hooks enforce it |
| **When it acts** | Before the AI starts thinking | When the AI tries to write code | AI knows the rules AND can't break them |
| **Failure mode** | AI can ignore, skip, or misinterpret | Action is literally blocked — exit code 2 | Neither layer can be bypassed |
| **What it catches** | Nothing — it's guidance, not detection | `as any`, `@ts-ignore`, `!.`, oversized files, type shortcuts | Guidance prevents most issues; hooks catch the rest |
| **Sub-agent coverage** | Sub-agents often don't read parent instructions | Hooks fire on ALL agents — main and sub | Sub-agents inherit the same quality gates |
| **Context window** | Instructions consume tokens | Hooks run externally — zero token cost | More room for actual code context |
| **Analogy** | Speed limit sign | Speed camera + ticket | Sign tells you the limit; camera enforces it |

---

## What Makes It Click

1. **Hooks fire on every agent.** Main agent, sub-agents, parallel workers — everyone hits the same gates. No special agent gets to skip quality checks.

2. **Two-pass type safety.** Regex catches the obvious (`as any`). LLM catches the subtle (`Record<string, any>`). Both must pass before code lands.

3. **The graph knows the truth.** Not "this file looks big" — the graph says this function is exactly 312 lines, called by 7 files, and changing it affects 23 downstream consumers.

4. **Tasks persist across sessions.** Resume tomorrow, the task verifier checks what's still open. No lost context.

5. **Non-blocking where it should be.** PreToolUse hooks block bad code (you must fix it). PostToolUse hooks log tasks (you can fix them later). The right friction in the right places.

6. **Zero tokens consumed.** Hooks run as external shell processes. They don't eat your context window. The AI gets more room to think about your actual code.

---

## The One-Liner

> **Composure is the difference between telling Claude how to write good code and making it impossible to write bad code.**
