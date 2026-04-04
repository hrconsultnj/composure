/**
 * esbuild config — bundles MCP server and CLI into self-contained files.
 *
 * Produces:
 *   dist/server.bundle.js — MCP STDIO server (Door 1)
 *   dist/cli.bundle.js    — CLI transport (Door 4)
 */

import { build } from "esbuild";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");

const sharedOptions = {
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  external: ["node:*"],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
};

async function main() {
  // Bundle MCP STDIO server
  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "server.js")],
    outfile: join(distDir, "server.bundle.js"),
  });

  // Bundle CLI
  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "cli.js")],
    outfile: join(distDir, "cli.bundle.js"),
  });

  console.log("Cortex transports bundled successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
