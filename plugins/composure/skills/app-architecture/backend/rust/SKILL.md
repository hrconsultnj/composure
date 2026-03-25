---
name: rust-patterns
description: Rust code quality patterns and anti-patterns for AI-assisted development. Covers ownership, error handling, idiomatic patterns, and clippy compliance.
type: reference
---

# Rust Patterns

## Anti-Patterns (enforced by no-bandaids)

| Pattern | Why It's Bad | Fix |
|---|---|---|
| `.unwrap()` in non-test code | Panic on None/Err — crashes production | Use `?` operator, `.unwrap_or()`, or `.expect("reason")` |
| `.clone()` everywhere | Performance killer, defeats ownership | Borrow with `&`, use `Arc`/`Rc` for sharing |
| `unsafe {}` without comment | Undefined behavior risk | `// SAFETY: reason` comment required |
| C-style control flow | Unidiomatic, verbose | Use iterators, `match`, `if let`, `?` |
| `String` everywhere | Unnecessary allocations | `&str` for borrows, `Cow<str>` for conditional ownership |
| Missing `#[must_use]` | Result ignored silently | Add `#[must_use]` to Result/Option-returning functions |
| `println!` in library code | Not stderr, not structured | `eprintln!`, `tracing`, or `log` crate |

## Patterns to Follow

1. **`clippy` compliance** as baseline (equivalent to no-bandaids)
2. **`?` operator** over `.unwrap()` in all non-test code
3. **Ownership-first** — minimize `.clone()`, prefer borrows
4. **`unsafe` justification** — `// SAFETY:` comment required
5. **Iterator patterns** — `.iter().map().collect()` over manual loops
6. **Error types** — `thiserror` for libraries, `anyhow` for applications

## Key Context

- AI produces "C in Rust" — preserves C-like structure, verbose, unidiomatic
- 1.7x more issues than human-written Rust
- Misleading code, readability issues, and redundant code dominate AI output
