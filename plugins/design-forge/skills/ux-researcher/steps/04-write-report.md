# Step 4: Write Report

**MANDATORY: Write the full report to a file. Never output full research reports into the conversation.**

## File Output

1. Create `.claude/research/` directory if it doesn't exist
2. Write the full report to `.claude/research/{topic}-{YYYY-MM-DD}.md`
3. Use kebab-case for the topic slug (e.g., `dashboard-dataviz`, `animation-library-comparison`)

## Select Report Template

Based on the research type from Step 1, use the matching template.

> Read `references/report-templates.md` for the full template structures: Quick Research, Full Research (Design Intelligence Report), and Technology Comparison.

### Quick Research (15-30 min scope)

```markdown
# Quick Research: [Topic]
## Recommendation
[Technology/Pattern] because [Reason]
## Alternatives
1. [Option] - [Trade-off]
## Examples
- [URL 1] - [Why it's relevant]
```

### Full Research Report (1-2 hours scope)

Use the complete Design Intelligence Report template from `references/report-templates.md`. Includes:
- Executive Summary / Design Goal
- Research Summary (counts of competitors, patterns, technologies analyzed)
- Recommended Approach (pattern, technology, rationale, examples)
- Technology Stack specification
- Implementation Complexity estimates
- Alternative Approaches
- Design Patterns Identified
- Implementation Roadmap (phased)
- Performance Considerations
- Accessibility Notes
- References and Examples
- Next Steps for design-forge

### Technology Comparison (30-60 min scope)

Comparison matrices with bundle sizes, performance, use cases, examples.

## Pro Tips for Report Quality

1. **Be Specific**: "Use Framer Motion 11.x" not "use animations"
2. **Provide Evidence**: Always include URLs to examples
3. **Consider Context**: Tech choices depend on project constraints
4. **Bundle Awareness**: Always report bundle size impact
5. **Performance First**: Recommend fastest option that meets needs
6. **Progressive Enhancement**: Start simple, add complexity if needed
7. **Real Examples**: Theory is nice, working examples are essential
8. **Decision Matrices**: Help designers choose with clear trade-offs
9. **Accessibility Default**: All recommendations must be accessible
10. **Actionable Reports**: Designer should know exactly what to do next

---

**Next:** Read `steps/05-handoff.md`
