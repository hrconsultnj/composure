/**
 * Markdown content-level parser for documentation indexing.
 *
 * Parses markdown files at the CONTENT level — not just file existence,
 * but sections, rules, conventions, and references within them.
 *
 * Supports:
 * - CLAUDE.md → rules, conventions, architecture decisions
 * - README.md → project description, setup steps
 * - ADR files (docs/decisions/, docs/adr/) → decision records
 * - Any *.md in docs/, appendices/, or at root
 *
 * Node types emitted:
 * - File (the markdown file itself)
 * - Type (sections, conventions — reuses Type for searchability)
 *
 * Edge types:
 * - CONTAINS (File → Section)
 * - REFERENCES (Section → file path mentioned in content)
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isMdParseable(filePath: string): boolean;
export declare function parseMdFile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
