# Step 1: Identify Target Service

## 1a. Parse Arguments

Check if the user provided a service name as an argument (e.g., `/composure:mcp-builder airtable`).

- **If provided**: Use it as the target service name. Proceed to 1b.
- **If not provided**: Use **AskUserQuestion**:

  > "What service do you want to connect to Claude Code?"
  >
  > 1. **Airtable** — Spreadsheet-database hybrid, REST API
  > 2. **Notion** — Workspace with databases, pages, blocks
  > 3. **Jira** — Issue tracking, project management
  > 4. **Slack** — Messaging, channels, workflows
  > Other — Describe the service or provide an API docs URL

  **BLOCKING** — wait for response.

## 1b. Check for Existing MCP Server

Before building a custom server, check if a community MCP server already exists for this service.

Search for an existing server:
1. Check if `mcp-setup` has a curated registry: read `../mcp-setup/data/mcp-registry.json` if it exists
2. Quick npm search: `npm search mcp ${serviceName} --json 2>/dev/null | head -20`
3. Quick GitHub search (if WebSearch available): search for `"mcp server ${serviceName}"`

**If an existing server is found:**

Use **AskUserQuestion**:

> "An existing MCP server for [service] is available: `[package-name]`
>
> [one-line description]
>
> Want to install that instead, or build a custom one?"
>
> 1. **Install existing** — Redirect to `/composure:mcp-setup` (Recommended if the existing server covers your needs)
> 2. **Build custom** — I need features the existing server doesn't have
> 3. **Show me both** — Let me compare, then decide

**BLOCKING** — wait for response. If user chooses "Install existing", invoke `/composure:mcp-setup [package]` and stop this skill.

## 1c. Determine Service Type

Classify the target service:

| Type | Signal | Implication |
|------|--------|-------------|
| **Known SaaS** | Recognized service name (Airtable, Notion, Stripe, etc.) | Context7 likely has docs, official SDK may exist |
| **Custom API** | User says "our API", "internal service", provides URL | Need user to provide docs URL or OpenAPI spec |
| **Database** | PostgreSQL, MySQL, MongoDB, Redis | Dedicated connection pattern, no REST API |

For **Custom API**: Ask for documentation:

> "I'll need API documentation to design the MCP tools. Do you have:"
>
> 1. **OpenAPI/Swagger spec** — Provide the file path (e.g., `./openapi.yaml`)
> 2. **API docs URL** — I'll fetch and analyze them
> 3. **No formal docs** — Describe the endpoints you need and I'll scaffold from that

**BLOCKING** — wait for response.

## 1d. Confirm Direction

Present a summary before proceeding:

> "Building an MCP server for **[service]**
> - Type: [Known SaaS / Custom API / Database]
> - SDK: [official SDK name if found, or "Direct API"]
> - Docs: [Context7 / URL / OpenAPI spec / manual description]
>
> Ready to discover the API surface?"

Do NOT use AskUserQuestion here — this is informational. Just proceed unless the user corrects something.

---

**Next:** Read `steps/02-discover-api.md`
