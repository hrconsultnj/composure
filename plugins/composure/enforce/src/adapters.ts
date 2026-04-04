/**
 * Platform adapters — generate native configs from .composure/
 *
 * Each adapter creates platform-specific hook configs and MCP
 * registrations that call the shared composure-enforce engine.
 *
 * Usage: composure-enforce adapt <platform>
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { findProjectRoot } from "./config.js";

// ── Resolve enforce binary path ─────────────────────────────────

function getEnforcePath(): string {
  // In plugin context, use CLAUDE_PLUGIN_ROOT
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return join(process.env.CLAUDE_PLUGIN_ROOT, "enforce", "dist", "cli.js");
  }
  // Fallback: search common locations
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const cachePath = join(
    home,
    ".claude",
    "plugins",
    "cache",
    "my-claude-plugins",
    "composure",
  );
  if (existsSync(cachePath)) {
    // Find latest version
    const entries = require("fs")
      .readdirSync(cachePath)
      .filter((e: string) => !e.startsWith("."));
    if (entries.length > 0) {
      return join(cachePath, entries[entries.length - 1], "enforce", "dist", "cli.js");
    }
  }
  return "composure-enforce";
}

function getServerPath(): string {
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return join(process.env.CLAUDE_PLUGIN_ROOT, "enforce", "dist", "server.js");
  }
  return "composure-enforce-server";
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ── Cursor Adapter ──────────────────────────────────────────────

export function adaptCursor(projectDir: string): string[] {
  const cursorDir = join(projectDir, ".cursor");
  ensureDir(cursorDir);
  ensureDir(join(cursorDir, "rules"));

  const enforcePath = getEnforcePath();
  const serverPath = getServerPath();
  const created: string[] = [];

  // 1. Generate .cursor/hooks.json
  const hooksConfig = {
    hooks: {
      PreToolUse: {
        command: "node",
        args: [
          enforcePath,
          "all",
          "${file_path}",
          "--content",
          "${content}",
        ],
      },
    },
  };
  writeFileSync(
    join(cursorDir, "hooks.json"),
    JSON.stringify(hooksConfig, null, 2) + "\n",
  );
  created.push(".cursor/hooks.json");

  // 2. Generate .cursor/mcp.json
  const mcpConfig = {
    mcpServers: {
      "composure-graph": {
        command: "node",
        args: ["--experimental-sqlite", serverPath.replace("enforce", "graph")],
      },
      "composure-enforce": {
        command: "node",
        args: [serverPath],
      },
    },
  };
  writeFileSync(
    join(cursorDir, "mcp.json"),
    JSON.stringify(mcpConfig, null, 2) + "\n",
  );
  created.push(".cursor/mcp.json");

  // 3. Generate .cursor/rules/composure.mdc
  const rulesContent = `---
description: Composure code quality enforcement
globs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs']
alwaysApply: true
---

# Composure Enforcement Rules

This project uses Composure for code quality enforcement. The following rules are enforced automatically via hooks:

## No Band-Aids
- No \`as any\` — use type guards or satisfies
- No \`@ts-ignore\` / \`@ts-nocheck\` — fix the type error
- No non-null assertions (\`!\`) — use optional chaining
- No \`any\` parameters or return types — define interfaces
- No \`eval()\` — never
- No bare \`except:\` (Python) — catch specific exceptions
- No discarded errors (Go) — handle or return with context

## Decomposition
- Files over 400 lines get flagged, 800+ is critical
- Functions over 150 lines must be extracted
- 3+ inline types → move to types.ts
- Route files should be under 50 lines

## Framework Validation
Stack-specific rules loaded from .composure/no-bandaids.json — covers Next.js, Tailwind, Supabase, React 19, TanStack Query, Zod, and more.

Run \`composure-enforce rules\` to see all active rules.
`;
  writeFileSync(join(cursorDir, "rules", "composure.mdc"), rulesContent);
  created.push(".cursor/rules/composure.mdc");

  return created;
}

// ── Windsurf Adapter ────────────────────────────────────────────

export function adaptWindsurf(projectDir: string): string[] {
  const windsurfDir = join(projectDir, ".windsurf");
  ensureDir(windsurfDir);
  ensureDir(join(windsurfDir, "rules"));

  const enforcePath = getEnforcePath();
  const created: string[] = [];

  // 1. Generate .windsurf/hooks.json
  const hooksConfig = {
    hooks: {
      pre_write_code: [
        {
          command: `node ${enforcePath} all "\${file_path}" --content "\${content}"`,
          show_output: true,
        },
      ],
      post_write_code: [
        {
          command: `node ${enforcePath} quality "\${file_path}"`,
          show_output: false,
        },
      ],
    },
  };
  writeFileSync(
    join(windsurfDir, "hooks.json"),
    JSON.stringify(hooksConfig, null, 2) + "\n",
  );
  created.push(".windsurf/hooks.json");

  // 2. Generate .windsurf/rules/composure.md
  const rulesContent = `---
trigger: always_on
description: "Composure code quality enforcement — no band-aids, framework validation, decomposition limits"
---

# Composure Enforcement

This project uses Composure for code quality enforcement.

## Rules Summary
- **No type shortcuts**: \`as any\`, \`@ts-ignore\`, non-null assertions, \`any\` params/returns
- **No unsafe patterns**: \`eval()\`, bare \`except:\`, discarded errors, \`panic()\` in libraries
- **Decomposition**: Files <400 lines, functions <150 lines, types in types.ts
- **Framework-specific**: Stack rules from .composure/no-bandaids.json

## Enforcement
Pre-write hooks run automatically and block violations (exit code 2).
Post-write hooks log quality metrics.

Run \`node ${enforcePath} rules\` to see all active rules.
`;
  writeFileSync(join(windsurfDir, "rules", "composure.md"), rulesContent);
  created.push(".windsurf/rules/composure.md");

  return created;
}

// ── Cline Adapter ───────────────────────────────────────────────

export function adaptCline(projectDir: string): string[] {
  const created: string[] = [];
  const enforcePath = getEnforcePath();

  // 1. Generate .clinerules
  const rules = `# Composure Enforcement Rules

This project uses Composure for code quality enforcement.

## Mandatory Rules
- Never use \`as any\` — use type guards, satisfies, or fix the type
- Never use \`@ts-ignore\` or \`@ts-nocheck\` — fix the type error
- Never use non-null assertions (\`!\`) — use optional chaining
- Never type parameters as \`any\` — define an interface
- Never use \`eval()\`
- Files must stay under 400 lines (warn) / 800 lines (block)
- Functions must stay under 150 lines
- 3+ inline types → extract to types.ts
- Route/page files should be under 50 lines

## Framework Rules
Loaded from .composure/no-bandaids.json based on detected stack.
Run \`node ${enforcePath} rules\` to see all active rules.
`;
  writeFileSync(join(projectDir, ".clinerules"), rules);
  created.push(".clinerules");

  return created;
}

// ── Git Hooks Adapter (universal fallback) ──────────────────────

export function adaptGitHooks(projectDir: string): string[] {
  const gitHooksDir = join(projectDir, ".git", "hooks");
  if (!existsSync(join(projectDir, ".git"))) {
    return [];
  }
  ensureDir(gitHooksDir);

  const enforcePath = getEnforcePath();
  const created: string[] = [];

  // Generate pre-commit hook
  const preCommit = `#!/bin/bash
# Composure pre-commit hook — runs enforcement on staged files
# Generated by: composure-enforce adapt git

ENFORCE="node ${enforcePath}"
FAILED=0

for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx|js|jsx|py|go|rs|cpp|hpp|swift|kt)$'); do
  if [ -f "$file" ]; then
    CONTENT=$(cat "$file")
    $ENFORCE validate "$file" --content "$CONTENT" 2>/dev/null
    if [ $? -eq 2 ]; then
      FAILED=1
    fi
  fi
done

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "Composure: Fix violations above before committing."
  exit 1
fi
exit 0
`;
  const hookPath = join(gitHooksDir, "pre-commit");
  writeFileSync(hookPath, preCommit, { mode: 0o755 });
  created.push(".git/hooks/pre-commit");

  return created;
}

// ── Adapter Router ──────────────────────────────────────────────

export type Platform = "cursor" | "windsurf" | "cline" | "git" | "all";

export function runAdapter(platform: Platform, projectDir?: string): void {
  const dir = projectDir ?? findProjectRoot(process.cwd()) ?? process.cwd();

  console.log(`\nComposure — Generate ${platform} adapter configs\n`);
  console.log(`Project: ${dir}\n`);

  let allCreated: string[] = [];

  switch (platform) {
    case "cursor":
      allCreated = adaptCursor(dir);
      break;
    case "windsurf":
      allCreated = adaptWindsurf(dir);
      break;
    case "cline":
      allCreated = adaptCline(dir);
      break;
    case "git":
      allCreated = adaptGitHooks(dir);
      break;
    case "all":
      allCreated = [
        ...adaptCursor(dir),
        ...adaptWindsurf(dir),
        ...adaptCline(dir),
        ...adaptGitHooks(dir),
      ];
      break;
  }

  if (allCreated.length === 0) {
    console.log("No files generated.");
    return;
  }

  for (const f of allCreated) {
    console.log(`  Created: ${f}`);
  }
  console.log(`\n${allCreated.length} file(s) generated.`);
}
