# Document Fragments

Shared content blocks used by `/composure:doc-compose` to hydrate templates into final documents.

## Fragment Format

Each fragment is a markdown file with optional YAML frontmatter:

```markdown
---
name: fragment-name
description: One-line description of what this fragment contains
tier: all
---

Your content here.
```

### Frontmatter Fields

| Field | Required | Values | Default |
|---|---|---|---|
| `name` | Yes | kebab-case identifier | — |
| `description` | Yes | One-line summary | — |
| `tier` | No | `all`, `free`, `pro` | `all` |

### Tier Values

- `all` — included in every rendering context
- `free` — included when `--tier free` (or no tier specified)
- `pro` — included only when `--tier pro` or `--tier enterprise`

## Naming Convention

Use kebab-case, descriptive names: `install-quick.md`, `plugin-table.md`, `what-you-get.md`.

## Import Syntax

Reference fragments from templates using:

```
{{import docs/fragments/install-quick.md}}
```

Paths are relative to the repository root.

## Conditional Syntax

For audience-specific content in templates:

```
{{if tier == "pro"}}
This content only appears in Pro-tier renders.
{{endif}}
```

Supported operators: `==`, `!=`. Conditionals can be nested.

## Nesting

Fragments can contain `{{import}}` directives (resolved recursively, max depth: 5).
