# Step 1: Detect Test Framework

Check if Composure or Sentinel have already profiled the project:

```bash
cat .claude/no-bandaids.json 2>/dev/null
cat .claude/sentinel.json 2>/dev/null
```

If either exists, extract `frameworks`, `packageManager`, and `language` fields -- no need to re-detect the base stack.

Then detect test frameworks by reading config files and dependencies:

| Signal | Framework | Config file |
|--------|-----------|-------------|
| `vitest` in devDependencies | Vitest | `vitest.config.ts`, `vitest.config.js`, `vite.config.ts` (with test block) |
| `jest` in devDependencies | Jest | `jest.config.*`, `package.json` jest field |
| `@playwright/test` in devDependencies | Playwright | `playwright.config.ts`, `playwright.config.js` |
| `@testing-library/*` in devDependencies | Testing Library | (no config -- used alongside Vitest/Jest) |
| `cypress` in devDependencies | Cypress | `cypress.config.*`, `cypress/` directory |
| `pytest` in requirements.txt or `[tool.pytest]` in pyproject.toml | pytest | `pytest.ini`, `pyproject.toml`, `conftest.py` |
| `_test.go` files present | Go test | (built-in -- no config file) |
| `Cargo.toml` present with `[dev-dependencies]` | Cargo test | (built-in -- no config file) |
| `rspec` in Gemfile | RSpec | `.rspec`, `spec/` directory |
| `phpunit` in composer.json | PHPUnit | `phpunit.xml` |

**Priority when multiple are detected**: A project can have BOTH a unit test framework (Vitest/Jest/pytest) AND an E2E framework (Playwright/Cypress). Record both -- they serve different purposes.

Build a framework profile:

```json
{
  "unit": { "framework": "vitest", "configFile": "vitest.config.ts" },
  "e2e": { "framework": "playwright", "configFile": "playwright.config.ts" },
  "testingLibrary": true,
  "language": "typescript"
}
```

If NO test framework is detected at all, report this clearly and still generate a minimal config:

```
No test framework detected. Consider adding one:
  - TypeScript/JavaScript: vitest (fast, Vite-native, ESM-first)
  - Python: pytest (de facto standard)
  - Go: built-in (go test)

Generated a minimal .claude/testbench.json. Run /testbench:calibrate again after adding a framework.
```

---

**Next:** Read `steps/02-detect-conventions.md`
