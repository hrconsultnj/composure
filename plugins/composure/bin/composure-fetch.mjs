#!/usr/bin/env node

/**
 * composure-fetch.mjs — Authenticated Content Fetcher (Bash CLI)
 *
 * Bash CLI entry point for fetching skill steps, hook scripts, and reference docs.
 * Runs anywhere Node is available, including sandboxes where MCP servers aren't loaded.
 *
 * All fetch/cache/crypto logic lives in the shared module composure-content.mjs.
 * The equivalent MCP tools (composure_fetch_*) on composure-enforce use the same
 * module, so bug fixes propagate to both entry points automatically.
 *
 * Usage:
 *   composure-fetch skill {plugin} {skill} {step}   # Fetch a skill step
 *   composure-fetch hook  {plugin} {hook}            # Fetch a hook script
 *   composure-fetch ref   {plugin} {path}            # Fetch a reference doc
 */

import {
  fetchSkillContent,
  fetchHookContent,
  fetchRefContent,
  FetchError,
  CACHE_DIR,
} from "./composure-content.mjs";

// ── Failure Output (stdout so Claude sees it despite 2>/dev/null) ───

function failWithGuidance(error, action) {
  const msg = [
    `[composure:fetch-failed] ${error}`,
    action || "Run /composure:auth login or check your connection.",
    "IMPORTANT: Do NOT reconstruct this content from memory or training data.",
    "Report this error to the user and wait for instructions.",
  ].join("\n");
  process.stdout.write(msg + "\n");
  process.exit(1);
}

// ── Command Runners (thin wrappers over shared module) ─────────────

async function runFetch(fetchFn, ...args) {
  try {
    const { content, source } = await fetchFn(...args);
    if (source !== "api") {
      console.error(`${source} — using locally cached version`);
    }
    process.stdout.write(content);
  } catch (err) {
    if (err instanceof FetchError) {
      // Write the structured error to stdout so Claude sees it despite 2>/dev/null
      process.stdout.write(err.toCliMessage() + "\n");
      process.exit(1);
    }
    // Unexpected error — surface with a generic wrapper
    failWithGuidance(
      `Unexpected error: ${err.message}`,
      "Check ~/.composure/ permissions or re-install the plugin.",
    );
  }
}

// ── CLI Router ───────────────────────────────────────────────────────

const [type, ...args] = process.argv.slice(2);

switch (type) {
  case "skill": {
    const [plugin, skill, step] = args;
    if (!plugin || !skill || !step) {
      failWithGuidance("Missing arguments for skill fetch.", "Usage: composure-fetch skill {plugin} {skill} {step}");
    }
    await runFetch(fetchSkillContent, plugin, skill, step);
    break;
  }

  case "hook": {
    const [plugin, hook] = args;
    if (!plugin || !hook) {
      failWithGuidance("Missing arguments for hook fetch.", "Usage: composure-fetch hook {plugin} {hook}");
    }
    await runFetch(fetchHookContent, plugin, hook);
    break;
  }

  case "ref": {
    const [plugin, ...pathParts] = args;
    const path = pathParts.join("/");
    if (!plugin || !path) {
      failWithGuidance("Missing arguments for ref fetch.", "Usage: composure-fetch ref {plugin} {path}");
    }
    await runFetch(fetchRefContent, plugin, path);
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
