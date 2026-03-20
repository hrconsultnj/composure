# Composure

*Go with the grain — write composed, decomposed code.*

**Build clean, decomposed, well-structured applications — automatically.**

A Claude Code plugin that enforces code quality and architectural discipline through automated hooks, skills, and a severity-tracked task queue. It prevents monolithic files from being written in the first place, detects code quality issues in real-time, and organizes remediation tasks by priority.

---

## What It Does

This plugin changes how Claude Code writes and maintains code:

| Feature | How it works |
|---------|-------------|
| **Architecture auto-trigger** | `PreToolUse` hook fires once per session on the first Write/Edit to a source file. Reminds the agent to load the architecture skill before building. |
| **Code quality detection** | `PostToolUse` hook fires on every Read/Edit/Write. Detects oversized files, large functions, inline types, mixed concerns, and shared-type duplication. |
| **Task queue** | Issues are logged to `tasks-plans/tasks.md` (grouped by severity: Critical / High / Moderate) instead of interrupting your workflow. |
| **Decomposition audit** | On-demand full codebase scan for size violations. Produces a 3-tier priority report. |
| **Review tasks** | Batch-process accumulated tasks — sequential, parallel sub-agents, or delegate to another session. |

---

## Who It's For

Developers building production applications with:

- **Next.js 15+** (App Router, Server Components, Server Actions)
- **React Native / Expo** (mobile apps with shared codebases)
- **TypeScript** (strict, type-safe development)
- **Supabase** (PostgreSQL + Auth + Realtime)
- **TanStack Query v5** (data fetching and caching)
- **Monorepo** setups (Turborepo, shared packages)

The plugin is stack-aware but framework-agnostic in its core quality rules. The decomposition hooks work on any TypeScript/JavaScript codebase.

---

## Installation

```bash
claude plugin add github:hrconsultnj/composure
```

Restart Claude Code after installation.

---

## What You Get

### 3 Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **App Architecture** | `/app-architecture` | Complete feature-building guide. Decision trees for rendering, data fetching, multi-tenant patterns. 25+ reference docs. |
| **Decomposition Audit** | `/decomposition-audit` | Scans entire codebase for size violations. Reports Critical (800+), High (400-799), Moderate (200-399) with specific extraction instructions. |
| **Review Tasks** | `/review-tasks` | Reads the task queue and processes it. Modes: `summary`, `batch`, `delegate` (parallel agents), `clean`. |

### 2 Automated Hooks

| Hook | Event | Behavior |
|------|-------|----------|
| **Architecture Trigger** | `PreToolUse` (Write/Edit) | Once per session, reminds the agent to load `/app-architecture` before writing code. Uses session dedup — fires once, not on every edit. |
| **Code Quality Guard** | `PostToolUse` (Read/Edit/Write) | Detects: oversized files (400/600/800 thresholds), large functions (150+ lines), inline types (>3 in a component), StyleSheet blocks (React Native), modals in screen files, thick route files, and shared-type duplication. Logs to task queue silently — no workflow interruption. |

### Task Queue (`tasks-plans/tasks.md`)

The hook automatically creates and maintains a severity-grouped task file:

```markdown
## Critical
- [ ] **DECOMPOSE** `security-client.tsx` (1220 lines) [2026-03-19]
  - EXTRACT: `SecurityClient` (lines 111-1220, ~1110 lines)
  - MOVE: 6 inline types to `types.ts`

## High
- [ ] **DECOMPOSE** `OrgShopsList.tsx` (739 lines) [2026-03-19]
  - MOVE: 4 inline types to `types.ts`

## Moderate
- [ ] **SHARED** `security-client.tsx` [2026-03-19]
  - Types `PasskeyInfo`, `VerificationAction` already exist in shared package
```

Tasks are deduplicated (same file won't be logged twice) and persist across sessions. Another session or developer can pick up where you left off.

---

## Size Limits

The plugin enforces these limits through the hook and the architecture skill:

| Component Type | Plan at | Hard Limit | Decomposition Pattern |
|----------------|---------|------------|----------------------|
| Container/Page | 100 | 150 | Split into child presentation components |
| Presentation | 100 | 150 | Extract sub-sections into focused components |
| Dialog/Modal | 150 | 200 | Multi-step: `steps/Step1.tsx`, `steps/Step2.tsx` |
| Form (complex) | 200 | 300 | Split field groups into sub-forms |
| Hook (queries) | 80 | 120 | One entity's reads per file |
| Hook (queries + mutations) | 100 | 150 | Split: `queries.ts` + `mutations.ts` |
| Types file | 200 | 300 | Group by domain |
| Route file | 30 | 50 | Thin wrapper — import container, pass params |

---

## Reference Docs

The `/app-architecture` skill includes reference documentation organized by topic:

### Universal Patterns (included)
- **UI Patterns** — Component decomposition, SSR/hydration layouts, route groups, tab navigation, bottom sheet sizing (React Native), icon patterns
- **Hook Patterns** — Cache invalidation, common query/mutation patterns, multi-tenant patterns
- **TanStack Query** — Pattern selection guide, 5 patterns with examples, quick reference

### Data Architecture (included, private)
- Multi-tenant isolation patterns
- Role-based access control
- Database security policies
- Schema conventions

---

## Monorepo Shared-Type Detection

In monorepo setups, the hook automatically detects when you define a type inline that already exists in your shared package. It:

1. Auto-detects shared packages (`packages/shared`, `packages/common`, `packages/core`)
2. Reads the package name from `package.json` (e.g., `@myapp/shared`)
3. Checks the first 5 inline type names against the shared package
4. Logs a `SHARED` task if duplicates are found

This prevents the common problem of "copy-paste types" that drift out of sync between apps.

---

## How It Fits Your Workflow

```
1. Start working on a feature
     |
2. First Write/Edit → architecture hook fires (once)
     → "Load /app-architecture before building"
     |
3. Build your feature using the skill's patterns
     |
4. Hook silently logs any quality issues to tasks-plans/tasks.md
     |
5. When done, run /review-tasks summary
     → See what accumulated
     |
6. Run /review-tasks delegate
     → Sub-agents fix issues in parallel
     |
7. Periodically run /decomposition-audit
     → Full codebase health check
```

---

## Configuration

The plugin works out of the box with no configuration. The hooks fire globally on all projects.

To customize thresholds, edit the hook scripts in the plugin's `hooks/` directory:

- `WARN_LINES=400` — file size warning threshold
- `ALERT_LINES=600` — file size alert threshold
- `CRITICAL_LINES=800` — file size critical threshold
- `FUNC_MAX_LINES=150` — individual function size threshold

---

## Requirements

- Claude Code CLI
- Bash (macOS/Linux — the hooks are shell scripts)
- `jq` (for JSON parsing in hooks)

---

## License

MIT
