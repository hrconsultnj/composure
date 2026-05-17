#!/usr/bin/env node

/**
 * composure-token.mjs — Token read/write/refresh utilities
 *
 * Manages two-tier auth state (Slice N3, 2026-05-17):
 *   - ~/.composure/credentials.json  — secrets (access/refresh tokens, expires_at, cache_key)
 *   - ~/.composure/account.json      — entitlements cache (plan, email, tier, quota, cached_at)
 *
 * Storage backend (Darwin only): opt-in macOS Keychain via `security` shell.
 * Enable with `COMPOSURE_USE_KEYCHAIN=1` env var. Default: 0600 JSON files.
 * Keychain service name: "Composure-credentials", account: $USER.
 * Always deletes old keychain entry before write to avoid orphaning
 * (Claude Code bug #19456 root cause).
 *
 * Windows path (NOT implemented today, Wave E follow-up):
 *   Windows Credential Manager via `cmdkey /add` + `cmdkey /list /target`.
 *   See Wave E in tasks-plans/blueprints/composure-consolidation-2026-05-17.md.
 *
 * Uses Node 22.5+ built-ins only (no external dependencies).
 *
 * Exports: readCredentials, writeCredentials, readAccount, writeAccount,
 *          isExpired, refreshToken, getValidToken, getCacheKey
 * CLI:     composure-token validate | refresh | refresh-bg | info | license
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { homedir, userInfo, platform } from "node:os";

// ── Constants ────────────────────────────────────────────────────────

export const API_BASE = "https://composure-pro.com";
export const COMPOSURE_DIR = join(homedir(), ".composure");
export const CREDENTIALS_PATH = join(COMPOSURE_DIR, "credentials.json");
export const ACCOUNT_PATH = join(COMPOSURE_DIR, "account.json");

// Current schema version. v1 = single credentials.json (pre-2026-05-17).
// v2 = split into credentials.json (secrets) + account.json (entitlements).
export const SCHEMA_VERSION = 2;

// Token refresh buffer — refresh 5 minutes before actual expiry.
// Matches Copilot CLI's silent mid-turn refresh pattern (R1 research).
// Was 60_000 pre-2026-05-17.
const EXPIRY_BUFFER_MS = 300_000;

// Retry / Resilience
const TOKEN_RETRY_COUNT = 2;
const TOKEN_TIMEOUT_MS = 10_000;
const TOKEN_BACKOFF_MS = 1500;

// Keychain (Darwin only, opt-in via COMPOSURE_USE_KEYCHAIN=1)
const KEYCHAIN_SERVICE = "Composure-credentials";
const USE_KEYCHAIN = process.env.COMPOSURE_USE_KEYCHAIN === "1" && platform() === "darwin";

// ── Keychain helpers (Darwin only, opt-in) ──────────────────────────

function keychainRead() {
  try {
    const out = execFileSync(
      "security",
      ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", userInfo().username, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return out.trim();
  } catch {
    return null;
  }
}

function keychainWrite(jsonBlob) {
  // Always delete old entry first to avoid orphaning (Claude Code #19456 root cause).
  try {
    execFileSync(
      "security",
      ["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", userInfo().username],
      { stdio: "ignore" }
    );
  } catch {
    // Entry didn't exist — fine.
  }
  try {
    execFileSync(
      "security",
      ["add-generic-password", "-U", "-s", KEYCHAIN_SERVICE, "-a", userInfo().username, "-w", jsonBlob],
      { stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}

function keychainDelete() {
  try {
    execFileSync(
      "security",
      ["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", userInfo().username],
      { stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}

// ── Credential I/O (v2: split credentials + account) ────────────────

/**
 * Read credentials from Keychain (Darwin opt-in) or ~/.composure/credentials.json.
 * Auto-migrates v1 schema (single file with plan/email mixed in) to v2 (split).
 * @returns {object|null} Parsed credentials or null if missing/corrupt
 */
export function readCredentials() {
  let creds = null;

  // Try keychain first if enabled
  if (USE_KEYCHAIN) {
    const blob = keychainRead();
    if (blob) {
      try { creds = JSON.parse(blob); } catch { /* fall through to JSON */ }
    }
  }

  // Fall back to JSON file
  if (!creds) {
    try {
      const raw = readFileSync(CREDENTIALS_PATH, "utf8");
      creds = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Auto-migrate v1 → v2: extract entitlements to account.json
  if (!creds.version || creds.version < SCHEMA_VERSION) {
    creds = migrateV1ToV2(creds);
  }

  return creds;
}

/**
 * Write credentials. v2 splits secrets (credentials.json) from entitlements (account.json).
 * Caller passes the merged object; this function writes both files.
 * @param {object} data - Merged: access_token, refresh_token, expires_at, cache_key, plan, email, tier, etc.
 */
export function writeCredentials(data) {
  if (!existsSync(COMPOSURE_DIR)) {
    mkdirSync(COMPOSURE_DIR, { recursive: true, mode: 0o700 });
  }

  // Secrets-only payload (credentials.json + optional keychain)
  const secrets = {
    version: SCHEMA_VERSION,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    refreshed_at: data.refreshed_at,
    cache_key: data.cache_key,
  };
  const secretsBlob = JSON.stringify(secrets, null, 2) + "\n";

  // Try keychain if enabled, then always also write JSON as belt+suspenders.
  // The JSON file is the canonical source; keychain is a cache.
  if (USE_KEYCHAIN) {
    keychainWrite(secretsBlob);
  }
  writeFileSync(CREDENTIALS_PATH, secretsBlob, { mode: 0o600 });

  // Entitlements payload (account.json) — written only if any entitlement field is present
  const entitlements = {
    plan: data.plan ?? null,
    email: data.email ?? null,
    tier: data.tier ?? data.plan_tier ?? null,
    has_extra_usage: data.has_extra_usage ?? null,
    quota_remaining_pct: data.quota_remaining_pct ?? null,
    quota_resets_at: data.quota_resets_at ?? null,
    cached_at: new Date().toISOString(),
  };
  if (entitlements.plan || entitlements.email || entitlements.tier) {
    writeAccount(entitlements);
  }
}

/**
 * Delete credentials (file + keychain entry if present)
 */
export function deleteCredentials() {
  let ok = false;
  if (USE_KEYCHAIN) keychainDelete();
  try {
    unlinkSync(CREDENTIALS_PATH);
    ok = true;
  } catch { /* file may not exist */ }
  try {
    unlinkSync(ACCOUNT_PATH);
  } catch { /* account may not exist */ }
  return ok;
}

// ── Account I/O (v2 entitlements cache) ──────────────────────────────

/**
 * Read entitlements cache from ~/.composure/account.json
 * @returns {object|null} Parsed account or null if missing
 */
export function readAccount() {
  try {
    const raw = readFileSync(ACCOUNT_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write entitlements cache to ~/.composure/account.json (0600).
 * Always stamps cached_at.
 * @param {object} data - Entitlements (plan, email, tier, quota_*, has_extra_usage)
 */
export function writeAccount(data) {
  if (!existsSync(COMPOSURE_DIR)) {
    mkdirSync(COMPOSURE_DIR, { recursive: true, mode: 0o700 });
  }
  const payload = { ...data, cached_at: data.cached_at ?? new Date().toISOString() };
  writeFileSync(ACCOUNT_PATH, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
}

/**
 * Migrate v1 credentials (single file with plan/email mixed in) → v2 (split).
 * Idempotent. Writes account.json on first migration; returns v2 creds.
 * @param {object} v1 - The v1-shaped credentials read from disk
 * @returns {object} v2 credentials (secrets only)
 */
function migrateV1ToV2(v1) {
  // Extract entitlements
  const entitlements = {
    plan: v1.plan ?? null,
    email: v1.email ?? null,
    tier: v1.tier ?? v1.plan_tier ?? null,
    has_extra_usage: v1.has_extra_usage ?? null,
    quota_remaining_pct: v1.quota_remaining_pct ?? null,
    quota_resets_at: v1.quota_resets_at ?? null,
    cached_at: new Date().toISOString(),
  };
  if (entitlements.plan || entitlements.email) {
    writeAccount(entitlements);
  }

  // Strip entitlements from credentials, add version
  const v2 = {
    version: SCHEMA_VERSION,
    access_token: v1.access_token,
    refresh_token: v1.refresh_token,
    expires_at: v1.expires_at,
    refreshed_at: v1.refreshed_at,
    cache_key: v1.cache_key,
  };

  // Persist the migration (rewrite the file in v2 shape)
  try {
    const secretsBlob = JSON.stringify(v2, null, 2) + "\n";
    if (USE_KEYCHAIN) keychainWrite(secretsBlob);
    writeFileSync(CREDENTIALS_PATH, secretsBlob, { mode: 0o600 });
  } catch {
    // Migration write failed — return v2 in-memory; next write will retry.
  }

  return v2;
}

// ── Cache Encryption Key ─────────────────────────────────────────────

/**
 * Get the cache encryption key from credentials.
 * @returns {Buffer|null} 32-byte key or null if not authenticated
 */
export function getCacheKey() {
  const creds = readCredentials();
  if (!creds?.cache_key) return null;
  return Buffer.from(creds.cache_key, "hex");
}

// ── Token Validation ─────────────────────────────────────────────────

/**
 * Check if the access token is expired (with 60-second buffer)
 * @param {object} credentials - Credentials with expires_at field
 * @returns {boolean} True if expired or will expire within 60 seconds
 */
export function isExpired(credentials) {
  if (!credentials?.expires_at) return true;
  const expiresAt = new Date(credentials.expires_at).getTime();
  return Date.now() >= expiresAt - EXPIRY_BUFFER_MS;
}

// ── Token Refresh ────────────────────────────────────────────────────

/**
 * Refresh the access token using the stored refresh_token
 * @param {object} credentials - Credentials with refresh_token
 * @returns {object|null} Updated credentials or null on failure
 */
export async function refreshToken(credentials) {
  if (!credentials?.refresh_token) return null;

  for (let attempt = 1; attempt <= TOKEN_RETRY_COUNT; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);

      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credentials.refresh_token,
      });

      const response = await fetch(`${API_BASE}/api/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (process.env.COMPOSURE_DEBUG) {
          console.error(`[composure-token] Refresh attempt ${attempt}/${TOKEN_RETRY_COUNT} failed (${response.status}): ${JSON.stringify(errBody)}`);
        }
        // Don't retry 4xx errors — they indicate bad credentials, not transient failure
        if (response.status >= 400 && response.status < 500) return null;
        if (attempt < TOKEN_RETRY_COUNT) {
          await new Promise((r) => setTimeout(r, TOKEN_BACKOFF_MS));
          continue;
        }
        return null;
      }

      const data = await response.json();

      if (!data.access_token) return null;

      const updated = {
        ...credentials,
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? credentials.refresh_token,
        expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
        refreshed_at: new Date().toISOString(),
      };

      writeCredentials(updated);
      return updated;
    } catch (err) {
      if (process.env.COMPOSURE_DEBUG) {
        console.error(`[composure-token] Refresh attempt ${attempt}/${TOKEN_RETRY_COUNT} error: ${err.message}`);
      }
      if (attempt < TOKEN_RETRY_COUNT) {
        await new Promise((r) => setTimeout(r, TOKEN_BACKOFF_MS));
        continue;
      }
      return null;
    }
  }

  return null;
}

// ── Convenience ──────────────────────────────────────────────────────

/**
 * Get a valid access token — reads, checks expiry, refreshes if needed
 * @returns {string|null} Valid access token or null if unavailable
 */
export async function getValidToken() {
  const creds = readCredentials();
  if (!creds) return null;

  if (!isExpired(creds)) {
    return creds.access_token;
  }

  const refreshed = await refreshToken(creds);
  return refreshed?.access_token ?? null;
}

/**
 * Validate the current token against the license API
 * @returns {object|null} License info { valid, plan, features, user } or null
 */
export async function validateLicense() {
  const token = await getValidToken();
  if (!token) return null;

  for (let attempt = 1; attempt <= TOKEN_RETRY_COUNT; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);

      const response = await fetch(`${API_BASE}/api/v1/license/validate`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) return null;
        if (attempt < TOKEN_RETRY_COUNT) {
          await new Promise((r) => setTimeout(r, TOKEN_BACKOFF_MS));
          continue;
        }
        return null;
      }
      return await response.json();
    } catch {
      if (attempt < TOKEN_RETRY_COUNT) {
        await new Promise((r) => setTimeout(r, TOKEN_BACKOFF_MS));
        continue;
      }
      return null;
    }
  }

  return null;
}

// ── CLI Interface ────────────────────────────────────────────────────

const subcommand = process.argv[2];

if (subcommand === "validate") {
  // Back-compat output: `valid:plan:email` consumed by session-auth.sh and other hooks.
  // After v2 migration, plan/email live in account.json; read both files.
  const creds = readCredentials();
  if (!creds) {
    console.log("not-authenticated");
    process.exit(1);
  }
  const account = readAccount() ?? {};
  const plan = account.plan ?? creds.plan ?? "free";
  const email = account.email ?? creds.email ?? "unknown";

  if (isExpired(creds)) {
    // Try silent refresh before reporting expired
    const refreshed = await refreshToken(creds);
    if (refreshed) {
      const account2 = readAccount() ?? {};
      console.log(`valid:${account2.plan ?? "free"}:${account2.email ?? "unknown"}`);
      process.exit(0);
    }
    console.log("expired");
    process.exit(2);
  }
  console.log(`valid:${plan}:${email}`);
  process.exit(0);
}

if (subcommand === "refresh-bg") {
  // Proactive background refresh: triggered from SessionStart hooks.
  // Only refreshes if expiry within 5-min buffer (EXPIRY_BUFFER_MS).
  // Silent: exits 0 quickly whether refreshed or not. Never blocks.
  const creds = readCredentials();
  if (!creds) process.exit(0);
  if (!isExpired(creds)) process.exit(0);  // Not yet in buffer window
  // In buffer window — refresh now. Don't wait long; the next foreground call will refresh again if this misses.
  await refreshToken(creds).catch(() => null);
  process.exit(0);
}

if (subcommand === "refresh") {
  const creds = readCredentials();
  if (!creds) {
    console.error("No credentials found.");
    process.exit(1);
  }
  const refreshed = await refreshToken(creds);
  if (refreshed) {
    console.log("refreshed");
    process.exit(0);
  } else {
    console.error("Refresh failed. Run /composure:account login to re-authenticate.");
    process.exit(1);
  }
}

if (subcommand === "license") {
  const license = await validateLicense();
  if (license) {
    console.log(JSON.stringify(license, null, 2));
    process.exit(0);
  } else {
    console.error("License validation failed.");
    process.exit(1);
  }
}

if (subcommand === "info") {
  // Rich JSON output for /composure:health step 05.
  // Reads credentials.json (secrets) + account.json (entitlements cache, written by N3).
  // Never makes a network call. Exit 0 valid, 1 not authenticated, 2 expired.
  const creds = readCredentials();
  if (!creds) {
    console.log(JSON.stringify({ status: "not-authenticated" }));
    process.exit(1);
  }

  const now = Date.now();
  const expiresAt = creds.expires_at ? new Date(creds.expires_at).getTime() : 0;
  const refreshedAt = creds.refreshed_at ? new Date(creds.refreshed_at).getTime() : null;
  const msToExpiry = expiresAt ? expiresAt - now : null;
  const daysToExpiry = msToExpiry != null ? Math.floor(msToExpiry / 86_400_000) : null;
  const hoursToExpiry = msToExpiry != null ? Math.floor(msToExpiry / 3_600_000) : null;

  const account = readAccount() ?? {};
  const expired = isExpired(creds);

  console.log(JSON.stringify({
    status: expired ? "expired" : "valid",
    plan: account.plan ?? creds.plan ?? "free",
    email: account.email ?? creds.email ?? "unknown",
    tier: account.tier ?? account.plan_tier ?? null,
    expires_at: creds.expires_at ?? null,
    refreshed_at: creds.refreshed_at ?? null,
    days_to_expiry: daysToExpiry,
    hours_to_expiry: hoursToExpiry,
    has_extra_usage: account.has_extra_usage ?? null,
    quota_remaining_pct: account.quota_remaining_pct ?? null,
    quota_resets_at: account.quota_resets_at ?? null,
    account_cached_at: account.cached_at ?? null,
    keychain_enabled: USE_KEYCHAIN,
    schema_version: creds.version ?? 1,
  }, null, 2));
  process.exit(expired ? 2 : 0);
}

// If imported as a module (no subcommand and not direct execution), do nothing.
// This allows: import { getValidToken } from './composure-token.mjs'
