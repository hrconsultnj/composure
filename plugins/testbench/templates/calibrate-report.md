# Testbench Calibrate — Report Template

> **Purpose**: Structured output for `/testbench:calibrate`. Focus on the user's testing landscape — not plugin internals (no hooks, no skill listing).

## Template

```
Testbench Calibrated for {project}

Test Frameworks:
  Unit: {framework} {version} ({configFile})
  {if e2e detected:}
  E2E: {framework} ({configFile})
  {if helpers detected:}
  Helpers: {testing-library, msw, etc.}

Conventions (from {count} existing test files):
  Import:    {importStyle}
  Mocks:     {mockPattern}
  Assertions: {assertionStyle}
  Structure: {fileStructure — colocated or separate __tests__/}
  Setup:     {setupPattern — beforeEach, beforeAll, etc.}
  Naming:    {namingStyle — sentence, verb, descriptive}

{if no test files found:}
Conventions: No existing test files found — will use {framework} community defaults.

Commands:
  All:      {runCommand}
  Single:   {runSingleCommand}
  Changed:  {runChangedCommand}
  Coverage: {coverageCommand}

Generated:
  - .composure/testbench.json
  {if framework docs generated:}
  - .composure/testing/generated/ ({list framework docs})

{OBSERVATIONS — only if actionable}

🧪 Calibrated by Testbench · composure-pro.com
```

## Rules

1. **No "Active hooks" section.** Internal machinery.
2. **No "Available skills" section.** Visible in the CLI.
3. **No "Plugin integrations" section.** Internal plumbing.
4. **Conventions section is the value proposition.** This is what makes `/testbench:generate` produce tests that match the project style. Show exactly what was learned.
5. **If zero test files exist, say so directly.** Don't pretend to have conventions — state that defaults will be used and which defaults.
6. **Observations surface test health.** Examples: "3 test files across entire monorepo — low coverage", "E2E configured but no test files", "Mobile app has zero tests". These are the kinds of things the user wants to know from a testing plugin.
7. **Monorepo awareness.** If multiple workspaces have different frameworks (e.g., Vitest in web, Jest in shared), show both. Don't merge into one.
