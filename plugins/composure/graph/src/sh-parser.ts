/**
 * Shell file parser — routing and hooks.json parsing.
 *
 * Routes .sh files to sh-script-parser.ts and hooks.json to the
 * inline hooks parser. Creates edges from hook events → scripts.
 */

import { readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import type { EdgeInfo, NodeInfo } from "./types.js";
import { parseShellScript } from "./sh-script-parser.js";

// ── Detection ─────────────────────────────────────────────────────

export function isShParseable(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".sh") return true;
  if (basename(filePath) === "hooks.json" && filePath.includes("/hooks/")) return true;
  return false;
}

// ── Entry point ──────────────────────────────────────────────────

export function parseShFile(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  if (basename(filePath) === "hooks.json") {
    return parseHooksJson(filePath);
  }
  return parseShellScript(filePath);
}

// ── Helpers ─��─────────────────────────────────────────────────────

function qualify(name: string, filePath: string, parent: string | null): string {
  return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}

function findLineInContent(content: string, needle: string): number {
  const idx = content.indexOf(needle);
  if (idx < 0) return 1;
  let line = 1;
  for (let i = 0; i < idx; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

// ── hooks.json parser ────────────────────────────────────────────

function parseHooksJson(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }

  let config: { hooks?: Record<string, Array<{ matcher?: string; hooks?: Array<{ type?: string; command?: string }> }>> };
  try {
    config = JSON.parse(content);
  } catch {
    return { nodes: [], edges: [] };
  }

  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];
  const lines = content.split("\n");
  const name = basename(filePath);

  nodes.push({
    kind: "File",
    name,
    file_path: filePath,
    line_start: 1,
    line_end: lines.length,
    language: "json",
    is_test: false,
    extra: { configType: "hooks" },
  });

  if (!config.hooks) return { nodes, edges };

  for (const [eventType, matchers] of Object.entries(config.hooks)) {
    if (!Array.isArray(matchers)) continue;

    for (const matcherGroup of matchers) {
      const matcher = matcherGroup.matcher ?? "*";
      const hookList = matcherGroup.hooks ?? [];

      for (const hook of hookList) {
        if (hook.type !== "command" || !hook.command) continue;

        const scriptMatch = hook.command.match(
          /(?:bash|sh|node|python3?)\s+["']?(?:\$\{?\w+\}?\/)?([^"'\s]+\.(?:sh|js|py|ts))["']?/,
        );

        if (scriptMatch) {
          const scriptRelPath = scriptMatch[1];
          const hooksDir = dirname(filePath);
          const pluginRoot = dirname(hooksDir);
          const scriptAbsPath = resolve(pluginRoot, scriptRelPath);

          const hookName = `${eventType}:${matcher}→${basename(scriptRelPath)}`;

          nodes.push({
            kind: "Script",
            name: hookName,
            file_path: filePath,
            line_start: findLineInContent(content, scriptRelPath),
            line_end: findLineInContent(content, scriptRelPath),
            language: "json",
            is_test: false,
            extra: {
              hookEvent: eventType,
              hookMatcher: matcher,
              scriptPath: scriptRelPath,
            },
          });

          edges.push({
            kind: "CONTAINS",
            source: filePath,
            target: qualify(hookName, filePath, null),
            file_path: filePath,
            line: findLineInContent(content, scriptRelPath),
          });

          edges.push({
            kind: "CALLS",
            source: qualify(hookName, filePath, null),
            target: scriptAbsPath,
            file_path: filePath,
            line: findLineInContent(content, scriptRelPath),
            extra: {
              hookEvent: eventType,
              hookMatcher: matcher,
            },
          });
        }
      }
    }
  }

  return { nodes, edges };
}
