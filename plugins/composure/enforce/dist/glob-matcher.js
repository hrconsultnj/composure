/**
 * Glob-to-regex converter — ported from framework-validation.sh.
 *
 * Converts glob patterns like "**\/*.tsx" to regex patterns.
 * Used to match file paths against framework validation appliesTo patterns.
 */
/**
 * Convert a glob pattern to a RegExp.
 *
 * Supports:
 *   ** → match any path (including /)
 *   *  → match anything except /
 *   .  → escaped literal dot
 */
export function globToRegex(glob) {
    const escaped = glob
        .replace(/\*\*/g, "__DBLSTAR__")
        .replace(/\./g, "\\.")
        .replace(/\*/g, "__STAR__")
        .replace(/__DBLSTAR__/g, ".*")
        .replace(/__STAR__/g, "[^/]*");
    return new RegExp(`^${escaped}$`);
}
/**
 * Test if a relative file path matches any of the given glob patterns.
 */
export function matchesGlobs(relativePath, globs) {
    return globs.some((glob) => globToRegex(glob).test(relativePath));
}
//# sourceMappingURL=glob-matcher.js.map