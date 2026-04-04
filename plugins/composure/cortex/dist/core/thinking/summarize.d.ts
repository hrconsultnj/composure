/**
 * Session summarization — aggregate a thinking session into a structured summary.
 */
import type { ToolResult } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";
export declare function summarizeSession(adapter: StorageAdapter, params: {
    session_id: string;
}): Promise<ToolResult>;
