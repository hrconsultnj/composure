# Mobile Architecture — Index

> **This is a barrel index.** Load files based on the detected `frontend` value from `.claude/no-bandaids.json`.

## Always Also Load

Mobile frameworks still use frontend patterns. **You MUST also load `frontend/INDEX.md`** and follow its "Always Load" instructions — read `core.md` (routing file), then ALL files in `typescript/`.

## Load by `frontend` value

| `frontend` value | MUST load | Contains |
|---|---|---|
| `"expo"` | [expo/expo.md](expo/expo.md) + ALL `*.md` files in [expo/](expo/) | Phase 5 (overlay guards), Phase 7 (expo-router), anti-patterns (icons, bottom sheets, native modules, config plugins) |

## Native Module Languages

Load these ONLY when working on native modules (Turbo Modules), not for pure TypeScript Expo development:

| Language | File | Contains |
|---|---|---|
| Swift | [swift/SKILL.md](swift/SKILL.md) | Optionals, async/await actors, SwiftUI, Expo native module patterns |
| Kotlin | [kotlin/SKILL.md](kotlin/SKILL.md) | Null safety, coroutines, Jetpack Compose, Expo native module patterns |

## Project-Level Docs

Also check `.claude/frameworks/mobile/expo/` for project-specific docs:
- `generated/` — Context7 docs (expo-sdk, react-native)
- `project/` — team-written conventions
