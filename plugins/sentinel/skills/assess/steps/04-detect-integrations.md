# Step 4: Detect Integrations

Scan `package.json` dependencies (and `requirements.txt`, `go.mod`, etc.) for known third-party services. Each detected integration tells Sentinel which secret patterns and security docs are relevant for THIS project.

**Integration detection rules:**

| Dependency | Integration | Key patterns to watch |
|-----------|-------------|----------------------|
| `@stripe/stripe-node`, `stripe` | Stripe | `sk_live_`, `sk_test_`, `rk_live_`, `rk_test_` |
| `@supabase/supabase-js` | Supabase | `service_role` key, `anon` key (safe), JWTs |
| `twilio` | Twilio | `AC` + 32 hex (SID), auth token |
| `@sendgrid/mail`, `@sendgrid/client` | SendGrid | `SG.xxx.yyy` |
| `resend` | Resend | `re_` prefix |
| `@clerk/nextjs`, `@clerk/clerk-sdk-node` | Clerk | `sk_live_`, `pk_live_` (Clerk uses Stripe-like format) |
| `@auth0/nextjs-auth0`, `auth0` | Auth0 | client secret, management API token |
| `firebase`, `firebase-admin` | Firebase/GCP | `AIza` prefix, service account JSON |
| `@aws-sdk/*`, `aws-sdk` | AWS | `AKIA` prefix, secret access key |
| `@azure/*`, `azure-*` | Azure | `DefaultEndpointsProtocol=`, connection strings |
| `openai` | OpenAI | `sk-`, `sk-proj-`, `sk-svcacct-` |
| `@anthropic-ai/sdk` | Anthropic | `sk-ant-` |
| `postmark`, `postmark.js` | Postmark | server API token |
| `@sentry/node`, `@sentry/nextjs` | Sentry | DSN with secret portion |
| `nodemailer` | SMTP | username/password in transport config |
| `ioredis`, `redis` | Redis | connection URL with password |
| `pg`, `@prisma/client`, `drizzle-orm` | Database | connection strings |
| `@upstash/redis`, `@upstash/qstash` | Upstash | `UPSTASH_REDIS_REST_TOKEN` |
| `@vercel/kv`, `@vercel/blob` | Vercel | `VERCEL_` tokens |
| `mongoose`, `mongodb` | MongoDB | `mongodb://` or `mongodb+srv://` connection strings |

**For each detected integration:**
1. Record it in the config (Step 5)
2. The `/sentinel:scan` skill will load only the relevant secret patterns from `references/`
3. The `secret-guard.sh` hook catches all patterns universally (doesn't need per-project config — it checks everything)

## Create `.claude/security/` directory structure

```
.claude/security/
├── integrations.json          <- detected integrations + versions
├── generated/                 <- Context7 security docs for detected integrations
│   ├── stripe-security.md     <- Stripe-specific security patterns
│   ├── supabase-security.md   <- RLS, auth, service_role
│   └── ...                    <- one per detected integration
└── project/                   <- team-written security conventions
    ├── allowed-overrides.md   <- intentional pattern suppressions
    └── custom-patterns.md     <- project-specific secret patterns
```

## Write `integrations.json`

```json
{
  "detectedAt": "2026-03-27",
  "integrations": {
    "stripe": { "package": "@stripe/stripe-node", "version": "17.5.0", "keyPatterns": ["sk_live_", "sk_test_", "rk_live_", "rk_test_"] },
    "supabase": { "package": "@supabase/supabase-js", "version": "2.93.0", "keyPatterns": ["service_role", "anon_key"] },
    "openai": { "package": "openai", "version": "5.1.0", "keyPatterns": ["sk-", "sk-proj-"] },
    "sentry": { "package": "@sentry/nextjs", "version": "9.5.0", "keyPatterns": ["DSN"] },
    "resend": { "package": "resend", "version": "4.2.0", "keyPatterns": ["re_"] }
  }
}
```

Only include integrations that are actually detected — don't list Twilio if the project doesn't use Twilio.

## Context7 security docs

Context7 security docs for detected integrations follow the same pattern as Composure's framework docs:
- One library at a time (anti-fabrication)
- Freshness check (skip if < staleness threshold)
- Sequential query + write
- Query: `{integration} security best practices API key management vulnerabilities`

---

**Next:** Read `steps/05-config-and-report.md`
