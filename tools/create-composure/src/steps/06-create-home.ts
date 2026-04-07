/**
 * Step 06 — Create the global ~/.composure/ scaffold + initialize Cortex DB.
 */

import { mkdir, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { execSafe } from "../lib/exec.js";
import { logger } from "../lib/logger.js";

export async function createHome(): Promise<string> {
  const home = join(homedir(), ".composure");

  await mkdir(join(home, "bin"), { recursive: true });
  await mkdir(join(home, "cache"), { recursive: true });
  await mkdir(join(home, "cortex"), { recursive: true });
  await mkdir(join(home, "worktrees"), { recursive: true });

  // Set directory permissions (700 — owner only) on POSIX systems
  if (platform() !== "win32") {
    await chmod(home, 0o700);
  }

  // Initialize Cortex global database if it doesn't exist
  // This ensures cross-project memory is ready from the first session
  const cortexDb = join(home, "cortex", "cortex.db");
  if (!existsSync(cortexDb)) {
    // Find the cortex CLI in the plugin cache
    const pluginCacheBase = join(homedir(), ".claude", "plugins", "cache", "composure-suite", "composure");
    try {
      const { readdirSync } = await import("node:fs");
      const versions = readdirSync(pluginCacheBase).sort().reverse();
      for (const version of versions) {
        const cortexCli = join(pluginCacheBase, version, "cortex", "dist", "cli.bundle.js");
        if (existsSync(cortexCli)) {
          // Create DB by running a no-op search (initializes schema)
          await execSafe("node", ["--experimental-sqlite", cortexCli, "search_memory", '{"agent_id":"__init__","limit":1}']);
          logger.success("Cortex global memory initialized");
          break;
        }
      }
    } catch {
      // Cortex will initialize on first session start — not a blocker
    }
  }

  return home;
}
