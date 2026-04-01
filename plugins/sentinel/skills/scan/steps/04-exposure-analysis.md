# Step 4: Exposure Analysis

This is the core graph integration step. For every finding from Steps 2 and 3, determine how exposed it is by tracing callers through the Composure code graph.

## 4a. Code Findings (Semgrep)

For each Semgrep finding:

1. **Extract the function name and file path** from the finding's `path` and `start.line`.
2. **Query the graph:** `callers_of(function_name)` via Composure graph MCP.
3. **Classify each caller** by matching its file path against `exposureBoundaries` (loaded in Step 1):
   - Check `public` patterns first
   - Then `authenticated` patterns
   - Then `internal` patterns
   - If no match: use fallback (`"internal"`)
4. **Determine the finding's exposure** as the highest exposure among ALL its callers:
   - Any caller in `"public"` => exposure = **Public**
   - Any caller in `"authenticated"` (and none in public) => exposure = **Authenticated**
   - All callers in `"internal"` => exposure = **Internal**
   - Zero callers => exposure = **Dead Code**

## 4b. Dependency Findings

For dependency vulnerabilities and banned packages:

1. **Query the graph:** `importers_of(package_name)` to find which files import the vulnerable package.
2. **Classify each importing file** against `exposureBoundaries` using the same pattern matching as 4a.
3. **Determine exposure** using the same hierarchy: Public > Authenticated > Internal > Dead Code.

## 4c. Exposure Data Format

Store exposure data alongside each finding in this format:

```json
{
  "finding_id": "semgrep:sql-injection:users.ts:45",
  "exposure": "Public",
  "callers": [
    { "file": "src/app/api/public/users/route.ts", "zone": "public" },
    { "file": "src/app/api/admin/users/route.ts", "zone": "authenticated" }
  ],
  "caller_count": 2
}
```

For dependency findings:

```json
{
  "finding_id": "dep:axios:banned",
  "exposure": "Public",
  "callers": [
    { "file": "src/app/api/public/search/route.ts", "zone": "public" },
    { "file": "src/lib/api-client.ts", "zone": "internal" }
  ],
  "caller_count": 2
}
```

## 4d. Pattern Matching Rules

When matching file paths against boundary patterns:

- Patterns use glob syntax (`**` for recursive, `*` for single segment)
- Resolution order matters: check `public` first, then `authenticated`, then `internal`
- A file matching `src/app/api/public/users/route.ts` matches both `src/app/api/public/**` (public) and `src/app/api/**` (authenticated) — the `public` match wins because it is checked first
- The fallback for unmatched paths is `"internal"` (conservative default)

## 4e. Summary

After processing all findings, you should have:
- Every Semgrep finding tagged with an exposure level
- Every dependency/banned-package finding tagged with an exposure level
- Caller details for each finding (used in report output)

---

**Next:** Read `steps/05-severity-mapping.md`
