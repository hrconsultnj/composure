---
name: app-architecture
description: Complete architecture guide for building features from database to UI. Routes to frontend/, fullstack/, mobile/, backend/, or sdks/ based on detected stack. Covers decomposition, multi-tenant isolation, auth model, query patterns, and component patterns.
---

# App Architecture — Index

**You MUST load framework-specific references before writing any code.** This is not optional. Your training data is 10+ months behind — the reference docs contain current API patterns from Context7.

> **This is the master barrel.** Detect the stack, then load ONLY the matching architecture files. Do NOT load everything.

## Step 1: Detect Stack

Read `.claude/no-bandaids.json` and extract:
- `frameworks` — which languages are in use
- `frontend` — which frontend framework (`"vite"`, `"nextjs"`, `"angular"`, `"expo"`, or `null`)
- `backend` — which backend framework (or `null`)

If the file is missing:
1. **Run `/composure:initialize`** to detect the stack and generate the config
2. If that's not possible, default to `typescript` with `frontend: null` — but warn the user: *"No `.claude/no-bandaids.json` found. Run `/composure:initialize` to detect your stack and generate framework-specific reference docs. Without it, only universal patterns are loaded."*

## Step 2: Route to Architecture Files

Based on the detected `frontend` value, load the matching INDEX.md which tells you exactly what files to read:

| `frontend` value | Load this INDEX | Then follow its MUST READ instructions |
|---|---|---|
| `"vite"` | [frontend/INDEX.md](frontend/INDEX.md) | `frontend/core.md` + `frontend/vite/vite.md` |
| `"angular"` | [frontend/INDEX.md](frontend/INDEX.md) | `frontend/core.md` + `frontend/angular/angular.md` |
| `"nextjs"` | [fullstack/INDEX.md](fullstack/INDEX.md) | `frontend/core.md` + `fullstack/nextjs/nextjs.md` + curated docs |
| `"expo"` | [mobile/INDEX.md](mobile/INDEX.md) | `frontend/core.md` + `mobile/expo/expo.md` + curated docs |
| `null` or other | [frontend/INDEX.md](frontend/INDEX.md) | `frontend/core.md` only |

**Always also load:**
- [frontend/core.md](frontend/core.md) — Points to curated reference docs (query patterns, hooks, decomposition)
- [backend/INDEX.md](backend/INDEX.md) → [backend/core.md](backend/core.md) — Database, RLS, auth model (if building data layer)
- [sdks/INDEX.md](sdks/INDEX.md) — Cross-cutting libraries if detected (AI SDK, Zod, Stripe, etc.)

## Step 3: Load Language-Specific Patterns

| Language | MUST Read |
|---|---|
| Python | `backend/python/SKILL.md` |
| Go | `backend/go/SKILL.md` |
| Rust | `backend/rust/SKILL.md` |
| C/C++ | `backend/c-cpp/SKILL.md` |
| Swift | `mobile/swift/SKILL.md` (only for native modules) |
| Kotlin | `mobile/kotlin/SKILL.md` (only for native modules) |

TypeScript patterns live in `frontend/typescript/` — loaded automatically via `frontend/INDEX.md`.

**Also load if `.claude/composure-pro.json` exists:**
- Composure Pro Patterns — read `pluginRoot` from the JSON, then load `data-patterns/` and `rls-policies/` from the plugin cache. Licensed templates for multi-tenant Supabase architecture. If not available, `backend/core.md` provides conceptual guidance.

## Step 4: Load Project-Level Docs

Check if `.claude/frameworks/` exists in the project. If it does, load docs from there too:

```
.claude/frameworks/{category}/{framework}/generated/  ← Context7 docs for this project
.claude/frameworks/{category}/{framework}/project/     ← team-written conventions
```

**Plugin and project docs are complementary — read BOTH, never discard.**

| # | Source | What | Why |
|---|--------|------|-----|
| 1 | Plugin | Category `INDEX.md` + curated docs | Battle-tested patterns (hooks, decomposition, query patterns) |
| 2 | Plugin | Framework-specific files + co-located curated docs | e.g., `fullstack/nextjs/nextjs.md` + `01-ssr-hydration-layout.md` |
| 3 | Plugin | Language `SKILL.md` | Anti-patterns for the detected language |
| 4 | Plugin | Composure Pro Patterns (if `.claude/composure-pro.json` exists) | Licensed Pro patterns — read from `pluginRoot` in JSON |
| 5 | Project | `.claude/frameworks/{category}/{framework}/generated/` | Context7 docs — may have newer API versions |
| 6 | Project | `.claude/frameworks/{category}/{framework}/project/` | Team conventions, decisions, overrides |

**When plugin and project docs cover the same topic:**
- **Read both.** Project docs may have newer API patterns. Plugin docs have architectural rules Context7 doesn't provide.
- **If they conflict on a specific API**, prefer the project doc — it was generated against the project's actual version.
- **Never skip plugin docs** just because project docs exist.

**To generate project docs:** Run `/composure:initialize --force`

---

## Directory Structure

```
skills/app-architecture/                  ← PLUGIN (curated, battle-tested)
├── SKILL.md                              ← You are here (thin router)
├── GENERATED-DOC-TEMPLATE.md             ← Template for Context7 agent output
│
├── frontend/                             ← Web frontend + shared TypeScript patterns
│   ├── INDEX.md
│   ├── core.md                           ← Routing file (points to typescript/)
│   ├── typescript/                       ← Curated: TanStack Query, hooks, data patterns
│   ├── vite/vite.md                      ← Phase 5+7 for Vite SPA
│   └── angular/angular.md               ← Phase 5+7 for Angular
│
├── fullstack/                            ← Full-stack web frameworks
│   ├── INDEX.md
│   └── nextjs/
│       ├── nextjs.md                     ← Phase 5+7 for Next.js
│       ├── 01-ssr-hydration-layout.md    ← Curated
│       └── 02-route-groups.md            ← Curated
│
├── mobile/                               ← Mobile frameworks
│   ├── INDEX.md
│   ├── swift/SKILL.md                    ← Native module language
│   ├── kotlin/SKILL.md                   ← Native module language
│   └── expo/
│       ├── expo.md                       ← Phase 5+7 + anti-patterns
│       ├── 01-icon-patterns.md           ← Curated
│       ├── 02-bottom-sheet-dynamic-sizing.md
│       └── 03-custom-ui-components.md
│
├── backend/                              ← Backend concerns + languages
│   ├── INDEX.md
│   ├── core.md                           ← Phases 1-2 (database, RLS, auth)
│   ├── python/SKILL.md
│   ├── go/SKILL.md
│   ├── rust/SKILL.md
│   └── c-cpp/SKILL.md
│
├── sdks/                                 ← Cross-cutting libraries
│   └── INDEX.md
│
└── references/
    └── private/                          ← Licensed patterns (git submodule)
```

```
.claude/frameworks/                       ← PROJECT (Context7 generated + team-written)
├── frontend/
│   ├── generated/                        ← typescript, shadcn, tailwind, tanstack-query
│   └── project/                          ← team conventions
├── fullstack/nextjs/
│   ├── generated/                        ← nextjs
│   └── project/
├── mobile/expo/
│   ├── generated/                        ← expo-sdk
│   └── project/
├── backend/supabase/
│   ├── generated/                        ← supabase-js
│   └── project/
└── sdks/
    ├── generated/                        ← ai-sdk, zod
    └── project/
```

---

## Quick Reference: The 7-Phase Workflow

```
Phase 1: Database     → backend/core.md
Phase 2: Auth Model   → backend/core.md
Phase 3: Query Keys   → frontend/core.md → frontend/typescript/
Phase 4: Query Hooks  → frontend/core.md → frontend/typescript/
Phase 5: App Shell    → fullstack/nextjs/ | frontend/vite/ | mobile/expo/
Phase 6: Page         → frontend/core.md → frontend/typescript/
Phase 7: Navigation   → fullstack/nextjs/ | frontend/vite/ | mobile/expo/
```

---

## Code Quality Toolchain

| Tool | How to use | When | Output |
|------|-----------|------|--------|
| **Automatic hook** | Fires on Read/Edit/Write | Logs tasks to `tasks-plans/tasks.md` silently | `tasks-plans/tasks.md` |
| `/audit` | Invoke manually | Full codebase audit for size violations | `tasks-plans/audit-{date}.md` |
| `/backlog` | Invoke manually | Process tasks from both sources | TaskCreate entries |
| `/backlog sync` | Invoke at session start | Load pending tasks into current session | TaskCreate entries |
| `/backlog delegate` | Invoke to execute | Dispatch parallel sub-agents to fix | Completed tasks |
| `find_large_functions_tool` | MCP tool (code-review-graph) | Query AST graph for oversized functions | Direct query results |

### /simplify Integration

After editing 5+ source files in a session, the PostToolUse hook will inject a systemMessage asking you to offer `/simplify` to the user. When you receive this message:

1. **Use AskUserQuestion** — ask: "Want me to run /simplify to refine what I just wrote before continuing?"
2. **Do NOT auto-run** — the user decides
3. `/simplify` preserves all functionality — it only refines *how* code is written, never *what* it does.
