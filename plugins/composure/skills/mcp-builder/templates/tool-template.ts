/**
 * MCP Tool Handler Template — Reference Pattern
 *
 * This is a reference template read by Step 5 (implement), NOT executable code.
 * Each tool lives in its own file under src/tools/.
 *
 * Pattern:
 *   1. Export the Zod input schema (used by registerTool in index.ts)
 *   2. Export the handler function
 *   3. Handle errors internally — return isError: true, don't throw
 *   4. Format output as readable text, not raw JSON
 */

import * as z from 'zod/v4';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { createClient } from '../client.js';

// --- Input Schema ---
// Export so index.ts can pass it to registerTool's inputSchema
export const toolNameInput = z.object({
  // Required params
  resource_id: z.string().describe('ID of the resource to operate on'),

  // Optional params with defaults
  limit: z.number().optional().default(100).describe('Maximum items to return'),
  filter: z.string().optional().describe('Filter expression'),
});

// --- Handler ---
// Export so index.ts can call it from the registerTool callback
export async function toolName(
  input: z.infer<typeof toolNameInput>
): Promise<CallToolResult> {
  const client = createClient();

  try {
    // Make API call
    const result = await client.request('GET', `/resources/${input.resource_id}`);

    // Format response as readable text
    // LLMs consume text better than raw JSON blobs
    const formatted = formatResult(result);

    return {
      content: [{
        type: 'text',
        text: formatted,
      }],
    };
  } catch (error) {
    // Return error as tool result — don't throw
    // This lets the LLM see the error and adjust its approach
    return {
      content: [{
        type: 'text',
        text: `Error in tool_name: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// --- Helpers (private to this tool) ---

function formatResult(result: unknown): string {
  // For lists: summarize count + show first N items
  if (Array.isArray(result)) {
    const preview = result.slice(0, 10);
    const summary = result.length > 10
      ? `Showing 10 of ${result.length} results:\n\n`
      : '';
    return summary + JSON.stringify(preview, null, 2);
  }

  // For single items: pretty-print
  return JSON.stringify(result, null, 2);
}
