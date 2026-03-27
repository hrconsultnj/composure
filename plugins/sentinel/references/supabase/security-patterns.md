# Supabase Security Patterns

Patterns used by `/sentinel:scan`, `insecure-pattern-guard.sh`, and Supabase-specific hooks. Covers RLS, auth, storage, Edge Functions, and common misconfiguration.

## Service Role Key Exposure

### service_role Key in Client Code
- **Pattern:** `SUPABASE_SERVICE_ROLE_KEY` or `service_role` JWT referenced in client-side code (React components, browser JS, mobile app)
- **Detection:** File contains `service_role` AND is in a client-side path (`/app/`, `/components/`, `/pages/`, `/src/`) AND does NOT use `process.env`, `Deno.env`, `import.meta.env`, `os.environ`
- **Risk:** Bypasses ALL Row Level Security policies. Full read/write/delete on every table. This is the single most critical Supabase vulnerability.
- **Fix:** Only use `service_role` key in:
  - Supabase Edge Functions (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`)
  - Next.js API routes / Server Actions (`process.env.SUPABASE_SERVICE_ROLE_KEY`)
  - Backend servers (never bundled into client)
- **Note:** The `anon` key is safe for client-side use. RLS policies apply to all `anon` requests.

### Hardcoded Keys
- **Pattern:** `createClient('https://xxx.supabase.co', 'eyJ...')` with inline JWT
- **Risk:** Key rotation impossible, exposed in source control and client bundles
- **Fix:** Always load from environment variables. Use `createBrowserClient()` from `@supabase/ssr` for client-side.

## Row Level Security (RLS)

### Missing RLS Policies
- **Pattern:** Table created without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or with RLS enabled but zero policies
- **Risk:** RLS enabled with no policies = ALL access denied (safe but broken). RLS disabled = public access to all rows.
- **Fix:** Every table must have RLS enabled AND at least one policy per operation (SELECT, INSERT, UPDATE, DELETE) that the app needs
- **Critical:** In Supabase, RLS is OFF by default on new tables. Always enable it immediately.

### Overly Permissive Policies
- **Pattern:** `CREATE POLICY ... USING (true)` or `WITH CHECK (true)`
- **Risk:** Equivalent to no RLS — all authenticated users can access all rows
- **Fix:** Policies should reference `auth.uid()` or a role check:
  ```sql
  CREATE POLICY "Users can read own data"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);
  ```

### RLS on Junction/Lookup Tables
- **Pattern:** Junction tables (e.g., `user_roles`, `team_members`) without RLS
- **Risk:** Data leakage through relationships even if parent tables are protected
- **Fix:** Apply RLS to every table, including junction tables. Policy can reference the parent: `USING (auth.uid() IN (SELECT user_id FROM team_members WHERE team_id = teams.id))`

## Authentication

### getSession() vs getUser()
- **Pattern:** `supabase.auth.getSession()` used for server-side auth verification
- **Example:** `const { data: { session } } = await supabase.auth.getSession()`
- **Risk:** `getSession()` reads from the local JWT without server verification. The JWT can be spoofed or expired.
- **Fix:** Use `supabase.auth.getUser()` for any server-side auth check. It validates the token against Supabase Auth servers.
  ```typescript
  // WRONG — client-side JWT, not verified
  const { data: { session } } = await supabase.auth.getSession()

  // RIGHT — server-verified
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  ```
- **Note:** `getSession()` is fine for client-side UI rendering (show/hide elements). It is NOT safe for authorization decisions.

### Missing Auth in Server Actions
- **Pattern:** Next.js Server Action or API route that mutates data without calling `getUser()`
- **Risk:** Unauthenticated users can invoke the action directly
- **Fix:** Every Server Action that mutates data must start with auth verification:
  ```typescript
  'use server'
  export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Unauthorized')
    // ... proceed
  }
  ```

### Auth Callback Misconfiguration
- **Pattern:** Missing or incorrect `redirectTo` in OAuth/magic link flows
- **Risk:** Open redirect — attacker can redirect post-auth to a malicious site
- **Fix:** Validate `redirectTo` against an allowlist. Configure `SITE_URL` and `REDIRECT_URLS` in Supabase dashboard.

## RPC / Database Functions

### Functions Without Security Context
- **Pattern:** `supabase.rpc('function_name')` calling a function without `SECURITY DEFINER` or `SECURITY INVOKER` specified
- **Risk:** Default is `SECURITY INVOKER` — runs with the caller's permissions, which is usually correct. But if the function queries tables the caller shouldn't access directly, it needs `SECURITY DEFINER`.
- **Fix:** Explicitly set security context:
  ```sql
  CREATE FUNCTION get_team_stats(team_id uuid)
  RETURNS json
  SECURITY DEFINER  -- runs as function owner, bypasses caller's RLS
  SET search_path = public  -- prevent search_path hijacking
  AS $$ ... $$;
  ```
- **Critical:** `SECURITY DEFINER` functions MUST set `search_path` to prevent privilege escalation.

### Missing Input Validation in Functions
- **Pattern:** PL/pgSQL function uses parameters directly in dynamic SQL
- **Risk:** SQL injection inside the database function itself
- **Fix:** Use `EXECUTE ... USING` for dynamic queries, or use `quote_ident()` / `quote_literal()`

## Storage

### Bucket Policies Separate from RLS
- **Pattern:** Assumption that table RLS protects file access
- **Risk:** Storage bucket policies are completely independent from table RLS. A locked-down `profiles` table does not protect files in the `avatars` bucket.
- **Fix:** Configure storage policies per bucket in the Supabase dashboard or via SQL:
  ```sql
  CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  ```

### Public Buckets
- **Pattern:** Bucket created with `public: true`
- **Risk:** All files accessible without authentication via direct URL
- **Fix:** Only make buckets public if the content is genuinely public (marketing assets). User uploads should always be in private buckets with signed URLs.

## Realtime

### Subscribe Filters Are Not Security
- **Pattern:** `.on('postgres_changes', { filter: 'user_id=eq.' + userId })` treated as access control
- **Risk:** Realtime filters are client-side convenience, not security. Any client can subscribe without filters.
- **Fix:** RLS policies are the ONLY security boundary for Realtime. If RLS allows a user to SELECT a row, they can receive Realtime events for it. If RLS denies it, the event is filtered server-side.

## Edge Functions

### Hardcoded Secrets
- **Pattern:** `const key = 'sk_live_...'` in Edge Function code
- **Risk:** Secrets exposed in deployment logs, version control, and function source
- **Fix:** Use `Deno.env.get('SECRET_NAME')`. Set secrets via `supabase secrets set SECRET_NAME=value`.

### Missing CORS Configuration
- **Pattern:** Edge Function returns responses without CORS headers when called from browser
- **Risk:** Browsers block cross-origin requests. Not a security risk per se, but missing CORS often leads to developers adding `Access-Control-Allow-Origin: *` as a blanket fix.
- **Fix:** Return specific origin: `'Access-Control-Allow-Origin': 'https://your-app.com'`

## False Positive Exclusions

These are intentionally NOT flagged:
- `SUPABASE_ANON_KEY` in client-side code (safe by design, RLS applies)
- `getSession()` in client components for UI rendering purposes
- `service_role` in server-only files (`/api/`, `/edge-functions/`, `supabase/functions/`)
- `USING (true)` on genuinely public tables (e.g., `public_posts`, `product_catalog`)
- Storage buckets marked public that contain only static/marketing assets
