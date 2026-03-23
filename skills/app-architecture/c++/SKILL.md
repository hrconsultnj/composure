---
name: cpp-patterns
description: C++ code quality patterns and anti-patterns for AI-assisted development. Covers smart pointers, RAII, const correctness, and modern C++ idioms.
type: reference
---

# C++ Patterns

## Anti-Patterns (enforced by no-bandaids)

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

1. **Smart pointers** — `unique_ptr` for ownership, `shared_ptr` for sharing
2. **const correctness** — `const` on everything that doesn't mutate
3. **Modern idioms** — `constexpr`, `std::optional`, structured bindings, `auto`
4. **Header hygiene** — no `using namespace` in headers, forward declarations
5. **RAII** — resource acquisition is initialization, always
6. **Range-based for** — prefer over index-based loops

## Key Context

- MISRA C 2025 just released — updated safety rules for embedded
- AI generates C++11 style even when C++20/23 is available
- C++ modernization (17→20→23) is a major enterprise effort
