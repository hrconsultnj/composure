# Generated Reference Doc Template

> **This file is a template for Context7 agents.** It defines the structure, frontmatter, and content expectations for every generated reference doc in this skill. Agents MUST follow this template exactly.

## Filename Convention (required)

Generated docs use numbered prefixes: `{NN}-{descriptive-name}.md`

The number is the **priority** — lower numbers are more foundational and get loaded first. Core language and framework docs get the lowest numbers, supplementary libraries get higher numbers. Within the same priority level, order alphabetically.

```
frontend/generated/01-typescript-5.9.md
frontend/generated/02-react-19.md
frontend/generated/03-tailwind-4.md
frontend/generated/04-shadcn-v4.md
frontend/generated/05-tanstack-query-5.90.md
fullstack/nextjs/generated/01-nextjs-16.md
mobile/expo/generated/01-expo-sdk55.md
mobile/expo/generated/02-react-native-0.79.md
sdks/generated/01-ai-sdk-v6.md
sdks/generated/02-zod-v4.md
```

## Frontmatter (required)

```markdown
---
name: {Library} {Version} Patterns
source: context7
queried_at: {YYYY-MM-DD}
library_version: {version}
context7_library_id: {/org/project or /org/project/version}
---
```

## Document Structure

Every generated doc MUST follow this structure in order:

### 1. Title

```markdown
# {Library Name} {Major Version}
```

### 2. Setup (required)

How to install and configure the library. Include the minimum viable config.

```markdown
## Setup

\`\`\`bash
# Installation command
\`\`\`

\`\`\`typescript
// Minimum config file
\`\`\`
```

### 3. Key Patterns (required)

The 3-5 most important patterns from Context7. Each pattern gets a heading, a short explanation, and a code example.

```markdown
## Key Patterns

### Pattern Name

Brief explanation of when and why to use this pattern.

\`\`\`typescript
// Code example from Context7
\`\`\`
```

### 4. Anti-Patterns (required)

Common mistakes. Use ❌ / ✅ format.

```markdown
## Anti-Patterns

- ❌ **Don't do this** — explanation
  ✅ **Do this instead** — explanation

- ❌ **Another mistake** — why it's wrong
  ✅ **Correct approach** — code or explanation
```

### 5. Migration (if applicable)

Only include if the library has breaking changes from the previous major version.

```markdown
## Migration from {Previous Version}

| Before | After |
|--------|-------|
| old pattern | new pattern |
```

### 6. What Stays the Same (if applicable)

List things that did NOT change — prevents Claude from suggesting outdated migration steps for things that are fine.

```markdown
## What Stays the Same

- Feature X — unchanged from v{prev}
- API Y — same signature
```

## Rules (MUST — non-negotiable)

1. **MUST source ALL content from Context7.** Do NOT invent patterns, guess APIs, or fill gaps from training data. If you did not get it from a `query-docs` call, it does not go in the document.
2. **MUST have a valid `context7_library_id` in frontmatter.** The value MUST be the exact ID returned by `resolve-library-id` (e.g., `/vitejs/vite/v8.0.0`). NEVER use `manual`, `n/a`, `training-data`, or any placeholder. If you could not resolve the library, do NOT produce a document — return NO_DATA instead.
3. **MUST NOT fabricate.** If Context7 returns nothing useful after 3 query attempts, return NO_DATA. An empty result is correct. A fabricated document is a defect — it will be treated as a bug, not a fallback.
4. **If Context7 returns nothing for a section, skip it.** Don't write filler. Omit the section entirely.
5. **Code examples MUST come from Context7.** Copy them verbatim, then clean up formatting only.
6. **Aim for 200-500 lines.** Be thorough with what Context7 provides. Don't truncate useful content, but don't pad with filler either.
7. **Use the library's actual API.** Real imports, real function signatures, real config keys.
8. **Frontmatter is machine-readable.** Other tools parse `queried_at` and `context7_library_id` to validate provenance. Invalid frontmatter = invalid document.

## Context7 Query Strategy

Don't give up after one query. Follow this process:

1. **Resolve the library ID** — pick the highest benchmark score with "High" reputation
2. **First query**: broad — setup, key patterns, breaking changes
3. **Second query**: targeted — focus on the specific areas listed in your prompt (e.g., "oklch theming" for shadcn, "Environment API" for Vite)
4. **Third query** (if needed): fill gaps — if the first two queries missed anti-patterns or migration steps, query specifically for those
5. **If a version-specific ID exists** (e.g., `/vitejs/vite/v8.0.0`), prefer it over the generic ID
6. **If Context7 returns sparse results**, try a different library ID from the resolve results — sometimes the `/websites/` variant has better docs than the `/org/repo` variant
