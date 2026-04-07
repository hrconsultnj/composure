/**
 * Shared types for the Composure enforcement engine.
 */
/** Maps file extension to language. */
export const EXTENSION_TO_LANGUAGE = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "typescript",
    ".jsx": "typescript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".h": "cpp",
    ".swift": "swift",
    ".kt": "kotlin",
    ".kts": "kotlin",
};
/** Default skip patterns for files that should never be checked. */
export const DEFAULT_SKIP_PATTERNS = ["*.d.ts", "*.generated.*", "*.gen.*"];
/** Detect if a file is a test file. */
export function isTestFile(filePath) {
    const basename = filePath.split("/").pop() ?? "";
    if (/\.(test|spec)\./i.test(basename))
        return true;
    if (/_test\.(go|py)$/i.test(basename))
        return true;
    if (/\/(tests|test|__tests__)\//.test(filePath))
        return true;
    return false;
}
/** Get language from file path. */
export function detectLanguage(filePath) {
    const ext = filePath.match(/\.[^.]+$/)?.[0] ?? "";
    return EXTENSION_TO_LANGUAGE[ext] ?? null;
}
//# sourceMappingURL=types.js.map