#!/usr/bin/env node

/**
 * Request Classifier — UserPromptSubmit Hook (.mjs)
 *
 * Classifies user intent from prompt keywords. Injects guidance
 * that shapes Claude's initial approach before any tool runs.
 *
 * Config: classifications.json (same directory)
 * Task nag: absorbed — checks .composure/current-task.json
 *
 * Constraint: <200ms total. Single Node process, no subprocess spawns.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load config ─────────────────────────────────────────────────
const config = JSON.parse(
  readFileSync(join(__dirname, "classifications.json"), "utf8")
);

// ── Read stdin (hook payload) ───────────────────────────────────
let raw = "";
for await (const chunk of process.stdin) raw += chunk;

const input = JSON.parse(raw);
const prompt = input.prompt || "";
if (!prompt) process.exit(0);

const promptHead = prompt.slice(0, 500).toLowerCase();

// ── Precompute (used by conversational gate + later detections) ──
const cleaned = prompt.replace(/```[\s\S]*?```/g, "");
const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

// ── Conversational fast-exit ───────────────────────────────────
// Short messages matching greeting/meta patterns with no action
// keywords exit with zero output — no classification, no hints.
const conv = config.types.conversational;
if (conv && conv.max_words) {
  if (wordCount <= conv.max_words) {
    const hasPattern = (conv.patterns || []).some((p) =>
      promptHead.includes(p)
    );
    const hasAction = (conv.action_exclude || []).some((a) =>
      promptHead.includes(a)
    );
    if (hasPattern && !hasAction) {
      process.exit(0);
    }
  }
}

// ── Classify ────────────────────────────────────────────────────
// Order: iterate types in config order (plan → review → ... → operate)
// First match wins. Default: "implement"

let type = config.default_type;
let matched = config.types[config.default_type];

for (const [name, def] of Object.entries(config.types)) {
  if (name === config.default_type || name === "conversational") continue;
  if (def.patterns.some((p) => promptHead.includes(p))) {
    type = name;
    matched = def;
    break;
  }
}

// ── Multi-intent detection (voice-transcribed + structured) ─────
const lp = config.long_prompt;
const mi = config.multi_intent;
let longPromptTriggered = false;
let multiIntentDetected = false;
let concernCount = 0;

// Structured signals (numbered lists, arrows)
if (lp.applies_to.includes(type)) {
  const arrows = (cleaned.match(/->/g) || []).length;
  const numbered = (cleaned.match(/^\s*\d+\./gm) || []).length;

  let signals = 0;
  if (wordCount >= lp.triggers.word_count) signals++;
  if (arrows >= lp.triggers.arrow_markers) signals++;
  if (numbered >= lp.triggers.numbered_items) signals++;

  if (signals >= lp.triggers.signal_gate) {
    longPromptTriggered = true;
    concernCount = Math.max(arrows, numbered, 2);
  }
}

// Voice-transcribed signals (topic shifts, questions, high word count)
if (mi && !longPromptTriggered && wordCount >= (mi.word_threshold || 60)) {
  const lower = cleaned.toLowerCase();
  const shifts = (mi.topic_shift_markers || []).filter((m) =>
    lower.includes(m)
  ).length;
  const questions = (cleaned.match(/\?/g) || []).length;

  // Two paths to multi-intent:
  // 1. Topic shifts alone (voice rambles): shifts >= gate AND enough words
  // 2. Combined signals: any 2 of (shifts, questions, heavy word count)
  if (shifts >= (mi.shift_gate || 2)) {
    multiIntentDetected = true;
    concernCount = Math.max(shifts, questions, 2);
  } else {
    let miSignals = 0;
    if (questions >= (mi.question_gate || 2)) miSignals++;
    if (wordCount >= (mi.word_heavy || 100)) miSignals++;
    if (miSignals >= 1 && shifts >= 1) {
      multiIntentDetected = true;
      concernCount = Math.max(shifts, questions, 2);
    }
  }
}

// ── Research multi-topic detection ──────────────────────────────
let researchForced = false;
if (type === "research" && matched.force_tasks === "conditional") {
  const topicSignals = (matched.force_tasks_signals || []).filter((s) =>
    promptHead.includes(s)
  ).length;
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  if (
    topicSignals >= matched.force_tasks_signal_gate ||
    wordCount >= matched.force_tasks_word_threshold
  ) {
    researchForced = true;
  }
}

// ── Task nag check ──────────────────────────────────────────────
// Only nag if: type is in task_nag.applies_to AND no active task
const nag = config.task_nag;
let shouldNag = false;

if (nag.applies_to.includes(type) && nag.suppress_if_task_active) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || ".";
  const taskFile = join(projectDir, nag.check_file);
  try {
    if (existsSync(taskFile)) {
      const taskData = JSON.parse(readFileSync(taskFile, "utf8"));
      // Suppress nag if a task is active (non-null task_id)
      shouldNag = !taskData.task_id;
    } else {
      shouldNag = true;
    }
  } catch {
    shouldNag = true;
  }
}

// ── Determine if tasks should be forced ─────────────────────────
const forceTasks =
  matched.force_tasks === true ||
  longPromptTriggered ||
  researchForced;

// ── Output ──────────────────────────────────────────────────────
const lines = [];

if (multiIntentDetected) {
  // Multi-intent voice prompt: signal decomposition, don't force blueprint
  lines.push(`[composure:request-type] ${type}`);
  lines.push(
    `[composure:multi-intent] ~${concernCount} intents detected in this prompt. Use TaskCreate to break down what the user is asking — they likely want ${concernCount}+ separate things addressed. Do NOT start implementing until you have listed back what you understood.`
  );
} else if (forceTasks) {
  const fallback =
    "Start with /composure:blueprint to plan and break this down — it will classify the work, check for research, and create tracked tasks. If this is a simple list of independent items, use TaskCreate to track them directly.";

  let detail;
  if (longPromptTriggered) {
    detail = `This prompt contains ~${concernCount} distinct concerns. ${fallback}`;
  } else if (matched.task_prompt) {
    detail = matched.task_prompt;
  } else {
    detail = fallback;
  }

  lines.push("<system-reminder>");
  lines.push(`UserPromptSubmit hook success: <system-reminder>`);
  lines.push(detail);
  lines.push("</system-reminder>");
  lines.push("</system-reminder>");
} else {
  lines.push(`[composure:request-type] ${type}`);
  if (matched.guidance) {
    lines.push(`[composure:guidance] ${matched.guidance}`);
  }
}

if (matched.reasoning) {
  const reasoningMap = {
    sequential_think:
      "Use sequential thinking (sequential_think MCP tool) for multi-step analysis before writing code.",
  };
  const text = reasoningMap[matched.reasoning] || matched.reasoning;
  lines.push(`[composure:reasoning] ${text}`);
}

// Task nag — only if no force_tasks and type qualifies
if (!forceTasks && shouldNag) {
  lines.push(
    `[composure:hint] No active task detected. Consider using TaskCreate if this is multi-step work.`
  );
}

process.stdout.write(lines.join("\n") + "\n");
