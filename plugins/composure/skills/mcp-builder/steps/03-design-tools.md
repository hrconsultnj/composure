# Step 3: Design MCP Tool Definitions

## 3a. Propose Tools from API Surface

Using the candidate endpoints from Step 2, design MCP tool definitions. Each tool maps to one logical operation (not necessarily one endpoint).

**Naming convention**: `verb_noun` in snake_case (e.g., `list_records`, `get_record`, `create_record`, `search_records`).

For each proposed tool, define:

```
Tool: list_records
  Description: List records from a table with optional filtering
  Input:
    - table_id (string, required) — The table to query
    - filter (string, optional) — Filter formula
    - max_records (number, optional) — Maximum records to return (default: 100)
  Output: Array of records with id and fields
  API: GET /bases/{baseId}/tables/{tableId}/records
  Auth: Required
```

**Guidelines:**
- **5-10 tools** is the sweet spot. More than 15 is overwhelming for LLM tool selection.
- **Group related endpoints** into single tools when the input determines the operation (e.g., one `manage_record` with a `action: create|update|delete` param is worse than three focused tools).
- **Read operations first** — they're the highest value and lowest risk.
- **Destructive operations get confirmation descriptions** — tool description should warn: "This will permanently delete the record."

## 3b. Present for User Selection

Use **AskUserQuestion** with `multiSelect: true`:

> "Here are the proposed MCP tools for [service]. Select which ones to include:"
>
> 1. **list_records** — List records from a table with filtering
> 2. **get_record** — Get a single record by ID
> 3. **create_record** — Create a new record in a table
> 4. **update_record** — Update an existing record's fields

All read operations should be pre-selected (recommended). Write/delete operations listed but not pre-selected.

**BLOCKING** — wait for user selection.

## 3c. Refine Tool Specs

After user selects tools:

1. For each selected tool, finalize the input/output schema:
   - Input params → Zod schema shape
   - Output → `CallToolResult` content format
   - Required vs optional params
   - Default values where sensible

2. Check for cross-cutting concerns:
   - **Pagination**: If any tool returns lists, add `cursor`/`offset` + `limit` params
   - **Error responses**: Standardize error format across tools
   - **Rate limiting**: If service has tight limits, note which tools are high-cost

3. Present the finalized tool specs:

```
Finalized tools (N selected):

1. list_records
   Input: z.object({
     table_id: z.string().describe("Table ID to query"),
     filter: z.string().optional().describe("Filter formula"),
     max_records: z.number().optional().default(100)
   })

2. get_record
   Input: z.object({
     table_id: z.string().describe("Table ID"),
     record_id: z.string().describe("Record ID to retrieve")
   })

...
```

Do NOT use AskUserQuestion here — proceed to scaffold. The user already confirmed the tool set.

---

**Next:** Read `steps/04-scaffold.md`
