---
name: kotlin-patterns
description: Kotlin code quality patterns and anti-patterns for AI-assisted development. Covers null safety, coroutines, Jetpack Compose patterns, and Expo native module integration.
type: reference
---

# Kotlin Patterns

## Anti-Patterns (enforced by no-bandaids)

| Pattern | Why It's Bad | Fix |
|---|---|---|
| `!!` (non-null assertion) | Crashes on null — same as force unwrap | `?.let { }`, `?:`, safe calls |
| `var` when `val` works | Unnecessary mutability | `val` by default, `var` only when needed |
| `runBlocking` on main thread | Blocks UI — ANR (Application Not Responding) | `lifecycleScope.launch`, `viewModelScope.launch` |
| Bare `return@AsyncFunction` | Returns `Unit` — Expo expects `Any?` | `return@AsyncFunction null` for void async |
| `lateinit var` overuse | Crashes if accessed before init | `by lazy { }` or nullable with `?.` |
| `Thread.sleep()` in coroutines | Blocks the thread, defeats coroutines | `delay()` (suspending, non-blocking) |
| Platform types `T!` from Java | Null crash at Kotlin boundary | Explicitly type as `T?` or `T` |
| Mutable collections exposed | External mutation of internal state | Return `List` (immutable) not `MutableList` |
| `when` without `else` on non-sealed | Compiler doesn't enforce exhaustive | Add `else` branch or use `sealed class` |

## Patterns to Follow

1. **Null safety** — `?.` safe calls, `?:` elvis operator, `?.let { }` for scoping
2. **Coroutines** — `suspend fun`, `Flow`, `StateFlow`, structured concurrency with scopes
3. **Immutability** — `val` over `var`, `List` over `MutableList`, `data class` for value types
4. **Sealed classes** — exhaustive `when` expressions for state machines
5. **Extension functions** — extend existing types without inheritance
6. **Scope functions** — `let`, `apply`, `also`, `run`, `with` (don't overuse)

## Expo Native Module Context

Kotlin files in Expo projects are typically native modules:
- Expo Modules `AsyncFunction` expects `Any?` return — bare `return@AsyncFunction` sends `Unit` (type mismatch)
- Nullable API chains: `api?.method()?.subscribe()` returns `Disposable?` — can't store in `ConcurrentHashMap<String, Disposable>`. Fix: `val a = api ?: return@AsyncFunction null`
- SDK callback abstract classes may not cover all interface methods — compiler tells you which are missing
- Watch for internal package imports from SDKs (e.g., `com.polar.androidcommunications.api.ble.model.DisInfo`)
- `build.gradle` dependencies: keep commented until native implementation compiles
- Read `e:` errors, not `w:` warnings — warnings are from Expo's own packages
