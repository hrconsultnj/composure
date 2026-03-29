# Report Templates

Use the matching template based on the research type identified in Step 1.

## Quick Research Template (15-30 min)

```markdown
# Quick Research: [Topic]

## Recommendation
[Technology/Pattern] because [Reason]

## Alternatives
1. [Option] - [Trade-off]

## Examples
- [URL 1] - [Why it's relevant]
```

## Full Research Template (Design Intelligence Report)

```markdown
# Design Intelligence Report: [Feature/Component]

## Design Goal
[What we're trying to achieve]

## Research Summary
- **Competitor Analysis**: N competitors analyzed
- **Pattern Discovery**: N patterns identified
- **Technology Research**: N technologies evaluated
- **Industry Standards**: N key conventions found

## Recommended Approach

### Primary Recommendation
**Pattern**: [Specific pattern name]
**Technology**: [Specific tech stack]
**Rationale**: [Why this works best]
**Examples**: [2-3 real implementations with URLs]

### Technology Stack
framework: Next.js 15 (App Router)
ui_library: shadcn/ui
animations: Framer Motion (for page transitions)
3d_integration: Spline (for hero section 3D element)
styling: Tailwind CSS
performance: Next.js Image, Server Components

### Implementation Complexity
- **Effort**: Medium (3-5 days)
- **Learning Curve**: Low-Medium
- **Maintenance**: Low
- **Performance Impact**: Minimal (+50KB bundle)

## Alternative Approaches
[Options with trade-offs]

## Design Patterns Identified
[Patterns with examples and URLs]

## Implementation Roadmap
### Phase 1: Foundation
### Phase 2: Interactions
### Phase 3: Advanced Features

## Performance Considerations
- Bundle size impact
- Load time impact
- Mitigation strategies
- Lighthouse targets

## Accessibility Notes
- prefers-reduced-motion support
- Keyboard navigation
- WCAG 2.1 AA compliance
- Screen reader patterns

## References & Examples
[URLs to excellent implementations]

## Next Steps for design-forge
1. Review technology recommendations
2. Install required packages
3. Reference pattern examples
4. Start with Phase 1
5. Progressive enhancement
6. Test performance
7. Validate accessibility
```

## Technology Comparison Template (30-60 min)

```markdown
# Technology Comparison: [Technology A] vs [Technology B]

## Summary
[Winner and one-line rationale]

## Comparison Matrix

| Criteria | [Tech A] | [Tech B] |
|----------|----------|----------|
| Best For | ... | ... |
| Complexity | ... | ... |
| Performance | ... | ... |
| Bundle Size | ... | ... |
| React Support | ... | ... |
| Learning Curve | ... | ... |
| Community/Docs | ... | ... |

## Detailed Analysis

### [Technology A]
- Strengths
- Weaknesses
- Best use cases
- Real-world examples (URLs)

### [Technology B]
- Strengths
- Weaknesses
- Best use cases
- Real-world examples (URLs)

## Recommendation
[Which to use and why, based on project context]

## References
[URLs to benchmarks, docs, examples]
```
