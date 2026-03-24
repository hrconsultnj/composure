---
name: TypeScript 5.9 Patterns
source: context7
queried_at: 2026-03-24
library_version: 5.9
context7_library_id: /microsoft/typescript
---

# TypeScript 5.9

## Recommended tsconfig

Based on the updated `tsc --init` defaults in 5.9, which now targets `esnext`, uses `nodenext` modules, and enables `verbatimModuleSyntax` by default.

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
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

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

Only type-level syntax that can be erased (removed without changing runtime behavior) is allowed. This prohibits enums and parameter properties.

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
// DISALLOWED — constructor(public foo: string) emits code
class MyClassErr {
  constructor(public foo: string) {}
  // error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
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

All type imports/exports must be explicitly marked. This prevents accidental runtime imports of type-only declarations.

```ts
// CORRECT
import type { User } from "./types";
import { fetchUser, type UserFilter } from "./api";
export type { User };
export { type UserFilter } from "./api";

// WRONG — will error (TS1484)
import { User } from "./types"; // if User is only a type
// error TS1484: 'User' is a type and must be imported using a type-only import
// when 'verbatimModuleSyntax' is enabled.

// WRONG — re-exporting a type without type keyword (TS1205)
export { SomeType } from "./types";
// error TS1205: Re-exporting a type when 'verbatimModuleSyntax' is enabled
// requires using 'export type'.
```

Chained re-exports also require type-only syntax:

```ts
// If AClass was re-exported as type-only from './b', then importing it
// as a value from './b' will error (TS1485)
import { AClass } from "./b";
// error TS1485: 'AClass' resolves to a type-only declaration and must be
// imported using a type-only import when 'verbatimModuleSyntax' is enabled.
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

## satisfies — Type Validation Without Widening

`satisfies` validates a value matches a type without widening it, preserving narrow literal types.

### Narrowing property types

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

### Value type validation

```ts
type RGB = [red: number, green: number, blue: number];

const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0], // Error: Expected RGB tuple, but got [0, 0]
} satisfies Record<string, string | RGB>;

// Information about each property is still maintained
const redComponent = palette.red.at(0); // number | undefined
const greenNormalized = palette.green.toUpperCase(); // string
```

### Exact key matching

```ts
type Colors = "red" | "green" | "blue";

const favoriteColors = {
  red: "yes",
  green: false,
  blue: "kinda",
  platypus: false, // Error: "platypus" was never listed in 'Colors'
} satisfies Record<Colors, unknown>;

// Property types are preserved — green is boolean, not unknown
const g: boolean = favoriteColors.green;
```

### Config objects with array inference

```ts
interface ConfigSettings {
  compilerOptions?: CompilerOptions;
  extends?: string | string[];
}

let myConfigSettings = {
  compilerOptions: {
    strict: true,
    outDir: "../lib",
  },
  extends: [
    "@tsconfig/strictest/tsconfig.json",
    "../../../tsconfig.base.json",
  ],
} satisfies ConfigSettings;

// extends is inferred as string[] (not string | string[])
// so .map() is available without narrowing
let inheritedConfigs = myConfigSettings.extends.map(resolveConfig);
```

Use `satisfies` for config objects, route definitions, and theme tokens where you want both validation and narrow inference.

## const Type Parameters

The `const` modifier on type parameters forces literal inference without requiring `as const` at the call site.

```ts
type HasNames = { names: readonly string[] };

function getNamesExactly<const T extends HasNames>(arg: T): T["names"] {
  return arg.names;
}

// Inferred type: readonly ["Alice", "Bob", "Eve"]
// Without const: string[]
const names = getNamesExactly({ names: ["Alice", "Bob", "Eve"] });
```

Works with various shapes — objects, tuples, and rest parameters:

```ts
declare function f1<const T>(x: T): T;

const x1 = f1("a"); // type: "a"
const x2 = f1(["a", ["b", "c"]]); // type: readonly ["a", readonly ["b", "c"]]
const x3 = f1({ a: 1, b: "c", d: ["e", 2, true] });
// type: { readonly a: 1; readonly b: "c"; readonly d: readonly ["e", 2, true] }

declare function f6<const T extends readonly unknown[]>(...args: T): T;
const x6 = f6(1, "b", { a: 1 }); // type: readonly [1, "b", { readonly a: 1 }]
```

## NoInfer Utility Type

Prevents a type parameter from being inferred from a specific position. Useful for ensuring one parameter drives inference while others are checked against it.

```ts
declare function foo1<T extends string>(a: T, b: NoInfer<T>): void;

foo1("foo", "foo"); // OK — b matches inferred T
foo1("foo", "bar"); // Error — "bar" is not assignable to "foo"
```

Works in nested positions:

```ts
declare function foo2<T extends string>(a: T, b: NoInfer<T>[]): void;
declare function foo4<T extends string>(a: T, b: { x: NoInfer<T> }): void;

foo2("foo", ["bar"]); // Error — "bar" not assignable to "foo"
foo4("foo", { x: "bar" }); // Error — "bar" not assignable to "foo"
```

`keyof NoInfer<T>` is transformed into `NoInfer<keyof T>`:

```ts
type T30 = keyof NoInfer<{ a: string; b: string }>; // NoInfer<"a" | "b">
```

## using Declarations (Explicit Resource Management)

The `using` and `await using` keywords provide deterministic resource cleanup via `Symbol.dispose` and `Symbol.asyncDispose`.

```ts
interface MyDisposable {
  value: number;
  [Symbol.dispose](): void;
}

{
  using _ = { [Symbol.dispose]() {} };
}

{
  using resource: MyDisposable = {
    [Symbol.dispose]() {},
    value: 1,
  };
  // resource.value is available here
} // Symbol.dispose() called automatically at block end
```

Async variant:

```ts
interface MyAsyncDisposable {
  value: number;
  [Symbol.asyncDispose](): Promise<void>;
}

async function f() {
  {
    await using _ = {
      async [Symbol.asyncDispose]() {},
    };
  } // Symbol.asyncDispose() called and awaited at block end
}
```

Object literals used in `using` declarations are excess-property-checked against the declared type (TS2353).

## Import Attributes

Static imports can include metadata via the `with` clause:

```ts
import data from "./data.json" with { type: "json" };
import { a, b } from "./module" with { type: "json" };
import * as ns from "./module" with { type: "json" };

// Side-effect import with attributes
import "./init" with { type: "json" };
```

## Strict Flags Summary

| Flag | Effect |
| ---- | ------ |
| `strict` | Enables all strict type-checking options |
| `noUnusedLocals` | Error on declared-but-unused variables |
| `noUnusedParameters` | Error on unused function parameters (prefix with `_` to suppress) |
| `noFallthroughCasesInSwitch` | Error on switch cases that fall through without `break`/`return` |
| `noUncheckedSideEffectImports` | Error on side-effect imports that don't resolve |
| `noUncheckedIndexedAccess` | Adds `undefined` to index signature access results |
| `exactOptionalPropertyTypes` | Distinguishes `{ x?: string }` from `{ x: string \| undefined }` |
| `erasableSyntaxOnly` | Prohibits syntax that emits runtime code (enums, parameter properties) |
| `verbatimModuleSyntax` | Requires explicit `type` keyword on type-only imports/exports |
| `isolatedModules` | Ensures each file can be transpiled independently |

## Suppressing Unused Parameters

Prefix with underscore: `(_event: Event, index: number)` or `(_item, index) => index > 0`.
