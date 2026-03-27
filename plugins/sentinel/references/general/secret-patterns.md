# Secret Detection Patterns

Patterns used by `secret-guard.sh` and `/sentinel:scan`. Each pattern includes the regex, example matches, and false positive exclusions.

## Cloud Provider Keys

### AWS Access Key
- **Regex:** `AKIA[0-9A-Z]{16}`
- **Example:** `AKIAIOSFODNN7EXAMPLE`
- **Risk:** Full AWS account access if combined with secret key
- **Fix:** Use `AWS_ACCESS_KEY_ID` env var or IAM roles

### AWS Secret Access Key
- **Regex:** `aws_secret_access_key\s*=`
- **Example:** `aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **Risk:** Combined with access key, gives full AWS API access
- **Fix:** Use `AWS_SECRET_ACCESS_KEY` env var, never commit

## API Keys

### GitHub Tokens
- **Regex:** `gh[pousr]_[A-Za-z0-9]{36}`
- **Prefixes:** `ghp_` (personal), `gho_` (OAuth), `ghu_` (user-to-server), `ghs_` (server-to-server), `ghr_` (refresh)
- **Risk:** Repository access, code modification, CI trigger
- **Fix:** Use `GITHUB_TOKEN` env var

### OpenAI / Anthropic Keys
- **Regex:** `sk-[A-Za-z0-9]{20,}` or `sk-ant-`
- **Risk:** API billing, data access, model abuse
- **Fix:** Use `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env var

### Stripe Keys
- **Regex:** `sk_live_`, `sk_test_`, `rk_live_`, `rk_test_`
- **Risk:** Payment processing, customer data, refund capability
- **Fix:** Use `STRIPE_SECRET_KEY` env var. Note: `pk_live_` (publishable key) is safe for client-side

## Credentials

### Private Keys (SSH, RSA, EC, DSA, PGP, PKCS)
- **Regex:** `-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED |CERTIFICATE|PKCS7|PRIVATE )?PRIVATE KEY-----`
- **Covers:**
  - `-----BEGIN RSA PRIVATE KEY-----` (PKCS#1 RSA)
  - `-----BEGIN PRIVATE KEY-----` (PKCS#8 generic)
  - `-----BEGIN EC PRIVATE KEY-----` (Elliptic Curve)
  - `-----BEGIN DSA PRIVATE KEY-----` (DSA, legacy)
  - `-----BEGIN OPENSSH PRIVATE KEY-----` (Ed25519, ECDSA via ssh-keygen)
  - `-----BEGIN PGP PRIVATE KEY BLOCK-----` (GPG/PGP signing keys)
  - `-----BEGIN ENCRYPTED PRIVATE KEY-----` (password-protected, still shouldn't be in code)
- **Also detects:** `id_rsa`, `id_ed25519`, `id_ecdsa` filenames being read/embedded
- **Risk:** Server impersonation, SSH access, TLS decryption, code signing, GPG identity
- **Fix:** Store in secrets manager (Vault, AWS Secrets Manager), SSH agent, or `.env.local`. Never commit to git — add to `.gitignore`

### Database Connection Strings
- **Regex:** `(postgres|mysql|mongodb|redis)://[^:]+:[^@]+@`
- **Example:** `postgres://admin:password123@db.example.com:5432/mydb`
- **Risk:** Direct database access, data exfiltration
- **Fix:** Use `DATABASE_URL` env var

### JWT Tokens
- **Regex:** `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.`
- **Risk:** Session hijacking, identity impersonation
- **Fix:** Never hardcode tokens. Generate at runtime.
- **Note:** This catches Supabase `service_role` keys (they're JWTs)

## Encryption & Signing Keys

### AES / HMAC / Signing Secrets
- **Regex:** `(aes|hmac|signing|encryption)[_-]?(key|secret)\s*[:=]\s*["'][A-Za-z0-9+/=]{32,}["']`
- **Also catches:** Hex-encoded keys: `[0-9a-fA-F]{64}` assigned to key/secret variables
- **Risk:** Data decryption, token forgery, signature bypass
- **Fix:** Use KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault) or env vars. Never hardcode symmetric keys.

### KMS / Key Vault References with Inline Keys
- **Detection:** Variables named `*_kms_*`, `*_key_id*`, `*_master_key*` assigned string literals instead of env references
- **Risk:** KMS key IDs can enable decryption if combined with IAM access
- **Fix:** Always reference via env: `process.env.KMS_KEY_ID`

## Cloud Provider Credentials

### Google Cloud / Firebase
- **Regex:** `AIza[0-9A-Za-z_-]{35}` (API key)
- **Also:** `"type"\s*:\s*"service_account"` (service account JSON embedded in code)
- **Risk:** GCP resource access, Firebase database read/write, billing abuse
- **Fix:** Use `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to JSON file (not embedded)

### Azure
- **Regex:** `DefaultEndpointsProtocol=https;AccountName=.*AccountKey=`
- **Also:** `(?i)(azure|microsoft)[_-]?(secret|key|token|connection)\s*[:=]\s*["'][^"']{20,}["']`
- **Risk:** Storage, database, and service access
- **Fix:** Use Azure Key Vault or managed identities

### Firebase / GCP Service Account JSON
- **Detection:** JSON object with `"type": "service_account"` and `"private_key": "-----BEGIN`
- **Risk:** Full GCP project access
- **Fix:** Never embed service account JSON. Use `GOOGLE_APPLICATION_CREDENTIALS` file path.

## CI/CD Tokens

### Vercel
- **Regex:** `(?i)vercel[_-]?(token|api[_-]?key)\s*[:=]\s*["'][A-Za-z0-9]{24,}["']`
- **Risk:** Deploy access, environment variable exposure
- **Fix:** Use `VERCEL_TOKEN` env var in CI

### GitLab CI
- **Regex:** `glpat-[A-Za-z0-9_-]{20,}`
- **Risk:** Repository access, CI pipeline manipulation
- **Fix:** Use CI/CD variables, not hardcoded tokens

### CircleCI
- **Regex:** `circle[_-]?token\s*[:=]\s*["'][A-Za-z0-9]{40}["']`
- **Risk:** Pipeline access
- **Fix:** Use CircleCI contexts or environment variables

### Netlify
- **Regex:** `(?i)netlify[_-]?(token|auth)\s*[:=]\s*["'][A-Za-z0-9_-]{40,}["']`
- **Risk:** Deploy and site configuration access

## Messaging & Email Services

### Twilio
- **Regex:** `AC[0-9a-fA-F]{32}` (Account SID) paired with auth token
- **Also:** `(?i)twilio[_-]?(auth|token|secret)\s*[:=]\s*["'][0-9a-f]{32}["']`
- **Risk:** SMS/voice abuse, billing
- **Fix:** Use `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` env vars

### SendGrid
- **Regex:** `SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}`
- **Risk:** Email sending abuse, phishing from your domain
- **Fix:** Use `SENDGRID_API_KEY` env var

### Resend
- **Regex:** `re_[A-Za-z0-9]{20,}`
- **Risk:** Email sending from your domain
- **Fix:** Use `RESEND_API_KEY` env var

## OAuth & Auth Provider Secrets

### Google OAuth Client Secret
- **Regex:** `GOCSPX-[A-Za-z0-9_-]{28}`
- **Risk:** OAuth flow hijacking, user impersonation
- **Fix:** Store in server-only env vars, never expose to client

### Auth0 / Clerk / Kinde
- **Regex:** `(?i)(auth0|clerk|kinde)[_-]?(secret|api[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']`
- **Risk:** Auth bypass, user data access
- **Fix:** Server-side only, from env vars

## Monitoring & Observability

### Sentry DSN (with secret)
- **Regex:** `https://[a-f0-9]{32}@[a-z0-9]+\.ingest\.sentry\.io/[0-9]+`
- **Note:** Public Sentry DSNs (without secret key) are intentionally client-safe. Only flag DSNs containing the secret portion.
- **Risk:** Event injection, data exfiltration from error reports

### Datadog / New Relic
- **Regex:** `(?i)(datadog|dd|newrelic|nr)[_-]?(api[_-]?key|license[_-]?key)\s*[:=]\s*["'][A-Za-z0-9]{20,}["']`
- **Risk:** Metrics/log injection, observability data access

## Package Registry Tokens

### npm / GitHub Package Registry
- **Regex:** `//registry\.npmjs\.org/:_authToken=` or `npm_[A-Za-z0-9]{36}`
- **Detection:** `.npmrc` contents embedded in source code
- **Risk:** Publish access to npm packages, supply chain attack
- **Fix:** Use `NPM_TOKEN` env var in CI, never commit `.npmrc` with tokens

### PyPI
- **Regex:** `pypi-[A-Za-z0-9_-]{100,}`
- **Risk:** Python package publishing access

## Platform-Specific

### Supabase Service Role Key
- **Detection:** Content contains `service_role` AND does NOT reference `process.env`, `Deno.env`, `import.meta.env`, `os.environ`, or `getenv`
- **Risk:** Bypasses ALL Row Level Security policies. Full database access.
- **Fix:** Only use on server-side (Edge Functions, API routes). Always load from env: `process.env.SUPABASE_SERVICE_ROLE_KEY`
- **Safe:** `SUPABASE_ANON_KEY` is designed for client-side use (RLS applies)

## Generic Secrets

### Secret Assignment Pattern
- **Regex:** `(password|secret|token|api_key|apikey|auth_token)\s*[:=]\s*["'][^"']{8,}["']`
- **Exclusions:** Comment lines (`//`, `#`, `*`, `/*`) are stripped before matching
- **Risk:** Varies — any hardcoded credential
- **Fix:** Move to `.env.local` and reference via `process.env.*`

## False Positive Exclusions

These are intentionally NOT flagged:
- `.env` files (they hold secrets by design — that's where they should be)
- `.env.example` files (placeholder values, not real secrets)
- Test files (`*.test.*`, `*.spec.*`) — may use fake tokens
- Comment lines — documentation about patterns, not actual secrets
- `pk_live_` / `pk_test_` — Stripe publishable keys are safe for client-side
