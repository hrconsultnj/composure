/**
 * Step 05 — Install Composure plugins via Claude Code plugin system.
 *
 * Handles three real-world states:
 * 1. Fresh user — no plugins installed, marketplace not registered
 * 2. Existing user — plugins already installed (from curl script or prior run)
 * 3. Stale cache — plugins installed but marketplace version outdated
 */

import { commandExists, execSafe } from "../lib/exec.js";
import { logger } from "../lib/logger.js";

const DEFAULT_PLUGINS = ["composure", "sentinel", "shipyard", "testbench", "design-forge"];

interface PluginStatus {
  name: string;
  installed: boolean;
  enabled: boolean;
  version?: string;
  failed?: boolean;
}

/**
 * Parse `claude plugin list` output to get current plugin state.
 */
async function getInstalledPlugins(): Promise<Map<string, PluginStatus>> {
  const result = await execSafe("claude", ["plugin", "list"]);
  const plugins = new Map<string, PluginStatus>();

  if (result.exitCode !== 0) return plugins;

  // Parse the plugin list output — each plugin block starts with "❯ name@marketplace"
  const blocks = result.stdout.split(/❯\s+/);
  for (const block of blocks) {
    const nameMatch = block.match(/^(\S+)@(\S+)/);
    if (!nameMatch) continue;

    const name = nameMatch[1];
    const versionMatch = block.match(/Version:\s+(\S+)/);
    const enabled = block.includes("✔ enabled");
    const failed = block.includes("failed to load");

    plugins.set(name, {
      name,
      installed: true,
      enabled,
      version: versionMatch?.[1],
      failed,
    });
  }

  return plugins;
}

export async function installPlugins(options: {
  plugins: string[];
  selectedTools: string[];
}): Promise<{ installed: string[]; skipped: boolean; alreadyInstalled: string[] }> {
  // Can only install plugins if Claude Code is available
  if (!options.selectedTools.includes("claude") || !commandExists("claude")) {
    logger.info("Claude Code not available — skipping plugin installation");
    return { installed: [], skipped: true, alreadyInstalled: [] };
  }

  const plugins = options.plugins.length > 0 ? options.plugins : DEFAULT_PLUGINS;

  // Check what's already installed
  const currentPlugins = await getInstalledPlugins();
  const alreadyInstalled: string[] = [];
  const needsInstall: string[] = [];
  const needsUpdate: string[] = [];

  for (const plugin of plugins) {
    const status = currentPlugins.get(plugin);
    if (status?.installed && status.enabled) {
      alreadyInstalled.push(plugin);
    } else if (status?.installed && status.failed) {
      // Installed but broken — needs update
      needsUpdate.push(plugin);
    } else {
      needsInstall.push(plugin);
    }
  }

  // Report existing installs
  if (alreadyInstalled.length > 0) {
    logger.success(`Already installed: ${alreadyInstalled.join(", ")}`);
  }

  // Nothing to do
  if (needsInstall.length === 0 && needsUpdate.length === 0) {
    return { installed: alreadyInstalled, skipped: false, alreadyInstalled };
  }

  // Ensure marketplace is registered
  await execSafe("claude", [
    "plugin", "marketplace", "add", "hrconsultnj/claude-plugins",
  ]);

  const installed = [...alreadyInstalled];

  // Update broken plugins first
  for (const plugin of needsUpdate) {
    const result = await execSafe("claude", ["plugin", "update", plugin]);
    if (result.exitCode === 0) {
      installed.push(plugin);
    } else {
      // Try uninstall + reinstall for broken cache
      await execSafe("claude", ["plugin", "uninstall", plugin]);
      const reinstall = await execSafe("claude", [
        "plugin", "install", `${plugin}@my-claude-plugins`,
      ]);
      if (reinstall.exitCode === 0) {
        installed.push(plugin);
      } else {
        logger.warn(`${plugin}: update failed — run \`claude plugin update ${plugin}\` after next marketplace push`);
      }
    }
  }

  // Install new plugins
  for (const plugin of needsInstall) {
    const result = await execSafe("claude", [
      "plugin", "install", `${plugin}@my-claude-plugins`,
    ]);

    if (result.exitCode === 0) {
      installed.push(plugin);
    } else {
      const stderr = result.stderr || result.stdout;
      if (stderr.includes("already installed") || stderr.includes("already")) {
        installed.push(plugin);
      } else if (stderr.includes("Invalid") || stderr.includes("Validation")) {
        logger.warn(`${plugin}: marketplace needs update — will work after next publish`);
      } else {
        logger.warn(`${plugin}: install failed — ${stderr.split("\n")[0]}`);
      }
    }
  }

  return { installed, skipped: false, alreadyInstalled };
}
