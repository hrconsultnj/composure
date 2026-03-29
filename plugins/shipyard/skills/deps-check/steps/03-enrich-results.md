# Step 3: Parse and Enrich Results

For each vulnerability found, extract:

| Field | Description |
|-------|-------------|
| Package name | The vulnerable dependency |
| Current version | Version currently installed |
| CVE ID | e.g., CVE-2024-48930 (or GHSA ID if no CVE) |
| Severity | Critical / High / Medium / Low |
| Vulnerable range | e.g., `<3.0.1` |
| First patched version | The minimum version that fixes this CVE |
| Advisory URL | Link to the advisory for details |

## Determine the Highest Safe Version

Do NOT just recommend "latest." The latest version may itself have vulnerabilities, or may be a major version bump that breaks the project.

For JavaScript packages:

```bash
# Get all published versions
npm view {package} versions --json 2>/dev/null
```

Then:

1. Filter to versions >= the first patched version
2. Cross-reference with the advisory data -- exclude versions in ANY vulnerable range for this package
3. Prefer the highest version within the current major (e.g., if on 2.x, recommend highest safe 2.x)
4. If no safe version exists in the current major, note that a major upgrade is required

```json
{
  "package": "example-lib",
  "current": "2.3.1",
  "vulnerable": "<2.3.5",
  "firstPatched": "2.3.5",
  "highestSafe": "2.4.2",
  "latestMajor": "3.1.0",
  "recommendation": "upgrade to 2.4.2 (patch/minor, safe)",
  "note": "3.1.0 exists but is a major version bump -- review changelog before upgrading"
}
```

For packages where the advisory affects ALL versions (no patch available):

```
WARNING: No patched version available for {package} ({CVE}).
  Consider: alternative package, or accept risk with documentation.
```

---

**Next:** Read `steps/04-fix-report-tasks.md`
