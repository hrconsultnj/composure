/**
 * Audit-specific store operations.
 *
 * Separate module to keep store.ts under the decomposition limit.
 * All functions accept a GraphStore instance and operate on the
 * audit_findings, test_coverage, and audit_scores tables.
 */
// ── Findings ──────────────────────────────────────────────────────
export function insertFinding(store, f) {
    const db = store.getDb();
    const now = Date.now() / 1000;
    const info = db
        .prepare(`INSERT INTO audit_findings
       (audit_run_id, category, finding_type, severity, node_qualified_name, file_path, title, detail, score_impact, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(f.audit_run_id, f.category, f.finding_type, f.severity, f.node_qualified_name ?? null, f.file_path ?? null, f.title, JSON.stringify(f.detail ?? {}), f.score_impact, now);
    return Number(info.lastInsertRowid);
}
export function getFindings(store, runId, category) {
    const db = store.getDb();
    const sql = category
        ? "SELECT * FROM audit_findings WHERE audit_run_id = ? AND category = ? ORDER BY severity, score_impact DESC"
        : "SELECT * FROM audit_findings WHERE audit_run_id = ? ORDER BY category, severity, score_impact DESC";
    const params = category ? [runId, category] : [runId];
    const rows = db.prepare(sql).all(...params);
    return rows.map(rowToFinding);
}
export function getFindingCounts(store, runId) {
    const db = store.getDb();
    const rows = db
        .prepare(`SELECT category, severity, COUNT(*) as c
       FROM audit_findings WHERE audit_run_id = ?
       GROUP BY category, severity`)
        .all(runId);
    const result = {};
    for (const r of rows) {
        if (!result[r.category])
            result[r.category] = {};
        result[r.category][r.severity] = r.c;
    }
    return result;
}
// ── Test Coverage ─────────────────────────────────────────────────
export function insertTestCoverage(store, tc) {
    const db = store.getDb();
    const now = Date.now() / 1000;
    const info = db
        .prepare(`INSERT INTO test_coverage
       (audit_run_id, node_qualified_name, file_path, has_test_edge, coverage_pct, test_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(tc.audit_run_id, tc.node_qualified_name, tc.file_path, tc.has_test_edge ? 1 : 0, tc.coverage_pct, tc.test_count, now);
    return Number(info.lastInsertRowid);
}
export function getTestCoverage(store, runId) {
    const db = store.getDb();
    const rows = db
        .prepare("SELECT * FROM test_coverage WHERE audit_run_id = ? ORDER BY file_path")
        .all(runId);
    return rows.map(rowToCoverage);
}
export function getTestCoverageGaps(store, runId) {
    const db = store.getDb();
    const rows = db
        .prepare("SELECT * FROM test_coverage WHERE audit_run_id = ? AND has_test_edge = 0 ORDER BY file_path")
        .all(runId);
    return rows.map(rowToCoverage);
}
// ── Scores ────────────────────────────────────────────────────────
export function insertScore(store, s) {
    const db = store.getDb();
    const now = Date.now() / 1000;
    const info = db
        .prepare(`INSERT INTO audit_scores
       (audit_run_id, category, raw_score, weight, adjusted_weight, grade, grade_color, finding_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(s.audit_run_id, s.category, s.raw_score, s.weight, s.adjusted_weight, s.grade, s.grade_color, s.finding_count, now);
    return Number(info.lastInsertRowid);
}
export function getScores(store, runId) {
    const db = store.getDb();
    const rows = db
        .prepare("SELECT * FROM audit_scores WHERE audit_run_id = ? ORDER BY category")
        .all(runId);
    return rows.map(rowToScore);
}
export function getOverallScore(store, runId) {
    const scores = getScores(store, runId);
    if (scores.length === 0)
        return { score: 0, grade: "F", color: "#ef4444" };
    const overall = scores.reduce((sum, s) => sum + s.raw_score * s.adjusted_weight, 0);
    const { grade, color } = gradeFor(overall);
    return { score: Math.round(overall * 10) / 10, grade, color };
}
// ── Run management ────────────────────────────────────────────────
export function clearAuditRun(store, runId) {
    const db = store.getDb();
    db.exec("BEGIN");
    try {
        db.prepare("DELETE FROM audit_findings WHERE audit_run_id = ?").run(runId);
        db.prepare("DELETE FROM test_coverage WHERE audit_run_id = ?").run(runId);
        db.prepare("DELETE FROM audit_scores WHERE audit_run_id = ?").run(runId);
        db.exec("COMMIT");
    }
    catch (err) {
        db.exec("ROLLBACK");
        throw err;
    }
}
export function getLatestRunId(store) {
    const db = store.getDb();
    const row = db
        .prepare("SELECT audit_run_id FROM audit_scores ORDER BY created_at DESC LIMIT 1")
        .get();
    return row?.audit_run_id ?? null;
}
// ── Grading ───────────────────────────────────────────────────────
export function gradeFor(score) {
    if (score >= 90)
        return { grade: "A", color: "#22c55e" };
    if (score >= 80)
        return { grade: "B", color: "#3b82f6" };
    if (score >= 70)
        return { grade: "C", color: "#eab308" };
    if (score >= 60)
        return { grade: "D", color: "#f97316" };
    return { grade: "F", color: "#ef4444" };
}
// ── Row converters ────────────────────────────────────────────────
function rowToFinding(row) {
    return {
        id: row.id,
        audit_run_id: row.audit_run_id,
        category: row.category,
        finding_type: row.finding_type,
        severity: row.severity,
        node_qualified_name: row.node_qualified_name ?? undefined,
        file_path: row.file_path ?? undefined,
        title: row.title,
        detail: JSON.parse(row.detail || "{}"),
        score_impact: row.score_impact,
        created_at: row.created_at,
    };
}
function rowToCoverage(row) {
    return {
        id: row.id,
        audit_run_id: row.audit_run_id,
        node_qualified_name: row.node_qualified_name,
        file_path: row.file_path,
        has_test_edge: Boolean(row.has_test_edge),
        coverage_pct: row.coverage_pct ?? null,
        test_count: row.test_count,
        created_at: row.created_at,
    };
}
function rowToScore(row) {
    return {
        id: row.id,
        audit_run_id: row.audit_run_id,
        category: row.category,
        raw_score: row.raw_score,
        weight: row.weight,
        adjusted_weight: row.adjusted_weight,
        grade: row.grade,
        grade_color: row.grade_color,
        finding_count: row.finding_count,
        created_at: row.created_at,
    };
}
//# sourceMappingURL=audit-store.js.map