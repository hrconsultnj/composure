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
export async function addThought(adapter, params) {
    try {
        let sessionId = params.session_id;
        // Auto-create session if none provided
        if (!sessionId) {
            if (!params.agent_id) {
                return { status: "error", error: "agent_id is required when no session_id is provided" };
            }
            const session = await adapter.createSession(params.agent_id, params.title);
            sessionId = session.id;
        }
        // Get current session state to determine next thought_number
        const sessionData = await adapter.getSession(sessionId);
        if (!sessionData) {
            return { status: "not_found", error: `Session ${sessionId} not found` };
        }
        const { session, steps } = sessionData;
        // Determine thought_number based on branch context
        let thoughtNumber;
        if (params.branch_id) {
            // Within a branch: count steps in this branch
            const branchSteps = steps.filter((s) => s.branch_id === params.branch_id);
            thoughtNumber = branchSteps.length + 1;
        }
        else {
            // Main branch: count main branch steps
            const mainSteps = steps.filter((s) => !s.branch_id);
            thoughtNumber = mainSteps.length + 1;
        }
        // Validate revision target exists
        if (params.is_revision && params.revises_thought != null) {
            const targetExists = steps.some((s) => s.thought_number === params.revises_thought &&
                (params.branch_id ? s.branch_id === params.branch_id : !s.branch_id));
            if (!targetExists) {
                return {
                    status: "error",
                    error: `Cannot revise thought #${params.revises_thought}: not found in ${params.branch_id ?? "main"} branch`,
                };
            }
        }
        // Validate branch_from_thought exists
        if (params.branch_id && params.branch_from_thought != null) {
            const branchPointExists = steps.some((s) => s.thought_number === params.branch_from_thought && !s.branch_id);
            if (!branchPointExists) {
                return {
                    status: "error",
                    error: `Cannot branch from thought #${params.branch_from_thought}: not found in main branch`,
                };
            }
        }
        // Determine thought_type
        const thoughtType = params.is_revision
            ? "revision"
            : params.branch_id && params.branch_from_thought != null
                ? "branch"
                : params.thought_type ?? "analysis";
        // Add the step
        const step = await adapter.addStep(sessionId, {
            thought_number: thoughtNumber,
            thought: params.thought,
            thought_type: thoughtType,
            is_revision: params.is_revision ?? false,
            revises_thought: params.revises_thought ?? null,
            branch_id: params.branch_id ?? null,
            branch_from_thought: params.branch_from_thought ?? null,
            needs_more_thoughts: params.total_thoughts != null
                ? thoughtNumber < params.total_thoughts
                : true,
            metadata: {},
        });
        // Update session total_thoughts
        const newTotal = session.total_thoughts + 1;
        await adapter.updateSession(sessionId, { total_thoughts: newTotal });
        // Determine if more thoughts are expected
        const needsMore = params.total_thoughts != null
            ? thoughtNumber < params.total_thoughts
            : true;
        return {
            status: "ok",
            session_id: sessionId,
            thought_number: step.thought_number,
            thought_type: step.thought_type,
            branch_id: step.branch_id,
            is_revision: step.is_revision,
            total_in_session: newTotal,
            needs_more_thoughts: needsMore,
        };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to add thought: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
//# sourceMappingURL=step.js.map