#!/usr/bin/env node

/**
 * agents-loader.mjs
 *
 * Loads agent context with optional Pro overlay.
 * Reads base AGENTS.md, checks for Pro license, merges .pro.md overlay if valid.
 *
 * Usage:
 *   import { loadAgentContext } from './agents-loader.mjs';
 *   const context = loadAgentContext(pluginPath, projectRoot);
 *
 * CLI:
 *   node agents-loader.mjs <pluginPath> [projectRoot]
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Load composed agent context (base + optional Pro overlay).
 *
 * @param {string} pluginPath - Path to the plugin directory (e.g., "plugins/composure")
 * @param {string} [projectRoot=process.cwd()] - Path to the user's project root
 * @returns {string|null} Composed agent context, or null if no base AGENTS.md exists
 */
export function loadAgentContext(pluginPath, projectRoot = process.cwd()) {
  const baseFile = join(pluginPath, 'AGENTS.md');
  if (!existsSync(baseFile)) return null;

  const base = readFileSync(baseFile, 'utf-8');

  // Check for Pro license
  const proLicenseFile = join(projectRoot, '.composure', 'composure-pro.json');
  if (!existsSync(proLicenseFile)) return base;

  try {
    const license = JSON.parse(readFileSync(proLicenseFile, 'utf-8'));
    if (!isValidLicense(license)) return base;
  } catch {
    // Corrupted license file — fall back to free tier
    console.warn('[agents-loader] Warning: could not parse composure-pro.json, falling back to free tier');
    return base;
  }

  // Load Pro overlay
  const overlayFile = join(pluginPath, 'AGENTS.pro.md');
  if (!existsSync(overlayFile)) return base;

  try {
    const overlay = readFileSync(overlayFile, 'utf-8');
    return `${base}\n\n---\n\n${overlay}`;
  } catch {
    console.warn('[agents-loader] Warning: could not read AGENTS.pro.md, returning base only');
    return base;
  }
}

/**
 * Validate a Composure Pro license object.
 * @param {object} license - Parsed composure-pro.json content
 * @returns {boolean}
 */
function isValidLicense(license) {
  return license?.tier === 'pro' && license?.valid === true;
}

// CLI entry point
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [pluginPath, projectRoot] = process.argv.slice(2);
  if (!pluginPath) {
    console.error('Usage: node agents-loader.mjs <pluginPath> [projectRoot]');
    process.exit(1);
  }
  const context = loadAgentContext(pluginPath, projectRoot);
  if (context) {
    console.log(context);
  } else {
    console.error('No AGENTS.md found at', join(pluginPath, 'AGENTS.md'));
    process.exit(1);
  }
}
