# Contributing to Composure

Thank you for helping improve code quality across languages.

## Ways to Contribute

### 1. Submit Framework Patterns (Most Common)

If you've built patterns that work well in your projects, share them:

1. Start with a **project-level override** at `.composure/frameworks/{lang}/*.md` in your project
2. Test it across multiple sessions — make sure Claude consistently follows the pattern
3. Move the file to `skills/app-architecture/{lang}/references/universal/`
4. Submit a PR using the template

**Pattern file format:**

```markdown
---
name: descriptive-name
description: One-line summary of what this pattern covers
type: reference
---

# Pattern Name

## Anti-Patterns

| Pattern | Why It's Bad | Fix |
|---|---|---|
| Bad thing | Reason | Better approach |

## Patterns to Follow

1. **Pattern name** — description with `code examples`

## Code Examples

\```language
// Correct
doTheThing()

// Incorrect
dontDoThis()
\```
```

### 2. Add a New Language

See the **New Language Checklist** in the PR template. You'll need to update:
- `skills/app-architecture/{lang}/SKILL.md` — anti-patterns and patterns
- `hooks/no-bandaids.sh` — extension detection and rules
- `skills/app-architecture/SKILL.md` — framework loading table
- `skills/initialize/steps/01-detect-stack.md` — stack detection
- `README.md` — language list

### 3. Improve Hooks

The hooks are bash scripts in `hooks/`. Size limits:
- `no-bandaids.sh` — under 220 lines
- `decomposition-check.sh` — under 350 lines

Test locally:
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"test.py","content":"x: Any = 5"}}' | bash hooks/no-bandaids.sh
# Should output: BLOCKED with "Use a specific type instead of Any"
```

### 4. Report Issues

Open an issue at [github.com/hrconsultnj/composure/issues](https://github.com/hrconsultnj/composure/issues) for:
- False positives from hooks (pattern blocked that shouldn't be)
- False negatives (anti-pattern not caught)
- Missing language support
- Skill improvements

## Development Setup

```bash
git clone https://github.com/hrconsultnj/composure.git
cd composure

# Install the graph MCP server dependencies
cd graph && pnpm install && pnpm build && cd ..

# Install as a local Claude Code plugin for testing
claude plugin install --local .
```

## Guidelines

- **Keep patterns practical** — real code from real projects, not theoretical
- **Include "why"** — every anti-pattern needs a reason and a fix
- **Stay under size limits** — practice what we preach
- **Test with Claude Code** — verify the hook/skill works in an actual session
- **One concern per PR** — don't mix a Python pattern with a Go hook fix

## License

By submitting a pull request, you grant the licensor the right to license your contribution under the project's current and any future license terms.
