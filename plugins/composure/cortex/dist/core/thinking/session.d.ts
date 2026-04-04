/**
 * Thinking session management — create, resume, complete, list.
 *
 * All functions take a StorageAdapter as the first parameter,
 * keeping them transport- and storage-agnostic.
 */
import type { ToolResult, ThinkingSessionStatus } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";
export declare function createSession(adapter: StorageAdapter, params: {
    agent_id: string;
    title?: string;
    template_id?: string;
}): Promise<ToolResult>;
export declare function resumeSession(adapter: StorageAdapter, params: {
    session_id: string;
}): Promise<ToolResult>;
export declare function completeSession(adapter: StorageAdapter, params: {
    session_id: string;
    conclusion?: string;
}): Promise<ToolResult>;
export declare function listSessions(adapter: StorageAdapter, params: {
    agent_id: string;
    status?: ThinkingSessionStatus;
}): Promise<ToolResult>;
