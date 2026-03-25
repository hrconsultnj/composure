/**
 * Self-contained HTML graph visualization generator.
 *
 * Produces a single .html file with all CSS + JS inlined.
 * No external dependencies — opens offline in any browser.
 * Supports light/dark themes via CSS custom properties.
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
export interface GraphHtmlData {
    nodes: VisNode[];
    repoName: string;
    generatedAt: string;
    stats: {
        totalNodes: number;
        totalEdges: number;
        filesCount: number;
    };
}
export declare function generateGraphHtml(data: GraphHtmlData): string;
declare const CATEGORY_META: Record<string, {
    label: string;
    color: string;
}>;
declare const DEFAULT_CAT_ORDER: string[];
export { CATEGORY_META, DEFAULT_CAT_ORDER };
