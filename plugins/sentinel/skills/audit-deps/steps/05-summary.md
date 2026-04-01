# Step 5: Summary

Aggregate all findings into a summary with counts, quick-fix commands, and override proposals.

## Output Format

```
Dependency Audit Summary

Scanned: 342 packages via pnpm
Vulnerable: 11 packages
Banned: 2 packages (require replacement)

  Critical: 1 (1 auto-fixable)
  High:     3 (2 auto-fixable, 1 requires major upgrade)
  Moderate: 7 (7 auto-fixable)

Overrides proposed: 4 transitive deps
  Auto-applicable: 3 (patch/minor)
  Needs review:    1 (major bump)

Quick fix (patch/minor only — no breaking changes):
  pnpm update lodash postcss express next semver

Manual review needed:
  webpack@4.46.0 -> 5.x (major version, breaking changes)
    CVE-2024-AAAAA: Code injection via loader configuration
    Review: https://github.com/webpack/webpack/releases/tag/v5.0.0

Banned packages (must be replaced):
  axios -> native fetch(), ky, or ofetch
  colors -> chalk, picocolors, or kleur
```

Include the override proposal count in the summary. If overrides were proposed, reference Step 4 output for the full copy-pasteable block.

---

**Next:** Read `steps/06-auto-fix.md`
