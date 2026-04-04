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

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getValidToken, getCacheKey, API_BASE, COMPOSURE_DIR } from "./composure-token.mjs";

// ── Constants ────────────────────────────────────────────────────────

const CACHE_DIR = join(COMPOSURE_DIR, "cache");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Retry / Resilience Constants ────────────────────────────────────
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;     // 1s → 2s → 4s
const REQUEST_TIMEOUT_MS = 10_000;   // 10 seconds per attempt

// ── Encryption Utilities ─────────────────────────────────────────────

const ALGO = "aes-256-gcm";
const IV_LEN = 12;       // 96-bit IV for GCM
const TAG_LEN = 16;      // 128-bit auth tag

function encrypt(plaintext, key) {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: [IV (12)] [AuthTag (16)] [Ciphertext (...)]
  return Buffer.concat([iv, tag, encrypted]);
}

function decrypt(buffer, key) {
  if (buffer.length < IV_LEN + TAG_LEN + 1) return null;
  const iv = buffer.subarray(0, IV_LEN);
  const tag = buffer.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buffer.subarray(IV_LEN + TAG_LEN);
  try {
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null; // Wrong key, corrupted, or tampered — treat as cache miss
  }
}

// ── Cache Utilities (encrypted at rest) ─────────────────────────────

function getCachePath(type, plugin, ...parts) {
  return join(CACHE_DIR, plugin, type, ...parts);
}

function getMetaPath(cachePath) {
  return cachePath + ".meta.json";
}

function isPlaintext(buffer) {
  // Plaintext markdown starts with readable ASCII: #, -, space, letter
  if (buffer.length < 2) return false;
  const first = buffer[0];
  // Common markdown/text file first bytes: #(35) -(45) space(32) A-Z(65-90) a-z(97-122)
  return first === 35 || first === 45 || first === 32 || (first >= 65 && first <= 122);
}

function readCache(cachePath) {
  try {
    const metaPath = getMetaPath(cachePath);
    if (!existsSync(cachePath) || !existsSync(metaPath)) return null;

    const raw = readFileSync(cachePath); // Read as Buffer (binary)

    // Auto-clean legacy plaintext cache files
    if (isPlaintext(raw)) {
      try { unlinkSync(cachePath); } catch {}
      try { unlinkSync(metaPath); } catch {}
      return null; // Force re-fetch with encryption
    }

    const key = getCacheKey();
    if (!key) return null; // No key = can't decrypt

    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    const fetchedAt = new Date(meta.fetched_at).getTime();
    const content = decrypt(raw, key);

    if (!content) return null; // Decryption failed (wrong key, corrupted)

    if (Date.now() - fetchedAt > CACHE_TTL_MS) {
      return { content, stale: true, meta };
    }

    return { content, stale: false, meta };
  } catch {
    return null;
  }
}

function writeCache(cachePath, content, meta) {
  const key = getCacheKey();
  if (!key) return; // No key = can't encrypt, skip caching

  const dir = dirname(cachePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const encrypted = encrypt(content, key);
  writeFileSync(cachePath, encrypted, { mode: 0o600 }); // Binary
  writeFileSync(getMetaPath(cachePath), JSON.stringify({
    ...meta,
    fetched_at: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });
}

// ── Retry Helpers ───────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status) {
  // Retry on network errors (0), server errors (5xx), and 429 (rate-limited)
  return status === 0 || status === 429 || (status >= 500 && status < 600);
}

// ── Fetch from API (with retries + timeout) ─────────────────────────

async function fetchFromAPI(endpoint) {
  const token = await getValidToken();

  if (!token) {
    return { ok: false, status: 401, error: "Not authenticated. Run /composure:auth login" };
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/markdown, application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        lastError = {
          ok: false,
          status: response.status,
          error: body.error || body.message || response.statusText,
        };

        // Don't retry auth or plan errors — they won't resolve with retries
        if (!isRetryable(response.status)) {
          return lastError;
        }

        if (attempt < MAX_RETRIES) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.error(`[composure] Attempt ${attempt}/${MAX_RETRIES} failed (${response.status}). Retrying in ${backoff / 1000}s...`);
          await sleep(backoff);
          continue;
        }

        return lastError;
      }

      const contentType = response.headers.get("content-type") || "";
      const content = await response.text();
      return { ok: true, content, contentType };
    } catch (err) {
      const isTimeout = err.name === "AbortError";
      lastError = {
        ok: false,
        status: 0,
        error: isTimeout
          ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
          : `Network error: ${err.message}`,
      };

      if (attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.error(`[composure] Attempt ${attempt}/${MAX_RETRIES} failed (${isTimeout ? "timeout" : "network"}). Retrying in ${backoff / 1000}s...`);
        await sleep(backoff);
        continue;
      }
    }
  }

  return lastError;
}

// ── Fetch with Cache (cache-first strategy) ─────────────────────────

async function fetchWithCache(type, endpoint, cachePath) {
  // Check cache first — if fresh, serve immediately (no network needed)
  const cached = readCache(cachePath);

  if (cached && !cached.stale) {
    return { content: cached.content, source: "[cached]" };
  }

  // Cache is stale or missing — try API with retries
  const result = await fetchFromAPI(endpoint);

  if (result.ok) {
    writeCache(cachePath, result.content, { endpoint, type });
    return { content: result.content, source: "api" };
  }

  // API failed — handle non-retryable errors
  if (result.status === 401) {
    // Auth error — still serve stale cache if available (don't block work)
    if (cached) {
      console.error("[composure] Auth expired — serving cached version. Run /composure:auth login to refresh.");
      return { content: cached.content, source: "[cached:stale:auth-expired]" };
    }
    console.error(result.error);
    process.exit(1);
  }

  if (result.status === 403) {
    console.error(`This content requires a different plan. ${result.error}`);
    console.error("Run /composure:auth upgrade to view available plans.");
    process.exit(1);
  }

  // Network/server error — serve stale cache if available
  if (cached) {
    console.error(`[composure] API unreachable after ${MAX_RETRIES} attempts — serving cached version`);
    return { content: cached.content, source: "[cached:stale]" };
  }

  // No cache, no API — hard fail with actionable guidance
  console.error(`[composure] Failed to fetch after ${MAX_RETRIES} attempts: ${result.error}`);
  console.error("No cached version available.");
  console.error("Fix: Run 'composure-cache sync' when online to pre-populate the cache.");
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
