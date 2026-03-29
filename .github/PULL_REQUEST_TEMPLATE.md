## What kind of contribution is this?

- [ ] **Framework pattern** — adding/updating patterns for a language (TypeScript, Python, Go, Rust, C/C++, Swift, Kotlin)
- [ ] **New language support** — adding a new language framework
- [ ] **Hook improvement** — updating no-bandaids rules, decomposition checks, or other hooks
- [ ] **Skill enhancement** — improving an existing skill
- [ ] **Bug fix**
- [ ] **Other** (describe below)

## Summary

<!-- 1-3 sentences: what does this PR do and why? -->

## Framework Pattern Checklist

If contributing patterns to `skills/app-architecture/{lang}/references/universal/`:

- [ ] Pattern is **battle-tested** — used in a real project, not theoretical
- [ ] Includes **code examples** with correct/incorrect patterns
- [ ] Has **frontmatter** (`name`, `description`, `type: reference`)
- [ ] File is under **150 lines** (decompose if larger)
- [ ] Anti-patterns include **why it's bad** and **the fix**
- [ ] Does NOT duplicate existing patterns in that language's `references/universal/`
- [ ] Tested: the pattern works with the latest version of the library/framework

### Where did this pattern come from?

- [ ] Project-level override (`.claude/frameworks/{lang}/`) that proved useful
- [ ] Context7 generated doc that should be curated permanently
- [ ] Original contribution based on production experience
- [ ] Community request / issue

## New Language Checklist

If adding a new language to `skills/app-architecture/`:

- [ ] Created `{lang}/SKILL.md` with anti-patterns table and patterns list
- [ ] Created `{lang}/references/universal/` directory
- [ ] Created `{lang}/references/generated/README.md`
- [ ] Added language to `hooks/no-bandaids.sh`:
  - [ ] Extension detection (line ~47)
  - [ ] Anti-pattern rules (in the `case` block)
- [ ] Added language to master `skills/app-architecture/SKILL.md`:
  - [ ] Framework Loading table
  - [ ] Other Frameworks section
- [ ] Updated `skills/initialize/` step files:
  - [ ] `steps/01-detect-stack.md` — Stack detection files table
  - [ ] `steps/02-extensions-skip-patterns.md` — Extensions and skip patterns table
  - [ ] `steps/03a-context7-folders.md` — Context7 query focus table
- [ ] Updated `README.md` language list and no-bandaids table

## Hook / Skill Checklist

If modifying hooks or skills:

- [ ] Hook stays under 200 lines (no-bandaids) or 350 lines (decomposition-check)
- [ ] Backward compatible — existing `no-bandaids.json` without new fields still works
- [ ] Tested with `echo '{"tool_name":"Write","tool_input":{"file_path":"test.xx","content":"..."}}' | bash hooks/no-bandaids.sh`

## Test Plan

<!-- How did you verify this works? -->

- [ ] Tested locally with Claude Code
- [ ] Verified hook blocks the anti-pattern
- [ ] Verified hook allows the correct pattern
- [ ] Ran `/composure:initialize --force` to verify detection
