/**
 * Self-contained HTML graph visualization generator.
 *
 * Produces a single .html file with all CSS + JS inlined.
 * No external dependencies — opens offline in any browser.
 *
 * CSS lives in html-styles.ts, JS scripts in html-scripts.ts.
 */
export interface VisNode {
    id: string;
    label: string;
    path: string;
    cat: string;
    lines: number;
    functions: number;
    classes: number;
    types: number;
    isTest: boolean;
    language: string;
    imports: string[];
}
export interface VisEntity {
    name: string;
    displayName: string;
    source: string;
    memberCount: number;
    roles: Record<string, number>;
    memberIds: string[];
}
export interface GraphHtmlData {
    nodes: VisNode[];
    entities: VisEntity[];
    repoName: string;
    generatedAt: string;
    stats: {
        totalNodes: number;
        totalEdges: number;
        filesCount: number;
    };
}
export declare const CATEGORY_META: Record<string, {
    label: string;
    color: string;
}>;
export declare const DEFAULT_CAT_ORDER: string[];
export declare function esc(s: string): string;
export declare function jsonInject(data: unknown): string;
export declare function generateGraphHtml(data: GraphHtmlData): string;
