/**
 * Framework validation rules — plugin defaults + project config layering.
 *
 * Ported from hooks/enforcement/framework-validation.sh.
 *
 * Two-layer system:
 *   Layer 1: Plugin defaults (immutable, always loaded based on detected stack)
 *   Layer 2: Project config (frameworkValidation in no-bandaids.json)
 *   Plugin group names take precedence — project groups with matching names are skipped.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { matchesGlobs } from "../glob-matcher.js";
/** Load framework rule groups from a plugin defaults JSON file. */
function loadRuleFile(path) {
    if (!existsSync(path))
        return null;
    try {
        const parsed = JSON.parse(readFileSync(path, "utf8"));
        return parsed.rules ?? null;
    }
    catch {
        return null;
    }
}
/**
 * Evaluate framework validation rules against file content.
 *
 * @param filePath - Absolute file path
 * @param relativePath - Path relative to project root
 * @param content - File content to check
 * @param config - Composure config (may have frameworkValidation)
 * @param pluginRoot - Path to plugin root (for loading defaults)
 */
export function runFrameworkValidation(filePath, relativePath, content, config, pluginRoot) {
    const violations = [];
    const warnings = [];
    const pluginGroupNames = new Set();
    // ── Layer 1: Plugin defaults ──────────────────────────────────
    if (pluginRoot) {
        const defaultsDir = join(pluginRoot, "defaults");
        // Always load shared rules
        processRuleFile(defaultsDir, "shared.json");
        // Load based on detected stack
        if (config.frameworks) {
            const frontends = new Set();
            const backends = new Set();
            for (const fw of Object.values(config.frameworks)) {
                if (fw.frontend)
                    frontends.add(fw.frontend);
                if (fw.backend)
                    backends.add(fw.backend);
            }
            // Frontend rules
            if (frontends.size > 0) {
                const frontendDir = join(defaultsDir, "frontend");
                if (existsSync(frontendDir)) {
                    for (const f of readdirSync(frontendDir).filter((f) => f.endsWith(".json"))) {
                        processRuleFile(frontendDir, f);
                    }
                }
            }
            // Fullstack / mobile
            if (frontends.has("nextjs"))
                processRuleFile(join(defaultsDir, "fullstack"), "nextjs.json");
            if (frontends.has("expo"))
                processRuleFile(join(defaultsDir, "mobile"), "expo.json");
            // Backend
            if (backends.has("supabase"))
                processRuleFile(join(defaultsDir, "backend"), "supabase.json");
            // Vanilla HTML
            if (config.frameworks.html)
                processRuleFile(defaultsDir, "vanilla.json");
            // SDK-specific
            const allVersions = Object.values(config.frameworks)
                .map((fw) => JSON.stringify(fw.versions ?? {}))
                .join(" ");
            if (/tanstack-query|@tanstack\/react-query/.test(allVersions))
                processRuleFile(join(defaultsDir, "sdks"), "tanstack-query.json");
            if (/zod/.test(allVersions))
                processRuleFile(join(defaultsDir, "sdks"), "zod.json");
        }
    }
    // ── Layer 2: Project rules ────────────────────────────────────
    if (config.frameworkValidation) {
        for (const [groupName, group] of Object.entries(config.frameworkValidation)) {
            // Skip if plugin already defined this group
            if (pluginGroupNames.has(groupName))
                continue;
            evaluateGroup(groupName, group);
        }
    }
    // ── Next.js app directory content check (hardcoded) ───────────
    if (config.frameworks) {
        const hasNextjs = Object.values(config.frameworks).some((fw) => fw.frontend === "nextjs");
        if (hasNextjs) {
            const basename = filePath.split("/").pop() ?? "";
            if (/^(app|src\/app)\/.*\.tsx$/.test(relativePath) &&
                ![
                    "page.tsx", "layout.tsx", "loading.tsx", "error.tsx",
                    "not-found.tsx", "global-error.tsx", "template.tsx", "default.tsx",
                    "opengraph-image.tsx", "twitter-image.tsx", "icon.tsx",
                    "apple-icon.tsx", "sitemap.tsx", "robots.tsx", "manifest.tsx",
                ].includes(basename)) {
                violations.push({
                    rule: "nextjs-app-content",
                    severity: "error",
                    message: `Content component '${basename}' belongs in components/, not app/.`,
                    source: "framework",
                });
            }
        }
    }
    return { violations, warnings };
    // ── Helpers ───────────────────────────────────────────────────
    function processRuleFile(dir, filename) {
        const groups = loadRuleFile(join(dir, filename));
        if (!groups)
            return;
        for (const [name, group] of Object.entries(groups)) {
            pluginGroupNames.add(name);
            evaluateGroup(name, group);
        }
    }
    function evaluateGroup(groupName, group) {
        if (!matchesGlobs(relativePath, group.appliesTo))
            return;
        for (const rule of group.rules) {
            const matched = new RegExp(rule.pattern).test(content);
            const effective = rule.invertMatch ? !matched : matched;
            if (!effective)
                continue;
            // Check skipIf
            if (rule.skipIf && new RegExp(rule.skipIf).test(content))
                continue;
            const violation = {
                rule: groupName,
                severity: rule.severity,
                message: rule.message,
                source: "framework",
            };
            if (rule.severity === "error") {
                violations.push(violation);
            }
            else {
                warnings.push(violation);
            }
        }
    }
}
//# sourceMappingURL=framework.js.map