# Session Context Optimization

**Scenario**: Plugin scaffolding consumes too much context before any work starts
**Stack**: Any project with Composure + companion plugins installed
**Plugin feature**: Lightweight session hooks, on-demand architecture loading

---

## The Problem

Claude Code has a finite context window. Every line of plugin instructions, skill listings, MCP server descriptions, and hook injections competes with the actual work — your code, your files, your conversation.

When multiple plugins are installed, session startup can inject hundreds of lines of scaffolding before you type a single character. This scaffolding includes:
- Architecture routing tables
- Skill registrations (each plugin lists all its skills)
- MCP server instructions
- Hook-injected context on every file operation

The more plugins you install, the less context remains for actual work.

---

## What We Measured

### Before Optimization

| Source | Lines injected | When |
|--------|---------------|------|
| Architecture router (SKILL.md) | ~200 | Every session start, resume, compact |
| Skills list (with duplicates) | ~80 entries | Every session lifecycle event |
| MCP instructions (Context7 2x) | ~40 | Every session lifecycle event |
| Resume agent hook | 60s agent spawn | Every resume |

**Total pre-work overhead**: ~1,300+ lines of context before the user says anything.

On resume or context compaction (mid-conversation), the full 200-line architecture router would be re-injected — even though the information was already in the conversation from earlier.

### Plugin Skill Duplication

Multiple plugins from the same marketplace registered identical skills:

| Plugin | Skills registered | Unique skills |
|--------|------------------|---------------|
| document-skills | 17 | 17 |
| example-skills | 17 | 0 (100% duplicate) |
| claude-api | 17 | 0 (100% duplicate) |
| expo-plugin-1 | 12 | 12 |
| expo-plugin-2 | 12 | 0 (100% duplicate) |
| expo-plugin-3 | 12 | 0 (100% duplicate) |

**80+ skill entries**, but only ~40 unique. The duplicates consumed context for zero benefit.

An MCP server (Context7) was registered both as a plugin AND as an MCP JSON server — doubling its tool listings and instruction blocks.

---

## The Fix

### 1. On-Demand Architecture Loading

**Before**: Full 200-line SKILL.md routing table injected at every session start
**After**: 8-line stack note on startup, 1-line reminder on resume

```
# Startup (fresh session)
[composure:stack] Detected: typescript | frontend=nextjs | backend=supabase
Architecture category: fullstack (entry: fullstack/INDEX.md → nextjs/nextjs.md)

When building features:
- Non-trivial work: Run /composure:blueprint first
- Routine edits: /composure:app-architecture loads reference docs on demand

# Resume (same conversation continuing)
[composure:stack] typescript | nextjs | arch=fullstack
```

The full architecture docs load only when `/app-architecture` or `/blueprint` is explicitly invoked — when you're actually building something.

### 2. Lifecycle-Aware Hooks

SessionStart hooks now read the `source` field from stdin JSON to differentiate:

| Event | What fires | Context injected |
|-------|-----------|-----------------|
| `startup` | Full stack note + task/graph check | ~10 lines |
| `resume` | 1-line stack reminder + task/graph check | ~3 lines |
| `compact` | 1-line stack reminder only | ~1 line |

The old approach treated all lifecycle events the same — 200 lines every time.

### 3. Stale Graph Detection

The resume hook checks if the code graph is stale and instructs Claude to rebuild before exploring:

```
[composure:action-required] Code graph is stale.
BEFORE any feature work, rebuild using build_or_update_graph.
```

This prevents the expensive fallback where Claude spawns multiple Explore agents (see [Graph vs Explore](graph-vs-explore.md) case study).

### 4. Plugin Deduplication

Disabled redundant plugins:

| Change | Impact |
|--------|--------|
| Disabled `example-skills` | -17 duplicate skill entries |
| Disabled `claude-api` plugin | -17 duplicate skill entries |
| Disabled 2 of 3 expo plugins | -24 duplicate skill entries |
| Disabled Context7 plugin (kept MCP JSON server) | -1 duplicate MCP tool set |

### 5. Agent Hook → Command Hook

The resume check was a `type: "agent"` hook that spawned a 60-second sub-agent to count tasks and check graph staleness. The docs say SessionStart only supports `type: "command"` hooks.

Replaced with a bash script that does the same job in <1 second:

```
[composure:resume] Tasks: 4 open, 0 done | Code graph is stale.
```

---

## Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Session start context | ~200 lines | ~10 lines | **20x less** |
| Session resume context | ~200 lines | ~3 lines | **67x less** |
| Skill list entries | ~80 | ~40 | **50% reduction** |
| Context7 tool sets | 2 | 1 | **No duplication** |
| Resume hook time | ~60s (agent) | <1s (command) | **60x faster** |
| Architecture docs | Always loaded | On-demand only | **Zero waste on non-feature work** |

---

## The Principle

**Load what you need, when you need it.**

Every line of context injected at session start is a line that can't be used for reasoning about the actual problem. Plugins should be invisible until they're needed — then load precisely the right context for the task at hand.

The ideal plugin has:
- **Zero** overhead on sessions that don't need it
- **Minimal** overhead on sessions that do (just enough to trigger the right loading)
- **Full** context available on-demand when explicitly invoked

---

*Composure v1.2.74 · Claude Opus 4.6*
