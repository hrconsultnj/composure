#!/usr/bin/env node

/**
 * composure-auth.mjs — CLI Authentication Orchestrator
 *
 * Handles OAuth 2.1 PKCE flow: CLI → browser → localhost callback → token storage.
 * Subcommands: login, logout, status, upgrade, migrate, refresh
 *
 * Usage:
 *   composure-auth login        # Open browser, authenticate, store tokens
 *   composure-auth logout       # Clear stored credentials
 *   composure-auth status       # Show current auth status, plan, cache info
 *   composure-auth upgrade      # Open pricing page to upgrade plan
 *   composure-auth migrate      # Migrate project configs (.claude/ → .composure/)
 *   composure-auth refresh      # Silently refresh expired token
 */

import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { platform } from "node:os";
import {
  readCredentials,
  writeCredentials,
  deleteCredentials,
  isExpired,
  refreshToken,
  validateLicense,
  getValidToken,
  API_BASE,
  COMPOSURE_DIR,
  CREDENTIALS_PATH,
} from "./composure-token.mjs";
import { existsSync, mkdirSync, symlinkSync, lstatSync, rmSync } from "node:fs";

// ── Constants ────────────────────────────────────────────────────────

const CLIENT_ID = "composure-cli";
const CALLBACK_PATH = "/callback";
const LOGIN_TIMEOUT_MS = 120_000; // 2 minutes
const PREFERRED_PORT = 19275;

// ── PKCE Utilities ───────────────────────────────────────────────────

function generateCodeVerifier() {
  return randomBytes(64).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function generateState() {
  return randomBytes(32).toString("base64url");
}

// ── Browser Open ─────────────────────────────────────────────────────

function openBrowser(url) {
  const os = platform();
  const cmd =
    os === "darwin" ? "open" :
    os === "win32" ? "start" :
    "xdg-open";

  exec(`${cmd} "${url}"`, (err) => {
    if (err) {
      console.error(`\nCould not open browser automatically.`);
      console.error(`Open this URL manually:\n  ${url}\n`);
    }
  });
}

// ── Port Finding ─────────────────────────────────────────────────────

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE" && startPort < PREFERRED_PORT + 10) {
        resolve(findFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

// ── Login Flow ───────────────────────────────────────────────────────

async function login() {
  // Check if already authenticated
  const existing = readCredentials();
  if (existing && !isExpired(existing)) {
    console.log(`Already authenticated as ${existing.email ?? "unknown"} (${existing.plan ?? "free"} plan).`);
    console.log(`Run 'composure-auth logout' first to re-authenticate.`);
    return;
  }

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Find a free port for the callback server
  const port = await findFreePort(PREFERRED_PORT);
  const redirectUri = `http://localhost:${port}${CALLBACK_PATH}`;

  // Build authorization URL
  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    scope: "read",
  });

  // Use Supabase's OAuth endpoint (the consent redirect goes through our app)
  const authUrl = `${API_BASE}/api/oauth/authorize?${authParams}`;

  console.log("Opening browser for authentication...");
  console.log("If the browser doesn't open, visit:");
  console.log(`  ${authUrl}\n`);
  console.log("Waiting for authentication...");

  // Start callback server
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out after 2 minutes. Try again."));
    }, LOGIN_TIMEOUT_MS);

    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      // Respond to the browser immediately
      res.writeHead(200, { "Content-Type": "text/html" });

      if (error) {
        res.end(authResultPage("Authentication Failed", `Error: ${error}. You can close this tab.`, false));
        clearTimeout(timeout);
        server.close();
        reject(new Error(`Authentication failed: ${error}`));
        return;
      }

      if (!code || returnedState !== state) {
        res.end(authResultPage("Authentication Failed", "Invalid callback. Please try again.", false));
        clearTimeout(timeout);
        server.close();
        reject(new Error("Invalid callback: state mismatch or missing code."));
        return;
      }

      res.end(authResultPage("Authentication Successful", "You can close this tab and return to the terminal.", true));

      clearTimeout(timeout);
      server.close();
      resolve({ code, redirectUri });
    });

    server.listen(port, "127.0.0.1", () => {
      openBrowser(authUrl);
    });
  });

  // Exchange code for tokens
  console.log("Exchanging authorization code for tokens...");

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code: result.code,
    redirect_uri: result.redirectUri,
    code_verifier: codeVerifier,
    client_id: CLIENT_ID,
  });

  const tokenResponse = await fetch(`${API_BASE}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.json().catch(() => ({}));
    console.error(`Token exchange failed: ${err.error_description ?? err.error ?? tokenResponse.statusText}`);
    process.exit(1);
  }

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    console.error("Token exchange returned no access token.");
    process.exit(1);
  }

  // Validate the token and get plan info
  let plan = "free";
  let email = "unknown";

  try {
    const licenseResponse = await fetch(`${API_BASE}/api/v1/license/validate`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (licenseResponse.ok) {
      const license = await licenseResponse.json();
      plan = license.plan ?? "free";
      email = license.user?.email ?? "unknown";
    }
  } catch {
    // License check failed — continue with defaults
  }

  // Store credentials (with cache encryption key)
  const credentials = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString(),
    cache_key: randomBytes(32).toString("hex"),
    plan,
    email,
    authenticated_at: new Date().toISOString(),
  };

  writeCredentials(credentials);

  // Clear old cache (new key = old cache unreadable anyway)
  clearCache();

  // Ensure ~/.composure/bin/ symlinks exist for cross-plugin access
  setupBinSymlinks();

  console.log(`\nLogged in as ${email}. Plan: ${plan}.`);
  console.log(`Credentials stored at ${CREDENTIALS_PATH}`);
}

// ── Cache Management ────────────────────────────────────────────────

function clearCache() {
  const cacheDir = join(COMPOSURE_DIR, "cache");
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

// ── Bin Symlinks ────────────────────────────────────────────────────

function setupBinSymlinks() {
  const binDir = join(COMPOSURE_DIR, "bin");
  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true, mode: 0o755 });
  }

  // Resolve the directory containing this script (composure plugin's bin/)
  const scriptDir = new URL(".", import.meta.url).pathname;
  const binaries = ["composure-fetch.mjs", "composure-token.mjs", "composure-cache.mjs", "composure-auth.mjs"];

  for (const bin of binaries) {
    const target = join(scriptDir, bin);
    const link = join(binDir, bin);
    try {
      // Skip if symlink already points to the right place
      if (existsSync(link)) {
        const stat = lstatSync(link);
        if (stat.isSymbolicLink()) continue;
      }
      symlinkSync(target, link);
    } catch {
      // Non-fatal — symlink may already exist or permissions issue
    }
  }
}

// ── Logout ───────────────────────────────────────────────────────────

function logout() {
  const existed = deleteCredentials();
  clearCache(); // Encrypted cache is unreadable without credentials anyway, but clean up
  if (existed) {
    console.log("Logged out. Cached content cleared.");
    console.log("Run /composure:auth login to re-authenticate.");
  } else {
    console.log("No active session found.");
  }
}

// ── Status ───────────────────────────────────────────────────────────

async function status() {
  const creds = readCredentials();

  if (!creds) {
    console.log("Not authenticated.");
    console.log("Run /composure:auth login to authenticate.");
    return;
  }

  if (isExpired(creds)) {
    console.log("Session expired. Attempting refresh...");
    const refreshed = await refreshToken(creds);
    if (!refreshed) {
      console.log("Refresh failed. Run /composure:auth login to re-authenticate.");
      return;
    }
    console.log("Token refreshed.");
  }

  // Validate with server
  const license = await validateLicense();
  if (license) {
    console.log(`Authenticated as ${license.user?.email ?? creds.email ?? "unknown"}`);
    console.log(`Plan: ${license.plan}`);
    console.log(`Features: ${license.features?.join(", ") ?? "basic"}`);

    // Update stored plan if it changed
    if (license.plan !== creds.plan) {
      writeCredentials({ ...creds, plan: license.plan, email: license.user?.email ?? creds.email });
    }
  } else {
    // Offline — show cached info
    console.log(`Authenticated as ${creds.email ?? "unknown"} (offline — cached info)`);
    console.log(`Plan: ${creds.plan ?? "free"}`);
  }

  const expiresAt = new Date(creds.expires_at);
  console.log(`Token expires: ${expiresAt.toLocaleString()}`);
  console.log(`Credentials: ${CREDENTIALS_PATH}`);
}

// ── Upgrade Plan ─────────────────────────────────────────────────────

function upgrade() {
  const url = `${API_BASE}/pricing`;
  console.log("Opening pricing page...");
  openBrowser(url);
  console.log(`Visit: ${url}`);
}

// ── Refresh Token ───────────────────────────────────────────────────

async function refresh() {
  const creds = readCredentials();
  if (!creds) {
    console.log("Not authenticated. Run composure-auth login first.");
    process.exit(1);
  }

  if (!isExpired(creds)) {
    console.log(`Token still valid (expires ${new Date(creds.expires_at).toLocaleString()}).`);
    return;
  }

  console.log("Refreshing token...");
  const refreshed = await refreshToken(creds);
  if (refreshed) {
    console.log("Token refreshed successfully.");
  } else {
    console.log("Refresh failed. Run composure-auth login to re-authenticate.");
    process.exit(1);
  }
}

// ── Migrate (.claude/ → .composure/) ─────────────────────────────────

import { cpSync, readFileSync, writeFileSync, readdirSync, renameSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

async function upgradeProject() {
  // Find project root
  let projectDir;
  try {
    projectDir = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    projectDir = process.cwd();
  }

  const claudeDir = join(projectDir, ".claude");
  const composureDir = join(projectDir, ".composure");

  console.log(`\nComposure Migrate — Verify & repair project structure\n`);
  console.log(`Project: ${projectDir}`);

  const ok = [];
  const fixed = [];
  const warn = [];

  // ── 1. Scaffold: ensure .composure/ directory structure ─────────
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
      mkdirSync(dir, { recursive: true });
      fixed.push(`Created: ${dir.replace(projectDir + "/", "")}`);
    }
  }
  ok.push(`.composure/ scaffold (${requiredDirs.length} dirs)`);

  // ── 2. Scaffold: tasks-plans/ ───────────────────────────────────
  const taskDirs = [
    join(projectDir, "tasks-plans"),
    join(projectDir, "tasks-plans", "backlog"),
    join(projectDir, "tasks-plans", "blueprints"),
    join(projectDir, "tasks-plans", "archive"),
    join(projectDir, "tasks-plans", "ideas"),
    join(projectDir, "tasks-plans", "reference"),
  ];
  for (const dir of taskDirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      fixed.push(`Created: ${dir.replace(projectDir + "/", "")}`);
    }
  }
  ok.push(`tasks-plans/ scaffold (${taskDirs.length} dirs)`);

  // ── 3. Global Cortex DB directory ───────────────────────────────
  const globalCortexDir = join(COMPOSURE_DIR, "cortex");
  if (!existsSync(globalCortexDir)) {
    mkdirSync(globalCortexDir, { recursive: true });
    fixed.push("Created: ~/.composure/cortex/");
  }
  ok.push("Global Cortex directory");

  // ── 4. Config: no-bandaids.json ─────────────────────────────────
  const noBandaids = join(composureDir, "no-bandaids.json");
  const legacyNoBandaids = join(claudeDir, "no-bandaids.json");
  if (existsSync(noBandaids)) {
    ok.push("no-bandaids.json");
  } else if (existsSync(legacyNoBandaids)) {
    cpSync(legacyNoBandaids, noBandaids);
    fixed.push("Migrated: .claude/no-bandaids.json → .composure/");
  } else {
    warn.push("no-bandaids.json missing — run /composure:initialize");
  }

  // ── 5. Companion configs ────────────────────────────────────────
  for (const companion of ["sentinel", "shipyard", "testbench", "composure-pro"]) {
    const target = join(composureDir, `${companion}.json`);
    const legacy = join(claudeDir, `${companion}.json`);
    if (existsSync(target)) {
      ok.push(`${companion}.json`);
    } else if (existsSync(legacy)) {
      cpSync(legacy, target);
      fixed.push(`Migrated: .claude/${companion}.json → .composure/`);
    }
    // No warning if missing — companions are optional
  }

  // ── 6. Frameworks ───────────────────────────────────────────────
  const fwGenerated = join(composureDir, "frameworks", "generated");
  const legacyFw = join(claudeDir, "frameworks");
  if (readdirSync(fwGenerated).length > 0) {
    ok.push("frameworks/generated");
  } else if (existsSync(legacyFw)) {
    cpSync(legacyFw, join(composureDir, "frameworks"), { recursive: true });
    fixed.push("Migrated: .claude/frameworks/ → .composure/frameworks/");
  } else {
    warn.push("frameworks/generated empty — run /composure:initialize");
  }

  // ── 7. Graph DB: .code-review-graph/ → .composure/graph/ ───────
  const newGraphDir = join(composureDir, "graph");
  const newGraphDb = join(newGraphDir, "graph.db");
  const legacyGraphDir = join(projectDir, ".code-review-graph");
  const legacyGraphDb = join(legacyGraphDir, "graph.db");
  if (existsSync(newGraphDb)) {
    ok.push("Graph DB (.composure/graph/graph.db)");
    // Clean up legacy if it still exists alongside the new one
    if (existsSync(legacyGraphDir)) {
      try { rmSync(legacyGraphDir, { recursive: true }); } catch {}
      fixed.push("Removed: stale .code-review-graph/ (DB already in .composure/graph/)");
    }
  } else if (existsSync(legacyGraphDb)) {
    const files = readdirSync(legacyGraphDir);
    for (const file of files) {
      if (file === ".gitignore") continue;
      renameSync(join(legacyGraphDir, file), join(newGraphDir, file));
    }
    try { rmSync(legacyGraphDir, { recursive: true }); } catch {}
    fixed.push("Migrated: .code-review-graph/ → .composure/graph/");
  } else {
    warn.push("No graph DB — run /composure:build-graph");
  }

  // ── 8. Cortex DB (project-level) ───────────────────────────────
  const cortexDb = join(composureDir, "cortex.db");
  if (existsSync(cortexDb)) {
    ok.push("Cortex DB (.composure/cortex.db)");
  } else {
    warn.push("No project Cortex DB — will be created on first use");
  }

  // ── 9. Global Cortex DB ─────────────────────────────────────────
  const globalCortexDb = join(COMPOSURE_DIR, "cortex", "cortex.db");
  if (existsSync(globalCortexDb)) {
    ok.push("Global Cortex DB");
  } else {
    warn.push("No global Cortex DB — will be created on first use");
  }

  // ── 10. .gitignore entries ──────────────────────────────────────
  const gitignorePath = join(projectDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf8");
    const missing = [];
    if (!content.includes(".composure/")) missing.push(".composure/");
    if (!content.includes(".code-review-graph")) missing.push(".code-review-graph/");
    if (missing.length > 0) {
      writeFileSync(gitignorePath, content.trimEnd() + "\n\n# Composure\n" + missing.join("\n") + "\n");
      fixed.push(`Updated .gitignore: added ${missing.join(", ")}`);
    }
    ok.push(".gitignore");
  }

  // ── Report ──────────────────────────────────────────────────────
  console.log("\n── Structure Check ──\n");
  for (const item of ok) console.log(`  ✓ ${item}`);
  for (const item of fixed) console.log(`  ⚡ ${item}`);
  for (const item of warn) console.log(`  ⚠ ${item}`);
  console.log(`\n${ok.length} OK · ${fixed.length} fixed · ${warn.length} warnings`);
  if (fixed.length > 0) {
    console.log("\nRestart Claude Code to pick up changes.");
  }
}

// ── HTML Response Page ───────────────────────────────────────────────

function authResultPage(title, message, success) {
  const color = success ? "#22c55e" : "#ef4444";
  const icon = success ? "&#10003;" : "&#10007;";
  return `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body style="font-family: -apple-system, system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa;">
  <div style="text-align: center; max-width: 400px;">
    <div style="font-size: 48px; color: ${color}; margin-bottom: 16px;">${icon}</div>
    <h1 style="font-size: 24px; margin: 0 0 8px;">${title}</h1>
    <p style="color: #a1a1aa; margin: 0;">${message}</p>
  </div>
</body>
</html>`;
}

// ── CLI Router ───────────────────────────────────────────────────────

const subcommand = process.argv[2];

switch (subcommand) {
  case "login":
    await login().catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
    break;

  case "logout":
    logout();
    break;

  case "status":
    await status();
    break;

  case "upgrade":
    upgrade();
    break;

  case "migrate":
    await upgradeProject();
    break;

  case "refresh":
    await refresh();
    break;

  default:
    console.log("composure-auth — Composure CLI Authentication\n");
    console.log("Usage:");
    console.log("  composure-auth login     Authenticate via browser (OAuth 2.1 + PKCE)");
    console.log("  composure-auth logout    Clear stored credentials and cache");
    console.log("  composure-auth status    Show account, plan, and token info");
    console.log("  composure-auth upgrade   Open pricing page to upgrade your plan");
    console.log("  composure-auth migrate   Migrate project configs (.claude/ → .composure/)");
    console.log("  composure-auth refresh   Refresh an expired token without re-login");
    console.log(`\nCredentials: ${CREDENTIALS_PATH}`);
    break;
}
