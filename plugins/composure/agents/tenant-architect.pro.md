# Tenant Architect — Pro Overlay

> Loaded when `.composure/composure-pro.json` is present with valid license.

## Composure Pro Multi-Tenant Patterns

- Use `feed` field convention: every tenant-scoped table has `feed` with `account_id` for RLS.
- `!inner()` method is MANDATORY for all tenant-scoped queries. Without it, RLS is bypassed.
- Entity Registry: all entity tables feed into `entity_registry` via shared triggers.
- ID Prefix System: 3-letter uppercase prefix per entity type. Check `data-patterns/id-prefixes.json`.
- NEVER CREATE OR REPLACE shared trigger functions in feature migrations.

## Tenant Provisioning

- New tenant setup uses the foundation migration's triggers automatically.
- Extend `entity_registry` for new entity types — don't duplicate the trigger.
- Type generation: `supabase gen types typescript 2>/dev/null` after schema changes.
