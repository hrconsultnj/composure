#!/usr/bin/env node

/**
 * composure-fetch.mjs — Authenticated Content Fetcher
 *
 * Fetches skill steps, hook scripts, and reference docs from the Composure API.
 * Caches content locally in ~/.composure/cache/ for offline use.
 *
 * Usage:
 *   composure-fetch skill {plugin} {skill} {step}   # Fetch a skill step
 *   composure-fetch hook  {plugin} {hook}            # Fetch a hook script
 *   composure-fetch ref   {plugin} {path}            # Fetch a reference doc
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { getValidToken, API_BASE, COMPOSURE_DIR } from "./composure-token.mjs";

// ── Constants ────────────────────────────────────────────────────────

const CACHE_DIR = join(COMPOSURE_DIR, "cache");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Cache Utilities ──────────────────────────────────────────────────

function getCachePath(type, plugin, ...parts) {
  return join(CACHE_DIR, plugin, type, ...parts);
}

function getMetaPath(cachePath) {
  return cachePath + ".meta.json";
}

function readCache(cachePath) {
  try {
    const metaPath = getMetaPath(cachePath);
    if (!existsSync(cachePath) || !existsSync(metaPath)) return null;

    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    const fetchedAt = new Date(meta.fetched_at).getTime();

    if (Date.now() - fetchedAt > CACHE_TTL_MS) {
      return { content: readFileSync(cachePath, "utf8"), stale: true, meta };
    }

    return { content: readFileSync(cachePath, "utf8"), stale: false, meta };
  } catch {
    return null;
  }
}

function writeCache(cachePath, content, meta) {
  const dir = dirname(cachePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(cachePath, content, { mode: 0o600 });
  writeFileSync(getMetaPath(cachePath), JSON.stringify({
    ...meta,
    fetched_at: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });
}

// ── Fetch from API ───────────────────────────────────────────────────

async function fetchFromAPI(endpoint) {
  const token = await getValidToken();

  if (!token) {
    return { ok: false, status: 401, error: "Not authenticated. Run /composure:auth login" };
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/markdown, application/json",
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        ok: false,
        status: response.status,
        error: body.error || body.message || response.statusText,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const content = await response.text();
    return { ok: true, content, contentType };
  } catch (err) {
    return { ok: false, status: 0, error: `Network error: ${err.message}` };
  }
}

// ── Fetch with Cache ─────────────────────────────────────────────────

async function fetchWithCache(type, endpoint, cachePath) {
  // Try API first
  const result = await fetchFromAPI(endpoint);

  if (result.ok) {
    writeCache(cachePath, result.content, { endpoint, type });
    return { content: result.content, source: "api" };
  }

  // API failed — try cache fallback
  if (result.status === 401) {
    // Auth error — no point falling back to cache
    console.error(result.error);
    process.exit(1);
  }

  if (result.status === 403) {
    console.error(`Plan upgrade required. ${result.error}`);
    console.error("Run /composure:auth upgrade to see pricing.");
    process.exit(1);
  }

  // Network error or server error — try cache
  const cached = readCache(cachePath);
  if (cached) {
    const marker = cached.stale ? "[cached:stale]" : "[cached]";
    return { content: cached.content, source: marker };
  }

  // No cache, no API
  console.error(`Failed to fetch: ${result.error}`);
  console.error("No cached version available. Check your internet connection.");
  process.exit(1);
}

// ── Command: Skill ───────────────────────────────────────────────────

async function fetchSkill(plugin, skill, step) {
  const endpoint = `/api/v1/skills/${plugin}/${skill}/${step}`;
  const cachePath = getCachePath("skills", plugin, skill, `${step}.md`);
  const { content, source } = await fetchWithCache("skill", endpoint, cachePath);

  if (source !== "api") {
    console.error(`${source} — using locally cached version`);
  }
  process.stdout.write(content);
}

// ── Command: Hook ────────────────────────────────────────────────────

async function fetchHook(plugin, hook) {
  const endpoint = `/api/v1/hooks/${plugin}/${hook}`;
  const cachePath = getCachePath("hooks", plugin, hook);
  const { content, source } = await fetchWithCache("hook", endpoint, cachePath);

  if (source !== "api") {
    console.error(`${source} — using locally cached version`);
  }
  process.stdout.write(content);
}

// ── Command: Reference ───────────────────────────────────────────────

async function fetchRef(plugin, path) {
  const endpoint = `/api/v1/skills/${plugin}/references/${path}`;
  const cachePath = getCachePath("references", plugin, `${path}.md`);
  const { content, source } = await fetchWithCache("reference", endpoint, cachePath);

  if (source !== "api") {
    console.error(`${source} — using locally cached version`);
  }
  process.stdout.write(content);
}

// ── CLI Router ───────────────────────────────────────────────────────

const [type, ...args] = process.argv.slice(2);

switch (type) {
  case "skill": {
    const [plugin, skill, step] = args;
    if (!plugin || !skill || !step) {
      console.error("Usage: composure-fetch skill {plugin} {skill} {step}");
      process.exit(1);
    }
    await fetchSkill(plugin, skill, step);
    break;
  }

  case "hook": {
    const [plugin, hook] = args;
    if (!plugin || !hook) {
      console.error("Usage: composure-fetch hook {plugin} {hook}");
      process.exit(1);
    }
    await fetchHook(plugin, hook);
    break;
  }

  case "ref": {
    const [plugin, ...pathParts] = args;
    const path = pathParts.join("/");
    if (!plugin || !path) {
      console.error("Usage: composure-fetch ref {plugin} {path}");
      process.exit(1);
    }
    await fetchRef(plugin, path);
    break;
  }

  default:
    console.log("composure-fetch — Authenticated Content Fetcher\n");
    console.log("Usage:");
    console.log("  composure-fetch skill {plugin} {skill} {step}");
    console.log("  composure-fetch hook  {plugin} {hook}");
    console.log("  composure-fetch ref   {plugin} {path}");
    console.log(`\nCache: ${CACHE_DIR}`);
    break;
}
