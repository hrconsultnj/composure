#!/usr/bin/env node

/**
 * composure-sync-pull.mjs — Cross-machine bootstrap (Slice N4, 2026-05-17)
 *
 * Restore the user's plugin set on a new machine:
 *   1. Verify auth (delegates to composure-token validate)
 *   2. Fetch manifest from SaaS (GET /api/v1/account/manifest)
 *      Falls back to local ~/.composure/manifest.json if SaaS unreachable.
 *   3. Print install plan (claude plugin marketplace add + claude plugin install)
 *   4. (Stub) Cortex graph restore — opt-in via --restore-cortex
 *
 * Usage:
 *   composure-sync-pull                  Fetch + print install plan
 *   composure-sync-pull --dry-run        Same; flag is informational (this command is always print-only)
 *   composure-sync-pull --restore-cortex Also attempt Cortex backup restore (stub today)
 *
 * SaaS endpoint status (2026-05-17): NOT yet implemented.
 * The binary falls back to local manifest when SaaS returns 404 / fails.
 * See: tasks-plans/blueprints/composure-consolidation-2026-05-17.md (Wave E)
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { API_BASE, getValidToken, readAccount } from "./composure-token.mjs";

const HOME = homedir();
const COMPOSURE_DIR = join(HOME, ".composure");
const LOCAL_MANIFEST_PATH = join(COMPOSURE_DIR, "manifest.json");
const SAAS_MANIFEST_ENDPOINT = `${API_BASE}/api/v1/account/manifest`;
const FETCH_TIMEOUT_MS = 10_000;

const argv = new Set(process.argv.slice(2));
const RESTORE_CORTEX = argv.has("--restore-cortex");

// ── Step 1: Auth ─────────────────────────────────────────────────────

async function checkAuth() {
  const token = await getValidToken();
  if (!token) {
    console.error("✗ Not authenticated.");
    console.error("  Run /composure:account login first, then re-invoke /composure:sync pull.");
    process.exit(1);
  }
  const account = readAccount() ?? {};
  const email = account.email ?? "unknown";
  const plan = account.plan ?? "free";
  const maskedEmail = email.replace(/^(.).*(@.*)$/, "$1***$2");
  console.log(`1. Auth:             ✅ logged in as ${maskedEmail} (${plan} plan)`);
  return token;
}

// ── Step 2: Manifest fetch (SaaS, with local fallback) ──────────────

async function fetchManifest(token) {
  // Try SaaS first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(SAAS_MANIFEST_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      console.log(`2. Manifest fetch:   ✅ retrieved ${Object.keys(data.installed_plugins ?? {}).length} plugins from SaaS`);
      return { source: "saas", manifest: data };
    }
    // 404 expected today (endpoint not yet implemented)
    if (res.status === 404) {
      console.log("2. Manifest fetch:   ⚠ SaaS endpoint pending implementation (Wave E)");
    } else {
      console.log(`2. Manifest fetch:   ⚠ SaaS returned ${res.status}; falling back to local`);
    }
  } catch (err) {
    console.log(`2. Manifest fetch:   ⚠ SaaS unreachable (${err.message}); falling back to local`);
  }

  // Fall back to local manifest
  if (!existsSync(LOCAL_MANIFEST_PATH)) {
    console.error("   ✗ No local manifest found either. Cannot construct install plan.");
    console.error(`   Expected: ${LOCAL_MANIFEST_PATH}`);
    process.exit(1);
  }
  try {
    const local = JSON.parse(readFileSync(LOCAL_MANIFEST_PATH, "utf8"));
    const count = Object.keys(local.installed_plugins ?? {}).length;
    console.log(`                     using LOCAL manifest (${count} plugins)`);
    console.log(`                     (this is the install set from THIS machine — useful for previewing the future SaaS flow)`);
    return { source: "local", manifest: local };
  } catch (err) {
    console.error(`   ✗ Local manifest corrupt: ${err.message}`);
    process.exit(1);
  }
}

// ── Step 3: Emit install plan ───────────────────────────────────────

function emitInstallPlan(manifest) {
  const plugins = manifest.installed_plugins ?? {};
  const upstream = manifest.upstream ?? {};
  const marketplaceUrl = upstream.marketplace_url ?? "https://github.com/hrconsultnj/claude-plugins.git";
  // Derive owner/repo form from URL for `claude plugin marketplace add`
  const m = marketplaceUrl.match(/github\.com[\/:]([\w-]+)\/([\w-]+?)(\.git)?$/);
  const ownerRepo = m ? `${m[1]}/${m[2]}` : marketplaceUrl;
  const marketplaceName = manifest.marketplace_name ?? "composure-suite";

  const pluginNames = Object.keys(plugins);
  console.log(`3. Install plan:     ${pluginNames.length} plugin(s) to install`);
  console.log("");
  console.log("Run these in Claude Code (or in your terminal if `claude` CLI is on PATH):");
  console.log("");
  console.log(`  claude plugin marketplace add ${ownerRepo}`);
  for (const name of pluginNames) {
    console.log(`  claude plugin install ${name}@${marketplaceName}`);
  }
  console.log("");
  return pluginNames.length;
}

// ── Step 4: Cortex restore (stub) ───────────────────────────────────

function maybeRestoreCortex() {
  if (!RESTORE_CORTEX) {
    console.log("4. Cortex restore:   skipped (use --restore-cortex to download backup)");
    return;
  }
  console.log("4. Cortex restore:   ⚠ stub — backup endpoint not implemented (Wave E)");
}

// ── Main ────────────────────────────────────────────────────────────

(async function main() {
  console.log("─── composure:sync pull ────────────────────");
  const token = await checkAuth();
  const { source, manifest } = await fetchManifest(token);
  const count = emitInstallPlan(manifest);
  maybeRestoreCortex();
  console.log("────────────────────────────────────────────");
  if (source === "local") {
    console.log(`Ready. ${count + 1} commands above will restore the plugin set on this or another machine.`);
    console.log("(SaaS manifest endpoint is pending — Wave E. Until then, pull is preview-only.)");
  } else {
    console.log(`Ready. Run the ${count + 1} commands above to complete the bootstrap.`);
  }
  process.exit(0);
})();
