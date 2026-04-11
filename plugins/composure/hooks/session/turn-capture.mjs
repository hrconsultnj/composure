#!/usr/bin/env node

/**
 * Turn Capture — Stop Hook
 *
 * Fires at the end of every turn. Parses the transcript for JUST the last
 * turn's activity and writes a compact git-stat-style observation to Cortex.
 * Enables cross-session awareness and decision archaeology.
 *
 * PRIVACY: Only tool names, file paths, line counts, and token totals.
 * NEVER: prompt text, tool results, assistant text, bash commands, diff content.
 *
 * Silent execution — no stdout, fire-and-forget. Exit 0 always.
 *
 * Payload (stdin JSON):
 *   session_id, transcript_path, cwd, hook_event_name, reason
 */

import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { spawn } from "node:child_process";

// ── Read stdin ─────────────────────────────────────────────────
let raw = "";
try {
  for await (const chunk of process.stdin) raw += chunk;
} catch {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

const transcriptPath = payload.transcript_path;
const sessionId = payload.session_id || "unknown";
const cwd = payload.cwd || process.env.CLAUDE_PROJECT_DIR || ".";
// NOTE: Claude Code's Stop hook stdin payload does NOT reliably include
// a stop_reason field — auditing 77 live session-turn rows (2026-04-10)
// found all 77 had empty string. The transcript jsonl DOES record
// stop_reason per assistant message. We track the last one below and
// use the payload value only as a fallback.
const stopReasonFromPayload = payload.stop_reason || payload.reason || "";

if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0);

// ── Read transcript (tail last 1000 lines for efficiency) ─────
let lines;
try {
  const content = readFileSync(transcriptPath, "utf8");
  lines = content.split("\n").filter(Boolean);
} catch {
  process.exit(0);
}

// ── Count user prompts (turn number) ──────────────────────────
// Walk forwards, count entries where content is a string (real prompts)
let turnNumber = 0;
let lastUserIdx = -1;
for (let i = 0; i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.type !== "user") continue;
    const content = obj.message?.content;
    if (typeof content !== "string") continue;
    if (content.startsWith("[Request")) continue;
    turnNumber++;
    lastUserIdx = i;
  } catch {}
}

if (lastUserIdx === -1) process.exit(0);

// ── Extract activity since last user prompt ───────────────────
const tools = {};
const files = { read: new Set(), write: new Set(), edit: new Set() };
let writeLines = 0;
let editLines = 0;
const tokens = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
const taskEvents = [];
// Track the LAST assistant message's stop_reason as we iterate — a turn
// has many assistant messages (one per tool_use round-trip) and the
// terminal one carries the meaningful stop_reason ("end_turn", "stop_sequence",
// "max_tokens", etc.). Intermediate messages all have "tool_use" which is
// uninformative as a turn-level label.
let stopReasonFromTranscript = "";

for (let i = lastUserIdx + 1; i < lines.length; i++) {
  let obj;
  try {
    obj = JSON.parse(lines[i]);
  } catch {
    continue;
  }
  if (obj.type !== "assistant" || !Array.isArray(obj.message?.content)) continue;

  // Track the running-last stop_reason (running overwrite = final wins)
  if (obj.message?.stop_reason) {
    stopReasonFromTranscript = obj.message.stop_reason;
  }

  // Aggregate token usage
  const usage = obj.message.usage;
  if (usage) {
    tokens.input += usage.input_tokens || 0;
    tokens.output += usage.output_tokens || 0;
    tokens.cache_read += usage.cache_read_input_tokens || 0;
    tokens.cache_creation += usage.cache_creation_input_tokens || 0;
  }

  // Walk content blocks
  for (const block of obj.message.content) {
    if (block.type !== "tool_use") continue;
    const name = block.name;
    tools[name] = (tools[name] || 0) + 1;

    const input = block.input || {};
    if (name === "Read" && input.file_path) files.read.add(input.file_path);
    if (name === "Write" && input.file_path) {
      files.write.add(input.file_path);
      writeLines += String(input.content || "").split("\n").length;
    }
    if (name === "Edit" && input.file_path) {
      files.edit.add(input.file_path);
      editLines += String(input.new_string || "").split("\n").length;
    }
    // Task events — capture ID + action only, no text
    if (name === "TaskCreate") {
      taskEvents.push({ action: "created" });
    }
    if (name === "TaskUpdate" && input.taskId) {
      const status = input.status || "updated";
      taskEvents.push({ action: status, id: input.taskId });
    }
  }
}

// ── Bail if nothing happened (no tools used this turn) ────────
const totalToolCalls = Object.values(tools).reduce((a, b) => a + b, 0);
if (totalToolCalls === 0 && taskEvents.length === 0) process.exit(0);

// ── Build metadata ────────────────────────────────────────────
const project = basename(cwd);
const sessionIdShort = sessionId.slice(0, 8);
const totalLines = writeLines + editLines;
const totalTokens = tokens.input + tokens.output + tokens.cache_read + tokens.cache_creation;
const filesTouched = files.read.size + files.write.size + files.edit.size;

// Prefer the transcript-derived stop_reason (terminal value from the last
// assistant message of the turn). Fall back to the payload value if the
// transcript didn't yield one (shouldn't happen, but defensive).
const stopReason = stopReasonFromTranscript || stopReasonFromPayload || "";

const metadata = {
  category: "session-turn",
  session_id: sessionId,
  session_id_short: sessionIdShort,
  project,
  project_root: cwd,
  turn_number: turnNumber,
  tool_counts: tools,
  files: {
    read: Array.from(files.read),
    write: Array.from(files.write),
    edit: Array.from(files.edit),
  },
  lines: {
    write: writeLines,
    edit: editLines,
    total: totalLines,
  },
  tokens: {
    ...tokens,
    total: totalTokens,
  },
  stop_reason: stopReason,
  timestamp: new Date().toISOString(),
  tags: ["session-turn", "active-session"],
};

const content = `Session ${sessionIdShort} (${project}): turn ${turnNumber} — ${filesTouched} files, +${totalLines} lines, ${totalTokens}tok`;

// ── Write to Cortex (silent, fire-and-forget) ─────────────────
const cortexCli = process.env.CLAUDE_PLUGIN_ROOT
  ? `${process.env.CLAUDE_PLUGIN_ROOT}/cortex/dist/cli.bundle.js`
  : null;

if (!cortexCli || !existsSync(cortexCli)) process.exit(0);

const cortexPayload = JSON.stringify({
  agent_id: "__system__",
  content,
  content_type: "observation",
  metadata,
});

// Spawn detached so we don't block the hook
const child = spawn("node", ["--experimental-sqlite", cortexCli, "create_memory_node", cortexPayload], {
  stdio: "ignore",
  detached: true,
});
child.unref();

process.exit(0);
