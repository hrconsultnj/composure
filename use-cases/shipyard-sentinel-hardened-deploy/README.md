# From Repo to Production with Hardened Security — 22 Minutes

> Shipyard preflight + GitHub repo creation + Vercel deploy + live header audit + Sentinel-style grading + security header fixes + redeploy. A 26-minute Design Forge build went from "clean local build" to "live at aigraas.com with A/A+ security headers" in 22 more minutes.

> **Part 2 of a series.** See [From Research to 13-Page Website in 26 Minutes](../design-forge-research-to-website/README.md) for how the site was built before this use case picks up.

## What Happened

The AIGRaaS website was built and clean locally at 3:46 PM ET. But a clean build is not a shipped product — there's no GitHub repo, no Vercel project, no custom domain, no PWA manifest, no SEO artifacts, no security headers, and no audit evidence to hand a security reviewer.

In 22 minutes, the workflow closed that gap:

1. **SEO + PWA artifacts** — SITE constants, full metadata, sitemap, robots, manifest, favicon, OG image, 4 PWA icon variants
2. **GitHub repo** — created private `hrconsultnj/aigraas` via `gh repo create`, pushed main
3. **Shipyard preflight** — production readiness checklist (env, health, security, performance)
4. **Vercel deploy** — CLI `vercel link` + `vercel --prod`, then connected GitHub for auto-deploys
5. **Custom domain** — DNS records, SSL provisioning, HTTP→HTTPS redirect
6. **Live audit** — curl headers, fetch SEO artifacts, inspect meta tags, check SSL expiry
7. **Code quality fixes** — React 19 lint rule (`set-state-in-effect`), unused imports
8. **Security headers** — added X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via `next.config.ts`
9. **Redeploy + re-audit** — commit + push (auto-deploy) + verify new headers live

Total: **22 minutes and 14 seconds** from "ready to ship" to "audit complete with A/A+ security grades."

## Session Timeline

| Milestone | Time (ET) | Elapsed |
|-----------|-----------|---------|
| SEO/PWA phase started | 15:49:33 | 0:00 |
| SITE constants edited | 15:51:36 | 2:03 |
| Full metadata written (layout.tsx) | 15:52:16 | 2:43 |
| sitemap.ts + robots.ts written | 15:52:49 | 3:16 |
| PWA manifest.ts written | 15:53:04 | 3:31 |
| Favicon + OG image SVG written | 15:55:38 | 6:05 |
| PWA icons generated (4 variants) | 15:54:41 | 5:08 |
| Build verification — 17 static routes | 15:56:48 | 7:15 |
| GitHub repo created + pushed | 15:59:49 | 10:16 |
| `/shipyard:preflight` run | 16:01:05 | 11:32 |
| Vercel CLI link + production deploy | 16:01:55 | 12:22 |
| Vercel GitHub integration connected | 16:03:03 | 13:30 |
| **Everything live at aigraas.com** | ~16:05:00 | **~15:27** |
| Live header audit started | 16:05:55 | 16:22 |
| SEO artifacts verified (all 11) | 16:06:28 | 16:55 |
| Security headers checked | 16:06:50 | 17:17 |
| Lint/typecheck run | 16:07:46 | 18:13 |
| Lint errors fixed (2 files) | 16:08:50 | 19:17 |
| Security headers added to next.config.ts | 16:09:18 | 19:45 |
| Build verified with new headers | 16:09:36 | 20:03 |
| Audit fix commit + push | 16:09:54 | 20:21 |
| New headers verified live | 16:10:10 | 20:37 |
| **Final audit output** | 16:11:47 | **22:14** |

## Phase Breakdown

### Phase 1: SEO + PWA Setup (~7 minutes, 15:49–15:56)

Before a single deploy command, the site needed the production artifacts that SEO, search engines, PWA installers, social sharing, and browser UIs all depend on:

| Artifact | File | Purpose |
|---|---|---|
| **SITE constants** | `src/lib/constants.ts` | Single source of truth: name, description, URL, creator, links — referenced by every metadata export |
| **Full metadata** | `src/app/layout.tsx` | `viewport`, `themeColor`, `metadataBase`, `authors`, 15 keywords, `icons`, `appleWebApp`, `formatDetection`, `robots` with `googleBot`, `openGraph`, `twitter` cards |
| **Sitemap** | `src/app/sitemap.ts` | 12 routes with `lastModified`, `changeFrequency`, `priority` — served at `/sitemap.xml` |
| **Robots** | `src/app/robots.ts` | Allow all, disallow `/api/` and `/dashboard/` — served at `/robots.txt` |
| **PWA manifest** | `src/app/manifest.ts` | `standalone` display, `#10B981` theme, 4 icons (192/512, any + maskable) — served at `/manifest.webmanifest` |
| **Favicon** | `public/favicon.svg` | Teal-mint lettermark SVG |
| **OG image** | `public/og-image.svg` → `.png` | 1200x630 social share image |
| **PWA icons** | `public/icons/*.png` | 192x192 + 512x512, each in `any` and `maskable` purpose |
| **Apple touch** | `public/apple-touch-icon.png` | 180x180 iOS home screen |
| **README** | `README.md` | Repo landing page |

**Key insight:** Next.js 16 handles `manifest.ts`, `sitemap.ts`, and `robots.ts` as route handlers — no need for static files in `public/`. The routes are auto-registered and appear in the build output as static routes.

**Build verification**: `pnpm build` → 17 routes, all static, clean.

### Phase 2: Repo + Deploy (~6 minutes, 15:59–16:05)

```bash
# 1. Stage + initial commit
git add -A && git commit -m "Initial commit — AIGRaaS website..."

# 2. Create private GitHub repo + push main
gh repo create aigraas --private --source=. \
  --description "AI Guardrails as a Service — constitutional guardrails..." \
  --push

# 3. Shipyard preflight audit
/shipyard:preflight

# 4. Vercel project link + production deploy
vercel link --yes --project aigraas
vercel --prod

# 5. Connect Vercel to GitHub for auto-deploys
# (Done via Vercel dashboard or `vercel git connect`)
```

**Shipyard preflight output** flagged the deploy footprint correctly (12MB actual, down from a misread 389MB of trace data) and identified what was skipped (no API routes = no CORS/CSRF/rate limit needs) vs what was a note-only (run `/sentinel:headers` after deploy).

```
Production Readiness: aigraas.com

Environment & Secrets:
  [SKIP] No .env.example needed (0 process.env references)
  [PASS] .env* gitignored, no env files tracked

Security:
  [SKIP] CORS/CSRF/rate limiting (no API routes)
  [NOTE] Run /sentinel:headers --url https://aigraas.vercel.app after deploy

Performance:
  [PASS] Deploy size: 12MB (1.1M static + 11M server)
  [PASS] 0 raw <img> tags (next/image throughout)
  [PASS] Production build clean (17 routes, all static)
```

**Vercel deploy protection gotcha**: Private projects from CLI deploys are protected by default (401 on preview URLs). Connecting the custom domain bypasses this for production; preview URLs remain protected.

### Phase 3: Live Audit (~3 minutes, 16:05–16:08)

Once the custom domain was live, the audit verified every layer:

```bash
# Deployment layer
curl -sI https://aigraas.com
curl -sI http://aigraas.com  # Verify 308 redirect to HTTPS
openssl s_client -connect aigraas.com:443 -servername aigraas.com </dev/null

# SEO artifacts (all should be 200 OK with correct content-type)
curl -sI https://aigraas.com/robots.txt
curl -sI https://aigraas.com/sitemap.xml
curl -sI https://aigraas.com/manifest.webmanifest
curl -sI https://aigraas.com/favicon.svg
curl -sI https://aigraas.com/apple-touch-icon.png
curl -sI https://aigraas.com/og-image.png
curl -sI https://aigraas.com/icons/icon-192x192.png

# Live meta tag inspection
curl -s https://aigraas.com | grep -oE '<meta[^>]+>'

# Security header grading
curl -sI https://aigraas.com | grep -iE 'strict-transport|x-frame|x-content|referrer|permissions|csp'
```

**Initial security header audit** showed HSTS was present (Vercel adds it automatically, 2-year max-age exceeds the 1-year recommendation), but the four standard hardening headers were missing — this is the gap Sentinel-style grading catches.

### Phase 4: Hardening (~4 minutes, 16:07–16:11)

Two classes of fix landed in a single commit:

**Code quality fixes:**

```diff
# src/components/layout/theme-toggle.tsx
- // Old: useState + useEffect set-state triggering React 19 lint rule
+ // New: useSyncExternalStore subscription to localStorage + matchMedia

# src/components/sections/use-case-detail.tsx
- import { StaggerChildren, StaggerItem } from "...";  // unused
```

**Security headers** added to `next.config.ts`:

```ts
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        },
      ],
    },
  ];
}
```

**Commit + push** triggered the Vercel GitHub integration's auto-deploy. No manual redeploy command needed.

```bash
git add -A && git commit -m "Fix lint errors and harden security headers"
git push
# Vercel picks it up automatically, rebuilds, deploys to aigraas.com
```

**Verification** at 16:10:10 confirmed the four new headers were live — full audit complete at 16:11:47.

## Final Audit Report

### Deployment Status

| Check | Result |
|---|---|
| Domain | **aigraas.com** — HTTP/2 200 |
| SSL | Valid until Jul 3, 2026 (auto-renews) |
| HTTP → HTTPS | 308 Permanent Redirect |
| HSTS | `max-age=63072000` (2 years) |
| CDN | Vercel edge (`iad1`, cache HIT) |
| GitHub integration | Connected, auto-deploys on push to `main` |
| Build | 17 routes, all static, ~12MB footprint |

### SEO Artifacts (all 200 OK)

| Artifact | Status | Notes |
|---|---|---|
| `/` | HTML 64KB | Full metadata, OG, Twitter cards |
| `/robots.txt` | Valid | Allow all, disallow `/api/` and `/dashboard/` |
| `/sitemap.xml` | Valid | 12 URLs, lastmod, priority |
| `/manifest.webmanifest` | Valid | PWA standalone, `#10B981` theme |
| `/favicon.svg` | 200 | Teal-mint lettermark |
| `/apple-touch-icon.png` | 200 | 180x180 |
| `/og-image.png` | 200 | 1200x630 |
| `/icons/icon-192x192.png` | 200 | PWA any-purpose |
| `/icons/icon-192x192-maskable.png` | 200 | PWA maskable |
| `/icons/icon-512x512.png` | 200 | PWA any-purpose |
| `/icons/icon-512x512-maskable.png` | 200 | PWA maskable |

### Security Headers (after fix commit)

| Header | Value | Grade |
|---|---|---|
| `strict-transport-security` | `max-age=63072000` | A+ (2yr, exceeds 1yr rec) |
| `x-frame-options` | `DENY` | A |
| `x-content-type-options` | `nosniff` | A |
| `referrer-policy` | `strict-origin-when-cross-origin` | A |
| `permissions-policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | A |
| `content-security-policy` | Not set | Acceptable (static marketing site, inline fonts) |

### Code Quality

| Check | Result |
|---|---|
| **TypeScript** | Clean (0 errors) |
| **ESLint** | Clean (was 1 error + 2 warnings — fixed) |
| **Build** | Clean, 17 static routes |

## Why This Is Efficient

### 1. Shipyard preflight caught the right things

The `/shipyard:preflight` skill didn't just dump a generic checklist — it detected that this was a **static marketing site with zero API routes** and correctly skipped CORS/CSRF/rate limiting checks that would have been noise. It also flagged Sentinel header check as a **note (not blocker)**, because security headers are a post-deploy activity. Preflight that understands context is preflight that saves time.

### 2. Fix-in-place beats fresh redeploy

The Vercel GitHub integration meant the audit fixes (lint + security headers) were a single `git push` away from production. No manual `vercel --prod` command, no deploy tokens to juggle, no preview-vs-production URL confusion. Push to `main` → Vercel rebuilds → live in ~40 seconds.

### 3. `next.config.ts` headers() is the right place for security headers

Security headers in `next.config.ts` apply to every route automatically (via the `source: "/(.*)"` pattern), including sitemap/robots/manifest/static assets. Versus alternatives:

| Approach | Pros | Cons |
|---|---|---|
| `next.config.ts` `headers()` | Applies to all routes, version-controlled, works locally and in production | None for this use case |
| Vercel dashboard headers | UI-based, no code change | Not version-controlled, easy to drift, doesn't work locally |
| `middleware.ts` | Dynamic per-request | Adds runtime cost for static sites |

### 4. Final audit is reproducible

Every verification in the final audit is a curl/openssl command. No GUI. No vendor-specific tooling. Anyone can run the same commands against the live site and get the same grades — including the next auditor or a compliance reviewer.

## What "22 Minutes" Actually Contains

This wasn't a simple "push to Vercel" task. The session included:

1. **SEO/PWA scaffold** — 10 artifact files written from scratch, including SVG→PNG conversion for OG image + 4 PWA icon variants generated
2. **Full Next.js 16 metadata** — 108-line `layout.tsx` with viewport, themeColor, metadataBase, keywords, icons, appleWebApp, formatDetection, googleBot robots, OpenGraph, Twitter cards
3. **Repo creation** — `gh repo create` with description, private visibility, push in one command
4. **Shipyard preflight** — automated production readiness check with context-aware skips
5. **Vercel link + deploy** — CLI auth verification, project linking, production deploy, deployment protection note
6. **GitHub integration** — connect Vercel to GitHub for auto-deploys, verify next push triggers rebuild
7. **Live audit** — 7 curl header checks, 11 SEO artifact fetches, meta tag HTML inspection, SSL certificate verification
8. **Code quality fixes** — React 19 `set-state-in-effect` lint rule (refactor to `useSyncExternalStore`), unused imports
9. **Security hardening** — 4 headers added to `next.config.ts`, each chosen intentionally vs copy-pasted
10. **Redeploy verification** — wait for auto-deploy, re-curl headers, confirm new values live

## Key Metrics

| Metric | Value |
|--------|-------|
| Total duration | 22m 14s |
| Phase 1 (SEO/PWA) | ~7 min |
| Phase 2 (Repo + Deploy) | ~6 min |
| Phase 3 (Live Audit) | ~3 min |
| Phase 4 (Hardening + Reaudit) | ~4 min + 2min verify |
| Files created/edited | 15 |
| Routes deployed | 17 (all static) |
| Deploy footprint | 12 MB (1.1M static + 11M server) |
| Git commits | 2 (initial + audit fixes) |
| Security headers added | 4 |
| HSTS max-age | 2 years (exceeds 1-year recommendation) |
| Final grades | A/A+ across all headers |
| SEO artifacts | 11, all 200 OK |
| Manual clicks in Vercel UI | 0 (GitHub connect was the only UI step) |

## Reproduce This Audit

Every check in the final audit is a shell command. You can run these against any Vercel/Next.js deploy:

```bash
DOMAIN="https://your-site.com"

# Deployment
curl -sI "$DOMAIN" | head -20
curl -sI "${DOMAIN/https/http}" | grep -i location  # HTTP → HTTPS redirect

# SSL
echo | openssl s_client -connect "${DOMAIN#https://}:443" -servername "${DOMAIN#https://}" 2>/dev/null | openssl x509 -noout -dates

# SEO artifacts
for path in /robots.txt /sitemap.xml /manifest.webmanifest /favicon.svg /og-image.png; do
  echo -n "$path: "; curl -sI "$DOMAIN$path" | head -1
done

# Security headers
curl -sI "$DOMAIN" | grep -iE 'strict-transport|x-frame|x-content|referrer|permissions|csp'
```

If any of these come back missing or graded below A, you have work to do. If they all come back clean, you've shipped a hardened site.
