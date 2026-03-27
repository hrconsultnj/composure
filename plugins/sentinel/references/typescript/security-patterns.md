# TypeScript / React / Next.js Security Patterns

Security patterns and anti-patterns for TypeScript web applications. Each pattern includes detection guidance, code examples, and fix. Used by `/sentinel:scan` when TypeScript or JavaScript is detected.

**Hook coverage:** `[HOOK]` = caught in real-time by `insecure-pattern-guard.sh`. `[SCAN-ONLY]` = requires `/sentinel:scan`.

---

## XSS Prevention

### dangerouslySetInnerHTML `[HOOK]`

```typescript
// BAD: raw user content injected as HTML
function Comment({ body }: { body: string }) {
  return <div dangerouslySetInnerHTML={{ __html: body }} />;
}

// GOOD: sanitize with DOMPurify
import DOMPurify from 'dompurify';
function Comment({ body }: { body: string }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }} />;
}

// BEST: avoid entirely — React auto-escapes strings
function Comment({ body }: { body: string }) {
  return <div>{body}</div>;
}
```

**Detection:** `dangerouslySetInnerHTML` without `DOMPurify`, `sanitize`, or `purify` nearby.

### innerHTML Assignment `[HOOK]`

```typescript
// BAD: XSS via innerHTML
element.innerHTML = userInput;

// GOOD: use textContent for plain text
element.textContent = userInput;

// GOOD: DOMPurify if HTML is required
element.innerHTML = DOMPurify.sanitize(userInput);
```

### document.write() `[HOOK]`

```typescript
// BAD: XSS vector, destroys existing DOM
document.write('<h1>' + userInput + '</h1>');

// GOOD: use DOM APIs
const h = document.createElement('h1');
h.textContent = userInput;
document.body.appendChild(h);
```

### eval() and new Function() `[HOOK]`

Code injection vectors. No legitimate use case in application code.

```typescript
// BAD: arbitrary code execution
eval(userInput);
const fn = new Function('return ' + userInput);

// GOOD: parse data safely
const data = JSON.parse(userInput);

// GOOD: lookup table instead of dynamic execution
const handlers: Record<string, () => void> = { action_a: handleA, action_b: handleB };
handlers[userInput]?.();
```

### href with User Input `[SCAN-ONLY]`

React does NOT sanitize `href` for `javascript:` protocol.

```typescript
// BAD: XSS via javascript: protocol
<a href={userProvidedUrl}>Click here</a>

// GOOD: validate protocol
function SafeLink({ url, children }: { url: string; children: React.ReactNode }) {
  if (!/^https?:\/\//i.test(url)) return null;
  return <a href={url}>{children}</a>;
}
```

---

## React Server Component Security (React 19+)

### CVE-2025-55182 — Unauthenticated RCE (CVSS 10.0) `[SCAN-ONLY]`

**Affected:** react 19.0.0, 19.1.0-19.1.1, 19.2.0
**Fixed in:** react 19.0.1, 19.1.2, 19.2.1
**Vector:** Malicious payload in Server Function request body triggers arbitrary code execution without authentication. Full server compromise.

### DoS + Source Code Exposure CVE `[SCAN-ONLY]`

**Affected:** react 19.0.0-19.0.3, 19.1.0-19.1.4, 19.2.0-19.2.3
**Fixed in:** react 19.0.4, 19.1.5, 19.2.4
**Vector:** Crafted request causes denial of service and leaks server-side source code via error responses.

### Minimum Safe Versions

| Release Line | Minimum Safe | Fixes |
|-------------|-------------|-------|
| 19.0.x | 19.0.4 | RCE + DoS + source exposure |
| 19.1.x | 19.1.5 | RCE + DoS + source exposure |
| 19.2.x | 19.2.4 | RCE + DoS + source exposure |

**Detection:** Parse `react` version from `package.json`. If `>=19.0.0` and below the minimum safe version for its line, report as **Critical**.

```bash
# Quick version check
grep -E '"react":\s*"19\.[0-2]\.[0-5]"' package.json
```

### Server Actions Auth Pattern `[SCAN-ONLY]`

Server Actions are individually addressable POST endpoints. Page-level auth does NOT protect them — an attacker can call any Server Action directly.

```typescript
// BAD: auth only on the page, action is unprotected
// app/admin/actions.ts
'use server';
export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } }); // Anyone can call this
}

// GOOD: always re-verify auth inside every Server Action
'use server';
import { auth } from '@/lib/auth';

export async function deleteUser(userId: string) {
  const session = await auth();
  if (session?.user?.role !== 'admin') throw new Error('Unauthorized');
  await db.user.delete({ where: { id: userId } });
}
```

---

## Next.js Specific

### Cross-Origin Server Actions

Next.js 14.2+ requires explicit allowlist for cross-origin Server Action calls. Without it, only same-origin requests are accepted (built-in CSRF protection).

```typescript
// next.config.ts — never use wildcards, list each origin explicitly
const config: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['my-app.vercel.app', 'staging.my-app.com'],
    },
  },
};
```

### Content Security Policy `[SCAN-ONLY]`

```typescript
// middleware.ts (Next.js 14-15) or proxy.ts (Next.js 16+)
export function middleware(request: Request) {
  const nonce = crypto.randomUUID();
  const isProd = process.env.NODE_ENV === 'production';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'${isProd ? '' : " 'unsafe-eval'"}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self'${isProd ? '' : ' ws:'}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}
```

| Directive | Production | Development | Why |
|-----------|-----------|-------------|-----|
| `unsafe-eval` | Never | Acceptable | React Fast Refresh requires it |
| `unsafe-inline` | Avoid (use nonce) | Acceptable | HMR style injection |
| `frame-ancestors 'none'` | Always | Always | Clickjacking prevention |

### proxy.ts — Next.js 16+ `[SCAN-ONLY]`

Next.js 16 replaces `middleware.ts` with `proxy.ts`. Security implications:
- Auth checks in middleware must be migrated to the new API
- Header injection (CSP, HSTS) must be re-implemented
- Test all security headers after migration

---

## Deprecated and Insecure APIs

### crypto.createCipher() `[HOOK]`

Deprecated. Uses weak key derivation (MD5) and no IV.

```typescript
// BAD: deprecated, insecure
const cipher = crypto.createCipher('aes-256-cbc', password);

// GOOD: explicit IV, modern API
const key = crypto.scryptSync(password, salt, 32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
```

### postMessage with Wildcard Origin `[HOOK]`

```typescript
// BAD: any origin can receive sensitive data
window.parent.postMessage(sensitiveData, '*');

// GOOD: specify exact target origin
window.parent.postMessage(sensitiveData, 'https://trusted-app.com');
```

### document.location with User Input `[HOOK]`

```typescript
// BAD: open redirect
const redirect = new URLSearchParams(location.search).get('redirect');
document.location = redirect; // ?redirect=https://evil.com

// GOOD: validate against allowlist
const ALLOWED_PATHS = ['/dashboard', '/settings', '/profile'];
if (redirect && ALLOWED_PATHS.includes(redirect)) {
  document.location = redirect;
}

// GOOD: ensure same-origin only
const url = new URL(redirect, window.location.origin);
if (url.origin === window.location.origin) {
  document.location = url.href;
}
```

---

## Environment and Secrets

### Server vs Client Boundary `[SCAN-ONLY]`

Next.js exposes `NEXT_PUBLIC_` variables to the browser bundle. Everything else stays server-side.

```bash
# .env.local
DATABASE_URL=postgres://...              # Server only (never in bundle)
NEXT_PUBLIC_APP_URL=https://...          # Exposed to client (safe for public values)
NEXT_PUBLIC_STRIPE_SECRET=sk_live_...    # BAD: secret visible in browser source
STRIPE_SECRET_KEY=sk_live_...            # GOOD: server-only
```

**Detection:** Scan `.env*` files for `NEXT_PUBLIC_` variables containing secret-format patterns (`sk_`, `password`, `secret`, `token` with 20+ chars).

### server-only Module Guard

```typescript
// lib/secrets.ts — build error if Client Component imports this
import 'server-only';

export async function getSecretConfig() {
  return db.config.findFirst({ where: { key: 'api_secret' } });
}
```

Use `server-only` for any module touching secrets, database connections, or sensitive logic.

---

## Input Validation

### Zod for Server Action Inputs `[SCAN-ONLY]`

Never trust client input in Server Actions.

```typescript
// BAD: trusting form data shape and using unvalidated userId
'use server';
export async function updateProfile(formData: FormData) {
  const name = formData.get('name') as string;
  await db.user.update({ where: { id: formData.get('id') as string }, data: { name } });
}

// GOOD: validate with Zod, use session for identity
'use server';
import { z } from 'zod';

const Schema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const result = Schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });
  if (!result.success) return { error: result.error.flatten() };

  await db.user.update({
    where: { id: session.user.id }, // Identity from session, never from form
    data: result.data,
  });
}
```

### SQL Injection via Template Literals `[SCAN-ONLY]`

```typescript
// BAD: string interpolation in SQL
const users = await db.$queryRawUnsafe(`SELECT * FROM users WHERE name = '${name}'`);

// GOOD: parameterized query (Prisma tagged template — auto-parameterizes)
const users = await db.$queryRaw`SELECT * FROM users WHERE name = ${name}`;

// GOOD: parameterized query (pg driver)
const { rows } = await pool.query('SELECT * FROM users WHERE name = $1', [name]);
```

**Detection:** `$queryRawUnsafe`, `$executeRawUnsafe`, string concatenation or `${...}` inside `.query()`, `.execute()`, or `.raw()` calls.

---

## Dependency Security

### Package Manager Audit

| Manager | Command | Notes |
|---------|---------|-------|
| pnpm | `pnpm audit --json` | Strict isolation prevents phantom deps |
| npm | `npm audit --json` | Flat node_modules allows phantom deps |
| yarn | `yarn audit --json` | v1 format differs from v2+ |

### Phantom Dependencies (npm vs pnpm) `[SCAN-ONLY]`

npm's flat `node_modules` lets you import packages not in your `package.json` (hoisted transitive deps). Supply chain risk: the parent drops the dep, or a malicious package claims that name.

```typescript
// BAD (npm): works due to hoisting, but not in your package.json
import { something } from 'transitive-dep';

// GOOD: explicitly add every import to package.json
// pnpm enforces this automatically via strict node_modules
```

### CI Security Gate

```yaml
# .github/workflows/security.yml
- run: pnpm audit --audit-level=high    # Fails on high/critical CVEs
- run: pnpm dlx is-website-vulnerable   # Checks built output for known CVEs
```

---

## Summary Table

| Pattern | Severity | Hook | Scan | CWE |
|---------|----------|------|------|-----|
| `dangerouslySetInnerHTML` unsanitized | High | Yes | Yes | CWE-79 |
| `innerHTML =` assignment | High | Yes | Yes | CWE-79 |
| `document.write()` | High | Yes | Yes | CWE-79 |
| `eval()` / `new Function()` | Critical | Yes | Yes | CWE-94 |
| `crypto.createCipher()` | High | Yes | Yes | CWE-327 |
| `postMessage('*')` | Medium | Yes | Yes | CWE-345 |
| `document.location =` user input | Medium | Yes | Yes | CWE-601 |
| React 19 RCE (CVE-2025-55182) | Critical | No | Yes | CWE-502 |
| React 19 DoS + source leak | High | No | Yes | CWE-400 |
| Server Action without auth | High | No | Yes | CWE-862 |
| `NEXT_PUBLIC_` with secrets | Critical | No | Yes | CWE-200 |
| SQL template literal injection | Critical | No | Yes | CWE-89 |
| `javascript:` in href | High | No | Yes | CWE-79 |
| Phantom dependencies (npm) | Medium | No | Yes | CWE-1357 |
| Missing `server-only` guard | Medium | No | Yes | CWE-200 |
| Missing input validation | Medium | No | Yes | CWE-20 |
