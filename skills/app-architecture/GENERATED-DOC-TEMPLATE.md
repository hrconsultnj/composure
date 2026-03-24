# Generated Reference Doc Template

> **This file is a template for Context7 agents.** It defines the structure, frontmatter, and content expectations for every generated reference doc in this skill. Agents MUST follow this template exactly.

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

## Rules

1. **Only include what Context7 returns.** Do NOT invent patterns, guess APIs, or fill gaps from training data.
2. **If Context7 returns nothing for a section, skip it.** Don't write "No data available" — just omit the section.
3. **Code examples must come from Context7.** Copy them verbatim, then clean up formatting only.
4. **Aim for 200-500 lines.** Be thorough — include complete code examples, full config blocks, and real-world patterns. The curated reference docs in this skill range from 275-773 lines. Don't truncate useful content to be brief, but don't pad with filler either.
5. **Use the library's actual API.** Don't simplify or abstract — show the real imports, real function signatures, real config keys.
6. **Frontmatter is machine-readable.** Other tools parse `queried_at` and `context7_library_id` — don't alter the format.

## Context7 Query Strategy

Don't give up after one query. Follow this process:

1. **Resolve the library ID** — pick the highest benchmark score with "High" reputation
2. **First query**: broad — setup, key patterns, breaking changes
3. **Second query**: targeted — focus on the specific areas listed in your prompt (e.g., "oklch theming" for shadcn, "Environment API" for Vite)
4. **Third query** (if needed): fill gaps — if the first two queries missed anti-patterns or migration steps, query specifically for those
5. **If a version-specific ID exists** (e.g., `/vitejs/vite/v8.0.0`), prefer it over the generic ID
6. **If Context7 returns sparse results**, try a different library ID from the resolve results — sometimes the `/websites/` variant has better docs than the `/org/repo` variant
