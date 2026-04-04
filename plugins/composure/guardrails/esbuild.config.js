import { build, context } from "esbuild";
import { cpSync, existsSync, mkdirSync } from "node:fs";
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
  // Copy rulesets into dist so the bundle can read them at runtime
  const rulesetsDir = join(distDir, "rulesets");
  if (!existsSync(rulesetsDir)) mkdirSync(rulesetsDir, { recursive: true });
  cpSync(join(__dirname, "src", "rulesets"), rulesetsDir, { recursive: true });

  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "server.js")],
    outfile: join(distDir, "server.bundle.js"),
  });

  await build({
    ...sharedOptions,
    entryPoints: [join(distDir, "cli.js")],
    outfile: join(distDir, "cli.bundle.js"),
  });

  console.log("Guardrails transports bundled successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
