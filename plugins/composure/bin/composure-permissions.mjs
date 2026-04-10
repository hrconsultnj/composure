#!/usr/bin/env node

/**
 * composure-permissions.mjs — Auto-inject plugin permissions
 *
 * Adds required Composure permissions to ~/.claude/settings.json so users
 * don't get prompted for routine plugin operations. Version-stamped —
 * only re-runs when the plugin version changes.
 *
 * Usage:
 *   composure-permissions sync [--plugin-version X.Y.Z]  # Add missing permissions
 *   composure-permissions list                            # Show what would be added
 *   composure-permissions check                           # Check if sync is needed
 *
 * Cross-platform: Mac (darwin) and Windows (win32) via os.homedir().
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

// ── Paths ───────────────────────────────────────────────────────────

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");
const COMPOSURE_DIR = join(homedir(), ".composure");
const STAMP_PATH = join(COMPOSURE_DIR, "last-permissions-sync");

// ── MCP Tool Prefix ─────────────────────────────────────────────────

const MCP_PREFIX = "mcp__plugin_composure_";

function mcpTool(server, tool) {
  return `${MCP_PREFIX}${server}__${tool}`;
}

// ── Required Permissions ────────────────────────────────────────────

const HOME = homedir();

const REQUIRED_PERMISSIONS = [
  // ── Fetch — resolved absolute path (Claude Code expands $HOME/~ in commands before matching) ──
  `Bash(${HOME}/.composure/bin/composure-fetch.mjs *)`,

  // ── Graph (code analysis — all read-safe + build) ──
  mcpTool("composure-graph", "build_or_update_graph"),
  mcpTool("composure-graph", "query_graph"),
  mcpTool("composure-graph", "search_references"),
  mcpTool("composure-graph", "semantic_search_nodes"),
  mcpTool("composure-graph", "get_impact_radius"),
  mcpTool("composure-graph", "get_dependency_chain"),
  mcpTool("composure-graph", "get_review_context"),
  mcpTool("composure-graph", "find_large_functions"),
  mcpTool("composure-graph", "list_graph_stats"),
  mcpTool("composure-graph", "entity_scope"),
  mcpTool("composure-graph", "run_audit"),
  mcpTool("composure-graph", "generate_audit_html"),
  mcpTool("composure-graph", "generate_graph_html"),

  // ── Cortex (memory + thinking) ──
  mcpTool("composure-cortex", "create_memory_node"),
  mcpTool("composure-cortex", "create_memory_edge"),
  mcpTool("composure-cortex", "search_memory"),
  mcpTool("composure-cortex", "search_memory_text"),
  mcpTool("composure-cortex", "search_memory_semantic"),
  mcpTool("composure-cortex", "traverse_memory_graph"),
  mcpTool("composure-cortex", "delete_memory_node"),
  mcpTool("composure-cortex", "generate_memory_html"),
  mcpTool("composure-cortex", "sequential_think"),
  mcpTool("composure-cortex", "capture_thought"),
  mcpTool("composure-cortex", "get_thinking_session"),
  mcpTool("composure-cortex", "list_thinking_sessions"),
  mcpTool("composure-cortex", "complete_thinking_session"),
  mcpTool("composure-cortex", "summarize_thinking_session"),
  mcpTool("composure-cortex", "list_thinking_templates"),

  // ── Enforce (code quality) ──
  mcpTool("composure-enforce", "validate_code"),
  mcpTool("composure-enforce", "validate_all"),
  mcpTool("composure-enforce", "framework_check"),
  mcpTool("composure-enforce", "check_quality"),
  mcpTool("composure-enforce", "get_rules"),
  mcpTool("composure-enforce", "get_stack"),

  // ── Guardrails (response safety) ──
  mcpTool("composure-guardrails", "evaluate_response"),
  mcpTool("composure-guardrails", "generate_prompt"),
  mcpTool("composure-guardrails", "load_ruleset"),
  mcpTool("composure-guardrails", "list_rulesets"),

  // ── Sequential Thinking (standalone MCP) ──
  "mcp__sequential-thinking__sequentialthinking",
];

// ── Read/Write Settings ─────────────────────────────────────────────

function readSettings() {
  if (!existsSync(SETTINGS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeSettings(settings) {
  const dir = dirname(SETTINGS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

// ── Stamp (version-based — only re-run on plugin update) ────────────

function readStamp() {
  try {
    return readFileSync(STAMP_PATH, "utf8").trim();
  } catch {
    return "";
  }
}

function writeStamp(version) {
  const dir = dirname(STAMP_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STAMP_PATH, version, "utf8");
}

// ── Deprecated Patterns (auto-cleaned on sync) ─────────────────────

// Patterns that never matched — auto-cleaned on sync.
// Dynamic: also removes any resolved-homedir patterns from earlier sync attempts.
function getDeprecatedPermissions() {
  const HOME = homedir();
  return [
    // v1.47.32: colon separator
    'Bash(~/.composure/bin/composure-fetch.mjs:*)',
    'Bash("$HOME/.composure/bin/composure-fetch.mjs":*)',
    // v1.47.33: unexpanded ~ and quoted $HOME
    'Bash(~/.composure/bin/composure-fetch.mjs *)',
    'Bash("$HOME/.composure/bin/composure-fetch.mjs" *)',
    // v1.47.33b: literal $HOME (not expanded in patterns)
    'Bash($HOME/.composure/bin/composure-fetch.mjs *)',
    'Bash("$HOME/.composure/bin/composure-fetch.mjs" *)',
  ];
}

// ── Sync Logic ──────────────────────────────────────────────────────

function syncPermissions(pluginVersion) {
  const settings = readSettings();
  if (!settings) {
    console.error("[composure:permissions] No ~/.claude/settings.json found — Claude CLI not detected.");
    process.exit(0); // Not an error — CLI just isn't installed
  }

  // Ensure permissions structure exists
  if (!settings.permissions) settings.permissions = {};
  if (!Array.isArray(settings.permissions.allow)) settings.permissions.allow = [];

  // Remove deprecated patterns (e.g., :* → literal $HOME migration)
  const deprecatedSet = new Set(getDeprecatedPermissions());
  const beforeLen = settings.permissions.allow.length;
  settings.permissions.allow = settings.permissions.allow.filter(p => !deprecatedSet.has(p));
  const removed = beforeLen - settings.permissions.allow.length;

  const existing = new Set(settings.permissions.allow);
  const added = [];

  for (const perm of REQUIRED_PERMISSIONS) {
    if (!existing.has(perm)) {
      settings.permissions.allow.push(perm);
      added.push(perm);
    }
  }

  if (added.length > 0 || removed > 0) {
    writeSettings(settings);
    if (removed > 0) {
      console.log(`[composure:permissions] Removed ${removed} deprecated permission(s)`);
    }
    if (added.length > 0) {
      console.log(`[composure:permissions] Added ${added.length} permission(s) to ~/.claude/settings.json`);
      for (const p of added) {
        console.log(`  + ${p}`);
      }
    }
  } else {
    console.log("[composure:permissions] All permissions already present.");
  }

  // Write version stamp
  if (pluginVersion) writeStamp(pluginVersion);

  return added.length;
}

// ── Commands ────────────────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "sync": {
    const versionIdx = args.indexOf("--plugin-version");
    const pluginVersion = versionIdx >= 0 ? args[versionIdx + 1] : null;
    syncPermissions(pluginVersion);
    break;
  }

  case "list": {
    console.log(`Composure required permissions (${REQUIRED_PERMISSIONS.length}):\n`);
    for (const p of REQUIRED_PERMISSIONS) {
      console.log(`  ${p}`);
    }
    break;
  }

  case "check": {
    const settings = readSettings();
    if (!settings?.permissions?.allow) {
      console.log("no-settings");
      process.exit(0);
    }
    const existing = new Set(settings.permissions.allow);
    const missing = REQUIRED_PERMISSIONS.filter(p => !existing.has(p));
    if (missing.length === 0) {
      console.log("ok");
    } else {
      console.log(`missing:${missing.length}`);
      for (const p of missing) {
        console.log(`  - ${p}`);
      }
    }
    break;
  }

  default:
    console.log("composure-permissions — Auto-inject plugin permissions\n");
    console.log("Usage:");
    console.log("  composure-permissions sync [--plugin-version X.Y.Z]");
    console.log("  composure-permissions list");
    console.log("  composure-permissions check");
    break;
}
