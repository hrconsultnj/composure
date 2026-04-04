# Blueprint: Auth Token Refresh Fix

**Classification**: bug-fix
**Date**: 2026-04-03
**Stack**: Next.js 16 + Supabase Auth + OAuth 2.1 PKCE

---

## Context

The CLI auth flow mints a Composure-signed authorization code containing the user's Supabase session tokens. The `refresh_token` embedded in the code comes from `supabase.auth.getSession()` on the server, which returns a truncated/session-bound token (12 chars: `2o3aquc3wnqt`) instead of a full Supabase refresh JWT (~100+ chars). This makes `composure-token.mjs refresh` fail silently — it sends the short token to Supabase, gets a 400 back, and returns null.

**Root cause**: `authorize/route.ts` line 105 uses `session.refresh_token` from server-side `getSession()`, which doesn't return the full refresh token in server component context.

---

## Fix Options

### Option A: Use `getUser()` + generate a fresh session (Recommended)

Instead of embedding the existing session's refresh token, call `supabase.auth.admin.generateLink()` or use the service role client to create a fresh session for the user. This gives us a proper refresh token.

### Option B: Pass refresh token from the client side

The client-side Supabase client (in the browser) has the full refresh token. Pass it through the OAuth flow:
1. Login form gets the full session (client-side `getSession()` returns the real refresh token)
2. Pass it as a parameter to the authorize endpoint
3. Authorize endpoint embeds it in the signed code

### Option C: Increase JWT TTL and skip refresh entirely

Set Supabase JWT expiry to 30 days. Users re-authenticate monthly. The refresh mechanism becomes a nice-to-have, not a requirement.

**Recommendation**: Option C for immediate relief (Supabase dashboard, 2 minutes), then Option B for proper fix (code change).

---

## Files to Touch

| # | File | Action | Why |
|---|------|--------|-----|
| 1 | `composure-web: src/app/api/oauth/authorize/route.ts` | Edit | Get proper refresh token |
| 2 | `claude-plugins: plugins/composure/bin/composure-token.mjs` | Edit | Better error handling on refresh failure |
| 3 | Supabase Dashboard | Config | Increase JWT TTL to 7-30 days |

---

## Implementation Spec

### 1. Supabase Dashboard (immediate)

- Authentication → Settings → JWT Expiry → change `3600` to `604800` (7 days) or `2592000` (30 days)
- This is the fastest fix and eliminates most refresh needs

### 2. `authorize/route.ts` (Option B fix)

The browser has the real refresh token. The confirm route already handles the redirect back to authorize. We can pass the refresh token via a secure cookie or by having the authorize endpoint read it from the Supabase server client's cookie store.

```typescript
// Instead of getSession() which returns truncated refresh_token:
const { data: sessionData } = await supabase.auth.getSession();

// Use the cookie-based session which has the full tokens:
// The Supabase SSR client reads refresh_token from the cookie
const session = sessionData?.session;
```

Actually — the issue might be that the server-side Supabase client is configured to NOT return refresh tokens. Check the `createClient()` configuration in `lib/supabase/server.ts`.

### 3. `composure-token.mjs` (better error handling)

```javascript
// In refreshToken():
if (!response.ok) {
  const error = await response.json().catch(() => ({}));
  console.error(`Refresh failed (${response.status}): ${error.error ?? 'unknown'}`);
  return null;  // was already null, but now logs the reason
}
```

And in the validate CLI:
```javascript
if (isExpired(creds)) {
  // Try refresh before reporting expired
  const refreshed = await refreshToken(creds);
  if (refreshed) {
    console.log(`valid:${refreshed.plan ?? "free"}:${refreshed.email ?? "unknown"}`);
    process.exit(0);
  }
  console.log("expired");
  process.exit(2);
}
```

---

## Verification

1. After JWT TTL change: login → wait 1+ hours → `composure-token validate` → should still be valid
2. After refresh fix: login → manually expire token → `composure-token refresh` → should get new token → `composure-fetch skill composure blueprint 01-classify` → should return content

---

## Checklist

- [ ] Change Supabase JWT TTL to 7+ days (dashboard)
- [ ] Debug `lib/supabase/server.ts` — check if refresh token is available in cookie-based session
- [ ] Fix authorize/route.ts to embed full refresh token
- [ ] Add error logging to composure-token.mjs refresh
- [ ] Add auto-refresh to validate command
- [ ] Test: login → expire → refresh → fetch works
