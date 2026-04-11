#!/usr/bin/env node
/**
 * MCP server for Composure enforcement.
 *
 * Exposes the enforcement engine as MCP tools for platforms
 * that don't support hooks (Roo Code, Codex, Aider, etc.).
 *
 * On Claude Code, hooks are the PRIMARY enforcement mechanism.
 * This MCP server is a COMPLEMENT, not a replacement.
 *
 * Uses stdio transport — same pattern as composure-graph.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  validateCode,
  frameworkCheck,
  checkQuality,
  validateAll,
  getStack,
  getRules,
} from "./engine.js";

// Shared content-fetch module — lives in bin/composure-content.mjs.
// Marked as external in esbuild.config.js so it's loaded at runtime (not bundled),
// which lets both the MCP server (here) and the Bash CLI (bin/composure-fetch.mjs)
// share a single source of truth for fetch/cache logic.
import {
  fetchSkillContent,
  fetchHookContent,
  fetchRefContent,
  FetchError,
} from "../../bin/composure-content.mjs";

const server = new McpServer({
  name: "composure-enforce",
  version: "1.0.0",
});

// ── Tool 1: validate_code ─────────────────────────────────────────

server.tool(
  "validate_code",
  "Run no-bandaids language rules against file content. Detects type shortcuts, unsafe patterns, and bad practices across TypeScript, Python, Go, Rust, C++, Swift, and Kotlin.",
  {
    file_path: z
      .string()
      .describe("Absolute or relative file path (used for language detection and config lookup)."),
    content: z
      .string()
      .describe("The file content to validate."),
  },
  async ({ file_path, content }) => {
    const result = validateCode(file_path, content);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 2: framework_check ───────────────────────────────────────

server.tool(
  "framework_check",
  "Run framework-specific validation rules against file content. Checks for deprecated APIs, wrong patterns, and framework anti-patterns based on the project's detected stack.",
  {
    file_path: z
      .string()
      .describe("Absolute or relative file path."),
    content: z
      .string()
      .describe("The file content to validate."),
    plugin_root: z
      .string()
      .optional()
      .describe("Plugin root path for loading default rules. Auto-detected if omitted."),
  },
  async ({ file_path, content, plugin_root }) => {
    const result = frameworkCheck(file_path, content, plugin_root);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 3: check_quality ─────────────────────────────────────────

server.tool(
  "check_quality",
  "Analyze a file for code quality issues: file size, large functions, inline types, multiple exported components. Returns metrics and decomposition suggestions.",
  {
    file_path: z
      .string()
      .describe("Absolute path to the file to analyze."),
  },
  async ({ file_path }) => {
    const report = checkQuality(file_path);
    return {
      content: [
        {
          type: "text" as const,
          text: report
            ? JSON.stringify(report, null, 2)
            : JSON.stringify({ error: "File not found or not analyzable" }),
        },
      ],
    };
  },
);

// ── Tool 4: get_rules ─────────────────────────────────────────────

server.tool(
  "get_rules",
  "List all enforcement rules, optionally filtered by language. Returns rule names, patterns, severity, and messages.",
  {
    language: z
      .string()
      .optional()
      .describe("Filter rules by language (typescript, python, go, rust, cpp, swift, kotlin)."),
  },
  async ({ language }) => {
    const result = getRules(language);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 5: get_stack ─────────────────────────────────────────────

server.tool(
  "get_stack",
  "Get the detected tech stack and Composure config for a project directory.",
  {
    project_dir: z
      .string()
      .optional()
      .describe("Project directory to check. Auto-detected from CWD if omitted."),
  },
  async ({ project_dir }) => {
    const result = getStack(project_dir);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 6: validate_all ──────────────────────────────────────────

server.tool(
  "validate_all",
  "Run ALL enforcement checks (no-bandaids + framework validation) on a file in one call. Returns combined violations and warnings.",
  {
    file_path: z
      .string()
      .describe("Absolute or relative file path."),
    content: z
      .string()
      .describe("The file content to validate."),
    plugin_root: z
      .string()
      .optional()
      .describe("Plugin root path for loading default rules. Auto-detected if omitted."),
  },
  async ({ file_path, content, plugin_root }) => {
    const result = validateAll(file_path, content, plugin_root);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ────────────────────────────────────────────────────────────────────
// Content Fetch Tools
// ────────────────────────────────────────────────────────────────────
//
// These three tools serve Composure skill steps, hook scripts, and reference
// docs through the MCP protocol. They mirror the Bash CLI at bin/composure-fetch.mjs
// and share the same underlying fetch/cache module (bin/composure-content.mjs),
// so bug fixes to the fetch logic propagate to both paths automatically.
//
// Implementation note: do not add PostToolUse hooks matching these tool names.
// Any hook that emits `updatedMCPToolOutput` interferes with the tool's intended
// result rendering. If you need to transform or augment fetch results, route it
// through the tool handler below instead of via a hook.
// ────────────────────────────────────────────────────────────────────

/**
 * Format a FetchError as the MCP tool result text.
 * Errors are returned as regular content (not thrown) with `isError: true` so
 * the MCP protocol surfaces them visibly in the tool result.
 */
function formatFetchError(err: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  let message: string;
  if (err instanceof FetchError) {
    message = err.toCliMessage();
  } else if (err instanceof Error) {
    message = `[composure:fetch-failed] Unexpected error: ${err.message}\nReport this to the user and wait for instructions.`;
  } else {
    message = `[composure:fetch-failed] Unexpected error: ${String(err)}\nReport this to the user and wait for instructions.`;
  }
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

// ── Tool 7: composure_fetch_skill ─────────────────────────────────

server.tool(
  "composure_fetch_skill",
  "Fetch a Composure skill step's content by plugin/skill/step. Returns the full content body. Cache-first, with API fallback when the cache is stale.",
  {
    plugin: z
      .string()
      .describe('Plugin slug (e.g., "composure", "sentinel", "testbench").'),
    skill: z
      .string()
      .describe('Skill name (e.g., "blueprint", "initialize", "review-pr").'),
    step: z
      .string()
      .describe('Step filename without extension (e.g., "01-classify", "00a-preflight").'),
  },
  async ({ plugin, skill, step }) => {
    try {
      const { content } = await fetchSkillContent(plugin, skill, step);
      return {
        content: [{ type: "text" as const, text: content }],
      };
    } catch (err) {
      return formatFetchError(err);
    }
  },
);

// ── Tool 8: composure_fetch_hook ──────────────────────────────────

server.tool(
  "composure_fetch_hook",
  "Fetch a Composure hook script's content by plugin/hook. Returns the full script body. Cache-first, with API fallback.",
  {
    plugin: z
      .string()
      .describe('Plugin slug (e.g., "composure").'),
    hook: z
      .string()
      .describe('Hook filename (e.g., "session/session-boot.sh", "quality/decomposition-check.sh").'),
  },
  async ({ plugin, hook }) => {
    try {
      const { content } = await fetchHookContent(plugin, hook);
      return {
        content: [{ type: "text" as const, text: content }],
      };
    } catch (err) {
      return formatFetchError(err);
    }
  },
);

// ── Tool 9: composure_fetch_ref ───────────────────────────────────

server.tool(
  "composure_fetch_ref",
  "Fetch a Composure reference document's content by plugin/path. Used for shared pattern guides, templates, and cross-skill references. Cache-first, with API fallback.",
  {
    plugin: z
      .string()
      .describe('Plugin slug (e.g., "composure").'),
    path: z
      .string()
      .describe('Reference path under the plugin\'s references/ directory (e.g., "integration-builder/auth-patterns", "blueprint/04b-blueprint-document").'),
  },
  async ({ plugin, path }) => {
    try {
      const { content } = await fetchRefContent(plugin, path);
      return {
        content: [{ type: "text" as const, text: content }],
      };
    } catch (err) {
      return formatFetchError(err);
    }
  },
);

// ── Start server ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("composure-enforce server failed to start:", err);
  process.exit(1);
});
