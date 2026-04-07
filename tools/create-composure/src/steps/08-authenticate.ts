/**
 * Step 08 — Authenticate automatically as part of the install flow.
 *
 * Flow: check status → if authenticated, done → if not, launch login immediately.
 * No extra prompts — the browser opens, user logs in, done.
 * The OAuth flow in composure-auth.mjs handles the PKCE + callback server.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSafe, commandExists } from "../lib/exec.js";
import { logger } from "../lib/logger.js";

/**
 * Find the composure-auth binary — check ~/.composure/bin first,
 * then the plugin cache, then PATH.
 */
function findAuthBinary(): string | null {
  const home = homedir();

  // 1. Symlinked binary in ~/.composure/bin/
  const binPath = join(home, ".composure", "bin", "composure-auth.mjs");
  if (existsSync(binPath)) return binPath;

  // 2. Direct path in plugin cache — scan all marketplaces dynamically
  const cacheBase = join(home, ".claude", "plugins", "cache");
  if (existsSync(cacheBase)) {
    try {
      for (const marketplace of readdirSync(cacheBase)) {
        const composureCache = join(cacheBase, marketplace, "composure");
        if (!existsSync(composureCache)) continue;
        for (const version of readdirSync(composureCache)) {
          const candidate = join(composureCache, version, "bin", "composure-auth.mjs");
          if (existsSync(candidate)) return candidate;
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // 3. On PATH
  if (commandExists("composure-auth.mjs")) return "composure-auth.mjs";

  return null;
}

export async function authenticate(options: {
  skipAuth: boolean;
  nonInteractive: boolean;
}): Promise<{ authenticated: boolean; email?: string; plan?: string }> {
  if (options.skipAuth) {
    return { authenticated: false };
  }

  const authBin = findAuthBinary();
  if (!authBin) {
    logger.info("Auth binary not available yet. Run /composure:auth login in Claude Code.");
    return { authenticated: false };
  }

  // Check if already authenticated via composure-auth status
  const credsPath = join(homedir(), ".composure", "credentials.json");
  if (existsSync(credsPath)) {
    const statusResult = await execSafe("node", [authBin, "status"]);
    if (statusResult.exitCode === 0 && statusResult.stdout.includes("Authenticated")) {
      // Parse email and plan from status output
      const emailMatch = statusResult.stdout.match(/Authenticated as (\S+)/);
      const planMatch = statusResult.stdout.match(/Plan:\s+(\S+)/);
      return {
        authenticated: true,
        email: emailMatch?.[1],
        plan: planMatch?.[1],
      };
    }
  }

  // Not authenticated — go straight to login (no prompt, just do it)
  if (options.nonInteractive) {
    logger.info("Non-interactive mode — run /composure:auth login to authenticate.");
    return { authenticated: false };
  }

  logger.info("Opening browser for authentication...");

  // Launch the OAuth flow — composure-auth login handles everything:
  // PKCE generation, local callback server, browser open, token exchange, credential storage.
  // It inherits stdio so the user sees the auth flow progress.
  const result = await execSafe("node", [authBin, "login"]);

  if (result.exitCode === 0) {
    // Parse the success output for email/plan
    const output = result.stdout;
    const emailMatch = output.match(/Logged in as (\S+)/);
    const planMatch = output.match(/Plan:\s+(\S+)/);
    return {
      authenticated: true,
      email: emailMatch?.[1],
      plan: planMatch?.[1]?.replace(".", ""),
    };
  }

  logger.warn("Authentication did not complete. Run /composure:auth login later.");
  return { authenticated: false };
}
