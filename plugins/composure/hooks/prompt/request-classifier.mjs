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

// ── Helper: extract intent snippets for multi-intent preview ────
// Scans text for topic-shift markers (e.g., "also", "another thing")
// that appear at sentence boundaries, returns a normalized 60-char
// snippet starting AFTER each marker. Position 0 (prompt start) is
// included only as a fallback when no markers are found. Min snippet
// length of 25 chars filters out bare-marker and preamble fragments.
// Stress-tested 2026-04-10 against 20 real voice recordings.
function extractIntentSnippets(text, shiftMarkers, maxSnippets = 5) {
  if (!text || !Array.isArray(shiftMarkers) || shiftMarkers.length === 0) {
    return [];
  }
  const lower = text.toLowerCase();

  // A position counts only if preceded by sentence-ending punctuation,
  // a comma, or at the very start of the prompt. Comma is included
  // because voice transcripts from speech-to-text often use commas
  // where typed text would use periods, and paired with the strong-only
  // marker list this still rejects mid-clause noise.
  const isSentenceBoundary = (pos) => {
    if (pos === 0) return true;
    let i = pos - 1;
    while (i >= 0 && /\s/.test(text[i])) i--;
    if (i < 0) return true;
    return /[.!?,;]/.test(text[i]);
  };

  // Collect (position, markerLength) hits that pass the boundary check.
  const hits = [];
  for (const marker of shiftMarkers) {
    let idx = lower.indexOf(marker);
    while (idx !== -1) {
      if (isSentenceBoundary(idx)) {
        hits.push({ pos: idx, markerLen: marker.length });
      }
      idx = lower.indexOf(marker, idx + marker.length);
    }
  }

  // Fallback: no sentence-boundary markers → use start-of-prompt as the
  // single intent boundary. Preserves legacy behavior for short prompts.
  if (hits.length === 0) {
    hits.push({ pos: 0, markerLen: 0 });
  }

  // Dedupe by position, keeping the longer marker match where collisions occur.
  const byPos = new Map();
  for (const h of hits) {
    const existing = byPos.get(h.pos);
    if (!existing || h.markerLen > existing.markerLen) byPos.set(h.pos, h);
  }
  const sorted = Array.from(byPos.values()).sort((a, b) => a.pos - b.pos);

  const snippets = [];
  for (let i = 0; i < sorted.length && snippets.length < maxSnippets; i++) {
    const { pos, markerLen } = sorted[i];
    const start = pos + markerLen; // skip past the marker itself
    const nextPos = sorted[i + 1]?.pos ?? text.length;
    const end = Math.min(nextPos, start + 120);
    const raw = text.slice(start, end).trim().replace(/\s+/g, " ");
    if (raw.length < 25) continue; // skip preamble / bare marker fragments
    snippets.push(raw.length > 60 ? raw.slice(0, 57) + "..." : raw);
  }
  return snippets;
}

// ── Helper: format insight policy line ──────────────────────────
// Used by all three output branches (multi-intent, forceTasks, normal)
// so insight_policy configured per type always emits, regardless of
// which detection path the classifier took.
function insightLine(policy) {
  const insightText = {
    always: "Insights welcome — include when you make non-obvious decisions.",
    on_tradeoff: "Include insights only for trade-offs the user wouldn't catch from the diff.",
    skip: "Skip insights — mechanical work.",
  };
  const text = insightText[policy];
  return text ? `[composure:insight] ${text}` : null;
}

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

// Voice-transcribed signals — sentence-boundary-aware detection.
// Calls extractIntentSnippets during detection so the count we trust is
// the count of snippets that actually survived the boundary filter. Kills
// false positives on long rambles with many mid-sentence "also"/"plus"
// fillers (stress-tested 2026-04-10 against 20 real voice recordings).
let candidateIntents = null;
if (mi && !longPromptTriggered && wordCount >= (mi.word_threshold || 120)) {
  candidateIntents = extractIntentSnippets(cleaned, mi.topic_shift_markers || [], 5);
  if (candidateIntents.length >= (mi.shift_gate || 2)) {
    multiIntentDetected = true;
    concernCount = candidateIntents.length;
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

if (multiIntentDetected && candidateIntents) {
  // Multi-intent voice prompt: candidateIntents was computed during detection
  // using sentence-boundary-aware extraction, so the count and bullet preview
  // always agree (no more ~N vs bullet-count mismatch).
  lines.push(`[composure:request-type] ${type}`);
  const bullets = candidateIntents.map((s, i) => `  ${i + 1}. ${s}`).join("\n");
  lines.push(
    `[composure:multi-intent] ${candidateIntents.length} intents detected. Break down before implementing:\n${bullets}\nUse TaskCreate to track each one. Do NOT start implementing until you have listed back what you understood.`
  );
  const insight = insightLine(matched.insight_policy);
  if (insight) lines.push(insight);
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

  // Clean single-tag output. The harness wraps hook output in a
  // <system-reminder> block automatically; the previous code double-wrapped
  // which produced nested tags in the final message.
  lines.push(`[composure:request-type] ${type}`);
  lines.push(`[composure:force-tasks] ${detail}`);
  const insight = insightLine(matched.insight_policy);
  if (insight) lines.push(insight);
} else {
  lines.push(`[composure:request-type] ${type}`);
  if (matched.guidance) {
    lines.push(`[composure:guidance] ${matched.guidance}`);
  }
  const insight = insightLine(matched.insight_policy);
  if (insight) lines.push(insight);
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
