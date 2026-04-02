# Step 5: Implement Server

Read `templates/server-template.ts` and `templates/tool-template.ts` in this skill's directory for the reference patterns. The MCP SDK v2 API uses `registerTool` — do NOT use the deprecated `server.tool()` method.

Also read these integration-builder references for auth and error handling patterns:
- `../integration-builder/references/auth-patterns.md`
- `../integration-builder/references/error-handling.md`

## 5a. Generate `src/types.ts`

Define shared types extracted from the API profile (Step 2):

```typescript
// Types derived from [Service] API responses

export interface ServiceConfig {
  apiKey: string;
  baseUrl?: string;
}

// Add types from API data models (Step 2 profile)
// e.g., Record, Base, Table, etc.
```

Keep types focused on what the tools actually use — don't type the entire API surface.

## 5b. Generate `src/client.ts`

API client for the target service. Two paths:

### If official SDK exists

```typescript
import ServiceSDK from '[service-sdk-package]';

export function createClient(): ServiceSDK {
  const apiKey = process.env.[SERVICE]_API_KEY;
  if (!apiKey) {
    throw new Error('[SERVICE]_API_KEY environment variable is required');
  }
  return new ServiceSDK({ apiKey });
}
```

### If Direct REST API

```typescript
import type { ServiceConfig } from './types.js';

export class ServiceClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config?: Partial<ServiceConfig>) {
    this.apiKey = config?.apiKey ?? process.env.[SERVICE]_API_KEY ?? '';
    this.baseUrl = config?.baseUrl ?? 'https://api.[service].com';

    if (!this.apiKey) {
      throw new Error('[SERVICE]_API_KEY environment variable is required');
    }
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`[Service] API error ${res.status}: ${error}`);
    }

    return res.json() as Promise<T>;
  }
}

export function createClient(config?: Partial<ServiceConfig>): ServiceClient {
  return new ServiceClient(config);
}
```

**Auth pattern**: Follow the auth method identified in Step 2. Read `../integration-builder/references/auth-patterns.md` for the matching pattern (API Key, Bearer Token, OAuth 2.0, Basic Auth).

**Error handling**: Read `../integration-builder/references/error-handling.md` and apply:
- Retry with exponential backoff for 429 (rate limit) and 5xx errors
- Do NOT retry 4xx (client errors) — those indicate bad input
- Wrap errors with context: which tool, which operation, what failed

## 5c. Generate `src/tools/*.ts`

One file per tool. Follow `templates/tool-template.ts` pattern.

For each tool from Step 3:

```typescript
// src/tools/list-records.ts
import * as z from 'zod/v4';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { createClient } from '../client.js';

export const listRecordsInput = z.object({
  table_id: z.string().describe('Table ID to query'),
  filter: z.string().optional().describe('Filter formula'),
  max_records: z.number().optional().default(100).describe('Maximum records to return'),
});

export async function listRecords(
  input: z.infer<typeof listRecordsInput>
): Promise<CallToolResult> {
  const client = createClient();

  try {
    const records = await client.request('GET',
      `/tables/${input.table_id}/records?maxRecords=${input.max_records}` +
      (input.filter ? `&filterByFormula=${encodeURIComponent(input.filter)}` : '')
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(records, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error listing records: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
```

**Key rules per tool file:**
- Export the Zod input schema (used by `registerTool`)
- Export the handler function (used by index.ts)
- Handle errors within the tool — return `isError: true`, don't throw
- Format output as readable text (LLMs consume text, not raw JSON blobs)
- For large responses, truncate or summarize (e.g., "Showing 10 of 847 records")

## 5d. Generate `src/index.ts`

Server entry point — imports all tools and registers them:

```typescript
import { McpServer, StdioServerTransport } from '@modelcontextprotocol/server';
import { listRecordsInput, listRecords } from './tools/list-records.js';
import { getRecordInput, getRecord } from './tools/get-record.js';
// ... import all tools

const server = new McpServer(
  { name: 'mcp-[service]', version: '1.0.0' },
  { capabilities: { logging: {} } }
);

// Register tools
server.registerTool(
  'list_records',
  {
    description: 'List records from a [service] table with optional filtering',
    inputSchema: listRecordsInput,
  },
  async (input) => listRecords(input)
);

server.registerTool(
  'get_record',
  {
    description: 'Get a single record by ID from a [service] table',
    inputSchema: getRecordInput,
  },
  async (input) => getRecord(input)
);

// ... register all tools

// Connect transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

## 5e. Update README.md

Replace the tools placeholder in README.md with the actual tool list:

```markdown
## Tools

| Tool | Description |
|------|-------------|
| `list_records` | List records from a table with filtering |
| `get_record` | Get a single record by ID |
| ... | ... |
```

---

**Next:** Read `steps/06-test-and-register.md`
