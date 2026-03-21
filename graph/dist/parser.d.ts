/**
 * Tree-sitter parser for TypeScript, TSX, JavaScript, and JSX.
 *
 * The CodeParser class orchestrates parsing: reads files, runs tree-sitter,
 * walks the AST to extract structural nodes/edges, and resolves call targets.
 * Helper functions for AST extraction live in parser-helpers.ts.
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isParseable(filePath: string): boolean;
export declare function detectLanguage(filePath: string): string | null;
export declare function fileHash(filePath: string): string;
export declare class CodeParser {
    private languages;
    private moduleCache;
    /**
     * Initialize web-tree-sitter runtime and load grammars.
     * Must be called once before parseFile/parseBytes.
     */
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
    private handleClass;
    private handleType;
    private handleFunction;
    private handleLexicalDeclaration;
    private handleImport;
    private handleCall;
    private resolveCallTarget;
    private resolveModuleCached;
    private resolveCallTargets;
    private generateTestEdges;
}
