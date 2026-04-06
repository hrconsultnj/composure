# Database Administrator — Pro Overlay

> Loaded when `.composure/composure-pro.json` is present with valid license.

## Multi-Tenant Schema Discipline

- Every tenant-scoped table MUST have a `feed` field for RLS tenant isolation.
- RLS policies use `!inner()` pattern — never bypass.
- Use `supabase db push` for migrations. NEVER `supabase db reset`.
- Feature migrations MUST NOT CREATE OR REPLACE shared trigger functions (`create_entity_feed`, `generate_entity_id_prefix`). These live only in the foundation migration.

## ID Prefix System

- All entity tables use 3-letter uppercase prefix IDs via `generate_id_prefix` trigger.
- Check existing prefixes in `data-patterns/id-prefixes.json` before creating new ones.

## Type Generation

- Run `supabase gen types typescript 2>/dev/null` after every schema change.
- Generated types at `src/lib/supabase/database.types.ts`.
