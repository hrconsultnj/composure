# Step 6: Coverage Analysis (--coverage flag)

If `--coverage` is passed, run the coverage command from config:

```bash
# Vitest
pnpm vitest run --coverage

# Jest
pnpm jest --coverage

# pytest
pytest --cov=src --cov-report=term-missing

# Go
go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out

# Cargo
cargo tarpaulin --out Stdout
```

Use `coverageCommand` from config if available.

#### Parse coverage output

Extract per-file coverage percentages. Identify:

- **Uncovered files** -- Source files with 0% coverage (no tests at all)
- **Under-threshold files** -- Files below the `coverageThreshold` from config
- **Uncovered functions** -- Specific exported functions with no test coverage

#### Composure graph integration

If `composureIntegration` is true in config and the Composure graph MCP is available, enhance coverage analysis:

```
# Query the graph to find high-impact untested functions
query_graph({ pattern: "callers_of", target: "{uncovered-function}" })
```

Functions with many callers but no tests are high-risk. Prioritize them:

```
Coverage: 78% lines, 82% functions

Under threshold (target: 70% lines, 80% functions):
  src/utils/validation.ts         45% lines   (6 callers in graph -- HIGH PRIORITY)
  src/hooks/usePermissions.ts     62% lines   (4 callers)
  src/api/billing.ts              58% lines   (3 callers)

Uncovered exports (0 test coverage):
  src/utils/validation.ts:
    - validatePhoneNumber  (called by 3 files)
    - sanitizeHtml         (called by 5 files -- HIGH PRIORITY)
  src/api/billing.ts:
    - calculateProration   (called by 2 files)

Run /testbench:generate src/utils/validation.ts to add tests for the highest-impact file.
```

Without the Composure graph, report coverage without caller analysis:

```
Coverage: 78% lines, 82% functions

Under threshold:
  src/utils/validation.ts    45% lines
  src/hooks/usePermissions.ts  62% lines
  src/api/billing.ts         58% lines

Run /testbench:generate <file> to improve coverage.
```

#### Update state with coverage

Add coverage data to `.claude/testbench-state.json`:

```json
{
  "lastRun": "2026-03-27T14:30:00Z",
  "scope": "all",
  "total": 142,
  "passed": 142,
  "failed": 0,
  "skipped": 0,
  "duration": "4.8s",
  "failures": [],
  "coverage": {
    "lines": 78,
    "functions": 82,
    "branches": 65,
    "meetsThreshold": false,
    "underThreshold": [
      { "file": "src/utils/validation.ts", "lines": 45 },
      { "file": "src/hooks/usePermissions.ts", "lines": 62 },
      { "file": "src/api/billing.ts", "lines": 58 }
    ],
    "uncoveredExports": [
      { "file": "src/utils/validation.ts", "function": "validatePhoneNumber" },
      { "file": "src/utils/validation.ts", "function": "sanitizeHtml" },
      { "file": "src/api/billing.ts", "function": "calculateProration" }
    ]
  }
}
```

---

**Done.**
