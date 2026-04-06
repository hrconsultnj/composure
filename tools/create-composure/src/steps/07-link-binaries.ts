/**
 * Step 07 — Find installed plugin bin/ directory and create symlinks.
 */

import { existsSync, symlinkSync, lstatSync, readdirSync, copyFileSync } from "node:fs";
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
 */
function findPluginBin(): string | null {
  const home = homedir();
  const candidates = [
    join(home, ".claude/plugins/marketplaces/my-claude-plugins/plugins/composure/bin"),
  ];

  // Also glob the cache path pattern
  const cachePath = join(home, ".claude/plugins/cache/my-claude-plugins/composure");
  if (existsSync(cachePath)) {
    try {
      for (const entry of readdirSync(cachePath)) {
        const binPath = join(cachePath, entry, "bin");
        if (existsSync(binPath)) {
          candidates.push(binPath);
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
      // Skip if symlink already points to the right place
      if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
        linked++;
        continue;
      }

      if (isWindows) {
        // On Windows, copy instead of symlink (avoids permission issues)
        copyFileSync(source, target);
      } else {
        symlinkSync(source, target);
      }
      linked++;
    } catch {
      // Non-fatal — symlink may already exist or permissions issue
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
