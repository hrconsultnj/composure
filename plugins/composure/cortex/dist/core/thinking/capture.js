/**
 * External thought capture — the seq-thinking reflex core.
 *
 * Captures the FULL reasoning context (thought + tool input + user message +
 * assistant prior turn + project/task) and persists it to Cortex, linked to
 * the entity_registry feed so queries can find reasoning by project or task.
 */
import { resolveCaptureContext } from "../context-resolver.js";
export async function captureExternalThought(adapter, payload) {
    try {
        // Resolve the full context (project, task, entity_feed linkage)
        const context = await resolveCaptureContext({
            project_root: payload.project_root,
            project_name: payload.project_name,
        });
        // Dedupe on (session_title, project_name) — thoughts from the same conversation
        // on the same project share ONE session
        const sessions = await adapter.listSessions("__reflex__", "active");
        const existing = sessions.find((s) => s.title === payload.session_title && s.metadata?.project_name === context.project_name);
        let sessionId;
        if (existing) {
            sessionId = existing.id;
        }
        else {
            const session = await adapter.createSession("__reflex__", payload.session_title, {
                feed_context: {
                    entity_type: "ai_thinking",
                    project: context.project_name,
                    project_root: context.project_root,
                    task_id: context.task_id,
                    task_subject: context.task_subject,
                },
                metadata: {
                    source: payload.source,
                    created_from: "seq-thinking-mcp-reflex",
                    project_name: context.project_name,
                },
            });
            sessionId = session.id;
        }
        // Count existing steps to determine thought number
        const stepsData = await adapter.getSession(sessionId);
        const currentSteps = stepsData?.steps ?? [];
        const mainSteps = currentSteps.filter((s) => !s.branch_id);
        const thoughtNumber = mainSteps.length + 1;
        // Determine thought type
        const thoughtType = payload.tool_input.isRevision ? "revision" : "analysis";
        // Append the thought with FULL context in metadata
        const step = await adapter.addStep(sessionId, {
            thought_number: thoughtNumber,
            thought: payload.thought,
            thought_type: thoughtType,
            is_revision: !!payload.tool_input.isRevision,
            revises_thought: payload.tool_input.revises_thought ?? null,
            branch_id: payload.tool_input.branchFromThought ? `branch-${payload.tool_input.branchFromThought}` : null,
            branch_from_thought: payload.tool_input.branchFromThought ?? null,
            needs_more_thoughts: !!payload.tool_input.nextThoughtNeeded,
            metadata: {
                source: payload.source,
                tool_input: payload.tool_input,
                user_message: payload.user_message,
                assistant_prior_turn: payload.assistant_prior_turn,
                project_root: payload.project_root,
                project_name: payload.project_name,
                task_id: context.task_id,
                task_subject: context.task_subject,
                captured_at: payload.captured_at,
            },
        });
        // Update session total_thoughts
        await adapter.updateSession(sessionId, { total_thoughts: thoughtNumber });
        return { status: "ok", session_id: sessionId, thought_number: step.thought_number };
    }
    catch (err) {
        return { status: "error", error: err instanceof Error ? err.message : String(err) };
    }
}
//# sourceMappingURL=capture.js.map