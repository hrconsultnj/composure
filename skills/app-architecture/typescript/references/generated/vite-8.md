---
name: Vite 8 Patterns
source: context7
queried_at: 2026-03-23
library_version: "8.0.0"
context7_library_id: /vitejs/vite/v8.0.0
---

# Vite 8

## SPA React Apps — No Breaking Changes

For standard SPA React apps, Vite 8 introduces no breaking changes from Vite 7. The React plugin setup is unchanged:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

## Environment API

The headline feature is multi-environment configuration. This allows a single Vite project to target different runtimes (client, server, edge) with distinct settings.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  environments: {
    client: {
      // Default browser environment — same as before
      build: {
        outDir: "dist/client",
      },
    },
    server: {
      // Node.js server environment
      build: {
        outDir: "dist/server",
        ssr: true,
      },
      resolve: {
        conditions: ["node"],
      },
    },
    edge: {
      // Edge runtime (Cloudflare Workers, Vercel Edge, etc.)
      build: {
        outDir: "dist/edge",
        ssr: true,
      },
      resolve: {
        conditions: ["edge-light", "worker"],
        noExternal: true,
      },
    },
  },
});
```

### Accessing Environment in Plugins

Plugins can target specific environments:

```ts
function myPlugin(): Plugin {
  return {
    name: "my-plugin",
    configureServer(server) {
      // configureServer hook is unchanged from Vite 7
      server.middlewares.use((req, res, next) => {
        next();
      });
    },
    transform(code, id) {
      // `this.environment` tells you which env this module belongs to
      if (this.environment.name === "server") {
        return transformForServer(code);
      }
      return code;
    },
  };
}
```

## Rolldown Integration

Vite 8 introduces Rolldown as an alternative bundler (Rust-based, replacing Rollup). Opt in:

```ts
export default defineConfig({
  builder: {
    sharedPlugins: true, // share plugin instances across environments
  },
});
```

For SPA React apps this is optional. Rollup remains the default.

## Migration from Vite 7

For SPA apps, update the dependency and you're done:

```bash
pnpm update vite@^8.0.0
```

No config changes needed. The `environments` key is additive — omitting it keeps Vite 7 behavior.

## What Stays the Same

- `@vitejs/plugin-react` — no changes to setup or options
- `configureServer` hook — same API
- `vite.config.ts` — `defineConfig` unchanged
- HMR, dev server, proxy config — all unchanged
- CSS modules, PostCSS, Tailwind integration — unchanged
