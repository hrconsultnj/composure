# Step 1: Run Audit

Execute the appropriate audit command based on the detected package manager.

## Audit Commands by Ecosystem

```bash
# JavaScript/TypeScript
pnpm audit --json 2>/dev/null
npm audit --json 2>/dev/null
yarn audit --json 2>/dev/null

# Python
pip-audit --format=json 2>/dev/null

# Go
govulncheck -json ./... 2>/dev/null

# Rust
cargo audit --json 2>/dev/null
```

Run the command matching the detected package manager. Capture the full JSON output for parsing in the next step.

## Cross-Reference Banned Packages

After running the audit, read the banned packages list:

```
$CLAUDE_PLUGIN_ROOT/data/banned-packages.json
```

For each installed dependency in the project, check if it appears in the banned list for the detected ecosystem (`js`, `python`, `go`, `rust`). For any match:

- Add it as a finding **even if the audit tool did not flag a CVE**
- Use the severity from `banned-packages.json` (critical, high, medium)
- Include the `reason` as the vulnerability description
- Include the `alternatives` as recommended replacements
- Include any `cves` listed in the banned entry

This ensures that deprecated, sabotaged, or supply-chain-compromised packages are always surfaced, not just those with active CVE advisories.

---

**Next:** Read `steps/02-parse-and-enrich.md`
