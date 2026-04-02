# Security Doc Template

Template for Context7-generated security reference docs. Used by `/sentinel:assess` when generating `.claude/security/generated/` docs for detected integrations.

## Frontmatter (required)

```yaml
---
title: "{Integration} Security Patterns"
context7_library_id: "/org/repo"
library_version: "1.2.3"
generated_at: "2026-03-27"
staleness_threshold_days: 30
category: "security"
integration: "{integration_name}"
---
```

**Rules:**
- `context7_library_id` MUST be the exact ID from `resolve-library-id`. NEVER use "manual", "n/a", or placeholders.
- `generated_at` is ISO date — used by freshness check to determine if re-query is needed.
- `staleness_threshold_days` comes from `.claude/sentinel.json` based on language.

## Document Structure

```markdown
# {Integration} Security Patterns

> Generated from Context7 on {date}. Do NOT edit — will be overwritten on next refresh.

## Authentication & Key Management
- How to properly authenticate with this service
- Which keys are safe for client-side, which are server-only
- Environment variable naming conventions
- Key rotation procedures

## Common Vulnerabilities
- Known CVEs affecting this integration (with version ranges and fixes)
- Common misconfiguration patterns
- OWASP categories this integration is susceptible to

## Secure Configuration
- Production vs development settings
- CORS / CSP implications
- Rate limiting requirements
- Logging considerations (what NOT to log)

## Code Patterns

### Insecure (do NOT write)
```{lang}
// BAD: explain why
{insecure code example from Context7}
```

### Secure (use this)
```{lang}
// GOOD: explain fix
{secure code example from Context7}
```

## Integration-Specific Checks
- What `/sentinel:scan` should look for in projects using this integration
- Semgrep rules that apply (if any)
- Hook patterns that catch misuse

## References
- Official security documentation links
- Relevant CVE numbers
- OWASP category mappings
```

## Rules (same as Composure's template)

1. MUST source ALL content from Context7 `query-docs` results. NEVER use training data.
2. MUST include a valid `context7_library_id` in frontmatter.
3. MUST NOT fabricate. If Context7 returns nothing after 3 attempts, skip the integration.
4. Aim for 150-400 lines — be thorough with complete code examples from Context7.
5. Process one integration at a time. Query Context7 → validate → write → next.
6. If a known CVE exists for the integration, include version ranges and fix versions.
7. Always show BAD/GOOD code pairs — insecure pattern then the secure alternative.
