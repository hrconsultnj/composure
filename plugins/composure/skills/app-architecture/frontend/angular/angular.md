# Angular Frontend — Component Architecture

> **Only load this file when `frontend: "angular"` in `.claude/no-bandaids.json`.**
> **Reference docs in `generated/` are populated by `/composure:initialize --force` via Context7.**

## Phase 5: App Shell with Route Guards

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ],
}
```

Auth guards use Angular's functional guard pattern:

```typescript
// auth.guard.ts
import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from './auth.service'

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService)
  const router = inject(Router)
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login'])
}
```

---

## Phase 7: Angular Router

```typescript
// app.routes.ts
import { Routes } from '@angular/router'
import { authGuard } from './auth.guard'

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login.component') },
  {
    path: ':account_id',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component') },
      { path: 'buildings', loadComponent: () => import('./buildings/buildings.component') },
      { path: 'settings', loadComponent: () => import('./settings/settings.component') },
    ],
  },
  { path: '**', redirectTo: 'login' },
]
```

Key patterns:
- **Standalone components** (default in Angular 17+) — no NgModules
- **`loadComponent`** for lazy loading — automatic code splitting
- **Functional guards** (`CanActivateFn`) — replaces class-based guards
- **Signals** for reactive state — replaces many RxJS patterns

---

## Anti-Patterns (Angular)

### ❌ Don't
- Use NgModules for new components — standalone is the default
- Use class-based guards — functional guards are simpler
- Use `'use client'` or React patterns — Angular has its own reactivity model
- Mix RxJS and Signals inconsistently — prefer Signals for local state, RxJS for async streams
- Skip `OnPush` change detection — use it by default for performance

---

## Checklist

- [ ] Standalone components (no NgModules)
- [ ] Functional route guards for auth
- [ ] Lazy-loaded routes with `loadComponent`
- [ ] Signals for reactive state
- [ ] `OnPush` change detection strategy
