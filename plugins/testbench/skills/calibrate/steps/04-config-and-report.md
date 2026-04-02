# Step 4: Generate Config and Report

## 4a. Generate Config

Create `.claude/testbench.json`:

```json
{
  "version": "1.0.0",
  "detectedAt": "2026-03-27",
  "framework": "vitest",
  "testDir": "src/__tests__",
  "testPattern": "*.test.ts",
  "conventions": {
    "importStyle": "import { describe, it, expect } from 'vitest'",
    "mockPattern": "vi.mock('@supabase/supabase-js')",
    "assertionStyle": "expect().toBe()",
    "fileStructure": "colocated",
    "setupPattern": "beforeEach",
    "namingStyle": "sentence",
    "grouping": "describe",
    "dataPatterns": "inline"
  },
  "e2e": {
    "framework": "playwright",
    "configFile": "playwright.config.ts",
    "baseUrl": "http://localhost:3000"
  },
  "runCommand": "pnpm test",
  "runSingleCommand": "pnpm vitest run {file}",
  "runChangedCommand": "pnpm vitest run --changed",
  "coverageCommand": "pnpm vitest run --coverage",
  "coverageThreshold": {
    "lines": 70,
    "functions": 80
  },
  "composureIntegration": true,
  "sentinelIntegration": false,
  "generatedDocsRoot": ".claude/testing"
}
```

**Field explanations:**

| Field | Source | Purpose |
|-------|--------|---------|
| `framework` | Step 1 detection | Primary unit test framework |
| `testDir` | Step 2 convention scan | Where test files live |
| `testPattern` | Step 2 convention scan | Glob for test file names |
| `conventions` | Step 2 convention scan | How to write tests matching project style |
| `e2e` | Step 1 detection | E2E framework info (null if none) |
| `runCommand` | package.json scripts or framework default | How to run all tests |
| `runSingleCommand` | Framework-specific pattern | How to run a single test file (`{file}` placeholder) |
| `runChangedCommand` | Framework-specific pattern | How to run tests for changed files |
| `coverageCommand` | package.json scripts or framework default | How to run with coverage |
| `coverageThreshold` | Existing config or sensible default | Target coverage percentages |
| `composureIntegration` | Check for `.claude/no-bandaids.json` | Whether Composure graph is available |
| `sentinelIntegration` | Check for `.claude/sentinel.json` | Whether Sentinel is available |

**Run command detection priority:**

1. `package.json` scripts: look for `test`, `test:unit`, `test:e2e`, `test:coverage`
2. Framework config: extract from `vitest.config.ts`, `jest.config.*`, `pyproject.toml`
3. Framework defaults: `pnpm vitest run`, `pnpm jest`, `pytest`, `go test ./...`, `cargo test`

If `--dry-run`, print the JSON to stdout without writing.

If the file already exists and `--force` is not passed, skip generation:

```
.claude/testbench.json already exists. Use --force to overwrite.
```

## 4b. Report

**Read the report template** at `templates/calibrate-report.md` (relative to the plugin root: `plugins/testbench/templates/calibrate-report.md`). Follow the template structure and rules exactly. Fill in placeholders with actual detected values from the steps above.

Key: the template focuses on the user's testing landscape — frameworks, conventions learned, commands, coverage observations. It explicitly excludes hooks, skill listings, and cross-plugin integration lines.

**Done.**
