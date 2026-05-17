#!/usr/bin/env node

/**
 * composure-update.mjs — Composure Workspace Self-Heal
 *
 * Single CLI entry point for "make my Composure install current."
 * Orchestrates the 8-step update flow (auth → plugin version → config
 * migration → framework detect → hook integrity → stale references →
 * cortex sqlite → summary).
 *
 * Per blueprint composure-auth-update-unification-2026-05-11.md:
 * - Replaces the old `composure-auth.mjs migrate` subcommand (now removed).
 * - Replaces /composure:update-project skill (now removed).
 * - Called by /composure:sync skill, by SessionStart auto-fix.sh hook,
 *   and directly by users who want a single command.
 *
 * Usage:
 *   composure-update                  Run all 8 steps; auto-fix what's safe
 *   composure-update --dry-run        Detect drift; print proposed actions; no changes
 *   composure-update --verbose        Per-step debug output alongside summary
 */

import { execSync } from "node:child_process";
import {
  existsSync, readFileSync, writeFileSync, readdirSync,
  mkdirSync, cpSync, rmSync, renameSync, statSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const COMPOSURE_DIR = join(HOME, ".composure");
const CREDENTIALS_PATH = join(COMPOSURE_DIR, "credentials.json");

// ── Argv ─────────────────────────────────────────────────────────────
const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has("--dry-run");
const VERBOSE = argv.has("--verbose");

// ── Step result type: { name, status, message, details? } ───────────
// status: 'noop' | 'fixed' | 'needs-action' | 'error'
const results = [];

function record(name, status, message, details) {
  results.push({ name, status, message, details });
  if (VERBOSE) {
    const icon = { noop: "·", fixed: "⚡", "needs-action": "⚠", error: "✗" }[status];
    console.error(`  ${icon} ${name}: ${message}`);
  }
}

function findProjectDir() {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    return process.cwd();
  }
}

// ── Step 01: Auth Check ──────────────────────────────────────────────
async function step01_authCheck() {
  if (!existsSync(CREDENTIALS_PATH)) {
    if (DRY_RUN) {
      record("Auth", "needs-action", "would prompt browser login (no credentials.json)");
      return;
    }
    record("Auth", "needs-action", "no credentials.json — run `composure-auth login` first");
    return;
  }
  let creds;
  try {
    creds = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
  } catch {
    record("Auth", "error", "credentials.json unparseable");
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const expires = Number(creds.expires_at) || 0;
  const buffer = 24 * 60 * 60; // 24h
  if (expires < now) {
    if (DRY_RUN) {
      record("Auth", "needs-action", "would refresh expired token");
      return;
    }
    try {
      execSync(`${HOME}/.composure/bin/composure-auth.mjs refresh`, { stdio: "pipe" });
      record("Auth", "fixed", `refreshed expired token (logged in as ${creds.email}, plan ${creds.plan})`);
    } catch {
      record("Auth", "needs-action", "refresh failed — run `composure-auth login`");
    }
    return;
  }
  if (expires < now + buffer) {
    if (!DRY_RUN) {
      try { execSync(`${HOME}/.composure/bin/composure-auth.mjs refresh`, { stdio: "pipe" }); } catch {}
    }
  }
  record("Auth", "noop", `logged in as ${creds.email}, plan ${creds.plan}`);
}

// ── Step 02: Plugin Version Check ────────────────────────────────────
// Per research file: ~/.claude/plugins/installed_plugins.json + git rev-parse origin/HEAD
async function step02_pluginVersion() {
  const lastCheckPath = join(COMPOSURE_DIR, "last-autoupdate-check");
  const cacheTtl = 24 * 60 * 60 * 1000;
  if (existsSync(lastCheckPath)) {
    const age = Date.now() - statSync(lastCheckPath).mtimeMs;
    if (age < cacheTtl) {
      record("Plugin version", "noop", "checked < 24h ago");
      return;
    }
  }

  const installedPath = join(HOME, ".claude", "plugins", "installed_plugins.json");
  const cacheBase = join(HOME, ".claude", "plugins", "cache", "composure-suite");
  if (!existsSync(installedPath) || !existsSync(cacheBase)) {
    record("Plugin version", "noop", "no plugin install detected (fail open)");
    if (!DRY_RUN) writeFileSync(lastCheckPath, "");
    return;
  }

  try {
    const installed = JSON.parse(readFileSync(installedPath, "utf8"));
    const composureEntry = installed.plugins?.["composure@composure-suite"]?.[0];
    if (!composureEntry?.gitCommitSha) {
      record("Plugin version", "noop", "installed_plugins.json lacks gitCommitSha (fail open)");
      if (!DRY_RUN) writeFileSync(lastCheckPath, "");
      return;
    }
    const installedSha = composureEntry.gitCommitSha;
    const headSha = execSync(`git -C "${cacheBase}" rev-parse origin/HEAD`, { encoding: "utf8" }).trim();
    if (installedSha === headSha) {
      record("Plugin version", "noop", `${composureEntry.version} — current`);
      if (!DRY_RUN) writeFileSync(lastCheckPath, "");
      return;
    }
    let behind = "?";
    try {
      behind = execSync(`git -C "${cacheBase}" rev-list --count ${installedSha}..${headSha}`, { encoding: "utf8" }).trim();
    } catch {}
    record("Plugin version", "needs-action",
      `${behind} commits behind — in Claude Code: /plugin install composure@composure-suite`);
    if (!DRY_RUN) writeFileSync(lastCheckPath, "");
  } catch (err) {
    // Fail open — installed_plugins.json is internal Claude Code state
    record("Plugin version", "noop", `version check failed (fail open): ${err.message.slice(0, 60)}`);
  }
}

// ── Step 03: Config Migration (.claude/ → .composure/) ───────────────
async function step03_configMigration() {
  const projectDir = findProjectDir();
  const claudeDir = join(projectDir, ".claude");
  const composureDir = join(projectDir, ".composure");
  const fixed = [];
  let migrated = 0;

  // Scaffold .composure/ directory structure
  const requiredDirs = [
    composureDir,
    join(composureDir, "frameworks", "generated"),
    join(composureDir, "frameworks", "project"),
    join(composureDir, "development", "workspaces"),
    join(composureDir, "cortex"),
    join(composureDir, "graph"),
  ];
  for (const dir of requiredDirs) {
    if (!existsSync(dir)) {
      if (DRY_RUN) { fixed.push(`would create ${dir.replace(projectDir + "/", "")}`); migrated++; }
      else { mkdirSync(dir, { recursive: true }); fixed.push(`created ${dir.replace(projectDir + "/", "")}`); migrated++; }
    }
  }

  // Migrate no-bandaids.json
  const noBandaids = join(composureDir, "no-bandaids.json");
  const legacyNoBandaids = join(claudeDir, "no-bandaids.json");
  if (!existsSync(noBandaids) && existsSync(legacyNoBandaids)) {
    if (DRY_RUN) { fixed.push("would migrate no-bandaids.json"); migrated++; }
    else { cpSync(legacyNoBandaids, noBandaids); fixed.push("migrated no-bandaids.json"); migrated++; }
  }

  // Migrate companion configs
  for (const companion of ["sentinel", "shipyard", "testbench", "composure-pro"]) {
    const target = join(composureDir, `${companion}.json`);
    const legacy = join(claudeDir, `${companion}.json`);
    if (!existsSync(target) && existsSync(legacy)) {
      if (DRY_RUN) { fixed.push(`would migrate ${companion}.json`); migrated++; }
      else { cpSync(legacy, target); fixed.push(`migrated ${companion}.json`); migrated++; }
    }
  }

  // Migrate frameworks/
  const fwGenerated = join(composureDir, "frameworks", "generated");
  const legacyFw = join(claudeDir, "frameworks");
  if (existsSync(fwGenerated) && readdirSync(fwGenerated).length === 0 && existsSync(legacyFw)) {
    if (DRY_RUN) { fixed.push("would migrate frameworks/"); migrated++; }
    else {
      cpSync(legacyFw, join(composureDir, "frameworks"), { recursive: true });
      try { rmSync(legacyFw, { recursive: true }); } catch {}
      fixed.push("migrated frameworks/");
      migrated++;
    }
  }

  // Migrate .code-review-graph/ → .composure/graph/
  const newGraphDir = join(composureDir, "graph");
  const newGraphDb = join(newGraphDir, "graph.db");
  const legacyGraphDir = join(projectDir, ".code-review-graph");
  const legacyGraphDb = join(legacyGraphDir, "graph.db");
  if (!existsSync(newGraphDb) && existsSync(legacyGraphDb)) {
    if (DRY_RUN) { fixed.push("would migrate .code-review-graph/ → .composure/graph/"); migrated++; }
    else {
      for (const file of readdirSync(legacyGraphDir)) {
        if (file === ".gitignore") continue;
        renameSync(join(legacyGraphDir, file), join(newGraphDir, file));
      }
      try { rmSync(legacyGraphDir, { recursive: true }); } catch {}
      fixed.push("migrated .code-review-graph/ → .composure/graph/");
      migrated++;
    }
  }

  // Migrate loose .composure/cortex.db → .composure/cortex/cortex.db
  const cortexDbNew = join(composureDir, "cortex", "cortex.db");
  const cortexDbOld = join(composureDir, "cortex.db");
  if (!existsSync(cortexDbNew) && existsSync(cortexDbOld)) {
    if (DRY_RUN) { fixed.push("would migrate cortex.db location"); migrated++; }
    else {
      for (const suffix of ["", "-shm", "-wal"]) {
        const src = cortexDbOld + suffix;
        const dst = cortexDbNew + suffix;
        if (existsSync(src)) renameSync(src, dst);
      }
      fixed.push("migrated cortex.db location");
      migrated++;
    }
  }

  // .gitignore entries
  const gitignorePath = join(projectDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf8");
    const missing = [];
    if (!content.includes(".composure/")) missing.push(".composure/");
    if (!content.includes(".code-review-graph")) missing.push(".code-review-graph/");
    if (missing.length > 0) {
      if (DRY_RUN) { fixed.push(`would add ${missing.join(", ")} to .gitignore`); migrated++; }
      else {
        writeFileSync(gitignorePath, content.trimEnd() + "\n\n# Composure\n" + missing.join("\n") + "\n");
        fixed.push(`added ${missing.join(", ")} to .gitignore`);
        migrated++;
      }
    }
  }

  if (migrated === 0) record("Config migration", "noop", "nothing to migrate");
  else record("Config migration", DRY_RUN ? "needs-action" : "fixed",
    `${migrated} change(s)`, fixed);
}

// ── Step 04: Framework Detect ────────────────────────────────────────
async function step04_frameworkDetect() {
  const projectDir = findProjectDir();
  const noBandaids = join(projectDir, ".composure", "no-bandaids.json");
  if (existsSync(noBandaids)) {
    record("Framework detect", "noop", ".composure/no-bandaids.json present");
    return;
  }
  // Hook can't directly invoke a slash command; surface for AI to invoke
  record("Framework detect", "needs-action",
    "no-bandaids.json missing — run /composure:initialize");
}

// ── Step 05: Hook Integrity ──────────────────────────────────────────
async function step05_hookIntegrity() {
  const cacheBase = join(HOME, ".claude", "plugins", "cache", "composure-suite", "composure");
  if (!existsSync(cacheBase)) {
    record("Hook integrity", "noop", "no plugin install detected");
    return;
  }
  const versions = readdirSync(cacheBase).sort();
  const latest = versions[versions.length - 1];
  if (!latest) {
    record("Hook integrity", "noop", "no version dir found");
    return;
  }
  const integrityPath = join(cacheBase, latest, "hooks", ".hooks-integrity.json");
  if (!existsSync(integrityPath)) {
    record("Hook integrity", "needs-action", "manifest missing — reinstall plugin");
    return;
  }
  let manifest;
  try { manifest = JSON.parse(readFileSync(integrityPath, "utf8")); }
  catch { record("Hook integrity", "needs-action", "manifest unparseable"); return; }

  const hookEntries = manifest.hooks || manifest;
  const mismatches = [];
  for (const [name, entry] of Object.entries(hookEntries)) {
    if (typeof entry !== "object" || !entry.path || !entry.sha256) continue;
    const fullPath = join(cacheBase, latest, "hooks", entry.path);
    if (!existsSync(fullPath)) { mismatches.push({ name, reason: "file_missing" }); continue; }
    try {
      const actual = execSync(`shasum -a 256 "${fullPath}"`, { encoding: "utf8" }).split(/\s+/)[0];
      if (actual !== entry.sha256) mismatches.push({ name, reason: "hash_diff" });
    } catch { mismatches.push({ name, reason: "shasum_failed" }); }
  }

  if (mismatches.length === 0) {
    record("Hook integrity", "noop", `${Object.keys(hookEntries).length} hooks verified`);
  } else {
    record("Hook integrity", "needs-action",
      `${mismatches.length} mismatch(es) — reinstall plugin`, mismatches);
  }
}

// ── Step 06: Stale References Scan ───────────────────────────────────
const STALE_REF_RENAMES = {
  "hooks/enforcement/architecture-skill-trigger.sh": "hooks/enforcement/pattern-loader.sh",
  "hooks/prompt/request-classifier.sh": "hooks/prompt/request-classifier.mjs",
};

async function step06_staleReferences() {
  const projectDir = findProjectDir();
  const settingsPath = join(projectDir, ".claude", "settings.local.json");
  if (!existsSync(settingsPath)) {
    record("Stale references", "noop", "no settings.local.json");
    return;
  }
  const cacheBase = join(HOME, ".claude", "plugins", "cache", "composure-suite", "composure");
  if (!existsSync(cacheBase)) {
    record("Stale references", "noop", "no plugin install to validate against");
    return;
  }
  const versions = readdirSync(cacheBase).sort();
  const latest = versions[versions.length - 1];
  if (!latest) { record("Stale references", "noop", "no version dir"); return; }

  let settings;
  try { settings = readFileSync(settingsPath, "utf8"); }
  catch { record("Stale references", "noop", "settings.local.json unreadable"); return; }

  const stale = [];
  // Match hook paths in command strings
  const hookPathRe = /hooks\/[a-zA-Z0-9_/.-]+\.(?:sh|mjs)/g;
  const matches = settings.matchAll(hookPathRe);
  const seen = new Set();
  for (const m of matches) {
    const relPath = m[0];
    if (seen.has(relPath)) continue;
    seen.add(relPath);
    const fullPath = join(cacheBase, latest, relPath);
    if (!existsSync(fullPath)) {
      const suggested = STALE_REF_RENAMES[relPath] || "(remove this line)";
      stale.push({ current: relPath, suggested });
    }
  }

  if (stale.length === 0) {
    record("Stale references", "noop", "all hook references valid");
  } else {
    record("Stale references", "needs-action",
      `${stale.length} stale ref(s) in .claude/settings.local.json`, stale);
  }
}

// ── Step 07: Cortex Sqlite ───────────────────────────────────────────
async function step07_cortexSqlite() {
  const sessionsDir = join(COMPOSURE_DIR, "sessions");
  const indexDb = join(sessionsDir, "index.db");
  const reindexScript = join(sessionsDir, "cli", "reindex-all.mjs");

  if (!existsSync(sessionsDir)) {
    record("Cortex sqlite", "noop", "sessions infra not installed");
    return;
  }
  if (!existsSync(indexDb)) {
    if (!existsSync(reindexScript)) {
      record("Cortex sqlite", "needs-action", "index.db missing AND reindex script missing");
      return;
    }
    if (DRY_RUN) { record("Cortex sqlite", "needs-action", "would run reindex"); return; }
    try {
      execSync(`node "${reindexScript}"`, { stdio: "pipe" });
      record("Cortex sqlite", "fixed", "reindex completed");
    } catch (err) {
      record("Cortex sqlite", "needs-action", `reindex failed: ${err.message.slice(0, 60)}`);
    }
    return;
  }
  // File exists; assume ok (counting rows would need sqlite3 binary)
  record("Cortex sqlite", "noop", "OK");
}

// ── Step 08: Summary ─────────────────────────────────────────────────
function step08_summary() {
  const counts = { fixed: 0, "needs-action": 0, error: 0, noop: 0 };
  for (const r of results) counts[r.status]++;

  console.log("\nComposure Update");
  console.log("─".repeat(48));
  for (const r of results) {
    const icon = { noop: "✓", fixed: "⚡", "needs-action": "⚠", error: "✗" }[r.status];
    console.log(`${icon} ${r.name.padEnd(20)} ${r.message}`);
  }
  console.log("─".repeat(48));
  if (DRY_RUN) {
    console.log(`(dry-run) ${counts["needs-action"] + counts.fixed} change(s) proposed, 0 applied`);
  } else {
    console.log(`${counts.fixed} fixed · ${counts["needs-action"]} need action · ${counts.noop} OK · ${counts.error} error`);
  }

  // Next-steps footer
  const needsAction = results.filter((r) => r.status === "needs-action");
  if (needsAction.length > 0) {
    console.log("\nNext steps for you:");
    for (const r of needsAction) {
      console.log(`  • ${r.name}: ${r.message}`);
      if (r.details && Array.isArray(r.details)) {
        for (const d of r.details) {
          if (d.current && d.suggested) {
            console.log(`      ${d.current}  →  ${d.suggested}`);
          }
        }
      }
    }
  }

  console.log("\nRun /composure:health for read-only diagnostics. Set COMPOSURE_DEBUG=1 for verbose hook output.");

  // Exit code
  if (counts.error > 0) process.exit(2);
  if (counts["needs-action"] > 0) process.exit(1);
  process.exit(0);
}

// ── Main ─────────────────────────────────────────────────────────────
(async () => {
  await step01_authCheck();
  await step02_pluginVersion();
  await step03_configMigration();
  await step04_frameworkDetect();
  await step05_hookIntegrity();
  await step06_staleReferences();
  await step07_cortexSqlite();
  step08_summary();
})().catch((err) => {
  console.error(`composure-update fatal: ${err.message}`);
  process.exit(2);
});
