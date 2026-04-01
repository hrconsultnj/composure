# Step 3: Report Findings

Format each finding with actionable details. Group by severity, highest first.

## Output Format

```
CRITICAL  CVE-2024-XXXXX  lodash@4.17.20
  Prototype Pollution — attacker can inject properties via crafted input
  Fixed in: 4.17.21 (patch, safe upgrade)
  Command:  pnpm update lodash

HIGH  CVE-2024-YYYYY  express@4.18.2
  Path Traversal — static file serving allows directory escape
  Fixed in: 4.19.2 (minor bump, review changelog)
  Command:  pnpm update express

HIGH  GHSA-XXXX-YYYY  next@14.1.0
  SSRF in Server Actions — requires major version upgrade
  Fixed in: 14.1.4 (patch, safe upgrade)
  Command:  pnpm update next

MODERATE  CVE-2024-ZZZZZ  postcss@8.4.31
  ReDoS in CSS parsing — low exploitability in server context
  Fixed in: 8.4.32 (patch, safe upgrade)
  Command:  pnpm update postcss
```

## Banned Package Findings

For packages flagged via the banned-packages list, use this format:

```
CRITICAL  BANNED  axios@1.7.2
  9+ CVEs (SSRF, credential leakage, DoS). State-sponsored supply chain compromise.
  Action: REPLACE — this package is banned
  Alternatives: native fetch(), ky, ofetch
  CVEs: CVE-2025-58754, CVE-2025-27152, CVE-2024-39338, CVE-2023-45857

HIGH  BANNED  colors@1.4.1
  Maintainer sabotage (2022). Intentionally injected infinite loop.
  Action: REPLACE — this package is banned
  Alternatives: chalk, picocolors, kleur
```

When `--json` is passed, output the raw JSON from the audit tool instead of this formatted report. Then:
- Skip Step 4 (propose overrides) — not applicable for machine-readable output
- Skip Step 5 (summary) — not applicable for machine-readable output
- Step 6 (auto-fix) **STILL executes** if `--fix` was also passed — auto-fix is never skipped

---

**Next:** Read `steps/04-propose-overrides.md`
