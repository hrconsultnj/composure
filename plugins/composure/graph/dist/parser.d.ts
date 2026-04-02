/**
 * Tree-sitter parser for TypeScript, TSX, JavaScript, and JSX.
 *
 * The CodeParser class orchestrates parsing: reads files, runs tree-sitter,
 * walks the AST to extract structural nodes/edges, and resolves call targets.
 * Helper functions for AST extraction live in parser-helpers.ts.
 * Node handler functions live in parser-handlers.ts.
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isParseable(filePath: string): boolean;
export declare function isTreeSitterParseable(filePath: string): boolean;
export declare function fileHash(filePath: string): string;
export declare class CodeParser {
    private languages;
    private moduleCache;
    init(): Promise<void>;
    private getParser;
    parseFile(filePath: string): {
        nodes: NodeInfo[];
        edges: EdgeInfo[];
    };
    parseBytes(filePath: string, source: Buffer): {
        nodes: NodeInfo[];
        edges: EdgeInfo[];
    };
    private collectFileScope;
    private static readonly MAX_DEPTH;
    private extractFromTree;
    private resolveCallTarget;
    private resolveModuleCached;
}
