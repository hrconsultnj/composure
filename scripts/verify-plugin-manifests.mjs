#!/usr/bin/env node

/**
 * verify-plugin-manifests.mjs
 *
 * CI/local sanity check — every plugin has required manifest keys,
 * declared directories are non-empty.
 *
 * Usage: node scripts/verify-plugin-manifests.mjs
 * Exit 0 = all valid, Exit 1 = errors found
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';

const PLUGINS_DIR = join(import.meta.dirname, '..', 'plugins');
const REQUIRED_KEYS = ['name', 'version', 'description', 'author', 'license'];
const DIR_KEYS = ['skills', 'commands', 'agents', 'hooks'];

const errors = [];
const warnings = [];

function addError(plugin, key, message) {
  errors.push({ plugin, key, message });
}

function addWarning(plugin, key, message) {
  warnings.push({ plugin, key, message });
}

function isNonEmptyDir(dir) {
  if (!existsSync(dir)) return false;
  if (!statSync(dir).isDirectory()) return false;
  return readdirSync(dir).length > 0;
}

function validateSemver(version) {
  return /^\d+\.\d+\.\d+/.test(version);
}

// Find all plugins with manifests
const pluginDirs = readdirSync(PLUGINS_DIR).filter(d => {
  const manifestPath = join(PLUGINS_DIR, d, '.claude-plugin', 'plugin.json');
  return existsSync(manifestPath);
});

if (pluginDirs.length === 0) {
  console.error('No plugin manifests found in', PLUGINS_DIR);
  process.exit(1);
}

for (const pluginDir of pluginDirs) {
  const manifestPath = join(PLUGINS_DIR, pluginDir, '.claude-plugin', 'plugin.json');
  const pluginRoot = join(PLUGINS_DIR, pluginDir);

  // Parse JSON
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    addError(pluginDir, 'json', `Invalid JSON: ${e.message}`);
    continue;
  }

  // Check name matches directory
  if (manifest.name !== pluginDir) {
    addError(pluginDir, 'name', `Manifest name "${manifest.name}" doesn't match directory "${pluginDir}"`);
  }

  // Check required keys
  for (const key of REQUIRED_KEYS) {
    if (key === 'author') {
      if (!manifest.author || !manifest.author.name) {
        addError(pluginDir, key, 'Missing author.name');
      }
    } else if (!manifest[key] || (typeof manifest[key] === 'string' && manifest[key].trim() === '')) {
      addError(pluginDir, key, `Missing or empty "${key}"`);
    }
  }

  // Check version is semver
  if (manifest.version && !validateSemver(manifest.version)) {
    addError(pluginDir, 'version', `Version "${manifest.version}" is not valid semver`);
  }

  // Check declared directories exist and are non-empty
  for (const key of DIR_KEYS) {
    if (!manifest[key]) continue; // Not declared, skip

    const declaredPath = manifest[key].replace(/^\.\//, '');
    const fullPath = join(pluginRoot, declaredPath);

    if (!existsSync(fullPath)) {
      addError(pluginDir, key, `Declared "${key}": "${manifest[key]}" but directory doesn't exist at ${fullPath}`);
      continue;
    }

    if (!isNonEmptyDir(fullPath)) {
      addError(pluginDir, key, `Declared "${key}": "${manifest[key]}" but directory is empty`);
      continue;
    }

    // Check if directory only has .gitkeep (placeholder for future content)
    const contents = readdirSync(fullPath).filter(f => f !== '.gitkeep' && f !== '.DS_Store');
    if (contents.length === 0) {
      addWarning(pluginDir, key, `${key}/ has only placeholder files — content expected in a later stage`);
      continue;
    }

    // Check for expected content
    if (key === 'skills') {
      const skills = contents.filter(d =>
        existsSync(join(fullPath, d, 'SKILL.md'))
      );
      if (skills.length === 0) {
        addError(pluginDir, key, 'skills/ has no subdirectories with SKILL.md');
      }
    }

    if (key === 'hooks') {
      if (!existsSync(join(fullPath, 'hooks.json'))) {
        addError(pluginDir, key, 'hooks/ missing hooks.json');
      }
    }
  }
}

// Report
if (warnings.length > 0) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  ${w.plugin} [${w.key}] ${w.message}`);
  }
  console.log();
}

if (errors.length === 0) {
  console.log(`All ${pluginDirs.length} plugins valid ✓`);
  for (const p of pluginDirs) {
    const m = JSON.parse(readFileSync(join(PLUGINS_DIR, p, '.claude-plugin', 'plugin.json'), 'utf-8'));
    console.log(`  ${p} v${m.version}`);
  }
  process.exit(0);
} else {
  console.error(`Found ${errors.length} error(s) across ${new Set(errors.map(e => e.plugin)).size} plugin(s):\n`);
  const grouped = {};
  for (const e of errors) {
    if (!grouped[e.plugin]) grouped[e.plugin] = [];
    grouped[e.plugin].push(e);
  }
  for (const [plugin, errs] of Object.entries(grouped)) {
    console.error(`  ${plugin}:`);
    for (const e of errs) {
      console.error(`    [${e.key}] ${e.message}`);
    }
  }
  process.exit(1);
}
