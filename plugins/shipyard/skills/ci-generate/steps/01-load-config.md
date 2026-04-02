# Step 1: Load Configuration

Read `.claude/shipyard.json` for stack and CI config:

```bash
cat .claude/shipyard.json 2>/dev/null
```

If missing, run `/shipyard:configure` first. Do NOT proceed without a config -- the generated workflow depends on accurate stack detection.

Extract these values for workflow generation:
- `ci.platform` -- which CI system to generate for
- `ci.packageManager` -- pnpm, npm, bun, yarn
- `ci.nodeVersion` -- Node.js version for setup-node
- `deployment.targets` -- where to deploy
- `stack.hasTypecheck` -- whether to include a typecheck step
- `stack.hasLint` -- whether to include a lint step
- `stack.hasTests` -- whether to include a test step
- `stack.testCommand` -- exact test command to run
- `stack.buildCommand` -- exact build command to run

## Read Reference Docs

Check for Context7-generated CI docs:

```bash
ls .claude/ci/generated/ 2>/dev/null
```

If docs exist for the target platform, read them for up-to-date syntax and patterns. These docs contain current API surface from Context7 -- prefer them over training data for action versions, caching strategies, and config syntax.

## Determine Pipeline Stages

Build the stage list based on what the project actually has. Only include stages that are relevant:

| Stage | Include when | Purpose |
|-------|-------------|---------|
| `install` | Always | Install dependencies with proper caching |
| `lint` | `stack.hasLint == true` | Run ESLint / project linter |
| `typecheck` | `stack.hasTypecheck == true` | Run tsc / type checking |
| `test` | `stack.hasTests == true` | Run test suite |
| `build` | `stack.buildCommand` exists | Build the application |
| `security` | Sentinel is installed (`sentinelIntegration == true`) | Run `pnpm audit` / dependency check |
| `deploy` | Deployment target detected | Deploy to target platform |

Stage dependency chain:
```
install -> [lint, typecheck, security] (parallel) -> test -> build -> deploy
```

Lint, typecheck, and security can run in parallel since they are independent. Test depends on install completing. Build depends on test passing. Deploy depends on build succeeding.

---

**Next:** Read `steps/02-generate-workflow.md`
