/**
 * Step 07 — Find installed plugin bin/ directory and create symlinks.
 */

import { existsSync, symlinkSync, lstatSync, readdirSync, copyFileSync, writeFileSync, unlinkSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { logger } from "../lib/logger.js";

const BINARIES = [
  "composure-auth.mjs",
  "composure-token.mjs",
  "composure-fetch.mjs",
  "composure-cache.mjs",
];

/**
 * Search known locations for the plugin bin directory.
 * Dynamically scans marketplace and cache dirs — no hardcoded marketplace names.
 */
function findPluginBin(): string | null {
  const home = homedir();
  const candidates: string[] = [];

  // 1. Scan ALL marketplaces for a composure plugin with bin/
  const marketplacesDir = join(home, ".claude", "plugins", "marketplaces");
  if (existsSync(marketplacesDir)) {
    try {
      for (const marketplace of readdirSync(marketplacesDir)) {
        const binPath = join(marketplacesDir, marketplace, "plugins", "composure", "bin");
        if (existsSync(binPath)) {
          candidates.push(binPath);
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // 2. Scan cache for any composure plugin version with bin/
  const cacheDir = join(home, ".claude", "plugins", "cache");
  if (existsSync(cacheDir)) {
    try {
      for (const marketplace of readdirSync(cacheDir)) {
        const composureCache = join(cacheDir, marketplace, "composure");
        if (!existsSync(composureCache)) continue;
        for (const version of readdirSync(composureCache)) {
          const binPath = join(composureCache, version, "bin");
          if (existsSync(binPath)) {
            candidates.push(binPath);
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function linkBinaries(): Promise<{ linked: number }> {
  const composureBin = join(homedir(), ".composure", "bin");
  const pluginBin = findPluginBin();

  if (!pluginBin) {
    logger.info("Plugin bin not found yet — commands will be linked on first Claude Code session");
    return { linked: 0 };
  }

  let linked = 0;
  const isWindows = platform() === "win32";

  for (const bin of BINARIES) {
    const source = join(pluginBin, bin);
    const target = join(composureBin, bin);

    if (!existsSync(source)) continue;

    try {
      // Check for existing symlink (including broken ones)
      let needsLink = true;
      try {
        const stat = lstatSync(target);
        if (stat.isSymbolicLink()) {
          const currentTarget = readlinkSync(target);
          if (currentTarget === source) {
            // Already points to the right place
            linked++;
            needsLink = false;
          } else {
            // Stale or broken symlink — remove and relink
            unlinkSync(target);
          }
        } else if (existsSync(target)) {
          // Regular file — leave it
          linked++;
          needsLink = false;
        }
      } catch {
        // lstatSync failed — target doesn't exist at all, needs link
      }

      if (needsLink) {
        if (isWindows) {
          copyFileSync(source, target);
        } else {
          symlinkSync(source, target);
        }
        linked++;
      }

      // On Windows, generate .cmd shims so users can run `composure-auth login`
      // without the `node` prefix — same pattern npm uses for global installs.
      if (isWindows) {
        const cmdName = bin.replace(".mjs", "");
        const cmdPath = join(composureBin, `${cmdName}.cmd`);
        try {
          if (!existsSync(cmdPath)) {
            writeFileSync(cmdPath, `@echo off\r\nnode "%~dp0${bin}" %*\r\n`);
          }
        } catch {
          // Non-fatal
        }
      }
    } catch {
      // Non-fatal — permissions or other issue
    }
  }

  // Also try to link the enforce CLI
  const enforceCandidates = [
    join(pluginBin, "..", "enforce", "dist", "cli.js"),
  ];
  for (const candidate of enforceCandidates) {
    if (existsSync(candidate)) {
      const target = join(composureBin, "composure-enforce");
      try {
        if (!existsSync(target)) {
          if (isWindows) {
            copyFileSync(candidate, target);
          } else {
            symlinkSync(candidate, target);
          }
        }
      } catch {
        // Non-fatal
      }
      break;
    }
  }

  return { linked };
}
