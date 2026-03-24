# AI SDK v6 — Enforced Validation Rules

> Claude MUST check written code against these patterns. Violations are bugs.

## Error-Level (Block — Must Fix Before Proceeding)

| Pattern | Issue | Fix |
|---------|-------|-----|
| `from 'openai'` (direct SDK) | Bypasses AI SDK abstraction | Use `@ai-sdk/openai` provider or `"openai/model"` string |
| `from '@anthropic-ai/sdk'` (direct SDK) | Bypasses AI SDK abstraction | Use `@ai-sdk/anthropic` provider. **Exception**: `@anthropic-ai/claude-agent-sdk` is a separate product — allowed. |
| `Experimental_Agent` | Deprecated in v6 | Use `ToolLoopAgent` |
| `useChat({ api: ... })` | v5 syntax | `useChat({ transport: new DefaultChatTransport({ api }) })` |
| `tool({ parameters: ... })` | Renamed in v6 | Use `inputSchema` (aligned with MCP spec) |
| `generateObject(...)` | Removed in v6 | Use `generateText` + `Output.object({ schema })` |
| `streamObject(...)` | Removed in v6 | Use `streamText` + `Output.object({ schema })` |
| `CoreMessage` | Renamed in v6 | Use `ModelMessage` and `convertToModelMessages()` |
| `message.content` (string access) | Removed in v6 | Iterate `message.parts` (types: `text`, `tool-*`, `reasoning`) |

## Recommended-Level (Fix — Technical Debt If Left)

| Pattern | Issue | Fix |
|---------|-------|-----|
| `toDataStreamResponse()` | Renamed in v6 | `toUIMessageStreamResponse()` (chat) or `toTextStreamResponse()` (text) |
| `maxSteps: N` | Removed in v6 | `stopWhen: stepCountIs(N)` — import `stepCountIs` from `ai` |
| `isLoading` from `useChat` | Removed in v6 | `status === "streaming" \|\| status === "submitted"` |
| `useChat({ body: ... })` | Removed in v6 | Pass data through transport configuration |
| `onResponse` callback | Removed from useChat v6 | Configure through transport |
| `agent.generateText()` | Renamed in v6 | `agent.generate()` |
| `agent.streamText()` | Renamed in v6 | `agent.stream()` |
| `dall-e-3` / `dall-e-2` | Outdated | `google/gemini-3.1-flash-image-preview` via `generateText` → `result.files` |
| `gemini-2.0-flash-*` | Outdated | `gemini-3.1-flash-image-preview` |

## Import Reference

```tsx
// Core — from 'ai'
import {
  streamText, generateText, tool,
  UIMessage, ModelMessage,
  convertToModelMessages,
  stepCountIs, Output,
} from 'ai'

// React hooks — from '@ai-sdk/react' (NOT 'ai')
import { useChat, DefaultChatTransport } from '@ai-sdk/react'
```

## Model Selection Guide

> Snapshot — models evolve. Check provider docs for latest.

| Use Case | Recommended Model |
|----------|-------------------|
| Fast chat responses | `claude-haiku-4.5`, `gemini-3-flash` |
| General purpose | `claude-sonnet-4.6`, `gemini-3-flash` |
| Complex reasoning | `claude-opus-4.6`, `gemini-3.1-pro-preview` |
| Code generation | `claude-sonnet-4.6` |
| Image generation | `google/gemini-3.1-flash-image-preview` |
| Embeddings | `text-embedding-3-small` (OpenAI) |

## Provider Reference

| Provider | Package | Key Models |
|----------|---------|-----------|
| Anthropic | `@ai-sdk/anthropic` | `claude-opus-4.6`, `claude-sonnet-4.6`, `claude-haiku-4.5` |
| OpenAI | `@ai-sdk/openai` | `gpt-5.4`, `gpt-5-nano`, `o3` |
| Google | `@ai-sdk/google` | `gemini-3.1-pro-preview`, `gemini-3-flash` |
