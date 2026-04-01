# Step 6: Auto-Fix (if --fix)

If `--fix` was **not** passed, skip this step entirely.

## Apply Safe Upgrades

Only patch and minor updates — never auto-apply major version bumps:

```bash
# Only patch and minor updates — never auto-apply major bumps
pnpm update lodash postcss express next semver
```

Replace the package list with the actual auto-fixable packages identified in previous steps.

## Re-Audit Verification

After applying fixes, re-run the audit to verify:

```bash
pnpm audit --json 2>/dev/null
```

## Report Results

Report what was fixed and what remains:

```
Auto-fix applied:
  - lodash 4.17.20 -> 4.17.21 (CVE-2024-XXXXX resolved)
  - express 4.18.2 -> 4.19.2 (CVE-2024-YYYYY resolved)
  - postcss 8.4.31 -> 8.4.32 (CVE-2024-ZZZZZ resolved)

Overrides applied (transitive deps):
  - lodash >=4.17.21 (added to pnpm.overrides)
  - express >=4.19.2 (added to pnpm.overrides)

Remaining (requires manual intervention):
  - webpack@4.46.0 — major upgrade needed (4.x -> 5.x)

Banned (requires replacement — not auto-fixable):
  - axios — replace with native fetch(), ky, or ofetch
```

If the re-audit shows all auto-fixable vulnerabilities are resolved, confirm success. If any remain, report them as requiring manual investigation.
