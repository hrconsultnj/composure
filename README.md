# Composure

*Go with the grain — write composed, decomposed code.*

A Claude Code plugin that enforces code quality, architectural discipline, and type safety through automated hooks, skills, a code knowledge graph, and a severity-tracked task queue. Prevents monolithic files, blocks type-casting band-aids, provides impact-aware code reviews, and organizes remediation by priority.

---

## Installation

```bash
# Add the marketplace
claude plugin marketplace add hrconsultnj/composure

# Install the plugin
claude plugin install composure@composure

# Restart Claude Code, then run init in your project
/composure:init
```

---

## Quick Start

```
/composure:init                 # Detect stack, build graph, generate config
/composure:app-architecture     # Feature-building guide with 25+ reference docs
/composure:decomposition-audit  # Full codebase scan for size violations
/composure:review-tasks         # Process task queue (verify, delegate, archive...)
/composure:review-pr            # PR review with blast-radius analysis
/composure:review-delta         # Review changes since last commit
/composure:build-graph          # Build/update code review knowledge graph
```

---

## What You Get

### 7 Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **Init** | `/init` | Detect project stack, generate config, build graph, create task queue. Run once per project. |
| **App Architecture** | `/app-architecture` | Feature-building guide. Decision trees for rendering, data fetching, multi-tenant patterns. 25+ reference docs. |
| **Decomposition Audit** | `/decomposition-audit` | Full codebase scan. Reports Critical (800+), High (400-799), Moderate (200-399) with extraction instructions. |
| **Review Tasks** | `/review-tasks` | Process the task queue. Modes: `summary`, `batch`, `delegate`, `clean`, `verify`, `archive`. |
| **Build Graph** | `/build-graph` | Build or update the code review knowledge graph for impact analysis. |
| **Review PR** | `/review-pr` | PR review with blast-radius context from the knowledge graph. |
| **Review Delta** | `/review-delta` | Token-efficient review of changes since last commit. |

### 6 Automated Hooks (3 types)

Claude Code supports three hook types: `command` (shell scripts), `prompt` (LLM evaluation), and `agent` (mini agents with tool access). Composure uses all three.

| Hook | Type | Event | What It Does |
|------|------|-------|-------------|
| **Task Verifier** | `agent` | `SessionStart` (resume) | On session resume, checks open tasks against actual file sizes, marks completed items. Also checks graph staleness. |
| **Architecture Trigger** | `command` | `PreToolUse` (Edit/Write) | Once per session, reminds the agent to load `/app-architecture` before writing code. |
| **No Band-Aids** | `command` | `PreToolUse` (Edit/Write) | Blocks literal type-casting shortcuts (`as any`, `@ts-ignore`, `!` assertions, `_unused` vars). |
| **Type Safety Review** | `prompt` | `PreToolUse` (Edit/Write) | Semantic review for hidden `any` in generics, lazy types (`Function`, `Object`), unnecessary `as` assertions. Runs after No Band-Aids passes. |
| **Code Quality Guard** | `command` | `PostToolUse` (Edit/Write) | Graph-aware: queries the knowledge graph for exact function sizes when available, falls back to regex. Logs violations to task queue. |
| **Graph Update** | `command` | `PostToolUse` (Edit/Write) | Incrementally updates the code review knowledge graph when files change. |

### Code Review Knowledge Graph

A TypeScript MCP server (`graph/`) that builds a persistent SQLite graph of functions, imports, and call relationships using tree-sitter. Zero native dependencies — uses Node.js built-in `node:sqlite`.

**7 MCP Tools:**

| Tool | Purpose |
|------|---------|
| `build_or_update_graph` | Full or incremental build (auto-detects changed files from git) |
| `query_graph` | Pattern queries: `callers_of`, `callees_of`, `imports_of`, `importers_of`, `children_of`, `tests_for`, `inheritors_of`, `file_summary` |
| `get_review_context` | Changed files + impact analysis + source snippets + review guidance |
| `get_impact_radius` | BFS traversal showing blast radius of changes |
| `find_large_functions` | Find functions exceeding a line count threshold (default 150) |
| `semantic_search_nodes` | Search code entities by name |
| `list_graph_stats` | Node/edge counts, languages, staleness |

**How it stays current:** The `graph-update` PostToolUse hook re-parses changed files on every Edit/Write. The `decomposition-check` hook queries the graph for exact function sizes instead of using regex heuristics.

**Requirements:** Node.js 22.5+ (for `node:sqlite`). Graph stored at `.code-review-graph/graph.db` (auto-gitignored).

---

## No Band-Aids Hook

Blocks Claude (and subagents) from using type-casting shortcuts. Validated against TypeScript 5.9, React 19.2, Next.js 16.1, Expo SDK 55.

### Rules

| Rule | Detects | Required Fix |
|------|---------|-------------|
| `as-any` | `as any` | `satisfies`, type guard, fix at source |
| `double-cast` | `as unknown as T` | Type guard to narrow `unknown` |
| `ts-suppress` | `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` | Fix the type error (`@ts-expect-error` allowed in test files) |
| `eslint-ts-disable` | `eslint-disable` for `@typescript-eslint` | Fix the type |
| `non-null-assertion` | `foo!.bar`, `foo![i]` | Optional chaining `?.` with null guard |
| `underscore-unused` | `catch(_e)`, `const _x = await` | Remove it. Use `catch {}` (TS 5.x) |
| `any-param` | `(param: any)` | Define interface. `ChangeEvent<T>`, `useLocalSearchParams<T>` |
| `return-assertion` | `return x as Type` | `satisfies`, type guard, or annotate return type |

Safe patterns that are **not** blocked: `as const`, `satisfies`, generic type params.

### Per-Project Config

`/init` generates this automatically, or create `.claude/no-bandaids.json` manually:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx"],
  "skipPatterns": ["*.d.ts", "*.generated.*", "database.types.ts"],
  "disabledRules": [],
  "typegenHint": "pnpm --filter @myapp/database generate"
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `extensions` | `.ts .tsx .js .jsx` | File extensions to check |
| `skipPatterns` | `*.d.ts *.generated.* *.gen.*` | Globs to skip |
| `disabledRules` | `[]` | Rule names to disable |
| `typegenHint` | `""` | Type regen command shown in error messages |

---

## Size Limits

Enforced by the hook and architecture skill:

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

## Task Queue

The PostToolUse hook logs issues to `tasks-plans/tasks.md`, grouped by severity:

```markdown
## Critical
- [ ] **DECOMPOSE** `security-client.tsx` (1220 lines) [2026-03-19]
  - EXTRACT: `SecurityClient` (lines 111-1220, ~1110 lines)
  - MOVE: 6 inline types to `types.ts`

## High
- [ ] **DECOMPOSE** `OrgShopsList.tsx` (739 lines) [2026-03-19]

## Moderate
- [ ] **SHARED** `security-client.tsx` [2026-03-19]
  - Types `PasskeyInfo`, `VerificationAction` already exist in shared package
```

Tasks are deduplicated and persist across sessions. Process with `/review-tasks`:

| Mode | What It Does |
|------|-------------|
| `summary` | Show categorized task counts |
| `batch` | Process tasks sequentially, mark done |
| `delegate` | Spawn parallel sub-agents for independent tasks |
| `verify` | Check file sizes against tasks, auto-mark completed items |
| `archive` | Move completed audit files to `tasks-plans/archived/`, reset queue |
| `clean` | Remove resolved `[x]` entries |

---

## Reference Docs

`/app-architecture` includes 25+ reference documents:

- **UI Patterns** — Component decomposition, SSR/hydration, route groups, tabs, bottom sheets, icon patterns
- **Hook Patterns** — Cache invalidation, common query/mutation patterns, multi-tenant isolation
- **TanStack Query** — Pattern guide, examples, quick reference
- **Data Architecture** — Entity registry, ID prefixes, auth model, privacy/role system, RLS policies
- **Custom UI** — CalendarPicker, DateNavigator, TagSheet, SearchPicker, NumericPicker, BrandedDialog

---

## Monorepo Shared-Type Detection

In monorepo setups, the code quality hook detects inline types that already exist in shared packages:

1. Auto-detects shared packages (`packages/shared`, `packages/common`, `packages/core`)
2. Reads package name from `package.json` (e.g., `@myapp/shared`)
3. Checks inline type names against the shared package
4. Logs a `SHARED` task if duplicates are found

---

## Workflow

```
1. /composure:init
   → Detects stack, generates config, builds graph, creates task queue
   |
2. Resume a session
   → SessionStart agent auto-verifies open tasks, checks graph staleness
   |
3. Start building a feature
   → Architecture hook fires once, reminds to load /app-architecture
   |
4. Write code
   → No band-aids (command) → type safety review (prompt) — layered gate
   → Graph update hook keeps knowledge graph current
   → Code quality hook queries graph for exact function sizes, logs violations
   |
5. /review-tasks verify
   → Check which decomposition tasks are now resolved
   |
6. /review-tasks delegate
   → Sub-agents fix remaining issues in parallel
   |
7. /review-delta (before commit)
   → Token-efficient review of what you changed
   |
8. /review-pr (before merge)
   → Full PR review with blast-radius analysis
   |
9. /review-tasks archive
   → Archive completed audits, reset task queue
   |
10. /decomposition-audit (periodically)
    → Full codebase health check
```

---

## Configuration

### Hook Thresholds

Edit hook scripts in `hooks/` to customize:

- `WARN_LINES=400` — file size warning
- `ALERT_LINES=600` — file size alert
- `CRITICAL_LINES=800` — file size critical
- `FUNC_MAX_LINES=150` — function size limit

### No Band-Aids Config

Per-project via `.claude/no-bandaids.json` (see above) or run `/init` to auto-generate.

---

## Requirements

- Claude Code CLI
- Node.js 22.5+ (for `node:sqlite` and WASM-based code parsers)
- `jq` (JSON parsing in hooks)
- `sqlite3` (optional — enables graph-aware decomposition checks)

**Platform support:** macOS, Linux, and Windows. The graph MCP server uses web-tree-sitter (WASM) — fully cross-platform with no native compilation. On Windows, hooks require bash via [Git for Windows](https://gitforwindows.org/) (ships Git Bash) or WSL.

---

## Licensing

### Community (Free)

**PolyForm Noncommercial 1.0.0** — [Full text](./LICENSE)

Free for personal, educational, and noncommercial use. Includes the full plugin: all hooks, graph MCP server, all 7 skills, and 15+ universal reference documents.

**Allowed:** Personal projects, hobby work, learning, academic research, nonprofit/government use, evaluating before purchase.

### Pro ($39 — one-time, per GitHub user)

**[Purchase Pro License](https://composure.lemonsqueezy.com)** | [Commercial License Terms](./COMMERCIAL-LICENSE.md)

Everything in Community, plus:

| | Community (Free) | Pro ($39) |
|---|---|---|
| Plugin core (hooks, graph MCP, skills) | Yes | Yes |
| Universal reference docs (15+) | Yes | Yes |
| Conceptual architecture (SKILL.md) | Yes | Yes |
| **Commercial use** | No | **Yes** |
| **Pro Patterns** (battle-tested data architecture) | No | **Yes** |
| **RLS & migration patterns** | No | **Yes** |
| Updates within major version | Yes | **Yes** |
| Major version upgrades | — | **50% off ($19)** |

**Pro Patterns** include production-proven multi-tenant architecture: entity registry, ID prefix conventions, multi-level auth, privacy/role systems, contact-first patterns, metadata templates, RLS policies, role hierarchies, and migration checklists — delivered via private Git submodule.

**How it works:**
1. Purchase at the link above
2. Provide your GitHub username
3. You're added as a collaborator on the private patterns repo (within 48 hours)
4. Run `git submodule update --init` in your Composure installation

**Requires a commercial license:** freelance/contract work, agency projects, for-profit company use, redistribution.

### Privacy

Composure runs entirely on your local machine. No data collection, no telemetry, no network requests. [Full privacy policy](./PRIVACY.md).

### Contributing

By submitting a pull request, you grant the licensor the right to license your contribution under these terms and any future license terms for this project.
