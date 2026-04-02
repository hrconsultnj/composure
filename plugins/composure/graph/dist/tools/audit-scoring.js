/**
 * Audit scoring logic extracted from run-audit.ts.
 *
 * Computes per-category scores with honesty overrides
 * and writes results to the audit_scores table.
 */
import { insertScore, gradeFor } from "../audit-store.js";
// ── Category weight configuration ────────────────────────────────
export const CATEGORY_WEIGHTS = {
    "code-quality": 0.3,
    security: 0.25,
    testing: 0.25,
    deployment: 0.2,
};
// ── Scoring ───────────────────────────────────────────────────────
export function computeScores(store, runId, availableCategories) {
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
//# sourceMappingURL=audit-scoring.js.map