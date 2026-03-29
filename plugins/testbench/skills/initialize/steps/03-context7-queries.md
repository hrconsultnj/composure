# Step 3: Query Context7 for Test Framework Docs

**Skip this entire step if `--skip-context7` was passed.**

**Same sequential pattern as Composure**: resolve -> query -> write -> next library.

Only query for DETECTED frameworks -- don't generate Playwright docs if no Playwright.

## 3a. Create directory structure

```
.claude/testing/generated/       <-- Context7-sourced test framework docs
.claude/testing/project/         <-- team-written test conventions (never auto-generated)
```

Run `mkdir -p` for both directories.

## 3b. Freshness check

Before querying Context7, check if a generated doc already exists:

```bash
stat -f "%m" .claude/testing/generated/{file} 2>/dev/null || stat -c "%Y" .claude/testing/generated/{file} 2>/dev/null
```

- **If the doc exists and is < 7 days old**: skip. Report: `"{framework} docs are fresh ({N} days old) -- skipping"`
- **If the doc exists and is >= 7 days old**: regenerate
- **If `--force` is passed**: regenerate docs >= 7 days old. Docs < 7 days old are STILL skipped
- **If the doc doesn't exist**: generate it

## 3c. Build library task list

From the detected test frameworks, build a list of `{ library, outputPath, focusAreas }` tuples:

```
Framework detected        ->  Output path                                    ->  Focus areas
------------------------------------------------------------------------------------------------------------
vitest                    ->  .claude/testing/generated/01-vitest.md          ->  config, mocking (vi.mock), coverage, workspace
jest                      ->  .claude/testing/generated/01-jest.md            ->  config, mocking (jest.mock), coverage, transforms
@playwright/test          ->  .claude/testing/generated/02-playwright.md      ->  config, selectors, fixtures, assertions, mobile
@testing-library/react    ->  .claude/testing/generated/03-testing-library.md ->  queries, user-event, act, async utilities
cypress                   ->  .claude/testing/generated/02-cypress.md         ->  config, commands, intercept, component testing
pytest                    ->  .claude/testing/generated/01-pytest.md          ->  fixtures, parametrize, monkeypatch, async
rspec                     ->  .claude/testing/generated/01-rspec.md           ->  matchers, let/subject, shared examples, mocks
```

## 3d. Query Context7 and write -- one library at a time

**Read `GENERATED-DOC-TEMPLATE.md` from the Composure plugin** (if available) for the doc template structure. If not available, use this minimal structure:

```markdown
---
name: {Framework} Testing Patterns
source: context7
queried_at: {YYYY-MM-DD}
library_version: {version}
context7_library_id: {/org/project}
---

# {Framework} Testing

## Setup
## Key Patterns
## Anti-Patterns
## Migration (if applicable)
```

For each library in the task list, if it passed the freshness check:

1. **Resolve**: Call `resolve-library-id` with `libraryName="{library}"` -- pick highest benchmark score with "High" reputation
2. **Query (BROAD)**: Call `query-docs` -- setup, key patterns, config. Focus areas: `{focusAreas}`
3. **Query (TARGETED)**: Call `query-docs` -- specifically for mocking patterns, assertion patterns, async testing
4. If results are sparse, try a DIFFERENT library ID from resolve results
5. **Validate** before writing:
   - If Context7 returned no data after 3+ attempts -> skip, report as "no Context7 data available"
   - If `resolve-library-id` returned no results -> skip, report as "library not found in Context7"
   - If `context7_library_id` would be `manual`, `n/a`, or missing -> **REJECT**
   - If content contains no code blocks from Context7 -> **REJECT**
6. **Write the doc immediately** -- `mkdir -p` then write
7. **Move to the next library**

**MUST rules (non-negotiable):**
- MUST source ALL content from Context7. NEVER use training data.
- MUST include a valid `context7_library_id` in frontmatter.
- MUST NOT fabricate. If Context7 returns nothing after 3 attempts, skip.
- Aim for 200-500 lines with complete code examples from Context7.

**If Context7 is unavailable**: skip this entire step.

---

**Next:** Read `steps/04-config-and-report.md`
