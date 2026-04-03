/**
 * Config loader — dual-read from .composure/ then .claude/ with caching.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ComposureConfig, FrameworkRuleGroup } from "./types.js";

const configCache = new Map<string, ComposureConfig | null>();

/**
 * Load Composure project config with dual-read fallback.
 * Returns null if no config found (project not initialized).
 */
export function loadConfig(projectDir: string): ComposureConfig | null {
  const cached = configCache.get(projectDir);
  if (cached !== undefined) return cached;

  const composurePath = join(projectDir, ".composure", "no-bandaids.json");
  const claudePath = join(projectDir, ".claude", "no-bandaids.json");

  let configPath: string | null = null;
  if (existsSync(composurePath)) {
    configPath = composurePath;
  } else if (existsSync(claudePath)) {
    configPath = claudePath;
  }

  if (!configPath) {
    configCache.set(projectDir, null);
    return null;
  }

  try {
    const raw = readFileSync(configPath, "utf8");
    const config = JSON.parse(raw) as ComposureConfig;
    configCache.set(projectDir, config);
    return config;
  } catch {
    configCache.set(projectDir, null);
    return null;
  }
}

/**
 * Load framework validation rules from a plugin defaults JSON file.
 * Returns the rules object, or null if the file doesn't exist / is invalid.
 */
export function loadDefaultRules(
  filePath: string,
): Record<string, FrameworkRuleGroup> | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const rules: Record<string, FrameworkRuleGroup> | undefined = parsed.rules;
    return rules ?? null;
  } catch {
    return null;
  }
}

/**
 * Detect the project root from a file path by walking up to find
 * .composure/no-bandaids.json, .claude/no-bandaids.json, or .git.
 */
export function findProjectRoot(filePath: string): string | null {
  let dir = filePath;
  // If it's a file, start from its directory
  if (!dir.endsWith("/")) {
    dir = dir.substring(0, dir.lastIndexOf("/")) || "/";
  }

  while (dir !== "/" && dir !== ".") {
    if (
      existsSync(join(dir, ".composure", "no-bandaids.json")) ||
      existsSync(join(dir, ".claude", "no-bandaids.json")) ||
      existsSync(join(dir, ".git"))
    ) {
      return dir;
    }
    dir = dir.substring(0, dir.lastIndexOf("/")) || "/";
  }
  return null;
}

/** Clear the config cache (for testing or config reload). */
export function clearConfigCache(): void {
  configCache.clear();
}
