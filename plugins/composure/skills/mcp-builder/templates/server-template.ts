/**
 * MCP Server Template — Reference Pattern
 *
 * This is a reference template read by Step 5 (implement), NOT executable code.
 * The MCP SDK v2 API uses registerTool() with config objects.
 *
 * Key imports:
 *   - McpServer, StdioServerTransport from '@modelcontextprotocol/server'
 *   - z from 'zod/v4' (Standard Schema required for v2)
 *   - CallToolResult type for return values
 *
 * IMPORTANT v2 changes from v1:
 *   - server.tool() is DEPRECATED → use server.registerTool()
 *   - Raw Zod shapes don't work → wrap with z.object()
 *   - Import from '@modelcontextprotocol/server' (not subpaths)
 */

import { McpServer, StdioServerTransport } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import type { CallToolResult } from '@modelcontextprotocol/server';

// Import tool handlers (one file per tool)
import { listRecordsInput, listRecords } from './tools/list-records.js';
import { getRecordInput, getRecord } from './tools/get-record.js';

// Create server instance
const server = new McpServer(
  {
    name: 'mcp-service-name',
    version: '1.0.0',
  },
  {
    capabilities: { logging: {} },
  }
);

// Register tools using v2 API
server.registerTool(
  'list_records',
  {
    title: 'List Records',
    description: 'List records from a table with optional filtering',
    inputSchema: listRecordsInput, // z.object() — Standard Schema
  },
  async (input): Promise<CallToolResult> => listRecords(input)
);

server.registerTool(
  'get_record',
  {
    title: 'Get Record',
    description: 'Get a single record by ID',
    inputSchema: getRecordInput,
  },
  async (input): Promise<CallToolResult> => getRecord(input)
);

// Connect via stdio transport (standard for Claude Code MCP servers)
const transport = new StdioServerTransport();
await server.connect(transport);
