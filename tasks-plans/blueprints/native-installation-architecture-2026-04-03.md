# Blueprint: Native Installation Architecture

**Classification**: refactor
**Date**: 2026-04-03
**Stack**: Claude Code plugin suite (shell hooks, Node.js bin/.mjs, markdown skills, MCP graph server)

---

## Context

Composure currently stores project-level configs (enforcement rules, companion configs, framework docs) inside `.claude/` — a directory owned by the Claude Code CLI. This creates ownership confusion: uninstalling Composure leaves orphaned files in `.claude/`, users don't know which files are Claude's vs Composure's, and future Claude Code updates could conflict with our files.

The goal is to make Composure fully self-contained: `~/.composure/` for global state (already mostly done), `.composure/` per-project for project state (new), with a dual-read fallback so existing projects keep working forever.

Additionally, this initiative establishes clear user-level vs project-level boundaries, and explores leveraging Claude Code's native auto-memory and auto-dream features for project preferences.

Research: `docs/expansion.txt` (user's requirements capture)
Prior: `tasks-plans/blueprints/cli-auth-repo-split-2026-04-02.md` (that blueprint said "don't move configs" — this one supersedes that decision)

---

## Related Code

**Hooks reading `.claude/no-bandaids.json` (36 refs):**
- `plugins/composure/hooks/enforcement/no-bandaids.sh` — config load + self-protection block
- `plugins/composure/hooks/enforcement/framework-validation.sh` — config load + project root walk
- `plugins/composure/hooks/enforcement/architecture-skill-trigger.sh` — stack detection
- `plugins/composure/hooks/enforcement/decomposition-guide.sh` — stack detection
- `plugins/composure/hooks/session/init-check.sh` — init check + version sync + freshness
- `plugins/composure/hooks/session/resume-check.sh` — init gate + version sync
- `plugins/composure/hooks/session/session-stack-note.sh` — config candidates array

**Hooks reading `.claude/{companion}.json` (18 refs):**
- `plugins/composure/hooks/session/init-check.sh` — companion detection (sentinel, shipyard, testbench, composure-pro)
- `plugins/composure/hooks/enforcement/no-bandaids.sh` — self-protection case block
- `plugins/sentinel/hooks/init-check.sh` — `.claude/sentinel.json` check
- `plugins/shipyard/hooks/init-check.sh` — `.claude/shipyard.json` check
- `plugins/testbench/hooks/init-check.sh` — `.claude/testbench.json` check
- `plugins/design-forge/hooks/init-check.sh` — `.claude/no-bandaids.json` check

**Hooks reading `.claude/frameworks/` (6 refs):**
- `plugins/composure/hooks/enforcement/architecture-skill-trigger.sh` — systemMessage text
- `plugins/composure/hooks/session/init-check.sh` — doc freshness check

**Skills referencing `.claude/` paths:**
- `plugins/composure/skills/initialize/SKILL.md` — description
- `plugins/composure/skills/app-architecture/SKILL.md` — reads config
- `plugins/composure/skills/health/SKILL.md` — checks config + companions

**Critical finding: ZERO hooks need to live in `.claude/`**

All Composure hooks fire from the plugin cache via `hooks.json`. Claude Code's native hook directories (`~/.claude/hooks/`, `.claude/hooks/`) are both empty. The ONLY things Claude Code reads natively from `.claude/` are: `CLAUDE.md`, `settings.json`, `settings.local.json`. None of our config files are read by Claude Code itself.

**Upgrade path for existing users:**
- `composure-auth upgrade` — CLI command that copies .claude/ configs to .composure/
- SessionStart notification when legacy configs detected without .composure/ equivalent

**Graph launcher (should move into plugin):**
- `plugins/composure/scripts/launch-graph-server.sh` — refs `~/.claude/plugins/composure-graph-launcher.sh`

**Global state already correct (no migration needed):**
- `~/.composure/credentials.json` — auth
- `~/.composure/bin/` — CLI commands
- `~/.composure/cache/` — skill content cache (20+ SKILL.md files already reference this)

---

## Decisions

1. **Pure refactor** — same file contents, just new paths. `.composure/no-bandaids.json` instead of `.claude/no-bandaids.json`. No config format changes, no key renames, no restructuring.
2. **Dual-read forever** — hooks always check `.composure/` first, fall back to `.claude/`. Old projects work forever. New projects get `.composure/` by default. No forced migration.
3. **Graph stays at `.code-review-graph/`** — it's a code artifact, not a config. Other tools may read it. No benefit to moving.
4. **Shared config resolver** — new `hooks/lib/resolve-config.sh` helper (like `resolve-plugin-root.sh`) that returns the config path. Source it from all hooks instead of duplicating the fallback logic.
5. **Project-level `.composure/` directory** — all Composure project state moves here. Companions get their own configs at `.composure/sentinel.json`, etc. (flat, not nested — same files, different parent directory).
6. **Self-protection block update** — `no-bandaids.sh` blocks edits to enforcement configs. Must block BOTH `.claude/` and `.composure/` paths.
7. **Native memory bridge (Phase 4)** — explore using Claude Code's auto-dream to consolidate project preferences from `.composure/` into the native memory system. This is additive, not blocking.

---

## Impact Analysis

- **Files affected**: 20 direct (hooks + skills + docs), 12 indirect (composure-pro skill steps)
- **Blast radius**: Every hook that reads project config. All 5 companion plugins. README + PRIVACY docs.
- **High-risk areas**: `no-bandaids.sh` and `framework-validation.sh` — these BLOCK edits (exit 2). If the config path resolver breaks, enforcement stops working silently.
- **Large functions in area**: None over 150 lines in hooks.
- **Missing test coverage**: No automated tests for hooks (shell scripts). Verification is manual + session testing.

---

## Files to Touch

| # | File | Action | Why |
|---|------|--------|-----|
| | **Phase 1: Config Resolution** | | |
| 1 | `plugins/composure/hooks/lib/resolve-config.sh` | Create | Shared helper: returns CONFIG_FILE path with .composure/ → .claude/ fallback |
| | **Phase 2: Composure Hooks** | | |
| 2 | `plugins/composure/hooks/enforcement/no-bandaids.sh` | Edit | Source resolve-config.sh; update self-protection block for both paths |
| 3 | `plugins/composure/hooks/enforcement/framework-validation.sh` | Edit | Source resolve-config.sh; replace hardcoded .claude/ path |
| 4 | `plugins/composure/hooks/enforcement/architecture-skill-trigger.sh` | Edit | Source resolve-config.sh; update systemMessage text |
| 5 | `plugins/composure/hooks/enforcement/decomposition-guide.sh` | Edit | Source resolve-config.sh |
| 6 | `plugins/composure/hooks/session/init-check.sh` | Edit | Check .composure/ first; update companion detection; update version sync path |
| 7 | `plugins/composure/hooks/session/resume-check.sh` | Edit | Check .composure/ first; update version sync path |
| 8 | `plugins/composure/hooks/session/session-stack-note.sh` | Edit | Add .composure/ to CONFIG_CANDIDATES array |
| 9 | `plugins/composure/hooks/.hooks-integrity.json` | Edit | Recompute checksums for all modified hooks |
| | **Phase 3: Companion Hooks** | | |
| 10 | `plugins/sentinel/hooks/init-check.sh` | Edit | Check .composure/ first |
| 11 | `plugins/shipyard/hooks/init-check.sh` | Edit | Check .composure/ first |
| 12 | `plugins/testbench/hooks/init-check.sh` | Edit | Check .composure/ first |
| 13 | `plugins/design-forge/hooks/init-check.sh` | Edit | Check .composure/ first |
| | **Phase 4: Skills** | | |
| 14 | `plugins/composure/skills/initialize/SKILL.md` | Edit | Update description to reference .composure/ |
| 15 | `plugins/composure/skills/app-architecture/SKILL.md` | Edit | Dual-read config path |
| 16 | `plugins/composure/skills/health/SKILL.md` | Edit | Check .composure/ paths for all diagnostics |
| | **Phase 5: Docs + Lifecycle** | | |
| 17 | `README.md` | Edit | Update directory structure diagram |
| 18 | `plugins/composure/PRIVACY.md` | Edit | Update data storage table |
| | **Phase 6: Install / Uninstall (composure-web)** | | |
| 19 | `composure-web: public/install.sh` | Edit | Create ~/.composure/ subdirs; add uninstall instructions |
| | **Phase 7: API-Served Skill Steps (composure-pro)** | | |
| 20 | `composure-pro: /composure:initialize steps` | Edit | Write configs to .composure/ instead of .claude/ |
| 21 | `composure-pro: /sentinel:assess steps` | Edit | Write .composure/sentinel.json |
| 22 | `composure-pro: /shipyard:configure steps` | Edit | Write .composure/shipyard.json |
| 23 | `composure-pro: /testbench:calibrate steps` | Edit | Write .composure/testbench.json |
| 24 | `composure-pro: /composure:app-architecture steps` | Edit | Read from .composure/ with fallback |
| | **Phase 8: Native Memory Bridge (exploratory)** | | |
| 25 | `plugins/composure/hooks/session/resume-check.sh` | Edit | On resume, optionally sync project preferences to native memory |

**Total: 2 creates + 23 edits = 25 files across 3 repos**

---

## Implementation Spec

### 1. `plugins/composure/hooks/lib/resolve-config.sh` (Create)

Sourceable helper that resolves the project config path with dual-read fallback:

```bash
# Sets: COMPOSURE_CONFIG — path to no-bandaids.json (or equivalent)
# Sets: COMPOSURE_PROJECT_DIR — the .composure/ or .claude/ parent

# Check .composure/ first (new convention)
if [ -f "${PROJECT_DIR}/.composure/no-bandaids.json" ]; then
  COMPOSURE_CONFIG="${PROJECT_DIR}/.composure/no-bandaids.json"
  COMPOSURE_PROJECT_DIR="${PROJECT_DIR}/.composure"
# Fall back to .claude/ (backward compat)
elif [ -f "${PROJECT_DIR}/.claude/no-bandaids.json" ]; then
  COMPOSURE_CONFIG="${PROJECT_DIR}/.claude/no-bandaids.json"
  COMPOSURE_PROJECT_DIR="${PROJECT_DIR}/.claude"
else
  COMPOSURE_CONFIG=""
  COMPOSURE_PROJECT_DIR=""
fi
```

- Expects `PROJECT_DIR` to be set by the calling hook (from `CLAUDE_PROJECT_DIR`, `.cwd` JSON field, or git root walk)
- Also resolves companion configs: `SENTINEL_CONFIG`, `SHIPYARD_CONFIG`, `TESTBENCH_CONFIG`
- Helper function `composure_config_dir()` returns the active dir

### 2. `plugins/composure/hooks/enforcement/no-bandaids.sh` (Edit)

- Source `resolve-config.sh` after deriving `PROJECT_DIR`
- Replace `CONFIG_FILE="${PROJECT_DIR}/.claude/no-bandaids.json"` with `CONFIG_FILE="$COMPOSURE_CONFIG"`
- Update self-protection case block:
  ```bash
  */.claude/no-bandaids.json|*/.composure/no-bandaids.json|*/.claude/sentinel.json|*/.composure/sentinel.json|...)
  ```
- Update project root walk: check for `.composure/no-bandaids.json` OR `.claude/no-bandaids.json`
- Preserve: all rule logic, severity, escalation counter — ZERO changes to enforcement behavior

### 3. `plugins/composure/hooks/enforcement/framework-validation.sh` (Edit)

- Source `resolve-config.sh` after deriving `PROJECT_DIR`
- Replace `CONFIG_FILE="${PROJECT_DIR}/.claude/no-bandaids.json"` with `CONFIG_FILE="$COMPOSURE_CONFIG"`
- Update project root walk: check for `.composure/no-bandaids.json` OR `.claude/no-bandaids.json`
- Preserve: all rule processing, glob matching, severity logic

### 4. `plugins/composure/hooks/enforcement/architecture-skill-trigger.sh` (Edit)

- Replace `CONFIG="${CLAUDE_PROJECT_DIR:-.}/.claude/no-bandaids.json"` with dual-read:
  ```bash
  CONFIG="${CLAUDE_PROJECT_DIR:-.}/.composure/no-bandaids.json"
  [ ! -f "$CONFIG" ] && CONFIG="${CLAUDE_PROJECT_DIR:-.}/.claude/no-bandaids.json"
  ```
- Update systemMessage text: replace `.claude/frameworks/` with `.composure/frameworks/` (mention both)
- Preserve: dedup logic, file role detection, ARCH_HINT generation

### 5. `plugins/composure/hooks/enforcement/decomposition-guide.sh` (Edit)

- Replace `CONFIG_FILE="${CLAUDE_PROJECT_DIR}/.claude/no-bandaids.json"` with dual-read
- Preserve: all decomposition rules, role detection, dedup

### 6. `plugins/composure/hooks/session/init-check.sh` (Edit)

- Check `.composure/no-bandaids.json` first, fall back to `.claude/no-bandaids.json`
- Update companion detection: check `.composure/{companion}.json` first, fall back to `.claude/{companion}.json`
- Update composure-pro detection: check `.composure/composure-pro.json` first
- Update version sync: write to whichever config file exists (prefer .composure/)
- Update framework doc freshness: check `.composure/frameworks/` first, fall back to `.claude/frameworks/`
- Update stack drift: compare against whichever config file is active
- Preserve: all messaging, companion name strings, version sync logic

### 7. `plugins/composure/hooks/session/resume-check.sh` (Edit)

- Replace `[ ! -f "$PROJECT_DIR/.claude/no-bandaids.json" ]` with dual check
- Update version sync to write to active config location
- Preserve: task counting, graph staleness, MCP check

### 8. `plugins/composure/hooks/session/session-stack-note.sh` (Edit)

- Add `.composure/no-bandaids.json` as first entry in `CONFIG_CANDIDATES` array:
  ```bash
  CONFIG_CANDIDATES=(
    "${CLAUDE_PROJECT_DIR:-.}/.composure/no-bandaids.json"
    "${CLAUDE_PROJECT_DIR:-.}/.claude/no-bandaids.json"
  )
  ```
- Preserve: all stack detection, event handling, output format

### 9-13. Companion plugin `init-check.sh` files (Edit)

All 4 companions + composure-pro detection get the same pattern:
```bash
# Check .composure/ first, fall back to .claude/
if [ -f ".composure/no-bandaids.json" ] || [ -f ".claude/no-bandaids.json" ]; then
```

And for their own configs:
```bash
if [ ! -f ".composure/sentinel.json" ] && [ ! -f ".claude/sentinel.json" ]; then
```

### 14-16. Skills (Edit)

- `initialize/SKILL.md`: Update description — "generate Composure config (.composure/no-bandaids.json)"
- `app-architecture/SKILL.md`: "Read `.composure/no-bandaids.json` (or `.claude/no-bandaids.json`)"
- `health/SKILL.md`: Check `.composure/` paths first for all 8 diagnostic checks

### 17-18. Docs (Edit)

- `README.md`: Update directory structure diagram to show `.composure/` as primary
- `PRIVACY.md`: Update data storage table with new paths

### 19. `install.sh` (Edit — composure-web)

Add to directory creation section:
```bash
mkdir -p "$COMPOSURE_DIR"/{bin,cache,worktrees}
```

Add uninstall instructions to output:
```bash
printf "  To uninstall: claude plugin remove composure && rm -rf ~/.composure\n"
```

### 20-24. API-Served Skill Steps (Edit — composure-pro)

Update `/composure:initialize` to:
- Create `.composure/` directory instead of writing to `.claude/`
- Write `no-bandaids.json` to `.composure/`
- Write companion configs to `.composure/`
- Write framework docs to `.composure/frameworks/`
- Add `.composure/` to `.gitignore`

Update companion assess/configure/calibrate steps similarly.

### 25. Native Memory Bridge (Phase 8 — exploratory)

On resume, sync key project preferences from `.composure/no-bandaids.json` to a one-line summary in the SessionStart output. This allows Claude's auto-memory to pick up project preferences naturally. Not a code change to native memory files — just structured output that auto-memory can learn from.

---

## Risks

- **Dual-read performance** — checking two paths per hook invocation doubles filesystem calls. Mitigation: `[ -f ]` checks are sub-millisecond. No measurable impact on 5-15s hook timeouts.
- **Enforcement gap during migration** — if a hook sources resolve-config.sh and it fails to find either path, enforcement silently stops. Mitigation: resolve-config.sh falls through gracefully. If COMPOSURE_CONFIG is empty, hooks already handle "no config = exit 0" (existing behavior for uninitialized projects).
- **Self-protection bypass** — if we add .composure/ paths but miss one in the no-bandaids.sh case block, Claude could modify an enforcement config. Mitigation: the case block pattern is explicit; grep verify all .composure/ config paths are included.
- **Companion plugin coordination** — all 4 companions need updates simultaneously, or a partially-migrated project confuses companion init-checks. Mitigation: dual-read means both old and new paths work. No coordination needed — each companion independently supports both paths.
- **Stale blueprint reference** — `cli-auth-repo-split-2026-04-02.md` explicitly says "do NOT migrate config." Mitigation: this blueprint supersedes that decision. Add a note to the old blueprint.

---

## Verification

1. **New project (happy path)**: Run `/composure:initialize` in a fresh project. Verify configs land in `.composure/` (not `.claude/`). Run `/composure:health`. All green.
2. **Existing project (backward compat)**: Open a project with `.claude/no-bandaids.json`. Verify all hooks fire correctly using the `.claude/` fallback. No migration prompt, no errors.
3. **Enforcement still blocks**: In a .composure/ project, write `as any` in a `.tsx` file. Verify `no-bandaids.sh` blocks it. Verify the self-protection block prevents editing `.composure/no-bandaids.json`.
4. **Clean uninstall**: Run `claude plugin remove composure`. Run `rm -rf ~/.composure`. Verify no Composure artifacts remain in `~/.claude/` except the (now-removed) plugin cache entry.
5. **Mixed state**: Project has `.claude/no-bandaids.json` AND `.composure/no-bandaids.json`. Verify hooks prefer `.composure/` version.

---

## Checklist

### Phase 1: Config Resolution
- [ ] Create `hooks/lib/resolve-config.sh` with dual-read helper
- [ ] Verify it sources correctly from all hook subdirectories

### Phase 2: Composure Hooks (7 files)
- [ ] Update `no-bandaids.sh` — source helper, update self-protection
- [ ] Update `framework-validation.sh` — source helper
- [ ] Update `architecture-skill-trigger.sh` — dual-read, update systemMessage
- [ ] Update `decomposition-guide.sh` — dual-read
- [ ] Update `init-check.sh` — dual-read for config + companions + version sync
- [ ] Update `resume-check.sh` — dual-read init gate + version sync
- [ ] Update `session-stack-note.sh` — add .composure/ to candidates
- [ ] Recompute `.hooks-integrity.json` checksums

### Phase 3: Companion Hooks (4 files)
- [ ] Update `sentinel/hooks/init-check.sh`
- [ ] Update `shipyard/hooks/init-check.sh`
- [ ] Update `testbench/hooks/init-check.sh`
- [ ] Update `design-forge/hooks/init-check.sh`

### Phase 4: Skills (3 files)
- [ ] Update `initialize/SKILL.md` description
- [ ] Update `app-architecture/SKILL.md` config path
- [ ] Update `health/SKILL.md` diagnostic paths

### Phase 5: Docs (2 files)
- [ ] Update `README.md` directory diagram
- [ ] Update `PRIVACY.md` data table

### Phase 6: Install/Uninstall (composure-web)
- [ ] Update `install.sh` directory creation + uninstall instructions

### Phase 7: API Steps (composure-pro)
- [ ] Update `/composure:initialize` steps to write to .composure/
- [ ] Update `/sentinel:assess` steps
- [ ] Update `/shipyard:configure` steps
- [ ] Update `/testbench:calibrate` steps
- [ ] Update `/composure:app-architecture` steps

### Phase 8: Native Memory Bridge (exploratory)
- [ ] Research auto-dream hooks/triggers
- [ ] Prototype project preferences sync on resume

### Verification
- [ ] New project: configs land in .composure/
- [ ] Existing project: hooks use .claude/ fallback
- [ ] Enforcement blocks in both paths
- [ ] Clean uninstall leaves no artifacts
- [ ] Mixed state prefers .composure/
