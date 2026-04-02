# Step 2: Discover API Surface

**Skip if `--skip-docs`.** Fall back to user-described endpoints from Step 1.

## 2a. Pull Documentation

Based on the service type from Step 1:

### Known SaaS (Context7 path)

1. **Resolve library**: `mcp__context7__resolve-library-id` with the service name
2. **Query docs**: `mcp__context7__query-docs` for:
   - Authentication methods (API key, OAuth, Bearer token)
   - Core CRUD endpoints (list, get, create, update, delete)
   - Search/query capabilities
   - Webhook support
   - Rate limits and pagination
   - Response data models

**Important**: Query Context7 ONE library at a time. Do NOT batch multiple queries.

3. **Check for official SDK**: Also resolve the service's SDK package (e.g., `airtable` npm package, `@notionhq/client`). If found, query its docs too — SDK methods are often cleaner than raw REST.

### Custom API (user-provided docs)

1. **OpenAPI spec**: Read the file, extract endpoints, schemas, auth requirements
2. **API docs URL**: Use `WebFetch` to pull the page, parse endpoint documentation
3. **Manual description**: Use what the user provided in Step 1c — work with available information

### Database

1. Query Context7 for the database client library (e.g., `pg` for PostgreSQL, `mongoose` for MongoDB)
2. Focus on: connection setup, query patterns, common operations

## 2b. Extract API Profile

From the docs, build a structured profile:

```
API Profile: [Service Name]

Auth:
  Method: [API Key | OAuth 2.0 | Bearer Token | Basic Auth]
  Header: [Authorization: Bearer {token} | X-API-Key: {key} | etc.]
  Env var: [AIRTABLE_API_KEY | NOTION_TOKEN | etc.]

Endpoints:
  - GET /bases — List all bases
  - GET /bases/{baseId}/tables/{tableId}/records — List records
  - GET /bases/{baseId}/tables/{tableId}/records/{recordId} — Get record
  - POST /bases/{baseId}/tables/{tableId}/records — Create record(s)
  - PATCH /bases/{baseId}/tables/{tableId}/records — Update record(s)
  - DELETE /bases/{baseId}/tables/{tableId}/records — Delete record(s)

Rate limits:
  - 5 requests per second per base (Airtable)

Pagination:
  - Cursor-based (offset parameter)

Key data models:
  - Record: { id, fields: Record<string, any>, createdTime }
  - Base: { id, name, tables: Table[] }

SDK available:
  - Package: airtable (npm)
  - Current version: 0.12.x
```

## 2c. Identify MCP-Relevant Operations

Not every API endpoint makes sense as an MCP tool. Filter for operations that are:

| Include | Exclude |
|---------|---------|
| Read/query data (high value for LLM context) | Bulk operations (better done manually) |
| Create/update records (LLM can assist with data entry) | Admin/settings operations (risky, rare) |
| Search/filter (LLM can build queries) | Destructive bulk operations (too dangerous) |
| Status checks / health (diagnostic) | File upload/download (MCP text-based) |

Present a candidate list — Step 3 will let the user refine it.

## 2d. Present Findings

Present the API profile to the user:

> "API surface for **[service]**:
> - Auth: [method] via [header/env var]
> - [N] candidate endpoints identified
> - SDK: [package name] available / Direct REST API
> - Rate limit: [limit]
>
> Moving to tool design."

---

**Next:** Read `steps/03-design-tools.md`
