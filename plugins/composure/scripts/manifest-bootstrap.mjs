#!/usr/bin/env node
// Writes / refreshes ~/.composure/manifest.json — the Composure-native
// source-of-truth for what plugin runtime is currently installed.
//
// Why this exists: today every hook resolves plugin paths via the
// `CLAUDE_PLUGIN_ROOT` env var, which points into Claude marketplace cache
// (`~/.claude/plugins/cache/composure-suite/composure/<version>/`). That
// couples Composure to the Claude CLI host. The manifest decouples them:
// hooks/skills read paths from manifest first, env var only as a cold-boot
// fallback. When we ship an npm-installed runtime or a different host, only
// the `source` field changes — every consumer keeps working.
//
// Invoked by:
//   1. composure-freshness.sh on cold boot (manifest missing)
//   2. /composure:update after a successful version bump
//   3. Manual:  node manifest-bootstrap.mjs [--force]
//
// Exit codes: 0 = ok, 1 = unrecoverable (no install detected).

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const HOME = homedir();
const COMPOSURE_HOME = join(HOME, ".composure");
const MANIFEST_PATH = join(COMPOSURE_HOME, "manifest.json");
const CLAUDE_PLUGINS = join(HOME, ".claude", "plugins");
const SUITE_CACHE = join(CLAUDE_PLUGINS, "cache", "composure-suite");
const MARKETPLACE_SRC = join(CLAUDE_PLUGINS, "marketplaces", "composure-suite");
const INSTALL_MANIFESTS = join(CLAUDE_PLUGINS, ".install-manifests");

const force = process.argv.includes("--force");
const quiet = process.argv.includes("--quiet");

function log(msg) { if (!quiet) process.stderr.write(`[composure:manifest] ${msg}\n`); }
function die(msg) { process.stderr.write(`[composure:manifest] FATAL ${msg}\n`); process.exit(1); }

function readJSON(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function gitRevParse(dir, ref = "HEAD") {
  try {
    return execSync(`git -C "${dir}" rev-parse ${ref}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch { return null; }
}

function newestVersionDir(pluginCache) {
  if (!existsSync(pluginCache)) return null;
  const versions = readdirSync(pluginCache).filter(v => /^\d+\.\d+\.\d+/.test(v));
  if (!versions.length) return null;
  versions.sort((a, b) => {
    const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
    return 0;
  });
  return versions[0];
}

function fileHash(path) {
  try { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
  catch { return null; }
}

// Detect the installed-plugins map from Claude marketplace internal state.
// Fail-open: if Claude's schema shifts, we record `null` and let the freshness
// hook re-check at next boot.
function detectInstalledPlugins() {
  const installedFile = join(CLAUDE_PLUGINS, "installed_plugins.json");
  const installed = readJSON(installedFile);
  if (!installed || typeof installed !== "object") return {};
  const out = {};
  for (const [key, val] of Object.entries(installed)) {
    if (!key.endsWith("@composure-suite")) continue;
    const name = key.split("@")[0];
    out[name] = {
      gitCommitSha: val?.gitCommitSha ?? null,
      installedAt: val?.installedAt ?? null,
    };
  }
  return out;
}

function buildPluginEntry(name) {
  const pluginCache = join(SUITE_CACHE, name);
  const version = newestVersionDir(pluginCache);
  if (!version) return null;
  const runtimePath = join(pluginCache, version);
  const pluginJson = readJSON(join(runtimePath, ".claude-plugin", "plugin.json")) ?? {};
  const installManifest = readJSON(join(INSTALL_MANIFESTS, `${name}@composure-suite.json`));
  return {
    name,
    version: pluginJson.version ?? version,
    source: "claude-marketplace",
    runtime_path: runtimePath,
    integrity: {
      plugin_json_sha256: fileHash(join(runtimePath, ".claude-plugin", "plugin.json")),
      install_manifest_created_at: installManifest?.createdAt ?? null,
      files_recorded: installManifest?.files ? Object.keys(installManifest.files).length : 0,
    },
    verified_at: Math.floor(Date.now() / 1000),
  };
}

function buildManifest() {
  const plugins = ["composure", "design-forge", "sentinel", "shipyard", "testbench"];
  const installed = {};
  for (const name of plugins) {
    const entry = buildPluginEntry(name);
    if (entry) installed[name] = entry;
  }
  if (!Object.keys(installed).length) die("no plugins detected under " + SUITE_CACHE);

  const claudeInstalled = detectInstalledPlugins();
  for (const [name, info] of Object.entries(claudeInstalled)) {
    if (installed[name]) installed[name].claude_commit_sha = info.gitCommitSha;
  }

  const marketplaceHead = gitRevParse(MARKETPLACE_SRC);
  const upstream = {
    channel: "stable",
    marketplace_url: "https://github.com/hrconsultnj/claude-plugins.git",
    last_known_commit: marketplaceHead,
    last_checked_at: Math.floor(Date.now() / 1000),
  };

  return {
    $schema: "https://composure-pro.com/schema/manifest-v1.json",
    schema_version: 1,
    generated_at: new Date().toISOString(),
    installed_plugins: installed,
    upstream,
    policy: {
      check_interval_seconds: 14400,     // 4h — matches existing autoupdate cadence
      drift_action: "warn",              // warn | heal | block
      reload_prompt: true,                // ask the user to /reload when an update lands
      auto_update: false,                 // future: when true, /composure:update runs unattended
    },
  };
}

function main() {
  if (!existsSync(COMPOSURE_HOME)) mkdirSync(COMPOSURE_HOME, { recursive: true });
  if (existsSync(MANIFEST_PATH) && !force) {
    const cur = readJSON(MANIFEST_PATH);
    if (cur?.schema_version === 1) { log("manifest exists; pass --force to rewrite"); process.exit(0); }
    log("manifest schema mismatch; rewriting");
  }
  const next = buildManifest();
  writeFileSync(MANIFEST_PATH, JSON.stringify(next, null, 2) + "\n");
  log(`wrote ${MANIFEST_PATH} (${Object.keys(next.installed_plugins).length} plugins)`);
}

main();
