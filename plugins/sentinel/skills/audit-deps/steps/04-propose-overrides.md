# Step 4: Propose pnpm Overrides

For vulnerable **transitive** dependencies (not direct deps in the project's `package.json` `dependencies` or `devDependencies`), generate proposed `pnpm.overrides` entries.

**This step only applies to pnpm projects.** If the detected package manager is not pnpm, skip to the next step.

## Logic

For each vulnerable transitive dependency:

1. Check if the package is a direct dependency — if so, skip (direct deps are handled by `pnpm update` in the fix step)
2. Determine the fixed version from the enrichment in Step 2
3. Create an override entry: `"package-name": ">=fixed-version"`
4. Classify the override:
   - **Auto-applicable**: patch or minor version bump (safe to add without review)
   - **Needs review**: major version bump (may introduce breaking changes in dependents)

## Output Format

```
Proposed pnpm.overrides (add to package.json > pnpm > overrides):

Auto-applicable (patch/minor — safe to add):
{
  "lodash": ">=4.17.21",
  "express": ">=4.19.2"
}

Needs review (major version bump — check for breaking changes):
{
  "webpack": ">=5.0.0"
}
```

If no transitive vulnerabilities were found, output:

```
No transitive dependency overrides needed — all vulnerabilities are in direct dependencies.
```

## Auto-fix Behavior

If `--fix` flag is active:

1. Read the current `package.json`
2. Locate or create the `pnpm.overrides` section (under `pnpm` key)
3. Merge **only the auto-applicable overrides** (patch/minor) into the existing overrides — do not remove existing entries
4. Write the updated `package.json`
5. Run `pnpm install` to apply the overrides

Do **not** auto-apply overrides that require a major version bump. Those are reported for manual review only.

---

**Next:** Read `steps/05-summary.md`
