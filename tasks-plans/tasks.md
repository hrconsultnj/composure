# Backlog
<!-- Process with /composure:backlog or pick up in next session. -->
<!-- Mark [x] when resolved. Last cleaned: 2026-04-02 -->

## 🔴 Critical

- [x] 🔴 **BUG** `framework-validation.sh` — Two issues preventing `frameworkValidation` from working [2026-04-02] FIXED 2026-04-03
  - **Issue 1: `\s` silently fails on macOS `grep -E` (POSIX ERE)**
    - macOS `grep -E` does NOT support `\s` (Perl/PCRE only). Every pattern using `\s` silently fails to match.
    - Affects ALL rules in both plugin `defaults/*.json` AND project `no-bandaids.json` frameworkValidation.
    - FIX: Auto-convert before grep in `process_fv_groups`: `RULE_PATTERN=$(printf '%s' "$RULE_PATTERN" | sed 's/\\s/[[:space:]]/g')`
    - Also convert `\d` → `[0-9]`, `\w` → `[a-zA-Z0-9_]` for full POSIX ERE compat.
    - Scope: audit ALL `defaults/*.json` for non-POSIX regex patterns.
  - **Issue 2: `inline-data` group never processed despite `MATCH=true` on other groups**
    - Traced with `bash -x`: `PROJECT_DIR` resolves correctly, `REL_PATH=src/components/pages/test-hook.tsx` is correct.
    - `icons`, `animation`, `base-ui-removed` groups all show `MATCH=true`.
    - But `inline-data` GROUP never appears in the trace — never iterated.
    - Hypothesis: `jq 'keys[]'` on the frameworkValidation JSON may not iterate all keys, or the hook exits early after processing plugin defaults (a `case` or early return before project FV groups are reached).
    - Debug approach: add `echo "[DEBUG] Processing project FV group: $GROUP" >&2` inside `process_fv_groups` when called with `project` source.
    - Alternatively: check if `process_fv_groups` is called TWICE (once for plugin defaults, once for project config) — the second call may be missing.
  - **Test project**: composure-web has `inline-data` rule with `severity: "error"` and `[[:space:]]` POSIX patterns. Use `src/components/pages/test-hook.tsx` as test target.
  - **Workaround applied**: composure-web `no-bandaids.json` updated to `[[:space:]]` patterns. Still doesn't fire due to Issue 2.

- [ ] 🔴 **DECOMPOSE** `plugins/composure/cortex/src/adapters/sqlite.ts` (771 lines) [2026-04-11]
  - EXTRACT: `SqliteAdapter` (lines 79-771, ~693 lines)
  - EXTRACT: `initSchema` (lines 130-443, ~314 lines)

## 🟡 High

- [ ] 🟡 **DECOMPOSE** `plugins/composure/graph/src/entities.ts` (326 lines) — monitor: internally cohesive, defer to split-on-next-touch

## 🟢 Moderate

- [ ] 🟢 **DECOMPOSE** `plugins/composure/graph/src/sh-script-parser.ts` (236 lines) — under 300 threshold, monitor

## 📋 Project

- [ ] Phase 2: Entity layer HTML visualization (Entities tab in graph.html)
- [ ] Phase 2: frameworkValidation rules — react, ai-sdk, supabase, expo, tanstack-query
- [ ] Phase 2: `/sentinel:review-secrets` — git history secret scan
- [ ] Phase 2: `/testbench:e2e-scaffold` — Playwright scaffolding (setup companion to `/shipyard:smoke-test` runner — see 💎 Premium section)
- [ ] Phase 2: Shipyard IaC generation — Terraform/K8s manifests
- [ ] Phase 2: Graph skill-reference parser — index `/composure:skillname` patterns in markdown
- [ ] Phase 2: Graph `REFERENCES` edges for markdown prose
- [ ] Composure initialize report template — create `plugins/composure/templates/initialize-report.md`
- [ ] Test MCP tools (search_references, get_dependency_chain) on a real project — verify importers_of after ESM fix

## 📊 Competitive & Website

- [ ] Comparison table for composure-pro.com — data: `docs/research/competitive-analysis-2026-04-02.md`
- [ ] "Why hooks, not instructions" section — hooks run outside LLM at zero token cost, agent cannot bypass
- [ ] Graph differentiation messaging — "Not just a graph — a graph that enforces."
- [ ] Address star gap — strategy: measured results as social proof (2.85x faster, 37% better quality)
- [ ] Pricing research applied to website — data: `docs/research/tool-pricing-comparison-2026-04-02.md`. $338/mo replacement value.
- [ ] Orchestration diagram for composure-pro.com — visual: initialize → blueprint → execute → review → commit → deploy

## 🔒 IP Protection & Monetization

- [ ] API-served pro skills — composure-pro.com/api/skills/ serves step content via authenticated WebFetch. No MCP, no terminal prompt. Step content never on disk. See `docs/strategy/ip-protection-prompt.md`.
- [ ] Two-tier skill architecture — free: local files (hooks + graph + shells). Pro: API-served steps (authenticated, never cached, instant revocation).
- [ ] Pricing tier implementation — Free ($0), Pro ($12/mo or $99/yr), Team ($19/seat/mo), Enterprise (custom). Based on $338/mo replacement value.

## 💎 Premium Features (Freemium)

- [ ] **`/shipyard:smoke-test` — Pre-merge E2E smoke test agent** [2026-04-03]
  - **Plugin**: shipyard (deployment pipeline context — runs as a pre-merge gate)
  - **Tier**: Premium/Pro (high-value paid feature, perfect for freemium upsell)
  - **What**: QA agent that launches the dev server, navigates critical paths, and verifies decomposed components render correctly *before* merge/PR submission
  - **Execution backends** (detect + fallback):
    1. **Playwright** (preferred) — headless browser, screenshot comparison, network assertion. Works in CI.
    2. **Claude Code computer tool** (`mcp__claude-in-chrome__*`) — for local dev when Playwright isn't configured. Uses existing browser session.
    3. **CLI-only fallback** — `curl` health checks + build verification when no browser available
  - **Trigger points**: 
    - `/shipyard:smoke-test` (manual)
    - Auto-suggested by `/composure:review` when blast radius > 20 files
    - Auto-suggested by `/composure:commit` when decomposition tasks were completed
    - Integrated into `/shipyard:preflight` as optional E2E step
  - **Flow**:
    1. Detect project stack (Next.js, Expo, etc.) from no-bandaids.json
    2. Start dev server (`pnpm dev:web` / `expo start`)
    3. Wait for ready signal (port open, health endpoint)
    4. Run critical path smoke tests:
       - Homepage renders (200 OK, no hydration errors)
       - Auth flow (login page loads, form elements present)
       - Recently decomposed components render (use git diff to find changed page routes)
       - Console error check (no React errors, no chunk load failures)
    5. Screenshot capture for visual verification
    6. Report: pass/fail per route, console errors, screenshot gallery
    7. Kill dev server
  - **Use case that inspired this**: NutriJourney audit decomposed 18 components across 5 waves (~90 new files). Typecheck passes but runtime rendering could still break (missing imports in barrel, wrong default export, SSR hydration mismatch). A 30-second smoke test catches what typecheck can't.
  - **Why shipyard, not testbench**: Testbench = unit/integration tests (code-level). Shipyard = deployment pipeline (system-level). Smoke tests are a deployment gate — "can we ship this?" — which is shipyard's domain. Testbench:e2e-scaffold still makes sense as the *setup* skill (generate Playwright config + test files), while shipyard:smoke-test is the *runner*.
  - **Monetization angle**: This is the skill that saves a deployment. Free tier gets testbench (unit tests). Pro tier gets shipyard:smoke-test (the safety net that catches runtime breaks before they hit production). High perceived value — "your CI caught a hydration error before merge" is worth $12/mo.

## 🔧 Auth & UX Improvements

- [ ] **Seamless auth** — When a skill needs API content and the user isn't authenticated, Claude should auto-offer to run `composure-auth login` (Bash tool, user approves once). No manual terminal commands. Flow: skill fetch fails 401 → Claude says "You need to authenticate to use this skill. Shall I open the login?" → runs login → continues skill. [2026-04-03]
- [x] **Token TTL** — ~~Increase Supabase JWT expiry~~ Done: 604800 (7 days) set in Supabase dashboard. JWT Signing Keys (new system, legacy secret migrated). [2026-04-03]
- [x] **Silent refresh fix** — ~~composure-token.mjs refresh exits 0 but doesn't update~~ Root cause: proxy sent form-urlencoded, Supabase expects JSON. Fixed in composure-web token route. Auto-refresh added to validate command. [2026-04-03]
- [x] **Content deployment** — ~~API endpoint at `/api/v1/skills/` returns 404~~ Auth fixed, 404 is content mount issue (see below). [2026-04-03]
- [ ] **Skill content mount on Vercel** — `/api/v1/skills/composure/blueprint/01-classify` returns 404 because skill step files from composure-pro are NOT available at `CONTENT_DIR` on the server. [2026-04-03]
  - **Auth works**: Token validates, 7-day TTL, refresh works. The 404 is purely about content files.
  - **API route**: `composure-web/src/app/api/v1/skills/[plugin]/[skill]/[step]/route.ts`
  - **Content source**: `composure-pro/plugins/{plugin}/skills/{skill}/steps/{step}.md`
  - **Expected path on server**: `{CONTENT_DIR}/{plugin}/skills/{skill}/steps/{step}.md` (or `/steps/{step}`, tries 6 path variants)
  - **CONTENT_DIR**: defaults to `{process.cwd()}/content/plugins` — needs composure-pro content cloned/mounted there
  - **Options**: (a) Git submodule composure-pro into composure-web at `content/plugins/`, (b) Build step that copies files, (c) Set `CONTENT_DIR` env var to point to a mounted volume
  - **Test**: After mounting, verify: `curl -H "Authorization: Bearer <token>" https://composure-pro.com/api/v1/skills/composure/blueprint/01-classify`

## 🔧 Skill Improvements

- [ ] **`/composure:review-pr` actionable output** — Three enhancements [2026-04-03]:
  1. Write audit file to `tasks-plans/audits/pr-{number}-{date}.md` (persists across sessions)
  2. AskUserQuestion: "Post as GitHub review?" → use `gh pr review` to post inline comments
  3. Structure findings with exact `file:line:fix` instructions for agent-to-agent delegation
  - PR template format: blocking vs non-blocking, each finding has file, line, current code, fix code
  - Enables: manager reviewing, autonomous agent fixing, audit trail
  - Lesson from: composure-pro#1 review where blocking issues needed manual relay to fixing agent

## 🗺️ Roadmap

- [ ] **Multi-platform enforcement MCP** — composure-enforce server + adapters (Cursor, Windsurf, Cline, Git). Branch: `feat/enforcement-mcp-server`, PR #8. Blueprint: `multi-platform-compatibility-2026-04-03.md`
- [ ] **Universal installer** — auto-detect 8 AI tools, auto-install Claude Code, auto-generate adapters. In composure-web `install.sh`. [2026-04-03]
- [ ] **Revenue gate** — multi-platform enforcement is the paid feature ($12/mo). Free on Claude Code, paid for Cursor/Windsurf/Gemini/Codex. Memory: `project_revenue_model_multi_platform.md`
- [ ] **Native installation Phases 7-8** — API-served skill steps write to .composure/ (done), native memory bridge (exploratory). Blueprint: `native-installation-architecture-2026-04-03.md`
- [ ] **Windows installer** — install.ps1 for PowerShell + WSL detection
- [ ] **Cursor marketplace submission** — package Composure as Cursor marketplace plugin

