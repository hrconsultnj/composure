/**
 * Cohesion analysis extracted from run-audit.ts.
 *
 * Detects structural code quality issues: grab-bag files, mixed concerns,
 * inline candidates, and co-locate candidates — all from graph SQL queries.
 */
import { relative } from "node:path";
import { insertFinding } from "../audit-store.js";
import { IMPACTS } from "./audit-analyzers.js";
// ── Recommendation Engine ────────────────────────────────────────
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
// ── Cohesion Analysis (structural, not just size) ────────────────
export function analyzeCohesion(store, db, runId, repoRoot) {
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
//# sourceMappingURL=audit-cohesion.js.map