# Step 1: Prerequisites

Verify all required infrastructure is available before scanning.

## 1a. Verify Composure Graph Availability

Attempt a probe query to confirm the graph MCP tools are reachable:

```
semantic_search_nodes({ query: "test", limit: 1 })
```

- **If the call succeeds:** Set `graph_available = true`. Continue.
- **If the call fails or the tool is not found:** Set `graph_available = false`. Print this warning and continue:

```
Composure code graph not available - exposure analysis will be skipped.
All findings will default to "Authenticated" exposure (conservative middle ground).
For full exposure-aware prioritization, run `/composure:build-graph` then re-scan.
```

The scan proceeds in degraded mode. Step 4 (Exposure Analysis) will be skipped, and Step 5 (Severity Mapping) will treat all findings as "Authenticated" exposure.

## 1b. Load Sentinel Configuration

Read `.claude/sentinel.json` to determine:

- **Package manager** - which audit command to use (Step 3)
- **Framework detection** - which rulesets and known CVEs apply
- **Custom `exposureBoundaries`** - project-specific path patterns for exposure zones

If `.claude/sentinel.json` does not exist, perform **inline auto-detection** instead of stopping:

1. **Detect language** from files in `--path` (or project root): `.py` = Python, `.ts`/`.tsx` = TypeScript, `.go` = Go, `.rs` = Rust
2. **Detect package manager** from manifest files: `requirements.txt`/`pyproject.toml`/`Pipfile` = pip, `package.json` = npm/pnpm/yarn, `go.mod` = go, `Cargo.toml` = cargo
3. **Detect framework** from imports/config: Django (`settings.py`, `django` imports), Flask (`flask` imports), FastAPI (`fastapi` imports), Next.js (`next.config`), React (`react` in package.json)
4. Set `config_source = "auto-detected"` and print:

```
No sentinel.json found - auto-detected: [language], [package_manager], [framework]
Run `/sentinel:initialize` for a persistent config with custom exposure boundaries.
```

Continue with the auto-detected values. The scan must not stop for missing config.

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
