/**
 * MCP tool: run_audit
 *
 * Zero-token audit engine. Computes code quality findings from existing
 * graph data (SQL queries, no file I/O), optionally runs security CLI
 * tools, and stores all results in audit_findings + test_coverage +
 * audit_scores tables.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { GraphStore } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
import { insertFinding, getFindingCounts, gradeFor, } from "../audit-store.js";
import { IMPACTS, analyzeFileOrganization, analyzeTestCoverage, analyzeSecurityCLI, findPkgManager, recommendForSize, } from "./audit-analyzers.js";
import { analyzeCohesion } from "./audit-cohesion.js";
import { computeScores } from "./audit-scoring.js";
// ── Code Quality Analysis (pure SQL) ──────────────────────────────
function analyzeCodeQuality(store, runId, repoRoot) {
    const db = store.getDb();
    let findingCount = 0;
    // Oversized files
    const fileRows = db
        .prepare(`SELECT qualified_name, file_path, (line_end - line_start + 1) as lines
       FROM nodes WHERE kind = 'File' AND (line_end - line_start + 1) > 400
       ORDER BY lines DESC`)
        .all();
    for (const f of fileRows) {
        let impact;
        let severity;
        let findingType;
        if (f.lines > 800) {
            impact = IMPACTS.FILE_800;
            severity = "critical";
            findingType = "oversized-file-800";
        }
        else if (f.lines > 600) {
            impact = IMPACTS.FILE_600;
            severity = "high";
            findingType = "oversized-file-600";
        }
        else {
            impact = IMPACTS.FILE_400;
            severity = "moderate";
            findingType = "oversized-file-400";
        }
        const sizeRec = recommendForSize(f.lines, f.lines > 800 ? 800 : f.lines > 600 ? 600 : 400, "file");
        insertFinding(store, {
            audit_run_id: runId,
            category: "code-quality",
            finding_type: findingType,
            severity,
            node_qualified_name: f.qualified_name,
            file_path: relative(repoRoot, f.file_path),
            title: `File ${f.lines} lines (>${findingType.split("-").pop()} limit)`,
            detail: {
                lines: f.lines,
                recommendation: sizeRec.recommendation,
                reason: sizeRec.reason,
            },
            score_impact: impact,
        });
        findingCount++;
    }
    // ── Cohesion analysis (structural, not just size) ──────────────
    findingCount += analyzeCohesion(store, db, runId, repoRoot);
    // Oversized functions
    const funcRows = db
        .prepare(`SELECT qualified_name, name, file_path, (line_end - line_start + 1) as lines
       FROM nodes WHERE kind = 'Function' AND (line_end - line_start + 1) > 150
       ORDER BY lines DESC`)
        .all();
    for (const f of funcRows) {
        const funcRec = recommendForSize(f.lines, 150, "function");
        insertFinding(store, {
            audit_run_id: runId,
            category: "code-quality",
            finding_type: "oversized-function",
            severity: "moderate",
            node_qualified_name: f.qualified_name,
            file_path: relative(repoRoot, f.file_path),
            title: `Function "${f.name}" is ${f.lines} lines (>150 limit)`,
            detail: {
                lines: f.lines,
                name: f.name,
                recommendation: funcRec.recommendation,
                reason: funcRec.reason,
            },
            score_impact: IMPACTS.FUNC_150,
        });
        findingCount++;
    }
    // Open tasks
    const tasksPath = join(repoRoot, "tasks-plans", "tasks.md");
    if (existsSync(tasksPath)) {
        try {
            const content = readFileSync(tasksPath, "utf-8");
            const openCount = (content.match(/^- \[ \]/gm) || []).length;
            if (openCount > 0) {
                const impact = Math.floor(openCount / 5) * IMPACTS.TASKS_PER_5;
                insertFinding(store, {
                    audit_run_id: runId,
                    category: "code-quality",
                    finding_type: "open-tasks",
                    severity: "low",
                    title: `${openCount} open quality tasks in task queue`,
                    detail: { open_count: openCount },
                    score_impact: impact,
                });
                findingCount++;
            }
        }
        catch {
            // Skip if unreadable
        }
    }
    return findingCount;
}
// ── Main Tool Export ──────────────────────────────────────────────
export async function runAudit(params) {
    const root = findProjectRoot(params.repo_root);
    const dbPath = getDbPath(root);
    let store;
    try {
        store = new GraphStore(dbPath);
    }
    catch (err) {
        return {
            status: "error",
            error: `Cannot open graph database: ${err instanceof Error ? err.message : String(err)}. Run build_or_update_graph first.`,
        };
    }
    try {
        const stats = store.getStats();
        if (stats.total_nodes === 0) {
            return {
                status: "error",
                error: "Graph is empty. Run build_or_update_graph with full_rebuild=true first.",
            };
        }
        const runId = new Date().toISOString();
        const availableCategories = new Set(["code-quality"]);
        // Phase 1: Code quality (always — pure SQL)
        analyzeCodeQuality(store, runId, root);
        // Phase 1b: File organization (Next.js — checks app/ directory)
        analyzeFileOrganization(store, runId, root);
        // Phase 2: Test coverage (always — uses TESTED_BY edges)
        if (params.include_testing !== false) {
            analyzeTestCoverage(store, runId, root);
            availableCategories.add("testing");
        }
        // Phase 3: Security (optional — requires CLI tools)
        if (params.include_security !== false) {
            analyzeSecurityCLI(store, runId, root);
            if (findPkgManager(root)) {
                availableCategories.add("security");
            }
        }
        // Phase 4: Compute scores
        computeScores(store, runId, availableCategories);
        // Build summary
        const findingCounts = getFindingCounts(store, runId);
        const scores = store
            .getDb()
            .prepare("SELECT * FROM audit_scores WHERE audit_run_id = ? ORDER BY category")
            .all(runId);
        const overallScore = scores.reduce((sum, s) => sum + s.raw_score * s.adjusted_weight, 0);
        const { grade: overallGrade, color: overallColor } = gradeFor(overallScore);
        const categorySummary = scores.map((s) => ({
            category: s.category,
            score: s.raw_score,
            grade: s.grade,
            grade_color: s.grade_color,
            findings: s.finding_count,
        }));
        const totalFindings = Object.values(findingCounts).reduce((s, c) => s + Object.values(c).reduce((a, b) => a + b, 0), 0);
        // Build recommendation summary from findings with recommendation field
        const allFindings = store
            .getDb()
            .prepare("SELECT detail FROM audit_findings WHERE audit_run_id = ? AND detail IS NOT NULL")
            .all(runId);
        const recCounts = { split: 0, "split-on-next-touch": 0, monitor: 0, ignore: 0 };
        for (const f of allFindings) {
            try {
                const detail = JSON.parse(f.detail);
                if (detail.recommendation && recCounts[detail.recommendation] !== undefined) {
                    recCounts[detail.recommendation]++;
                }
            }
            catch { }
        }
        return {
            status: "ok",
            run_id: runId,
            overall_score: Math.round(overallScore * 10) / 10,
            overall_grade: overallGrade,
            overall_color: overallColor,
            categories: categorySummary,
            finding_counts: findingCounts,
            recommendations: {
                split: recCounts.split,
                split_on_next_touch: recCounts["split-on-next-touch"],
                monitor: recCounts.monitor,
                ignore: recCounts.ignore,
                summary: recCounts.split > 0
                    ? `${recCounts.split} files need splitting. ${recCounts["split-on-next-touch"]} can wait until next touch. ${recCounts.monitor} to monitor.`
                    : recCounts["split-on-next-touch"] > 0
                        ? `No urgent splits. ${recCounts["split-on-next-touch"]} files to split on next touch. ${recCounts.monitor} to monitor.`
                        : `No splits needed. ${recCounts.monitor} files to monitor for growth.`,
            },
            summary: `Audit complete: ${overallGrade} (${Math.round(overallScore)}). ${totalFindings} findings across ${availableCategories.size} categories.`,
        };
    }
    finally {
        store.close();
    }
}
//# sourceMappingURL=run-audit.js.map