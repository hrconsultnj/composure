# Deployment Principles

> Universal deployment best practices. Always loaded regardless of CI platform or infrastructure.

---

## The Deployment Pipeline

Every project needs a pipeline. The minimum viable pipeline runs five stages in order:

```
lint --> typecheck --> test --> build --> deploy
```

**Why this order matters:**
- Lint catches style/formatting issues in seconds. Fail fast.
- Typecheck catches type errors without running code. Cheaper than tests.
- Tests validate behavior. Run after types are confirmed correct.
- Build proves the artifact can be produced. Don't deploy what doesn't build.
- Deploy only after all gates pass. Never skip gates "just this once."

If your project lacks a stage, add a placeholder. A pipeline with `lint: echo "TODO"` is better than no pipeline -- it documents the gap.

---

## Environment Management

### The Three Environments

| Environment | Purpose | Deploys from | Who sees it |
|-------------|---------|-------------|-------------|
| `development` | Local dev, feature branches | manual / PR preview | Developer |
| `staging` | Pre-production validation | `main` branch | Team |
| `production` | Live users | tagged release or `main` after staging | Everyone |

### Env Var Hygiene

- **One `.env.example` in version control** with every required variable, no real values.
- **Never commit `.env`** -- add to `.gitignore` on day one.
- **Validate env vars at startup** -- crash early if `DATABASE_URL` is missing, not when the first query runs.
- **Prefix client-side vars** -- Next.js uses `NEXT_PUBLIC_`, Vite uses `VITE_`. Server vars without the prefix never reach the browser.
- **Different values per environment** -- staging points to staging DB, not production. Obvious but frequently violated.

```typescript
// Validate at startup, not at first use
const requiredEnv = ['DATABASE_URL', 'AUTH_SECRET'] as const
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
}
```

---

## Zero-Downtime Deployment Strategies

### Blue-Green

Two identical environments. Deploy to the inactive one, validate, switch traffic.

```
                  +-----------+
  traffic ------> |   Blue    |  (current production)
                  +-----------+
                  +-----------+
  deploy -------> |   Green   |  (new version, validating)
                  +-----------+

  After validation: switch traffic Blue -> Green
  Rollback: switch traffic Green -> Blue (instant)
```

**Best for:** Applications where you can afford two full environments. Instant rollback.

### Canary

Route a small percentage of traffic to the new version. Increase gradually.

```
5% traffic  --> new version   (watch error rates)
25% traffic --> new version   (watch latency)
50% traffic --> new version   (watch business metrics)
100% traffic -> new version   (done)
```

**Best for:** High-traffic applications where you want to validate with real users before full rollout. Requires traffic splitting (load balancer, CDN, or platform support).

### Rolling Update

Replace instances one at a time. Kubernetes default.

```
[v1] [v1] [v1] [v1]   -->   [v2] [v1] [v1] [v1]   -->   [v2] [v2] [v1] [v1]   -->   [v2] [v2] [v2] [v2]
```

**Best for:** Container orchestration (Kubernetes, ECS). No extra infrastructure cost. Slower rollback than blue-green.

### Vercel / Serverless Platforms

Vercel, Netlify, and similar platforms handle zero-downtime deployments automatically. Each deploy creates an immutable deployment URL. Production alias switches atomically. Rollback is just re-aliasing a previous deployment.

---

## Rollback Strategy

### When to Roll Back

- Error rate spikes above baseline (even 0.5% increase is a signal)
- Latency P95 degrades beyond acceptable threshold
- Health check failures
- User-facing functionality broken (smoke test failure)
- Database connection failures after migration

### How to Roll Back

1. **Revert the deployment, not the code.** Re-deploy the last known good artifact/image/commit. Don't rush a code revert through the full pipeline.
2. **Database migrations are forward-only.** If a migration breaks rollback compatibility, you need a fix-forward migration, not a rollback.
3. **Document every rollback.** What triggered it, what was the impact, what was the root cause.

---

## Feature Flags vs Branch Deploys

| Approach | Use When | Trade-off |
|----------|----------|-----------|
| Feature flags | Gradual rollout, A/B testing, kill switch needed | Runtime complexity, flag cleanup debt |
| Branch deploys | Preview environments, PR review | No production gradual rollout |
| Both | Feature in preview via branch, gradual rollout via flag | Most flexible, most overhead |

Feature flags should be **temporary**. Schedule cleanup. A codebase with 200 permanent feature flags is unmaintainable.

---

## Secrets Management

### Rules

1. **Never in code.** Not in comments, not in "example" files with real values, not in test fixtures.
2. **Never in CI config directly.** Use your CI platform's secret store (GitHub Secrets, GitLab CI Variables).
3. **Rotate regularly.** Especially after team member departures.
4. **Scope narrowly.** A deploy key should only access what it needs. Don't use a root API key for CI.
5. **Audit access.** Know who can read production secrets.

### Environment Variables vs Vault

- **Env vars** (CI secrets, Vercel env): Fine for most projects. Simple, well-supported.
- **Vault** (HashiCorp Vault, AWS Secrets Manager): For regulated industries, dynamic secrets, automatic rotation.

---

## Post-Deploy Monitoring

### The First 30 Minutes

After every production deploy, watch:

| Metric | Where to Check | Red Flag |
|--------|---------------|----------|
| Error rate | Sentry, Datadog, Vercel analytics | Any increase above baseline |
| Response time (P95) | APM tool, server logs | > 20% increase |
| HTTP 5xx rate | Load balancer, CDN dashboard | Any non-zero increase |
| Core Web Vitals | Vercel Speed Insights, CrUX | LCP > 2.5s, CLS > 0.1 |
| Database connections | DB dashboard, connection pool metrics | Pool exhaustion |
| Memory / CPU | Container metrics, serverless dashboard | Sustained > 80% |

### Alerting

- **Page** on: 5xx spike, health check failure, complete outage.
- **Notify** on: error rate increase, latency degradation, unusual traffic patterns.
- **Log** on: deployment completed, deployment rolled back, config changed.

---

## Database Migrations

### Rules

1. **Run migrations before deploy.** The new code should work with the new schema.
2. **Make migrations backwards-compatible.** Old code should still work with the new schema during the rollout window.
3. **Never drop columns in the same deploy that stops using them.** Deploy code that stops using the column first, then drop it in a later migration.
4. **Test migrations against a copy of production data.** Not just an empty dev database.
5. **Have a rollback plan.** For additive migrations (add column, add table), rollback is "do nothing." For destructive migrations, plan the reverse.

### Backwards-Compatible Migration Pattern

```
Deploy 1: Add new column (nullable), code writes to both old and new
Deploy 2: Backfill new column, code reads from new
Deploy 3: Drop old column
```

---

## Cache Invalidation

- **Build ID in asset URLs.** Next.js does this automatically (`/_next/static/[buildId]/`). For custom setups, hash file contents into filenames.
- **CDN purge after deploy.** Vercel handles this. For custom CDNs, purge programmatically in your deploy script.
- **API cache headers.** `Cache-Control: public, max-age=31536000, immutable` for hashed assets. Short or no cache for HTML/API responses.
- **Don't cache `.env` or config in CI.** Stale config is a common source of "works on my machine" CI failures.

---

## The "Ship It" Checklist

Minimum viable deployment pipeline for any new project:

- [ ] CI runs lint, typecheck, test, build on every PR
- [ ] `main` branch is protected -- requires CI pass to merge
- [ ] Production deploys only from `main` (or tagged releases)
- [ ] Secrets are in CI secret store, not in code
- [ ] `.env.example` exists with all required variables documented
- [ ] Health check endpoint exists (`/api/health` or equivalent)
- [ ] Error tracking is configured (Sentry or equivalent)
- [ ] Rollback procedure is documented and tested
- [ ] Team knows how to deploy and how to roll back

---

## Infrastructure as Code

Don't click buttons in cloud consoles. Write config.

- **CI pipelines** are YAML files in version control (`.github/workflows/`, `.gitlab-ci.yml`).
- **Infrastructure** is Terraform, Pulumi, CDK, or equivalent.
- **Container config** is `Dockerfile` + `docker-compose.yml` in version control.
- **Platform config** is `vercel.json`, `netlify.toml`, or equivalent in version control.

Benefits: reproducible, reviewable, rollback-able, auditable.

---

## Container Best Practices

- **Minimal base images.** `node:22-alpine` not `node:22`. `python:3.12-slim` not `python:3.12`.
- **Non-root user.** Always add `USER` directive. Never run as root in production.
- **Health checks.** `HEALTHCHECK` instruction so orchestrators know when a container is unhealthy.
- **One process per container.** Don't run nginx + node + redis in one container.
- **Pin versions.** `node:22.12-alpine` not `node:latest`. Reproducible builds matter.

---

## CI Caching

### What to Cache

- `node_modules` or pnpm store (`~/.local/share/pnpm/store`)
- Build cache (`.next/cache`, `.turbo/`, `target/` for Rust)
- Dependency lock file hash as cache key

### What NOT to Cache

- `.env` files -- stale secrets cause silent failures
- Test databases -- tests should be hermetic
- Anything that changes every run -- cache thrashing is worse than no cache

---

## Branch Protection

Enforce on `main` (and `production` if you use a separate branch):

- Require CI status checks to pass before merge
- Require at least one PR review (for teams > 1)
- Prevent force pushes
- Require branches to be up to date before merging (prevents merge queue conflicts)
- Enable signed commits if your compliance requires it
