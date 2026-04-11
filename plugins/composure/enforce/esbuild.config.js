/**
 * esbuild config — bundles entry points into self-contained files.
 *
 * After tsc compiles TS → JS in dist/, this script:
 * 1. Bundles dist/server.js → dist/server.js (all deps inlined)
 * 2. Bundles dist/cli.js → dist/cli.js (all deps inlined)
 *
 * Result: dist/ is fully self-contained — no node_modules needed at runtime.
 */

import { build } from "esbuild";
import { copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");

const sharedOptions = {
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // Externalize the shared content-fetch module so esbuild doesn't try to bundle
  // a file from outside this package. Node resolves it at runtime relative to
  // dist/server.js → ../../bin/composure-content.mjs (sibling of enforce/).
  external: ["node:*", "../../bin/composure-content.mjs"],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
};

async function main() {
  // Bundle MCP server
  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "server.js")],
    outfile: join(distDir, "server.bundle.js"),
    allowOverwrite: true,
  });

  // Bundle CLI
  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "cli.js")],
    outfile: join(distDir, "cli.bundle.js"),
    allowOverwrite: true,
  });

  // Replace originals with bundles
  copyFileSync(join(distDir, "server.bundle.js"), join(distDir, "server.js"));
  copyFileSync(join(distDir, "cli.bundle.js"), join(distDir, "cli.js"));

  // Clean up
  const { unlinkSync } = await import("node:fs");
  try { unlinkSync(join(distDir, "server.bundle.js")); } catch {}
  try { unlinkSync(join(distDir, "cli.bundle.js")); } catch {}

  console.log("Build complete — dist/ is self-contained");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
