#!/usr/bin/env node
/**
 * self-repair.mjs — Composure install drift detector.
 *
 * Detects modified hook files + state-path drift (Decision 19).
 * Prints remediation commands, NEVER auto-migrates destructively.
 *
 * Usage: node scripts/self-repair.mjs [--json]
 */

import { readFile, access, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(__dirname, "..");

const issues = [];

// ── Hook Integrity Check ────────────────────────────────────────

async function checkHookIntegrity() {
  const manifestPath = join(pluginRoot, "plugins", "composure", "hooks", ".hooks-integrity.json");
  let manifest;

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    issues.push({
      type: "hook_manifest_missing",
      severity: "warn",
      message: "Hook integrity manifest not found",
      fix: "claude plugin update composure",
    });
    return;
  }

  for (const entry of manifest.hooks ?? []) {
    const hookPath = join(pluginRoot, "plugins", "composure", "hooks", entry.path);
    try {
      const content = await readFile(hookPath);
      const hash = createHash("sha256").update(content).digest("hex");
      if (hash !== entry.sha256) {
        issues.push({
          type: "hook_drift",
          severity: "fail",
          message: `Hook modified: ${entry.path} (expected ${entry.sha256.slice(0, 8)}..., got ${hash.slice(0, 8)}...)`,
          fix: "claude plugin update composure",
        });
      }
    } catch {
      issues.push({
        type: "hook_missing",
        severity: "fail",
        message: `Hook missing: ${entry.path}`,
        fix: "claude plugin update composure",
      });
    }
  }
}

// ── Decision 19 Path Drift ──────────────────────────────────────

async function checkPathDrift() {
  // Cortex path
  const oldCortex = ".composure/cortex.db";
  const newCortex = ".composure/cortex/cortex.db";

  const oldCortexExists = await access(oldCortex).then(() => true).catch(() => false);
  const newCortexExists = await access(newCortex).then(() => true).catch(() => false);

  if (oldCortexExists && !newCortexExists) {
    issues.push({
      type: "cortex_path_drift",
      severity: "warn",
      message: `Cortex DB at old path: ${oldCortex} (should be ${newCortex})`,
      fix: `mkdir -p .composure/cortex && mv ${oldCortex} ${newCortex}`,
    });
  }

  // Graph path
  const oldGraph = ".code-review-graph/graph.db";
  const newGraph = ".composure/graph/graph.db";

  const oldGraphExists = await access(oldGraph).then(() => true).catch(() => false);
  const newGraphExists = await access(newGraph).then(() => true).catch(() => false);

  if (oldGraphExists && !newGraphExists) {
    issues.push({
      type: "graph_path_drift",
      severity: "warn",
      message: `Graph DB at old path: ${oldGraph} (should be ${newGraph})`,
      fix: `mkdir -p .composure/graph && mv ${oldGraph} ${newGraph}`,
    });
  }
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const jsonMode = process.argv.includes("--json");

  await checkHookIntegrity();
  await checkPathDrift();

  if (jsonMode) {
    console.log(JSON.stringify({ issues, count: issues.length }, null, 2));
    process.exit(issues.some((i) => i.severity === "fail") ? 1 : 0);
    return;
  }

  if (issues.length === 0) {
    console.log("No drift detected. Installation is healthy.");
    process.exit(0);
    return;
  }

  console.log(`Found ${issues.length} issue(s):\n`);
  for (const issue of issues) {
    const icon = issue.severity === "fail" ? "x" : "!";
    console.log(`  [${icon}] ${issue.message}`);
    console.log(`      Fix: ${issue.fix}\n`);
  }

  console.log("NOTE: Run the fix commands above manually. This script does NOT auto-apply fixes.");
  process.exit(issues.some((i) => i.severity === "fail") ? 1 : 0);
}

main().catch((err) => {
  console.error(`self-repair error: ${err.message}`);
  process.exit(1);
});
