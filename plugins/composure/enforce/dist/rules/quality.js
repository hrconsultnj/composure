/**
 * Code quality checks — file size, function size, inline types.
 *
 * Ported from hooks/quality/decomposition-check.sh.
 * This is a simplified version for the MCP server — the full
 * graph-aware checks still run via the bash hook PostToolUse.
 */
import { readFileSync, existsSync } from "node:fs";
const WARN_LINES = 400;
const ALERT_LINES = 600;
const CRITICAL_LINES = 800;
const FUNC_MAX_LINES = 150;
/**
 * Analyze a file for quality issues.
 * Returns metrics and decomposition suggestions.
 */
export function checkQuality(filePath) {
    if (!existsSync(filePath))
        return null;
    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const lineCount = lines.length;
    const basename = filePath.split("/").pop() ?? "";
    const report = {
        filePath,
        lineCount,
        severity: null,
        largeFunctions: [],
        inlineTypeCount: 0,
        inlineTypes: [],
        exportedComponentCount: 0,
        suggestions: [],
    };
    if (lineCount < 100)
        return report;
    // ── Large function detection (regex heuristic) ──────────────
    const funcPattern = /^(export\s+)?(default\s+)?(async\s+)?function\s+([A-Za-z_]\w*)/gm;
    const arrowPattern = /^(export\s+)?(const|let)\s+([A-Za-z_]\w*)\s*[:=]/gm;
    const funcStarts = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        funcPattern.lastIndex = 0;
        arrowPattern.lastIndex = 0;
        const funcMatch = funcPattern.exec(line);
        const arrowMatch = arrowPattern.exec(line);
        if (funcMatch) {
            funcStarts.push({ name: funcMatch[4], line: i + 1 });
        }
        else if (arrowMatch && /[({=>]/.test(line)) {
            funcStarts.push({ name: arrowMatch[3], line: i + 1 });
        }
    }
    for (let i = 0; i < funcStarts.length; i++) {
        const start = funcStarts[i].line;
        const end = i + 1 < funcStarts.length ? funcStarts[i + 1].line - 1 : lineCount;
        const size = end - start + 1;
        if (size >= FUNC_MAX_LINES) {
            report.largeFunctions.push({
                name: funcStarts[i].name,
                lineStart: start,
                lineEnd: end,
                lines: size,
            });
        }
    }
    // ── Inline types ────────────────────────────────────────────
    if (!basename.startsWith("types.")) {
        const typePattern = /^\s*(export\s+)?(interface|type)\s+([A-Za-z_]\w*)/gm;
        let match;
        while ((match = typePattern.exec(content))) {
            report.inlineTypes.push(match[3]);
        }
        report.inlineTypeCount = report.inlineTypes.length;
        if (report.inlineTypeCount > 3) {
            report.suggestions.push(`Move ${report.inlineTypeCount} inline types (${report.inlineTypes.join(", ")}) to types.ts`);
        }
    }
    // ── Exported components (.tsx only) ─────────────────────────
    if (basename.endsWith(".tsx")) {
        const componentPattern = /^\s*export\s+(default\s+)?(function|const)\s+([A-Z][A-Za-z0-9_]*)/gm;
        let match;
        const components = [];
        while ((match = componentPattern.exec(content))) {
            components.push(match[3]);
        }
        report.exportedComponentCount = components.length;
        if (components.length > 2) {
            report.suggestions.push(`Split ${components.length} exported components (${components.join(", ")}) into separate files`);
        }
    }
    // ── Large function suggestions ──────────────────────────────
    for (const fn of report.largeFunctions) {
        report.suggestions.push(`Extract \`${fn.name}\` (lines ${fn.lineStart}-${fn.lineEnd}, ~${fn.lines} lines)`);
    }
    // ── Determine severity ──────────────────────────────────────
    const hasViolation = report.inlineTypeCount > 3 ||
        report.exportedComponentCount > 2 ||
        report.largeFunctions.length > 0;
    if (lineCount >= CRITICAL_LINES) {
        report.severity = "critical";
    }
    else if (lineCount >= ALERT_LINES && hasViolation) {
        report.severity = "critical";
    }
    else if (lineCount >= ALERT_LINES ||
        (report.largeFunctions.length > 0 && lineCount >= WARN_LINES)) {
        report.severity = "high";
    }
    else if (report.largeFunctions.length > 0) {
        report.severity = "high";
    }
    else if (hasViolation) {
        report.severity = "moderate";
    }
    return report;
}
//# sourceMappingURL=quality.js.map