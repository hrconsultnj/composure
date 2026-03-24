---
name: Vite 8 Patterns
source: context7
queried_at: 2026-03-24
library_version: 8.0
context7_library_id: /vitejs/vite/v8.0.0
---

# Vite 8

## SPA Setup

For standard SPA React apps, Vite 8 introduces no breaking changes to the configuration API. The React plugin setup is unchanged from Vite 7:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

What stays the same:

- `@vitejs/plugin-react` — no changes to setup or options
- `configureServer` hook — same API
- `vite.config.ts` — `defineConfig` unchanged
- HMR, dev server, proxy config — all unchanged
- CSS modules, PostCSS, Tailwind integration — unchanged

## Environment API

The headline feature is multi-environment configuration. A single Vite project can target different runtimes (client, server, edge) with distinct settings. Each environment inherits top-level config options unless explicitly overridden. Some options like `optimizeDeps` only apply to the client environment for backward compatibility.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
  },
  optimizeDeps: {
    include: ["lib"],
  },

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

Plugins can inspect `this.environment` to determine which environment a module belongs to:

```ts
import { Plugin } from "vite";

export function myPlugin(): Plugin {
  return {
    name: "my-plugin",
    resolveId(id, importer, options) {
      // Use this.environment instead of the deprecated options.ssr
      const isSSR = this.environment.config.consumer === "server";

      if (isSSR) {
        // SSR specific logic
      } else {
        // Client specific logic
      }
    },
    transform(code, id) {
      // this.environment.name tells you which env this module belongs to
      if (this.environment.name === "server") {
        return transformForServer(code);
      }
      return code;
    },
  };
}
```

## Dev Server

### Proxy

Configure proxy rules using string shorthands, option objects, regex, and WebSocket support:

```ts
export default defineConfig({
  server: {
    proxy: {
      // String shorthand: /foo -> http://localhost:4567/foo
      "/foo": "http://localhost:4567",

      // With options: /api/bar -> http://jsonplaceholder.typicode.com/bar
      "/api": {
        target: "http://jsonplaceholder.typicode.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },

      // WebSocket proxy
      "/ws": { target: "ws://localhost:3000", ws: true },
    },
  },
});
```

### Middleware Mode

Integrate Vite into an existing Node.js HTTP server (e.g., Express). Set `appType: 'custom'` to disable Vite's own HTML serving logic so the parent server can take control:

```ts
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer as createViteServer } from "vite";

async function createServer() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  app.use("*all", async (req, res) => {
    // serve index.html — handle SSR rendering here
  });

  app.listen(5173);
}

createServer();
```

## Plugins

### Per-Environment Plugins

Plugins that are not environment-aware need per-environment wrapping via `applyToEnvironment`:

```ts
import { nonShareablePlugin } from "non-shareable-plugin";

export default defineConfig({
  plugins: [
    {
      name: "per-environment-plugin",
      applyToEnvironment(environment) {
        // Return true to activate, or return a new plugin instance
        return nonShareablePlugin({ outputName: environment.name });
      },
    },
  ],
});
```

### Per-Environment State Management

Use a `Map` keyed by `Environment` to isolate plugin state across environments:

```ts
function PerEnvironmentCountTransformedModulesPlugin() {
  const state = new Map<Environment, { count: number }>();
  return {
    name: "count-transformed-modules",
    perEnvironmentStartEndDuringDev: true,
    buildStart() {
      state.set(this.environment, { count: 0 });
    },
    transform(id) {
      state.get(this.environment).count++;
    },
    buildEnd() {
      console.log(this.environment.name, state.get(this.environment).count);
    },
  };
}
```

### HMR Hook Migration (`handleHotUpdate` to `hotUpdate`)

The `handleHotUpdate` hook is replaced by `hotUpdate`. Access WebSocket and module graph through `this.environment`:

```ts
// Before (Vite 7)
handleHotUpdate({ server, modules, timestamp }) {
  const invalidatedModules = new Set()
  for (const mod of modules) {
    server.moduleGraph.invalidateModule(mod, invalidatedModules, timestamp, true)
  }
  server.ws.send({ type: 'full-reload' })
  return []
}

// After (Vite 8)
hotUpdate({ modules, timestamp }) {
  const invalidatedModules = new Set()
  for (const mod of modules) {
    this.environment.moduleGraph.invalidateModule(mod, invalidatedModules, timestamp, true)
  }
  this.environment.hot.send({ type: 'full-reload' })
  return []
}
```

Custom HMR events also use `this.environment.hot.send`:

```ts
hotUpdate() {
  this.environment.hot.send({
    type: "custom",
    event: "special-update",
    data: {},
  });
  return [];
}
```

## Rolldown Integration

Vite 8 uses Rolldown (Rust-based) and Oxc-based tools instead of esbuild and Rollup. There is a built-in compatibility layer for `esbuild` and `rollupOptions` so most projects work without config changes.

For SPA React apps, Rolldown is now the default bundler — no opt-in needed.

## Migration from Vite 7

### Direct Upgrade

For most projects, update the dependency and run dev/build:

```bash
pnpm update vite@^8.0.0
```

The `environments` key is additive — omitting it keeps Vite 7 behavior. The configuration API and plugin hooks are intentionally unchanged to minimize migration friction.

### Gradual Migration (Recommended for Complex Projects)

For larger or complex projects, first switch to the `rolldown-vite` package on Vite 7 to isolate Rolldown-specific issues:

```json
{
  "devDependencies": {
    "vite": "npm:rolldown-vite@7.2.2"
  }
}
```

Then upgrade to Vite 8:

```json
{
  "devDependencies": {
    "vite": "^8.0.0"
  }
}
```

### Key Breaking Changes

- `options.ssr` in `resolveId`/`load`/`transform` hooks is deprecated; use `this.environment.config.consumer === 'server'` instead
- `handleHotUpdate` hook replaced by `hotUpdate`; access module graph and HMR via `this.environment`
- `server.ws.send` replaced by `this.environment.hot.send`
- Rolldown replaces esbuild and Rollup (compatibility layer available)
- If relying on specific Rollup or esbuild options, adjustments may be needed
