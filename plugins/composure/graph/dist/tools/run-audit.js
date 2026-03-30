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
    GRAB_BAG: 8,
    MIXED_CONCERNS: 5,
    INLINE_CANDIDATE: 2,
    COLOCATE_CANDIDATE: 2,
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
function recommendAction(findingType, lines, cohesionRatio, funcCount, fanOut) {
    if (findingType === "grab-bag") {
        // Large + low cohesion = definitely split
        if (lines > 500 && cohesionRatio < 0.1) {
            return {
                action: "split",
                reason: `${lines} lines with ${Math.round(cohesionRatio * 100)}% cohesion — functions are unrelated. Split into domain-specific modules.`,
                severity: "high",
                impact: IMPACTS.GRAB_BAG,
            };
        }
        // Large + some cohesion = split when touching
        if (lines > 300) {
            return {
                action: "split-on-next-touch",
                reason: `Over 300 lines with low cohesion. Split when you're already editing this file.`,
                severity: "moderate",
                impact: IMPACTS.GRAB_BAG,
            };
        }
        // Small file with many functions = utility file, probably fine
        return {
            action: "monitor",
            reason: `${funcCount} functions but only ${lines} lines — small utility file. Monitor for growth.`,
            severity: "low",
            impact: Math.round(IMPACTS.GRAB_BAG / 2),
        };
    }
    if (findingType === "mixed-concerns") {
        // High fan-out + large file = real problem
        if (lines > 400 && (fanOut ?? 0) >= 6) {
            return {
                action: "split",
                reason: `${lines} lines reaching into ${fanOut} different files — too many responsibilities. Extract focused modules.`,
                severity: "moderate",
                impact: IMPACTS.MIXED_CONCERNS,
            };
        }
        // Pipeline/orchestrator files naturally have high fan-out
        if (funcCount <= 3) {
            return {
                action: "ignore",
                reason: `Only ${funcCount} functions — this is a pipeline/orchestrator, high fan-out is expected.`,
                severity: "info",
                impact: 0,
            };
        }
        return {
            action: "monitor",
            reason: `Moderate fan-out. Not urgent — revisit if the file keeps growing.`,
            severity: "low",
            impact: Math.round(IMPACTS.MIXED_CONCERNS / 2),
        };
    }
    // Default for unknown types
    return {
        action: "monitor",
        reason: "Review manually.",
        severity: "info",
        impact: 0,
    };
}
// Now add recommendations to oversized file/function findings too
function recommendForSize(lines, threshold, kind) {
    const ratio = lines / threshold;
    if (ratio > 2.5) {
        return {
            recommendation: "split",
            reason: `${lines} lines is ${ratio.toFixed(1)}x the ${threshold}-line limit. This needs decomposition.`,
        };
    }
    if (ratio > 1.5) {
        return {
            recommendation: "split-on-next-touch",
            reason: `${lines} lines is ${ratio.toFixed(1)}x the limit. Split when you're already editing this ${kind}.`,
        };
    }
    return {
        recommendation: "monitor",
        reason: `Just over the ${threshold}-line limit. Not urgent — watch for growth.`,
    };
}
function analyzeCohesion(store, db, runId, repoRoot) {
    let findingCount = 0;
    // ── 1. Grab bag: 8+ exported functions with low internal cohesion ──
    // A file with many functions that don't call each other is a utility dump.
    const filesWithManyFunctions = db
        .prepare(`SELECT f.file_path, f.qualified_name as file_qn, COUNT(n.id) as func_count
       FROM nodes f
       JOIN nodes n ON n.file_path = f.file_path AND n.kind IN ('Function', 'Test')
       WHERE f.kind = 'File' AND f.language IN ('typescript', 'tsx', 'javascript', 'jsx')
       GROUP BY f.file_path
       HAVING func_count >= 8
       ORDER BY func_count DESC`)
        .all();
    for (const file of filesWithManyFunctions) {
        // Get all function qualified names in this file
        const funcQns = db
            .prepare(`SELECT qualified_name FROM nodes
         WHERE file_path = ? AND kind IN ('Function', 'Test')`)
            .all(file.file_path);
        const qnSet = new Set(funcQns.map((r) => r.qualified_name));
        // Count internal calls (functions in this file calling each other)
        const internalCalls = db
            .prepare(`SELECT COUNT(*) as cnt FROM edges
         WHERE kind = 'CALLS'
           AND source_qualified IN (${funcQns.map(() => "?").join(",")})
           AND target_qualified IN (${funcQns.map(() => "?").join(",")})`)
            .get(...funcQns.map((r) => r.qualified_name), ...funcQns.map((r) => r.qualified_name));
        // Low cohesion: many functions but few call each other
        // Ratio: internal calls / function count. Below 0.3 = grab bag.
        const cohesionRatio = file.func_count > 0
            ? internalCalls.cnt / file.func_count
            : 0;
        if (cohesionRatio < 0.3) {
            // Get file size for recommendation
            const fileSize = db
                .prepare("SELECT (line_end - line_start + 1) as lines FROM nodes WHERE qualified_name = ?")
                .get(file.file_qn);
            const lines = fileSize?.lines ?? 0;
            const rec = recommendAction("grab-bag", lines, cohesionRatio, file.func_count);
            insertFinding(store, {
                audit_run_id: runId,
                category: "code-quality",
                finding_type: "grab-bag",
                severity: rec.severity,
                node_qualified_name: file.file_qn,
                file_path: relative(repoRoot, file.file_path),
                title: `"Grab bag" file: ${file.func_count} functions, only ${internalCalls.cnt} internal calls (${Math.round(cohesionRatio * 100)}% cohesion)`,
                detail: {
                    function_count: file.func_count,
                    internal_calls: internalCalls.cnt,
                    cohesion_ratio: Math.round(cohesionRatio * 100) / 100,
                    lines,
                    recommendation: rec.action,
                    reason: rec.reason,
                },
                score_impact: rec.impact,
            });
            findingCount++;
        }
    }
    // ── 2. Mixed concerns: file has functions calling into 4+ different files ──
    // High fan-out = file is doing too many things.
    const fanOutRows = db
        .prepare(`SELECT f.file_path, f.qualified_name as file_qn,
              COUNT(DISTINCT e.file_path) as call_files
       FROM nodes f
       JOIN nodes n ON n.file_path = f.file_path AND n.kind = 'Function'
       JOIN edges e ON e.source_qualified = n.qualified_name AND e.kind = 'CALLS'
         AND e.target_qualified NOT LIKE (f.file_path || '%')
       WHERE f.kind = 'File' AND f.language IN ('typescript', 'tsx', 'javascript', 'jsx')
       GROUP BY f.file_path
       HAVING call_files >= 4
       ORDER BY call_files DESC`)
        .all();
    // Only flag files that also have many functions (small files with high fan-out are just glue, which is fine)
    for (const row of fanOutRows) {
        const funcCount = db
            .prepare(`SELECT COUNT(*) as cnt FROM nodes
         WHERE file_path = ? AND kind = 'Function'`)
            .get(row.file_path);
        if (funcCount.cnt >= 5) {
            const fileSize = db
                .prepare("SELECT (line_end - line_start + 1) as lines FROM nodes WHERE qualified_name = ?")
                .get(row.file_qn);
            const lines = fileSize?.lines ?? 0;
            const rec = recommendAction("mixed-concerns", lines, 0, funcCount.cnt, row.call_files);
            insertFinding(store, {
                audit_run_id: runId,
                category: "code-quality",
                finding_type: "mixed-concerns",
                severity: rec.severity,
                node_qualified_name: row.file_qn,
                file_path: relative(repoRoot, row.file_path),
                title: `Mixed concerns: ${funcCount.cnt} functions calling into ${row.call_files} different files`,
                detail: {
                    function_count: funcCount.cnt,
                    external_file_targets: row.call_files,
                    lines,
                    recommendation: rec.action,
                    reason: rec.reason,
                },
                score_impact: rec.impact,
            });
            findingCount++;
        }
    }
    // ── 3. Inline candidate: function only called from ONE other file ──
    // If a function is exported but only consumed in one place, co-locate it.
    const singleCallerRows = db
        .prepare(`SELECT n.qualified_name, n.name, n.file_path,
              COUNT(DISTINCT e.file_path) as caller_files,
              MIN(e.file_path) as sole_caller_file
       FROM nodes n
       JOIN edges e ON e.target_qualified = n.qualified_name AND e.kind = 'CALLS'
       WHERE n.kind = 'Function' AND n.is_test = 0
         AND n.language IN ('typescript', 'tsx', 'javascript', 'jsx')
       GROUP BY n.qualified_name
       HAVING caller_files = 1
         AND sole_caller_file != n.file_path`)
        .all();
    // Only flag if the function's file has other single-caller functions too (pattern, not one-off)
    const singleCallerByFile = new Map();
    for (const row of singleCallerRows) {
        const existing = singleCallerByFile.get(row.file_path) ?? [];
        existing.push(row);
        singleCallerByFile.set(row.file_path, existing);
    }
    for (const [filePath, funcs] of singleCallerByFile) {
        if (funcs.length >= 3) {
            // 3+ functions in this file each only called from one other file — inline candidates
            for (const f of funcs) {
                insertFinding(store, {
                    audit_run_id: runId,
                    category: "code-quality",
                    finding_type: "inline-candidate",
                    severity: "info",
                    node_qualified_name: f.qualified_name,
                    file_path: relative(repoRoot, f.file_path),
                    title: `"${f.name}" only called from ${relative(repoRoot, f.sole_caller_file)} — co-locate?`,
                    detail: {
                        function_name: f.name,
                        sole_caller: relative(repoRoot, f.sole_caller_file),
                        recommendation: "move-on-next-touch",
                        reason: "Function has a single consumer. Co-locate when you're already editing either file — not worth a dedicated refactor.",
                    },
                    score_impact: IMPACTS.INLINE_CANDIDATE,
                });
                findingCount++;
            }
        }
    }
    // ── 4. Co-locate candidate: type only imported by ONE other file ──
    const singleImporterTypes = db
        .prepare(`SELECT n.qualified_name, n.name, n.file_path,
              COUNT(DISTINCT e.file_path) as importer_files,
              MIN(e.file_path) as sole_importer
       FROM nodes n
       JOIN edges e ON e.target_qualified LIKE ('%' || n.name || '%')
         AND e.kind = 'IMPORTS_FROM'
       WHERE n.kind = 'Type'
         AND n.language IN ('typescript', 'tsx')
       GROUP BY n.qualified_name
       HAVING importer_files = 1
         AND sole_importer != n.file_path`)
        .all();
    // Group by file — only flag if a file has 3+ single-importer types
    const typesByFile = new Map();
    for (const row of singleImporterTypes) {
        const existing = typesByFile.get(row.file_path) ?? [];
        existing.push(row);
        typesByFile.set(row.file_path, existing);
    }
    for (const [filePath, types] of typesByFile) {
        if (types.length >= 3) {
            insertFinding(store, {
                audit_run_id: runId,
                category: "code-quality",
                finding_type: "colocate-types",
                severity: "info",
                file_path: relative(repoRoot, filePath),
                title: `${types.length} types each only imported by one file — co-locate with consumers?`,
                detail: {
                    type_count: types.length,
                    types: types.slice(0, 5).map((t) => ({
                        name: t.name,
                        sole_importer: relative(repoRoot, t.sole_importer),
                    })),
                    recommendation: "move-on-next-touch",
                    reason: "Types have single consumers. Move them when you're already editing the consumer file.",
                },
                score_impact: IMPACTS.COLOCATE_CANDIDATE,
            });
            findingCount++;
        }
    }
    return findingCount;
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