# Fullstack Developer — Pro Overlay

> Loaded when `.composure/composure-pro.json` is present with valid license.

## Supabase Multi-Tenant Patterns

- Every user-data query MUST use `!inner()` for tenant isolation.
- Use `feed` field conventions: `feed.account_id` for tenant scoping.
- Run `supabase gen types typescript` after every schema change. Suppress CLI noise with `2>/dev/null`.
- Use `supabase db push` for migrations. NEVER `supabase db reset`.
- Domain types in `src/types/`; generated types at `src/lib/supabase/database.types.ts`.

## ID Prefix System

- Use 3-letter uppercase prefix + timestamp suffix for entity IDs.
- Check `data-patterns/id-prefixes.json` before creating new prefixes.
- Use `generate_id_prefix` database trigger — never generate IDs manually.

## Entity Registry

- New entity tables must feed into `entity_registry` via `create_entity_feed()` trigger.
- NEVER replace shared triggers in feature migrations.
