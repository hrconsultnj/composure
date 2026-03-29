/**
 * MCP tool: generate_audit_html
 *
 * Reads stored audit findings and scores from graph.db, fills the
 * HTML templates from skills/project-audit/templates/, and writes
 * a self-contained report. Zero tokens — pure template assembly.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { GraphStore } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
import {
  getLatestRunId,
  getScores,
  getFindings,
  getFindingCounts,
  getOverallScore,
  getTestCoverageGaps,
} from "../audit-store.js";
import type { ToolResult } from "../types.js";

// ── Template resolution ───────────────────────────────────────────

function findTemplateDir(): string | null {
  // The templates live at skills/project-audit/templates/ relative to plugin root.
  // The plugin root is 3 levels up from this file (graph/src/tools/ → graph/ → composure/).
  const candidates = [
    join(dirname(import.meta.dirname ?? __dirname), "..", "..", "skills", "project-audit", "templates"),
    // Fallback: check CLAUDE_PLUGIN_ROOT
    process.env.CLAUDE_PLUGIN_ROOT
      ? join(process.env.CLAUDE_PLUGIN_ROOT, "skills", "project-audit", "templates")
      : "",
  ].filter(Boolean);

  for (const dir of candidates) {
    if (existsSync(join(dir, "audit-header.html"))) return dir;
  }
  return null;
}

function readTemplate(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf-8");
}

// ── Placeholder replacement ───────────────────────────────────────

function coverageColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#eab308";
  if (pct >= 40) return "#f97316";
  return "#ef4444";
}

function buildReplacementMap(
  store: GraphStore,
  runId: string,
  repoRoot: string,
): Record<string, string> {
  const scores = getScores(store, runId);
  const overall = getOverallScore(store, runId);
  const findingCounts = getFindingCounts(store, runId);
  const findings = getFindings(store, runId);
  const gaps = getTestCoverageGaps(store, runId);

  const scoreMap: Record<string, { grade: string; color: string; score: number }> = {};
  for (const s of scores) {
    scoreMap[s.category] = { grade: s.grade, color: s.grade_color, score: s.raw_score };
  }

  const cq = scoreMap["code-quality"] ?? { grade: "N/A", color: "#64748b", score: 0 };
  const sec = scoreMap["security"] ?? { grade: "N/A", color: "#64748b", score: 0 };
  const test = scoreMap["testing"] ?? { grade: "N/A", color: "#64748b", score: 0 };
  const deploy = scoreMap["deployment"] ?? { grade: "N/A", color: "#64748b", score: 0 };

  // Count file size distribution from findings
  const cqFindings = findingCounts["code-quality"] ?? {};
  const secFindings = findingCounts["security"] ?? {};

  // Build findings table rows for security tab
  const securityRows = findings
    .filter((f) => f.category === "security")
    .slice(0, 10)
    .map(
      (f) =>
        `<tr><td><span class="badge badge-${f.severity}">${f.severity}</span></td><td>${escHtml(f.title)}</td><td class="path">${escHtml(f.file_path ?? "dependency")}</td></tr>`,
    )
    .join("\n");

  // Build untested function rows
  const untestedRows = gaps
    .slice(0, 15)
    .map(
      (g) =>
        `<tr><td class="path">${escHtml(g.file_path)}</td><td>${escHtml(g.node_qualified_name.split("::").pop() ?? "")}</td></tr>`,
    )
    .join("\n");

  const repoName = basename(repoRoot);

  return {
    "{{PROJECT_NAME}}": escHtml(repoName),
    "{{OVERALL_GRADE}}": overall.grade,
    "{{OVERALL_SCORE}}": String(overall.score),
    "{{OVERALL_COLOR}}": overall.color,
    "{{QUALITY_GRADE}}": cq.grade,
    "{{QUALITY_GRADE_COLOR}}": cq.color,
    "{{QUALITY_SCORE}}": String(Math.round(cq.score)),
    "{{SECURITY_GRADE}}": sec.grade,
    "{{SECURITY_GRADE_COLOR}}": sec.color,
    "{{SECURITY_SCORE}}": String(Math.round(sec.score)),
    "{{TESTING_GRADE}}": test.grade,
    "{{TESTING_GRADE_COLOR}}": test.color,
    "{{TESTING_SCORE}}": String(Math.round(test.score)),
    "{{DEPLOYMENT_GRADE}}": deploy.grade,
    "{{DEPLOYMENT_GRADE_COLOR}}": deploy.color,
    "{{DEPLOYMENT_SCORE}}": String(Math.round(deploy.score)),
    "{{COUNT_CRITICAL}}": String(cqFindings["critical"] ?? 0),
    "{{COUNT_HIGH}}": String(cqFindings["high"] ?? 0),
    "{{COUNT_MODERATE}}": String(cqFindings["moderate"] ?? 0),
    "{{CVE_CRITICAL}}": String(secFindings["critical"] ?? 0),
    "{{CVE_HIGH}}": String(secFindings["high"] ?? 0),
    "{{CVE_MODERATE}}": String(secFindings["moderate"] ?? 0),
    "{{SECURITY_ROWS}}": securityRows || "<tr><td colspan='3'>No findings</td></tr>",
    "{{UNTESTED_ROWS}}": untestedRows || "<tr><td colspan='2'>All functions have test coverage</td></tr>",
    "{{UNTESTED_COUNT}}": String(gaps.length),
    "{{COV_LINES}}": "0",
    "{{COV_LINES_COLOR}}": coverageColor(0),
    "{{COV_FUNCS}}": "0",
    "{{COV_FUNCS_COLOR}}": coverageColor(0),
    "{{COV_BRANCHES}}": "0",
    "{{COV_BRANCHES_COLOR}}": coverageColor(0),
    "{{TOTAL_FINDINGS}}": String(findings.length),
    "{{AUDIT_DATE}}": new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Main Tool Export ──────────────────────────────────────────────

export function generateAuditHtml(params: {
  audit_run_id?: string;
  output_path?: string;
  repo_root?: string;
}): ToolResult {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);

  let store: GraphStore;
  try {
    store = new GraphStore(dbPath);
  } catch (err) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const runId = params.audit_run_id ?? getLatestRunId(store);
    if (!runId) {
      return {
        status: "error",
        error: "No audit run found. Run run_audit first.",
      };
    }

    const templateDir = findTemplateDir();
    if (!templateDir) {
      return {
        status: "error",
        error: "Cannot find audit HTML templates. Expected at skills/project-audit/templates/.",
      };
    }

    // Read templates
    const header = readTemplate(templateDir, "audit-header.html");
    const tabs = readTemplate(templateDir, "audit-tabs.html");
    const panels = readTemplate(templateDir, "audit-tab-panels.html");
    const footer = readTemplate(templateDir, "audit-footer.html");

    // Build replacement map
    const replacements = buildReplacementMap(store, runId, root);

    // Assemble and replace
    let html = header + tabs + panels + footer;
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.replaceAll(placeholder, value);
    }

    // Write output
    const outputDir = join(root, "tasks-plans", "audits");
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
    const outputPath = params.output_path ?? join(outputDir, `audit-${timestamp}.html`);

    writeFileSync(outputPath, html, "utf-8");

    const overall = getOverallScore(store, runId);

    return {
      status: "ok",
      output_path: outputPath,
      overall_grade: overall.grade,
      overall_score: overall.score,
      summary: `Audit report generated: ${overall.grade} (${overall.score}). Saved to ${outputPath}`,
    };
  } finally {
    store.close();
  }
}
