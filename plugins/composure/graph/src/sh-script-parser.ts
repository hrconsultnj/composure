/**
 * Shell script (.sh) parser for hook and script indexing.
 *
 * Parses .sh files using regex (no tree-sitter needed) to extract:
 * - Function definitions (function_name() { ... } or function name { ... })
 * - Source/dot-source imports (source ./path or . ./path)
 * - External command executions (node, python, npx, bash, etc.)
 * - File path references (explicit paths in the script)
 *
 * Split from sh-parser.ts which handles routing and hooks.json parsing.
 */

import { readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import type { EdgeInfo, NodeInfo } from "./types.js";

function qualify(name: string, filePath: string, parent: string | null): string {
  return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}

// ── Main parser ──────────────────────────────────────────────────

export function parseShellScript(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }

  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];
  const lines = content.split("\n");
  const totalLines = lines.length;
  const name = basename(filePath);

  const purpose = detectPurpose(filePath, content);
  const isHook = filePath.includes("/hooks/") || purpose === "hook";

  // File node
  nodes.push({
    kind: "File",
    name,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "bash",
    is_test: false,
    extra: {
      scriptType: isHook ? "hook" : "script",
      purpose,
      hasSetE: content.includes("set -e") || content.includes("set -euo"),
      hasPipefail: content.includes("pipefail"),
      usesJq: content.includes("jq ") || content.includes("jq -"),
      readsStdin: content.includes("$(cat)") || content.includes("read "),
    },
  });

  // Track current function for CALLS edge scoping
  let currentFunc: string | null = null;
  let inFunction = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    if (trimmed.startsWith("#") || trimmed === "") continue;

    // ── Function definitions ──────────────────────────────────
    const funcMatch = trimmed.match(
      /^(?:function\s+)?(\w+)\s*\(\s*\)\s*\{?\s*$|^function\s+(\w+)\s*\{?\s*$/,
    );
    if (funcMatch) {
      const funcName = funcMatch[1] ?? funcMatch[2];
      if (funcName && !isBuiltinKeyword(funcName)) {
        const funcEnd = findFunctionEnd(lines, i);

        nodes.push({
          kind: "Function",
          name: funcName,
          file_path: filePath,
          line_start: lineNum,
          line_end: funcEnd,
          language: "bash",
          parent_name: undefined,
          is_test: false,
          extra: { shellFunction: true },
        });

        edges.push({
          kind: "CONTAINS",
          source: filePath,
          target: qualify(funcName, filePath, null),
          file_path: filePath,
          line: lineNum,
        });

        currentFunc = funcName;
        inFunction = true;
        braceDepth = 1;
        continue;
      }
    }

    // Track brace depth for function scope
    if (inFunction) {
      for (const ch of trimmed) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (braceDepth <= 0) {
        currentFunc = null;
        inFunction = false;
      }
    }

    // ── Source/dot-source imports ────────────────────────────
    const sourceMatch = trimmed.match(
      /^(?:source|\.)\s+["']?([^"'\s;#]+)["']?/,
    );
    if (sourceMatch) {
      const sourcePath = resolveShellPath(sourceMatch[1], filePath);
      edges.push({
        kind: "IMPORTS_FROM",
        source: filePath,
        target: sourcePath,
        file_path: filePath,
        line: lineNum,
      });
      continue;
    }

    // ── External script/command executions ───────────────────
    const execMatch = trimmed.match(
      /\b(bash|sh|node|python3?|ruby|npx|pnpm|npm|yarn|go\s+run|cargo\s+run)\s+["']?([^"'\s;#|&]+)/,
    );
    if (execMatch) {
      const command = execMatch[1];
      const target = execMatch[2];
      const caller = currentFunc
        ? qualify(currentFunc, filePath, null)
        : filePath;

      if (target.match(/\.\w+$|^[.$/]/)) {
        const resolvedTarget = resolveShellPath(target, filePath);
        edges.push({
          kind: "CALLS",
          source: caller,
          target: resolvedTarget,
          file_path: filePath,
          line: lineNum,
          extra: { via: command },
        });
      }
    }

    // ── File path references ────────────────────────────────
    const pathRefs = trimmed.matchAll(
      /["']([./][\w/.${}-]+\.(?:sh|ts|js|json|py|go|rs|yaml|yml|toml|sql))\b["']?/g,
    );
    for (const match of pathRefs) {
      const refPath = match[1];
      if (refPath.includes("*")) continue;
      const resolvedRef = resolveShellPath(refPath, filePath);
      const caller = currentFunc
        ? qualify(currentFunc, filePath, null)
        : filePath;

      edges.push({
        kind: "REFERENCES",
        source: caller,
        target: resolvedRef,
        file_path: filePath,
        line: lineNum,
        extra: { type: "file-reference" },
      });
    }
  }

  return { nodes, edges };
}

// ── Utility functions ────────────────────────────────────────────

function findFunctionEnd(lines: string[], startLine: number): number {
  let depth = 0;
  let foundOpen = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === "{") { depth++; foundOpen = true; }
      if (ch === "}") depth--;
    }
    if (foundOpen && depth <= 0) return i + 1;
  }
  return lines.length;
}

function resolveShellPath(raw: string, fromFile: string): string {
  if (raw.includes("CLAUDE_PLUGIN_ROOT") || raw.includes("PLUGIN_ROOT")) {
    return raw;
  }
  if (raw.startsWith("./") || raw.startsWith("../")) {
    return resolve(dirname(fromFile), raw);
  }
  if (raw.startsWith("$")) return raw;
  if (raw.startsWith("/")) return raw;
  return resolve(dirname(fromFile), raw);
}

function detectPurpose(filePath: string, content: string): string {
  const name = basename(filePath, ".sh").toLowerCase();
  const firstLines = content.slice(0, 500).toLowerCase();

  if (filePath.includes("/hooks/")) return "hook";
  if (name.includes("init") || name.includes("setup")) return "initialization";
  if (name.includes("build") || name.includes("compile")) return "build";
  if (name.includes("test") || name.includes("spec")) return "test";
  if (name.includes("deploy") || name.includes("release")) return "deployment";
  if (name.includes("lint") || name.includes("check") || name.includes("guard")) return "guard";
  if (name.includes("generate") || name.includes("scaffold")) return "codegen";
  if (name.includes("sync") || name.includes("update")) return "sync";
  if (firstLines.includes("pretooluse") || firstLines.includes("posttooluse")) return "hook";
  return "utility";
}

function isBuiltinKeyword(name: string): boolean {
  const BUILTINS = new Set([
    "if", "then", "else", "elif", "fi", "for", "while", "do", "done",
    "case", "esac", "in", "select", "until", "coproc", "time",
  ]);
  return BUILTINS.has(name);
}
