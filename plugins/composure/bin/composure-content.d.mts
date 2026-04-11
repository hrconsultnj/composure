/**
 * Companion type declarations for composure-content.mjs.
 *
 * TypeScript's Node16 module resolution finds this file when consumers import
 * `./composure-content.mjs` (or a relative path ending in that name).
 *
 * This file describes only the PUBLIC exports — the internals of the .mjs
 * module (retry helpers, sleep, etc.) are intentionally omitted.
 */

export interface FetchResult {
  /** The actual content string (decrypted markdown, hook script, etc.). */
  content: string;
  /** The source tag: "api" (fresh fetch), "[cached]" (fresh cache hit), "[cached:stale]" (stale served on API failure), "[cached:stale:auth-expired]" (stale served due to auth failure). */
  source: string;
}

/**
 * Structured error thrown by fetchWithCache and its consumers when a fetch
 * cannot be completed (auth failure without cache, plan gate, network failure
 * without cache, missing arguments).
 */
export class FetchError extends Error {
  /** The actionable next step to show the user (e.g., "Run /composure:auth login"). */
  action: string;
  /** HTTP-ish status code (401 for auth, 403 for plan gate, 500 for other). */
  status: number;

  constructor(message: string, action: string, status?: number);

  /**
   * Render this error as a plain-text message suitable for CLI stdout.
   * Includes the error, the action, and a guardrail reminder to not
   * reconstruct content from memory.
   */
  toCliMessage(): string;
}

/**
 * Fetch a Composure skill step's content.
 * Cache-first: returns fresh cache if available, falls back to API, falls back
 * to stale cache on API failure. Throws FetchError on unrecoverable failures.
 */
export function fetchSkillContent(
  plugin: string,
  skill: string,
  step: string,
): Promise<FetchResult>;

/**
 * Fetch a Composure hook script's content. Same cache-first semantics as
 * fetchSkillContent.
 */
export function fetchHookContent(
  plugin: string,
  hook: string,
): Promise<FetchResult>;

/**
 * Fetch a Composure reference doc's content. The `path` may contain slashes
 * to address nested references (e.g., "integration-builder/auth-patterns").
 */
export function fetchRefContent(
  plugin: string,
  path: string,
): Promise<FetchResult>;

/** The absolute path of the cache root (~/.composure/cache). */
export const CACHE_DIR: string;

/** Cache TTL in milliseconds (24 hours). */
export const CACHE_TTL_MS: number;
