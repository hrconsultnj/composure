/**
 * MCP tool: run_audit
 *
 * Zero-token audit engine. Computes code quality findings from existing
 * graph data (SQL queries, no file I/O), optionally runs security CLI
 * tools, and stores all results in audit_findings + test_coverage +
 * audit_scores tables.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { GraphStore } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
import { insertFinding, insertTestCoverage, insertScore, getFindingCounts, gradeFor, } from "../audit-store.js";
// ── Score impact constants (from step 02 scoring rules) ───────────
const IMPACTS = {
    FILE_400: 5,
    FILE_600: 15,
    FILE_800: 30,
    FUNC_150: 3,
    TASKS_PER_5: 1,
    CVE_CRITICAL: 25,
    CVE_HIGH: 10,
    CVE_MODERATE: 3,
    SEMGREP_ERROR: 15,
    SEMGREP_WARNING: 5,
    SEMGREP_INFO: 1,
    MISSING_HEADER: 3,
    UNTESTED_FUNC: 2,
    PREFLIGHT_FAIL: 15,
    PREFLIGHT_WARN: 5,
};
const CATEGORY_WEIGHTS = {
    "code-quality": 0.3,
    security: 0.25,
    testing: 0.25,
    deployment: 0.2,
};
// ── Helpers ───────────────────────────────────────────────────────
function execSafe(cmd, args, cwd) {
    try {
        return execFileSync(cmd, args, {
            cwd,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 60000,
        }).trim();
    }
    catch {
        return null;
    }
}
function findPkgManager(root) {
    if (existsSync(join(root, "pnpm-lock.yaml")))
        return "pnpm";
    if (existsSync(join(root, "yarn.lock")))
        return "yarn";
    if (existsSync(join(root, "package-lock.json")))
        return "npm";
    return null;
}
function toSeverity(raw) {
    if (typeof raw === "string") {
        const lower = raw.toLowerCase();
        if (lower === "critical" || lower === "high" || lower === "moderate" || lower === "low" || lower === "info") {
            return lower;
        }
    }
    return "moderate";
}
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
        insertFinding(store, {
            audit_run_id: runId,
            category: "code-quality",
            finding_type: findingType,
            severity,
            node_qualified_name: f.qualified_name,
            file_path: relative(repoRoot, f.file_path),
            title: `File ${f.lines} lines (>${findingType.split("-").pop()} limit)`,
            detail: { lines: f.lines },
            score_impact: impact,
        });
        findingCount++;
    }
    // Oversized functions
    const funcRows = db
        .prepare(`SELECT qualified_name, name, file_path, (line_end - line_start + 1) as lines
       FROM nodes WHERE kind = 'Function' AND (line_end - line_start + 1) > 150
       ORDER BY lines DESC`)
        .all();
    for (const f of funcRows) {
        insertFinding(store, {
            audit_run_id: runId,
            category: "code-quality",
            finding_type: "oversized-function",
            severity: "moderate",
            node_qualified_name: f.qualified_name,
            file_path: relative(repoRoot, f.file_path),
            title: `Function "${f.name}" is ${f.lines} lines (>150 limit)`,
            detail: { lines: f.lines, name: f.name },
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
// ── Test Coverage Analysis (SQL + TESTED_BY edges) ────────────────
function analyzeTestCoverage(store, runId, repoRoot) {
    const db = store.getDb();
    let findingCount = 0;
    const rows = db
        .prepare(`SELECT n.qualified_name, n.name, n.file_path,
              COUNT(e.id) as test_count
       FROM nodes n
       LEFT JOIN edges e ON e.target_qualified = n.qualified_name AND e.kind = 'TESTED_BY'
       WHERE n.kind = 'Function' AND n.is_test = 0
       GROUP BY n.qualified_name`)
        .all();
    for (const r of rows) {
        insertTestCoverage(store, {
            audit_run_id: runId,
            node_qualified_name: r.qualified_name,
            file_path: relative(repoRoot, r.file_path),
            has_test_edge: r.test_count > 0,
            coverage_pct: null,
            test_count: r.test_count,
        });
        if (r.test_count === 0) {
            insertFinding(store, {
                audit_run_id: runId,
                category: "testing",
                finding_type: "untested-function",
                severity: "low",
                node_qualified_name: r.qualified_name,
                file_path: relative(repoRoot, r.file_path),
                title: `Function "${r.name}" has no test coverage`,
                detail: { name: r.name },
                score_impact: IMPACTS.UNTESTED_FUNC,
            });
            findingCount++;
        }
    }
    return findingCount;
}
function analyzeSecurityCLI(store, runId, repoRoot) {
    let findingCount = 0;
    const pkgManager = findPkgManager(repoRoot);
    if (pkgManager) {
        const output = execSafe(pkgManager, ["audit", "--json"], repoRoot);
        if (output) {
            try {
                const data = JSON.parse(output);
                const vulns = (data.vulnerabilities ?? data.advisories ?? {});
                for (const [name, info] of Object.entries(vulns)) {
                    const severity = toSeverity(info.severity);
                    const impact = severity === "critical"
                        ? IMPACTS.CVE_CRITICAL
                        : severity === "high"
                            ? IMPACTS.CVE_HIGH
                            : IMPACTS.CVE_MODERATE;
                    insertFinding(store, {
                        audit_run_id: runId,
                        category: "security",
                        finding_type: `cve-${severity}`,
                        severity,
                        title: `${severity.toUpperCase()} vulnerability in ${name}`,
                        detail: {
                            package: name,
                            severity,
                            fix_available: Boolean(info.fixAvailable),
                        },
                        score_impact: impact,
                    });
                    findingCount++;
                }
            }
            catch {
                // JSON parse failure — skip
            }
        }
    }
    return findingCount;
}
// ── Scoring ───────────────────────────────────────────────────────
function computeScores(store, runId, availableCategories) {
    const db = store.getDb();
    const totalWeight = [...availableCategories].reduce((sum, cat) => sum + CATEGORY_WEIGHTS[cat], 0);
    for (const category of availableCategories) {
        const row = db
            .prepare(`SELECT COALESCE(SUM(score_impact), 0) as total, COUNT(*) as cnt
         FROM audit_findings
         WHERE audit_run_id = ? AND category = ?`)
            .get(runId, category);
        let score = Math.max(0, 100 - row.total);
        // Honesty overrides
        if (category === "testing") {
            const testNodes = db
                .prepare("SELECT COUNT(*) as c FROM nodes WHERE kind = 'Test'")
                .get();
            if (testNodes.c === 0)
                score = 0;
        }
        if (category === "security") {
            const criticals = db
                .prepare(`SELECT COUNT(*) as c FROM audit_findings
           WHERE audit_run_id = ? AND category = 'security' AND severity = 'critical'`)
                .get(runId);
            if (criticals.c > 0)
                score = Math.min(score, 59);
        }
        const { grade, color } = gradeFor(score);
        const adjustedWeight = CATEGORY_WEIGHTS[category] / totalWeight;
        insertScore(store, {
            audit_run_id: runId,
            category,
            raw_score: score,
            weight: CATEGORY_WEIGHTS[category],
            adjusted_weight: adjustedWeight,
            grade,
            grade_color: color,
            finding_count: row.cnt,
        });
    }
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
        return {
            status: "ok",
            run_id: runId,
            overall_score: Math.round(overallScore * 10) / 10,
            overall_grade: overallGrade,
            overall_color: overallColor,
            categories: categorySummary,
            finding_counts: findingCounts,
            summary: `Audit complete: ${overallGrade} (${Math.round(overallScore)}). ${totalFindings} findings across ${availableCategories.size} categories.`,
        };
    }
    finally {
        store.close();
    }
}
//# sourceMappingURL=run-audit.js.map