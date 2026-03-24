# React Best Practices — Enforced Quality Checklist

> Applied when editing TSX/JSX files. Claude MUST verify code against these rules.

## Component Structure

- **One component per file** — colocate helpers only if private to that component
- **Named exports** over default exports for better refactoring (except route files which need `export default`)
- **Props interface** defined inline or colocated, not in a separate `types.ts` unless shared
- **Destructure props** in the function signature: `function Card({ title, children }: CardProps)`

## Hooks

- **Rules of Hooks** — never call hooks conditionally or inside loops
- **Custom hooks** — extract reusable logic into `use*` functions when 2+ components share it
- **Dependency arrays** — list every reactive value; lint with `react-hooks/exhaustive-deps`
- **`useCallback` / `useMemo`** — only when passing to memoized children or expensive computations
- **`useEffect` cleanup** — return cleanup for subscriptions, timers, and abort controllers

## State Management

- **Colocate state** — keep state as close as possible to where it is consumed
- **Derive, don't sync** — compute values from existing state instead of `useEffect` to mirror state
- **Avoid prop drilling** past 2-3 levels — use context or composition
- **Server state** — use TanStack Query, not manual fetch-in-effect

## Accessibility

- **Semantic HTML first** — `<button>`, `<a>`, `<nav>`, `<main>` before `<div onClick>`
- **`alt` on every `<img>`** — decorative images get `alt=""`
- **Keyboard navigation** — interactive elements must be focusable and operable via keyboard
- **`aria-*` attributes** — only when native semantics are insufficient

## Performance

- **`React.memo`** — wrap pure display components that re-render due to parent changes
- **Lazy loading** — use `React.lazy` + `Suspense` for route-level code splitting
- **List keys** — use stable, unique IDs; never use array index as key for reorderable lists
- **Avoid inline object/array literals** in JSX props — they create new references every render
- **Image optimization** — use `next/image` (web) or `expo-image` (mobile)

## TypeScript Patterns

- **`React.FC` is optional** — prefer plain function declarations with explicit return types
- **`PropsWithChildren`** — use when component accepts `children` but has no other custom props
- **Event handlers** — type as `React.MouseEvent<HTMLButtonElement>`, not `any`
- **Generics for reusable components** — e.g., `function List<T>({ items }: ListProps<T>)`
- **`as const` for config objects** — ensures literal types for discriminated unions
