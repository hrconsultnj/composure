#!/usr/bin/env node

/**
 * composure-content.mjs — Shared Content Fetch Module
 *
 * Single source of truth for Composure's content delivery:
 *   - AES-256-GCM cache encryption/decryption
 *   - Cache-first strategy with 24h TTL and stale-on-error fallback
 *   - API fetch with retry + backoff + timeout
 *
 * Consumed by:
 *   1. bin/composure-fetch.mjs  — the Bash CLI
 *   2. enforce/src/server.ts    — the MCP tools (composure_fetch_*)
 *
 * Both consumers call fetchSkillContent / fetchHookContent / fetchRefContent.
 * The CLI writes the result to stdout; the MCP server returns it as an MCP tool result.
 *
 * DO NOT duplicate this logic anywhere else. Fix bugs here; both consumers inherit.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getValidToken, getCacheKey, API_BASE, COMPOSURE_DIR } from "./composure-token.mjs";

// ── Constants ────────────────────────────────────────────────────────

export const CACHE_DIR = join(COMPOSURE_DIR, "cache");
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Retry / Resilience Constants ────────────────────────────────────
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;     // 1s → 2s → 4s
const REQUEST_TIMEOUT_MS = 10_000;   // 10 seconds per attempt

// ── Encryption Utilities ─────────────────────────────────────────────

const ALGO = "aes-256-gcm";
const IV_LEN = 12;       // 96-bit IV for GCM
const TAG_LEN = 16;      // 128-bit auth tag

export function encrypt(plaintext, key) {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: [IV (12)] [AuthTag (16)] [Ciphertext (...)]
  return Buffer.concat([iv, tag, encrypted]);
}

export function decrypt(buffer, key) {
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

export function getCachePath(type, plugin, ...parts) {
  return join(CACHE_DIR, plugin, type, ...parts);
}

export function getMetaPath(cachePath) {
  return cachePath + ".meta.json";
}

export function isPlaintext(buffer) {
  // Plaintext markdown starts with readable ASCII: #, -, space, letter
  if (buffer.length < 2) return false;
  const first = buffer[0];
  // Common markdown/text file first bytes: #(35) -(45) space(32) A-Z(65-90) a-z(97-122)
  return first === 35 || first === 45 || first === 32 || (first >= 65 && first <= 122);
}

export function readCache(cachePath) {
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

export function writeCache(cachePath, content, meta) {
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

export async function fetchFromAPI(endpoint) {
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

/**
 * Fetch content with cache-first strategy.
 * Returns { content, source } on success.
 * Throws FetchError on unrecoverable failures.
 */
export async function fetchWithCache(type, endpoint, cachePath) {
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
    throw new FetchError(
      `Authentication failed: ${result.error}`,
      "Run /composure:auth login to authenticate.",
      401,
    );
  }

  if (result.status === 403) {
    throw new FetchError(
      `This content requires a different plan. ${result.error}`,
      "Run /composure:auth upgrade to view available plans.",
      403,
    );
  }

  // Network/server error — serve stale cache if available
  if (cached) {
    console.error(`[composure] API unreachable after ${MAX_RETRIES} attempts — serving cached version`);
    return { content: cached.content, source: "[cached:stale]" };
  }

  // No cache, no API — hard fail with actionable guidance
  throw new FetchError(
    `Failed to fetch after ${MAX_RETRIES} attempts: ${result.error}. No cached version available.`,
    "Run 'composure-cache sync' when online to pre-populate the cache.",
    result.status || 500,
  );
}

// ── Error Class ──────────────────────────────────────────────────────

/**
 * Structured error for fetch failures.
 * Carries a user-facing message, an actionable next step, and an HTTP-ish status.
 * Consumers can catch this and render it appropriately (CLI writes to stdout,
 * MCP server throws to make the error visible in the tool tile).
 */
export class FetchError extends Error {
  constructor(message, action, status = 500) {
    super(message);
    this.name = "FetchError";
    this.action = action;
    this.status = status;
  }

  /**
   * Render as a plain-text message with guidance.
   * Used by the CLI (Bash fallback path) to write to stdout.
   */
  toCliMessage() {
    return [
      `[composure:fetch-failed] ${this.message}`,
      this.action || "Run /composure:auth login or check your connection.",
      "IMPORTANT: Do NOT reconstruct this content from memory or training data.",
      "Report this error to the user and wait for instructions.",
    ].join("\n");
  }
}

// ── High-Level Entry Points ──────────────────────────────────────────

/**
 * Fetch a skill step's content.
 * @param {string} plugin - Plugin slug (e.g., "composure")
 * @param {string} skill - Skill name (e.g., "blueprint")
 * @param {string} step - Step filename (e.g., "01-classify.md")
 * @returns {Promise<{content: string, source: string}>}
 */
export async function fetchSkillContent(plugin, skill, step) {
  const endpoint = `/api/v1/skills/${plugin}/${skill}/${step}`;
  const cachePath = getCachePath("skills", plugin, skill, `${step}.md`);
  return fetchWithCache("skill", endpoint, cachePath);
}

/**
 * Fetch a hook script's content.
 * @param {string} plugin - Plugin slug
 * @param {string} hook - Hook filename
 * @returns {Promise<{content: string, source: string}>}
 */
export async function fetchHookContent(plugin, hook) {
  const endpoint = `/api/v1/hooks/${plugin}/${hook}`;
  const cachePath = getCachePath("hooks", plugin, hook);
  return fetchWithCache("hook", endpoint, cachePath);
}

/**
 * Fetch a reference doc's content.
 * @param {string} plugin - Plugin slug
 * @param {string} path - Reference path (may contain slashes)
 * @returns {Promise<{content: string, source: string}>}
 */
export async function fetchRefContent(plugin, path) {
  const endpoint = `/api/v1/skills/${plugin}/references/${path}`;
  const cachePath = getCachePath("references", plugin, `${path}.md`);
  return fetchWithCache("reference", endpoint, cachePath);
}
