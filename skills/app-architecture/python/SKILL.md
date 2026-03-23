---
name: python-patterns
description: Python code quality patterns and anti-patterns for AI-assisted development. Covers Pydantic validation, type safety, async patterns, and error handling.
type: reference
---

# Python Patterns

## Anti-Patterns (enforced by no-bandaids)

| Pattern | Why It's Bad | Fix |
|---|---|---|
| `type: ignore` | Silences type checker — hides real bugs | Fix the actual type error |
| Bare `except:` | Swallows all errors including KeyboardInterrupt | Catch specific exceptions |
| `except Exception:` | Too broad — masks bugs | Catch specific exceptions |
| `# noqa` without code | Blanket linting suppression | `# noqa: E501` with specific code |
| `: Any` type hints | Defeats typing purpose | Use `Union`, `Optional`, `TypeVar`, or specific types |
| Raw `dict` params at API boundaries | No validation | Use Pydantic `BaseModel` |
| `json.loads()` without validation | Unvalidated external data | `model_validate_json()` |
| `os.system()` | Command injection risk | `subprocess.run()` with list args |
| `eval()` | Code injection | `ast.literal_eval()` or structured parsing |
| Mutable default arguments | Shared state between calls | `None` default + `if x is None: x = []` |

## Patterns to Follow

1. **Pydantic validation at every boundary** — API inputs, config loading, external data
2. **`mypy --strict` compliance** — no `Any`, no `type: ignore`
3. **Structured error handling** — specific exceptions, context in error messages
4. **Async done right** — `asyncio.gather()`, no blocking in async functions
5. **Decomposition** — same size limits as TypeScript, applied to Python modules

## Key Libraries

| Library | Current Version | Context7 ID | Focus |
|---|---|---|---|
| FastAPI | 0.115+ | `/tiangolo/fastapi` | Route typing, dependency injection |
| Pydantic | 2.12+ | `/pydantic/pydantic` | Model validation, `model_validate_json` |
| SQLAlchemy | 2.0+ | `/sqlalchemy/sqlalchemy` | Async sessions, type-safe queries |
| mypy | 1.14+ | — | Strict type checking |
