# Blueprint: Enforcement QA & Validation

**Classification**: bug-fix + enhancement
**Date**: 2026-04-03
**Stack**: Shell hooks (bash), TypeScript enforcement engine, MCP server

---

## Context

Three QA issues surfaced during the enforcement MCP server build and self-review:

1. **Critical bug**: `framework-validation.sh` has two issues preventing `frameworkValidation` rules from firing — macOS POSIX ERE incompatibility (`\s` fails silently) and project-level FV groups not being iterated.
2. **Self-review findings**: The enforcement engine flagged its own rule definition strings as violations (false positives in `no-bandaids.ts`). This is expected behavior but exposes the need for a skip mechanism for enforcement tool source files.
3. **Parity validation**: The new TypeScript enforcement engine must produce identical results to the bash hooks for all rule types. No test suite exists yet.

Additionally, the enforcement MCP server (`composure-enforce`) shipped without automated tests — the engine needs a validation suite to catch regressions as rules are added.

Backlog: `tasks-plans/tasks.md` — 🔴 Critical bug entry with full debug trace.

---

## Related Code

**Bug (framework-validation.sh):**
- `plugins/composure/hooks/enforcement/framework-validation.sh` — the bash hook with the two bugs
- `plugins/composure/defaults/shared.json` — plugin default rules (may have non-POSIX patterns)
- `plugins/composure/defaults/frontend/*.json` — framework-specific defaults
- `plugins/composure/defaults/fullstack/nextjs.json` — Next.js rules
- `plugins/composure/defaults/backend/supabase.json` — Supabase rules
- `plugins/composure/defaults/sdks/*.json` — SDK rules

**Engine parity:**
- `plugins/composure/enforce/src/rules/no-bandaids.ts` — TypeScript rules (must match bash)
- `plugins/composure/enforce/src/rules/framework.ts` — TypeScript FV (must match bash)
- `plugins/composure/enforce/src/engine.ts` — orchestrator

---

## Decisions

1. **Fix both framework-validation.sh bugs** — POSIX ERE conversion + project FV group iteration fix. This unblocks all frameworkValidation rules on macOS.
2. **Audit all defaults/*.json** for non-POSIX regex patterns — convert `\s` → `[[:space:]]`, `\d` → `[0-9]`, `\w` → `[a-zA-Z0-9_]` across all rule files.
3. **Create parity test suite** — test cases that run the same input through both the bash hook (via direct execution) and the TypeScript engine, comparing results.
4. **Add skip mechanism** — enforce engine should skip its own source files (or files matching a configurable skipPaths pattern).

---

## Impact Analysis

- **Bug fix scope**: 1 hook file + ~12 JSON defaults files (regex audit)
- **Test suite scope**: New directory `enforce/tests/` with test cases
- **Risk**: The POSIX fix affects ALL regex patterns in ALL rule files — must verify every rule still matches its intended targets after conversion

---

## Files to Touch

| # | File | Action | Why |
|---|------|--------|-----|
| | **Bug Fix: POSIX ERE Compat** | | |
| 1 | `hooks/enforcement/framework-validation.sh` | Edit | Add POSIX conversion in `process_fv_groups` + fix project FV group iteration |
| 2 | `defaults/shared.json` | Edit | Audit + convert non-POSIX patterns |
| 3 | `defaults/frontend/react.json` | Edit | Audit + convert |
| 4 | `defaults/frontend/shadcn.json` | Edit | Audit + convert |
| 5 | `defaults/frontend/tailwind.json` | Edit | Audit + convert |
| 6 | `defaults/fullstack/nextjs.json` | Edit | Audit + convert |
| 7 | `defaults/backend/supabase.json` | Edit | Audit + convert |
| 8 | `defaults/mobile/expo.json` | Edit | Audit + convert |
| 9 | `defaults/sdks/tanstack-query.json` | Edit | Audit + convert |
| 10 | `defaults/sdks/zod.json` | Edit | Audit + convert |
| 11 | `defaults/vanilla.json` | Edit | Audit + convert if exists |
| | **Parity Test Suite** | | |
| 12 | `enforce/tests/parity.test.ts` | Create | Test cases comparing bash vs TS engine output |
| 13 | `enforce/tests/fixtures/` | Create | Test fixture files (TS, Python, Go with known violations) |
| | **Self-Review Skip** | | |
| 14 | `enforce/src/engine.ts` | Edit | Add configurable skipPaths for enforcement source files |

**Total: 1 create (test suite) + 13 edits = 14 files**

---

## Implementation Spec

### 1. `hooks/enforcement/framework-validation.sh` (Edit)

**Issue 1 fix** — Add POSIX ERE conversion before grep:
```bash
# Inside process_fv_groups, before the grep call:
# Convert Perl/PCRE shortcuts to POSIX ERE equivalents
RULE_PATTERN=$(printf '%s' "$RULE_PATTERN" | sed 's/\\s/[[:space:]]/g; s/\\d/[0-9]/g; s/\\w/[a-zA-Z0-9_]/g; s/\\b/[[:<:]]/g')
```

Apply same conversion to `RULE_SKIPIF` if present.

**Issue 2 fix** — Verify the second call to `process_fv_groups` for project config:
- Trace: add debug logging to confirm project FV groups are iterated
- Root cause likely: `PLUGIN_GROUP_NAMES` dedup filtering is too aggressive, or the `FILTERED_FV` jq command returns empty
- Fix: ensure `process_fv_groups` is called with the full project frameworkValidation after plugin groups

### 2-11. `defaults/*.json` (Edit — regex audit)

For each JSON file, grep for `\s`, `\d`, `\w`, `\b` in pattern fields and convert:
- `\s` → `[[:space:]]`
- `\d` → `[0-9]`
- `\w` → `[a-zA-Z0-9_]`
- `\b` → `[[:<:]]` (word boundary, macOS grep)

**IMPORTANT FINDING**: `[[:space:]]` does NOT work in JavaScript regex. Converting JSON files to POSIX would break the TypeScript engine. The correct architecture is:
- JSON files keep `\s`/`\d`/`\w` (works in JS regex natively)
- Bash hook converts at runtime via `sed` before `grep -E` (already implemented)
- **Do NOT modify the defaults/*.json files** — the runtime conversion handles everything

### 12-13. Parity Test Suite (Create)

`enforce/tests/parity.test.ts`:
- Test cases for each language (TS, Python, Go, Rust, C++, Swift, Kotlin)
- Each case: known violation content → run through engine → verify violation detected
- Each case: clean content → run through engine → verify no violations
- Framework validation cases: Next.js deprecated patterns, Tailwind v3 directives, Supabase deprecated API

`enforce/tests/fixtures/`:
- `violation.tsx` — file with multiple TS violations (as any, @ts-ignore, non-null, etc.)
- `clean.tsx` — file with zero violations
- `violation.py` — Python violations (bare except, eval, type ignore)
- `violation.go` — Go violations (err discard, empty interface)
- `nextjs-violation.tsx` — Next.js app component with 'use client' in page.tsx
- `tailwind-violation.css` — @tailwind base directive

### 14. `enforce/src/engine.ts` (Edit)

Add skip for enforcement source files:
```typescript
// Skip enforcement engine's own source files (rule definitions contain violation patterns)
const SELF_SKIP_PATTERNS = [
  /enforce\/src\/rules\//,
  /enforce\/src\/adapters\./,
];
```

---

## Risks

- **POSIX conversion breaks patterns** — Some patterns may rely on `\s` matching differently than `[[:space:]]`. Mitigation: test every rule after conversion against known-good inputs.
- **JS regex vs POSIX divergence** — After converting patterns to POSIX, JS regex still works (POSIX character classes are valid JS regex). Mitigation: parity tests validate both engines produce same results.
- **Debug logging left in production** — Framework validation debug echoes could leak to stderr. Mitigation: wrap in `[ -n "$COMPOSURE_DEBUG" ]` check.

---

## Verification

1. **Bug fix**: Create a `.tsx` file in a project with `frameworkValidation` rules in `.composure/no-bandaids.json`. Edit the file. Verify `framework-validation.sh` fires and blocks on both plugin defaults AND project-level rules.
2. **POSIX compat**: Run framework-validation.sh on macOS with rules containing `[[:space:]]` patterns. Verify they match.
3. **Parity**: Run parity test suite — all tests pass with zero engine/bash divergence.
4. **Self-review**: Run `composure-enforce validate` on enforce/src/rules/no-bandaids.ts — verify it's skipped (no false positives).

---

## Checklist

### Bug Fix
- [x] Fix POSIX ERE conversion in framework-validation.sh (runtime sed, NOT source JSON)
- [x] Fix project FV group iteration in framework-validation.sh (read from file, not shell var)
- [x] Audit defaults/*.json — KEEP \s/\d/\w (JS regex needs them), runtime conversion handles POSIX
- [x] Update .hooks-integrity.json checksums

### Parity Test Suite
- [ ] Create test fixtures (violation + clean files per language)
- [ ] Create parity test runner
- [ ] Verify all 35+ rules detect expected violations
- [ ] Verify framework validation rules match on both engines

### Self-Review Skip
- [ ] Add skipPaths to engine.ts for enforcement source files

### Windows VM Testing (VMware)
- [ ] Spin up Windows VM in VMware
- [ ] Install Node.js 22.5+ on Windows
- [ ] Test `composure-enforce validate` on Windows — verify path handling (backslash vs /)
- [ ] Test `composure-enforce adapt git` — verify pre-commit hook works with Windows git
- [ ] Test `composure-enforce adapt cursor` — verify .cursor/ configs generate correctly
- [ ] Test install.sh via WSL — verify detection + PATH setup
- [ ] Test all 35+ rules produce same results on Windows vs macOS
- [ ] Document any Windows-specific path or shell issues

### Verification
- [ ] Framework validation fires on macOS (POSIX fix)
- [ ] Parity tests pass
- [ ] Self-review false positives eliminated
- [ ] Windows VM: enforce CLI works identically
