---
name: swift-patterns
description: Swift code quality patterns and anti-patterns for AI-assisted development. Covers optionals, concurrency (async/await, actors), SwiftUI patterns, and Expo native module integration.
type: reference
---

# Swift Patterns

## Anti-Patterns (enforced by no-bandaids)

| Pattern | Why It's Bad | Fix |
|---|---|---|
| Force unwrap `!` | Crashes on nil — production crash | `guard let`, `if let`, `??` with default |
| Implicitly unwrapped optionals `T!` | Deferred crash — same as force unwrap | Use `T?` and proper unwrapping |
| `as!` force cast | Crashes on type mismatch | `as?` with optional binding |
| Missing `@MainActor` on UI code | UI updates from background thread — crash | `@MainActor` on view models, UI functions |
| `DispatchQueue.main.async` | Old concurrency pattern | `@MainActor` + `Task { }` (Swift 5.5+) |
| `var` when `let` works | Unnecessary mutability | `let` by default, `var` only when needed |
| Massive `ViewController` | God object — untestable | Extract into ViewModels, Coordinators |
| `try!` | Crashes on error | `do { try } catch` or `try?` |
| Retain cycles in closures | Memory leaks | `[weak self]` or `[unowned self]` |

## Patterns to Follow

1. **Optional safety** — `guard let` for early return, `if let` for conditional, never `!`
2. **Swift Concurrency** — `async`/`await`, `Actor`, `@MainActor`, `TaskGroup`
3. **Value types** — prefer `struct` over `class` unless reference semantics needed
4. **Protocol-oriented** — define behavior with protocols, not inheritance
5. **SwiftUI** — `@State`, `@Binding`, `@Observable` (not `@ObservableObject` in iOS 17+)
6. **Error handling** — typed errors with `enum Error: Swift.Error`, pattern match in `catch`

## Expo Native Module Context

Swift files in Expo projects are typically native modules:
- Constructor signatures change between SDK versions — always compile against the real SDK
- Use `@objc` for bridging to React Native
- Expo Modules use `ExpoModulesCore` — check the current API with Context7
- No-op stub first, then add real SDK code after successful build
