/**
 * Audit analyzer functions extracted from run-audit.ts.
 *
 * Contains: shared constants, helpers, size recommendations,
 * file organization, test coverage, and security CLI analyzers.
 *
 * Cohesion analysis lives in audit-cohesion.ts (largest single analyzer).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { insertFinding, insertTestCoverage, } from "../audit-store.js";
// ── Score impact constants (from step 02 scoring rules) ───────────
export const IMPACTS = {
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
    MISPLACED_APP_CONTENT: 5,
};
// ── Helpers ───────────────────────────────────────────────────────
export function execSafe(cmd, args, cwd) {
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
export function findPkgManager(root) {
    if (existsSync(join(root, "pnpm-lock.yaml")))
        return "pnpm";
    if (existsSync(join(root, "yarn.lock")))
        return "yarn";
    if (existsSync(join(root, "package-lock.json")))
        return "npm";
    return null;
}
export function toSeverity(raw) {
    if (typeof raw === "string") {
        const lower = raw.toLowerCase();
        if (lower === "critical" || lower === "high" || lower === "moderate" || lower === "low" || lower === "info") {
            return lower;
        }
    }
    return "moderate";
}
// ── Size Recommendation Engine ───────────────────────────────────
export function recommendForSize(lines, threshold, kind) {
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
// ── File Organization Analysis (Next.js app/ directory) ─────────────
const NEXTJS_CONVENTION_FILES = new Set([
    "page.tsx", "layout.tsx", "loading.tsx", "error.tsx",
    "not-found.tsx", "global-error.tsx", "template.tsx", "default.tsx",
    "opengraph-image.tsx", "twitter-image.tsx", "icon.tsx",
    "apple-icon.tsx", "sitemap.tsx", "robots.tsx", "manifest.tsx",
]);
export function analyzeFileOrganization(store, runId, repoRoot) {
    // Only applies to Next.js projects — detect from no-bandaids.json config
    const configPath = join(repoRoot, ".claude", "no-bandaids.json");
    if (!existsSync(configPath))
        return 0;
    try {
        const config = JSON.parse(readFileSync(configPath, "utf-8"));
        const frameworks = config.frameworks || {};
        const isNextJs = Object.values(frameworks).some((fw) => fw.frontend === "nextjs");
        if (!isNextJs)
            return 0;
    }
    catch {
        return 0;
    }
    const db = store.getDb();
    let findingCount = 0;
    // Find .tsx files in app/ that aren't Next.js convention files
    const rows = db
        .prepare(`SELECT qualified_name, file_path, name
       FROM nodes
       WHERE kind = 'File'
         AND name LIKE '%.tsx'
         AND file_path LIKE '%/app/%'
       ORDER BY file_path`)
        .all();
    for (const f of rows) {
        if (NEXTJS_CONVENTION_FILES.has(f.name))
            continue;
        insertFinding(store, {
            audit_run_id: runId,
            category: "code-quality",
            finding_type: "misplaced-app-content",
            severity: "moderate",
            node_qualified_name: f.qualified_name,
            file_path: relative(repoRoot, f.file_path),
            title: `Content component '${f.name}' in app/ — move to components/`,
            detail: {
                recommendation: "split",
                reason: `Route directories should only contain Next.js convention files. Move '${f.name}' to components/pages/ or components/features/ and import from the route's page.tsx.`,
            },
            score_impact: IMPACTS.MISPLACED_APP_CONTENT,
        });
        findingCount++;
    }
    return findingCount;
}
// ── Test Coverage Analysis (SQL + TESTED_BY edges) ────────────────
export function analyzeTestCoverage(store, runId, repoRoot) {
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
// ── Security Analysis (CLI tools) ─────────────────────────────────
export function analyzeSecurityCLI(store, runId, repoRoot) {
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
//# sourceMappingURL=audit-analyzers.js.map