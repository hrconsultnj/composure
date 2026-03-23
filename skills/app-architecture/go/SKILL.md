---
name: go-patterns
description: Go code quality patterns and anti-patterns for AI-assisted development. Covers error handling, generics, context propagation, and package decomposition.
type: reference
---

# Go Patterns

## Anti-Patterns (enforced by no-bandaids)

| Pattern | Why It's Bad | Fix |
|---|---|---|
| `_ = err` | Error swallowing — silent failures | Handle or return: `fmt.Errorf("context: %w", err)` |
| `interface{}` | Pre-generics pattern (Go 1.18+) | Use `any` keyword or generics `[T any]` |
| `//nolint` without justification | Blanket suppression | `//nolint:errcheck // reason` |
| Goroutine without context | Leaks, no cancellation | Pass `context.Context`, use `errgroup` |
| `panic()` in library code | Crashes the program | Return `error` — only `panic` in `main` |
| `init()` functions | Hidden initialization | Explicit init in `main` or constructors |
| God packages (1000+ lines) | No decomposition | Split by domain responsibility |
| `sync.Mutex` without `defer` | Deadlocks on error paths | `mu.Lock(); defer mu.Unlock()` |

## Patterns to Follow

1. **Error wrapping** — `fmt.Errorf("doing X: %w", err)` at every level
2. **Package decomposition** — same size limits, applied to packages
3. **Context propagation** — every I/O function takes `context.Context`
4. **Generics over interface{}** — since Go 1.18
5. **Goroutine lifecycle** — `errgroup.Group` with context cancellation
6. **Table-driven tests** — `[]struct{ name, input, want }` pattern

## Key Context

- Go has the **lowest AI satisfaction rate** at 55% — AI-generated Go code is the most complained about
- Main issues: non-functioning code, poor error handling, monolithic structure
- AI never suggests refactoring in Go — Composure's decomposition hooks are critical
