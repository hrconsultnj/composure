#!/usr/bin/env node

/**
 * composure-token.mjs — Token read/write/refresh utilities
 *
 * Manages ~/.composure/credentials.json for CLI authentication.
 * Uses Node 22.5+ built-ins only (no external dependencies).
 *
 * Exports: readCredentials, writeCredentials, isExpired, refreshToken, getValidToken
 * CLI:     composure-token validate | refresh
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ── Constants ────────────────────────────────────────────────────────

export const API_BASE = "https://composure-pro.com";
export const COMPOSURE_DIR = join(homedir(), ".composure");
export const CREDENTIALS_PATH = join(COMPOSURE_DIR, "credentials.json");

// Token refresh buffer — refresh 60 seconds before actual expiry
const EXPIRY_BUFFER_MS = 60_000;

// Retry / Resilience
const TOKEN_RETRY_COUNT = 2;
const TOKEN_TIMEOUT_MS = 10_000;
const TOKEN_BACKOFF_MS = 1500;

// ── Credential I/O ───────────────────────────────────────────────────

/**
 * Read credentials from ~/.composure/credentials.json
 * @returns {object|null} Parsed credentials or null if missing/corrupt
 */
export function readCredentials() {
  try {
    const raw = readFileSync(CREDENTIALS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write credentials to ~/.composure/credentials.json
 * Creates ~/.composure/ directory if needed. Sets file permissions to 600.
 * @param {object} data - Credentials object (access_token, refresh_token, expires_at, plan, email)
 */
export function writeCredentials(data) {
  if (!existsSync(COMPOSURE_DIR)) {
    mkdirSync(COMPOSURE_DIR, { recursive: true, mode: 0o700 });
  }
  const content = JSON.stringify(data, null, 2) + "\n";
  writeFileSync(CREDENTIALS_PATH, content, { mode: 0o600 });
}

/**
 * Delete credentials file
 */
export function deleteCredentials() {
  try {
    unlinkSync(CREDENTIALS_PATH);
    return true;
  } catch {
    return false;
  }
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
  const creds = readCredentials();
  if (!creds) {
    console.log("not-authenticated");
    process.exit(1);
  }
  if (isExpired(creds)) {
    // Try silent refresh before reporting expired
    const refreshed = await refreshToken(creds);
    if (refreshed) {
      console.log(`valid:${refreshed.plan ?? "free"}:${refreshed.email ?? "unknown"}`);
      process.exit(0);
    }
    console.log("expired");
    process.exit(2);
  }
  console.log(`valid:${creds.plan ?? "free"}:${creds.email ?? "unknown"}`);
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
    console.error("Refresh failed. Run /composure:auth login to re-authenticate.");
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

// If imported as a module (no subcommand and not direct execution), do nothing.
// This allows: import { getValidToken } from './composure-token.mjs'
