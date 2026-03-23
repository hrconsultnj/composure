---
name: c-cpp-patterns
description: C and C++ code quality patterns and anti-patterns for AI-assisted development. Covers smart pointers, RAII, const correctness, modern C++ idioms, and MISRA C compliance.
type: reference
---

# C / C++ Patterns

## C Anti-Patterns

| Pattern | Why It's Bad | Fix |
|---|---|---|
| `malloc`/`free` without checks | Memory leaks, use-after-free | Check return values, pair allocations with cleanup |
| `sprintf` / `strcat` | Buffer overflows | `snprintf`, `strncat` with bounds |
| `goto` for error handling | Spaghetti flow | Structured cleanup with labeled breaks or helper functions |
| Missing `NULL` checks on pointers | Segfaults | Always check before dereference |
| Magic numbers | Unreadable | `enum` or `#define` with descriptive names (C11: `_Static_assert`) |
| Global mutable state | Thread-unsafe, hard to test | Pass state via struct pointers |

## C++ Anti-Patterns

| Pattern | Why It's Bad | Fix |
|---|---|---|
| Raw `new`/`delete` | Memory leaks, double-free | `std::make_unique`, `std::make_shared` |
| `using namespace std` in headers | Namespace pollution for includers | `std::` prefix, or `using` in .cpp only |
| C-style casts `(int)x` | No type safety | `static_cast<int>(x)`, `dynamic_cast`, etc. |
| `NULL` | Ambiguous (could be 0) | `nullptr` (C++11+) |
| Missing `const` | Mutability where not needed | `const` on refs, pointers, member functions |
| `char*` strings | Buffer overflows | `std::string` or `std::string_view` (C++17) |
| Manual resource management | Exception-unsafe | RAII wrappers, smart pointers |
| `#define` for constants | No type safety, no scope | `constexpr` variables |

## Patterns to Follow

1. **Smart pointers (C++)** — `unique_ptr` for ownership, `shared_ptr` for sharing
2. **const correctness** — `const` on everything that doesn't mutate
3. **Modern idioms (C++17/20/23)** — `constexpr`, `std::optional`, structured bindings
4. **Header hygiene** — no `using namespace` in headers, forward declarations
5. **RAII (C++)** — resource acquisition is initialization, always
6. **Bounds checking (C)** — `snprintf` over `sprintf`, sized buffers
7. **MISRA C compliance** — for embedded/safety-critical (MISRA C 2025)

## Key Context

- MISRA C 2025 just released — updated safety rules for embedded
- AI generates C++11 style even when C++20/23 is available
- C++ modernization (17→20→23) is a major enterprise effort
- C code in embedded systems often has strict MISRA/CERT constraints
