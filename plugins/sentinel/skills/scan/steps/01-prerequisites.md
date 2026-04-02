# Step 1: Prerequisites

Verify all required infrastructure is available before scanning.

## 1a. Verify Composure Graph Availability

Attempt a probe query to confirm the graph MCP tools are reachable:

```
semantic_search_nodes({ query: "test", limit: 1 })
```

- **If the call succeeds:** Graph is available. Continue.
- **If the call fails or the tool is not found:** STOP immediately with this message:

```
Sentinel scan requires the Composure code graph for exposure-aware prioritization.
Run `/composure:build-graph` first, then retry `/sentinel:scan`.
```

Do NOT proceed without a working graph. Exposure analysis (Step 4) depends on it.

## 1b. Load Sentinel Configuration

Read `.claude/sentinel.json` to determine:

- **Package manager** — which audit command to use (Step 3)
- **Framework detection** — which rulesets and known CVEs apply
- **Custom `exposureBoundaries`** — project-specific path patterns for exposure zones

If `.claude/sentinel.json` does not exist, run `/sentinel:assess` first and STOP.

## 1c. Load Exposure Boundaries

Check if `sentinel.json` contains an `exposureBoundaries` key with `public`, `authenticated`, and `internal` arrays.

- **If custom boundaries exist:** Use them for exposure classification in Step 4.
- **If no custom boundaries:** Load defaults from `$CLAUDE_PLUGIN_ROOT/data/exposure-defaults.json`:

```json
{
  "public": ["src/app/api/public/**", "src/app/(public)/**", "app/api/public/**", "pages/api/public/**", "routes/public/**", "src/app/api/webhooks/**", "app/api/webhooks/**", "public/**"],
  "authenticated": ["src/app/api/**", "src/app/(auth)/**", "src/app/(dashboard)/**", "src/app/(protected)/**", "app/api/**", "pages/api/**", "routes/**", "src/routes/**", "src/pages/**"],
  "internal": ["scripts/**", "tools/**", "migrations/**", "seed/**", "supabase/**", "src/lib/**", "src/utils/**", "src/helpers/**", "internal/**", "cli/**"]
}
```

Resolution order: `public` > `authenticated` > `internal`. Fallback: `"internal"`.

## 1d. Load Data Files

Store these paths for use in subsequent steps:

- **Banned packages:** `$CLAUDE_PLUGIN_ROOT/data/banned-packages.json` — used in Step 3 for cross-referencing installed dependencies
- **Known CVEs:** `$CLAUDE_PLUGIN_ROOT/data/known-cves.json` — used in Step 6 for framework-specific CVE checks

Read both files now so the data is available when needed.

---

**Next:** Read `steps/02-semgrep-analysis.md`
