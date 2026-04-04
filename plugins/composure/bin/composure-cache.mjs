#!/usr/bin/env node

/**
 * composure-cache.mjs — Cache Manager
 *
 * Manages the local skill/hook cache at ~/.composure/cache/.
 *
 * Usage:
 *   composure-cache sync      # Download all content for your plan
 *   composure-cache list      # Show cached content with freshness
 *   composure-cache clear     # Delete all cached content
 *   composure-cache validate  # Check cache integrity
 */

import {
  readdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync, mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { createCipheriv, randomBytes } from "node:crypto";
import { getValidToken, validateLicense, getCacheKey, API_BASE, COMPOSURE_DIR } from "./composure-token.mjs";

// ── Constants ────────────────────────────────────────────────────────

const CACHE_DIR = join(COMPOSURE_DIR, "cache");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SYNC_RETRY_COUNT = 2;
const SYNC_TIMEOUT_MS = 10_000;
const SYNC_BACKOFF_MS = 1000;

// ── Resilient Fetch ─────────────────────────────────────────────────

async function resilientFetch(url, options) {
  for (let attempt = 1; attempt <= SYNC_RETRY_COUNT; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      if (attempt < SYNC_RETRY_COUNT) {
        await new Promise((r) => setTimeout(r, SYNC_BACKOFF_MS * attempt));
        continue;
      }
      throw err;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function walkDir(dir, base = dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, base));
    } else if (!entry.name.endsWith(".meta.json")) {
      const rel = full.slice(base.length + 1);
      const metaPath = full + ".meta.json";
      let meta = null;
      try {
        meta = JSON.parse(readFileSync(metaPath, "utf8"));
      } catch { /* no meta */ }
      const stat = statSync(full);
      results.push({ path: rel, size: stat.size, meta });
    }
  }
  return results;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatAge(isoDate) {
  if (!isoDate) return "unknown";
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Command: sync ────────────────────────────────────────────────────

async function sync() {
  const token = await getValidToken();
  if (!token) {
    console.error("Not authenticated. Run /composure:auth login first.");
    process.exit(1);
  }

  console.log("Fetching manifest...");

  const response = await resilientFetch(`${API_BASE}/api/v1/manifest`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error(`Manifest fetch failed: ${body.error || response.statusText}`);
    process.exit(1);
  }

  const manifest = await response.json();
  console.log(`Plan: ${manifest.plan}. Syncing ${manifest.version}...`);

  let fetched = 0;
  let errors = 0;

  // Import composure-fetch's fetchWithCache dynamically
  const { default: fetch_ } = await import("node:https");

  for (const [plugin, info] of Object.entries(manifest.plugins || {})) {
    // Sync skills
    for (const skill of info.skills || []) {
      for (const step of info.skill_steps?.[skill] || []) {
        try {
          const res = await resilientFetch(`${API_BASE}/api/v1/skills/${plugin}/${skill}/${step}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "text/markdown" },
          });
          if (res.ok) {
            const content = await res.text();
            const { writeCache } = await getCacheWriter();
            const cachePath = join(CACHE_DIR, plugin, "skills", skill, `${step}.md`);
            writeCache(cachePath, content, { endpoint: `/api/v1/skills/${plugin}/${skill}/${step}`, type: "skill" });
            fetched++;
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
      }
    }

    // Sync hooks
    for (const hook of info.hooks || []) {
      try {
        const res = await resilientFetch(`${API_BASE}/api/v1/hooks/${plugin}/${hook}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const content = await res.text();
          const { writeCache } = await getCacheWriter();
          const cachePath = join(CACHE_DIR, plugin, "hooks", hook);
          writeCache(cachePath, content, { endpoint: `/api/v1/hooks/${plugin}/${hook}`, type: "hook" });
          fetched++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }
  }

  console.log(`Synced: ${fetched} items. ${errors ? errors + " errors." : "No errors."}`);
}

function encryptContent(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

async function getCacheWriter() {
  const key = getCacheKey();
  if (!key) throw new Error("No cache key — run /composure:auth login first");
  return {
    writeCache(cachePath, content, meta) {
      const dir = dirname(cachePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
      const encrypted = encryptContent(content, key);
      writeFileSync(cachePath, encrypted, { mode: 0o600 }); // Binary
      writeFileSync(cachePath + ".meta.json", JSON.stringify({
        ...meta,
        fetched_at: new Date().toISOString(),
      }, null, 2), { mode: 0o600 });
    },
  };
}

// ── Command: list ────────────────────────────────────────────────────

function list() {
  const files = walkDir(CACHE_DIR);

  if (files.length === 0) {
    console.log("Cache is empty. Run 'composure-cache sync' to populate.");
    return;
  }

  console.log(`Cached content (${files.length} items):\n`);

  // Group by plugin
  const grouped = {};
  for (const f of files) {
    const plugin = f.path.split("/")[0] || "unknown";
    if (!grouped[plugin]) grouped[plugin] = [];
    grouped[plugin].push(f);
  }

  for (const [plugin, items] of Object.entries(grouped)) {
    console.log(`  ${plugin}/`);
    for (const item of items) {
      const age = formatAge(item.meta?.fetched_at);
      const stale = item.meta?.fetched_at && (Date.now() - new Date(item.meta.fetched_at).getTime() > CACHE_TTL_MS);
      const status = stale ? " (stale)" : "";
      console.log(`    ${item.path.slice(plugin.length + 1)}  ${formatBytes(item.size)}  ${age}${status}`);
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`\nTotal: ${formatBytes(totalSize)}`);
}

// ── Command: clear ───────────────────────────────────────────────────

function clear() {
  if (!existsSync(CACHE_DIR)) {
    console.log("Cache is already empty.");
    return;
  }

  const files = walkDir(CACHE_DIR);
  rmSync(CACHE_DIR, { recursive: true, force: true });
  console.log(`Cleared ${files.length} cached items.`);
}

// ── Command: validate ────────────────────────────────────────────────

function validate() {
  const files = walkDir(CACHE_DIR);

  if (files.length === 0) {
    console.log("Cache is empty. Nothing to validate.");
    return;
  }

  let valid = 0;
  let missingMeta = 0;
  let stale = 0;

  for (const f of files) {
    if (!f.meta) {
      missingMeta++;
      continue;
    }
    if (f.meta.fetched_at && Date.now() - new Date(f.meta.fetched_at).getTime() > CACHE_TTL_MS) {
      stale++;
    }
    valid++;
  }

  console.log(`Cache validation:`);
  console.log(`  Valid:        ${valid}`);
  console.log(`  Stale:        ${stale}`);
  console.log(`  Missing meta: ${missingMeta}`);
  console.log(`  Total:        ${files.length}`);

  if (missingMeta > 0) {
    console.log(`\nRun 'composure-cache sync' to repair missing metadata.`);
  }
  if (stale > 0) {
    console.log(`\nRun 'composure-cache sync' to refresh stale items.`);
  }
}

// ── CLI Router ───────────────────────────────────────────────────────

const subcommand = process.argv[2];

switch (subcommand) {
  case "sync":
    await sync();
    break;
  case "list":
    list();
    break;
  case "clear":
    clear();
    break;
  case "validate":
    validate();
    break;
  default:
    console.log("composure-cache — Cache Manager\n");
    console.log("Usage:");
    console.log("  composure-cache sync      Download all content for your plan");
    console.log("  composure-cache list      Show cached content with freshness");
    console.log("  composure-cache clear     Delete all cached content");
    console.log("  composure-cache validate  Check cache integrity");
    console.log(`\nCache: ${CACHE_DIR}`);
    break;
}
