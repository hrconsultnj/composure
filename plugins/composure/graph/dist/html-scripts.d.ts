/**
 * Browser-runtime JavaScript for the graph HTML visualization.
 *
 * Returns template strings of client-side JS that runs in the browser.
 * The untyped `var x = {}` patterns are intentional — this is browser JS.
 *
 * Decomposed into focused sections: data, controls, graph logic,
 * detail panel, tree view, entity view, and render loop.
 */
import type { VisNode, VisEntity } from "./html-template.js";
/** Data constants, edge/reverse-dep maps, sizing, state variables. */
export declare function buildScriptData(nodes: VisNode[], catsPresent: string[], entities: VisEntity[]): string;
/** Theme toggle, search, zoom, legend toggle + clickable legend items. */
export declare function buildScriptControls(): string;
/** Layout algorithm, BFS blast radius, node selection. */
export declare function buildScriptGraphLogic(): string;
/** Detail panel builder — populates the right sidebar on node click. */
export declare function buildScriptDetailPanel(): string;
/** Tree view — builds folder hierarchy from paths, renders recursively. */
export declare function buildScriptTreeView(): string;
/** Main render loop — draws nodes, column headers, and canvas edges. */
export declare function buildScriptRender(): string;
/** Entity view builder — renders entity cards in a grid. */
export declare function buildScriptEntityView(): string;
/** Concatenates all JS sections into the final inline script. */
export declare function buildScript(nodes: VisNode[], catsPresent: string[], entities: VisEntity[]): string;
