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

// ── Start server ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("composure-enforce server failed to start:", err);
  process.exit(1);
});
