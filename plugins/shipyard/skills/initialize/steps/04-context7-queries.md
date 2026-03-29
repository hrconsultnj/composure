# Step 4: Query Context7 for CI/CD Docs

**Guard:** If `--skip-context7` is passed, skip this entire step. Proceed to `steps/05-config-and-report.md`.

**Query from the main conversation** -- MCP tool permissions are session-scoped and not delegated to subagents.

## Freshness check (skip recent docs)

Before querying Context7 for a topic, check if a generated doc already exists:

```bash
stat -f "%m" {file} 2>/dev/null || stat -c "%Y" {file} 2>/dev/null
```

- **If the doc exists and is < 7 days old**: skip. Report: "{topic} docs are fresh ({N} days old) -- skipping"
- **If the doc exists and is >= 7 days old**: regenerate
- **If `--force` is passed**: regenerate docs >= 7 days old. Docs < 7 days old are STILL skipped
- **If the doc doesn't exist**: generate it

## Create directory structure

```
.claude/ci/
  generated/                  <- Context7-sourced CI/CD reference docs
    github-actions.md       <- if GitHub Actions detected
    docker-best-practices.md <- if Dockerfile detected
    vercel-deployment.md    <- if Vercel detected
    ...
  project/                    <- team-written CI/CD conventions
    (user-created files)
```

## Query plan

Based on detected platforms, build the query list:

| Detected | Library to resolve | Query focus |
|----------|-------------------|-------------|
| GitHub Actions | `github-actions` | Workflow syntax, caching, matrix, concurrency, permissions, reusable workflows |
| GitLab CI | `gitlab-ci` | Pipeline syntax, stages, artifacts, caching, rules |
| Vercel | `vercel` | Deployment config, preview deployments, environment variables, edge functions |
| Netlify | `netlify` | Build settings, redirects, functions, environment variables |
| Docker | `docker` | Multi-stage builds, layer caching, security hardening, .dockerignore |
| Kubernetes | `kubernetes` | Deployments, services, probes, resource limits, rolling updates |
| Fly.io | `fly-io` | fly.toml config, scaling, regions, secrets |
| Railway | `railway` | Deployment config, environment variables, services |

## Sequential query+write

**Process one library at a time** (same anti-fabrication pattern as Composure):

1. **Resolve**: Call `resolve-library-id` with the library name
2. **Query**: Call `query-docs` with focus areas specific to CI/CD patterns
3. **Write the doc immediately** to `.claude/ci/generated/{platform}.md`
4. Move to the next library

**MUST rules:**
- MUST source ALL content from Context7 results. NEVER use training data.
- MUST include a valid `context7_library_id` in a frontmatter comment at the top of each doc.
- MUST NOT fabricate. If Context7 returns nothing after 3 attempts, skip the library.

---

**Next:** Read `steps/05-config-and-report.md`
