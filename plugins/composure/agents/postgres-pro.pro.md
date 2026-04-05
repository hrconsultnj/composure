# Postgres Pro — Pro Overlay

> Loaded when `.composure/composure-pro.json` is present with valid license.

## Supabase-Specific PostgreSQL

- Use Supabase CLI for migrations: `supabase db push` (never `db reset`).
- RLS policies are the primary security boundary. Trust the database, don't reimplement in app code.
- `!inner()` pattern for multi-tenant queries is mandatory.
- Foundation triggers (`create_entity_feed`, `generate_entity_id_prefix`) must never be replaced in feature migrations.

## Performance with RLS

- RLS adds overhead — keep policies simple (single `auth.uid()` check preferred).
- Use `SECURITY DEFINER` functions sparingly and audit them for privilege escalation.
- Index the columns used in RLS policies.
