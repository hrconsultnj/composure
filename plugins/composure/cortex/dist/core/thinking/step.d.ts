/**
 * Thinking step state machine — add thoughts with branching and revision.
 *
 * This is the core of Sequential Thinking. It manages:
 * - Auto-creating sessions when no session_id is provided
 * - Incrementing thought_number within a session or branch
 * - Revision tracking (is_revision + revises_thought)
 * - Branch creation (branch_id + branch_from_thought)
 * - Updating session.total_thoughts
 *
 * Ported from @modelcontextprotocol/server-sequential-thinking (MIT).
 */
import type { ToolResult, ThinkingParams } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";
export declare function addThought(adapter: StorageAdapter, params: ThinkingParams): Promise<ToolResult>;
