/**
 * esbuild config — bundles entry points into self-contained files.
 *
 * After tsc compiles TS → JS in dist/, this script:
 * 1. Bundles dist/server.js → dist/server.js (all deps inlined)
 * 2. Bundles dist/update.js → dist/update.js (all deps inlined)
 * 3. Bundles dist/view-graph.js → dist/view-graph.js (all deps inlined)
 * 4. Copies .wasm grammar files into dist/ (alongside the bundles)
 *
 * Result: dist/ is fully self-contained — no node_modules needed at runtime.
 */

import { build } from "esbuild";
import { copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");

// Bundle both entry points
const sharedOptions = {
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // node:sqlite is a Node.js built-in — don't try to bundle it
  external: ["node:*"],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
};

async function main() {
  // Bundle server
  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "server.js")],
    outfile: join(distDir, "server.bundle.js"),
    allowOverwrite: true,
  });

  // Bundle update CLI
  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "update.js")],
    outfile: join(distDir, "update.bundle.js"),
    allowOverwrite: true,
  });

  // Bundle view-graph CLI
  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "view-graph.js")],
    outfile: join(distDir, "view-graph.bundle.js"),
    allowOverwrite: true,
  });

  // Replace originals with bundles
  copyFileSync(join(distDir, "server.bundle.js"), join(distDir, "server.js"));
  copyFileSync(join(distDir, "update.bundle.js"), join(distDir, "update.js"));
  copyFileSync(join(distDir, "view-graph.bundle.js"), join(distDir, "view-graph.js"));

  // Clean up bundle intermediates
  const { unlinkSync } = await import("node:fs");
  try { unlinkSync(join(distDir, "server.bundle.js")); } catch {}
  try { unlinkSync(join(distDir, "update.bundle.js")); } catch {}
  try { unlinkSync(join(distDir, "view-graph.bundle.js")); } catch {}

  // Copy web-tree-sitter runtime WASM (the only file that changes with version upgrades)
  // Grammar .wasm files are pre-built via: npx tree-sitter build --wasm <grammar-path>
  // and already exist in dist/ — don't overwrite them during regular builds.
  const wasmRuntime = join(__dirname, "node_modules", "web-tree-sitter", "web-tree-sitter.wasm");
  if (existsSync(wasmRuntime)) {
    copyFileSync(wasmRuntime, join(distDir, "web-tree-sitter.wasm"));
    console.log("  Copied web-tree-sitter.wasm");
  }

  // Verify grammar WASM files exist (built separately with tree-sitter-cli)
  for (const name of ["tree-sitter-typescript.wasm", "tree-sitter-tsx.wasm", "tree-sitter-javascript.wasm"]) {
    if (!existsSync(join(distDir, name))) {
      console.warn(`  WARNING: ${name} missing — run: npx tree-sitter build --wasm <grammar-path> -o dist/${name}`);
    }
  }

  console.log("Build complete — dist/ is self-contained");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
