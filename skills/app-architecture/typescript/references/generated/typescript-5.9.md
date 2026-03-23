---
name: TypeScript 5.9 Patterns
source: context7
queried_at: 2026-03-23
library_version: "5.9"
context7_library_id: n/a
---

# TypeScript 5.9

## Recommended tsconfig

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],

    // Strict mode
    "strict": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    // Module behavior
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,

    // Output
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": true,

    // Interop
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,

    // JSX (React)
    "jsx": "react-jsx"
  }
}
```

## erasableSyntaxOnly

Only type-level syntax that can be erased (removed without changing runtime behavior) is allowed. This prohibits:

```ts
// DISALLOWED — enums emit runtime code
enum Status {
  Active,
  Inactive,
}

// ALLOWED — const enums are fully erased
const enum Status {
  Active = "active",
  Inactive = "inactive",
}

// PREFERRED — union types (zero runtime cost)
type Status = "active" | "inactive";
```

Parameter properties are also disallowed:

```ts
// DISALLOWED — constructor(private name: string) emits code
class User {
  constructor(private name: string) {}
}

// ALLOWED — explicit field declaration
class User {
  private name: string;
  constructor(name: string) {
    this.name = name;
  }
}
```

## verbatimModuleSyntax

All type imports/exports must be explicitly marked:

```ts
// CORRECT
import type { User } from "./types";
import { fetchUser, type UserFilter } from "./api";

// WRONG — will error
import { User } from "./types"; // if User is only a type
```

## noUncheckedSideEffectImports

Side-effect imports (imports with no bindings) are checked for existence:

```ts
// These must resolve to real files
import "./styles.css";
import "reflect-metadata";

// This will error if the file doesn't exist
import "./missing-polyfill"; // Error: Module not found
```

## satisfies — Narrowing Pattern

`satisfies` validates a value matches a type without widening it:

```ts
type Route = {
  path: string;
  component: () => JSX.Element;
  auth?: boolean;
};

// Type is narrowed — path is the literal, not just `string`
const loginRoute = {
  path: "/login",
  component: LoginPage,
  auth: false,
} satisfies Route;

// loginRoute.path is "/login", not string
// loginRoute.auth is false, not boolean | undefined
```

Use `satisfies` for config objects, route definitions, and theme tokens where you want both validation and narrow inference.

## Strict Flags Summary

| Flag | Effect |
|------|--------|
| `noUnusedLocals` | Error on declared-but-unused variables |
| `noUnusedParameters` | Error on unused function parameters (prefix with `_` to suppress) |
| `noFallthroughCasesInSwitch` | Error on switch cases that fall through without `break`/`return` |
| `noUncheckedSideEffectImports` | Error on side-effect imports that don't resolve |

## Suppressing Unused Parameters

Prefix with underscore: `(_event: Event, index: number)` or `(_item, index) => index > 0`.
