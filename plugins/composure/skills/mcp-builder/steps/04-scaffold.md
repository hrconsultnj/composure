# Step 4: Scaffold Project

## 4a. Determine Project Location

Use **AskUserQuestion**:

> "Where should the MCP server project be created?"
>
> 1. **Current directory** — Create `mcp-[service]/` subdirectory here
> 2. **Monorepo package** — Add as `packages/mcp-[service]/` in the current monorepo
> 3. **Custom path** — Specify a path

**BLOCKING** — wait for response.

## 4b. Detect Package Manager and Initialize

Detect the user's package manager before running any install commands. Check in order:

1. `pnpm-lock.yaml` or `pnpm-workspace.yaml` exists → **pnpm**
2. `bun.lockb` or `bun.lock` exists → **bun**
3. `yarn.lock` exists → **yarn**
4. `package-lock.json` exists → **npm**
5. None found → ask the user which to use

Use the detected package manager for ALL commands below. The examples use `{pm}` as a placeholder:

```bash
# Create directory
mkdir -p {target-path}
cd {target-path}

# Initialize package
{pm} init    # pnpm init, bun init, yarn init -y, npm init -y

# Install MCP SDK + Zod (required)
{pm} add @modelcontextprotocol/sdk zod

# Install TypeScript (dev)
{pm} add -D typescript @types/node

# Install target service SDK (if available from Step 2)
# e.g., {pm} add airtable
# e.g., {pm} add @notionhq/client
```

**Package manager command mapping:**

| Action | pnpm | bun | yarn | npm |
|--------|------|-----|------|-----|
| Init | `pnpm init` | `bun init` | `yarn init -y` | `npm init -y` |
| Add dep | `pnpm add` | `bun add` | `yarn add` | `npm install` |
| Add dev dep | `pnpm add -D` | `bun add -D` | `yarn add -D` | `npm install -D` |
| Run script | `pnpm run` | `bun run` | `yarn run` | `npm run` |
| Execute | `pnpm dlx` | `bunx` | `yarn dlx` | `npx` |

## 4c. Configure TypeScript

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 4d. Update package.json

Update the generated package.json:

```json
{
  "name": "mcp-[service]",
  "version": "1.0.0",
  "description": "MCP server for [Service Name] — connects Claude Code to [service]",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  },
  "keywords": ["mcp", "mcp-server", "[service]"],
  "license": "MIT"
}
```

## 4e. Create Directory Structure

```
mcp-[service]/
├── package.json
├── tsconfig.json
├── .env.example           ← Document required env vars
├── .gitignore
├── README.md              ← Usage instructions
└── src/
    ├── index.ts           ← Server entry point (created in Step 5)
    ├── client.ts          ← API client for target service
    ├── types.ts           ← Shared types
    └── tools/             ← One file per tool
        ├── list-records.ts
        ├── get-record.ts
        └── ...
```

Create the directories and placeholder files:

```bash
mkdir -p src/tools
```

Write `.env.example`:
```
# [Service Name] API credentials
[SERVICE]_API_KEY=your-api-key-here
# [SERVICE]_BASE_URL=https://api.service.com  # Optional: custom endpoint
```

Write `.gitignore`:
```
node_modules/
dist/
.env
.env.*
!.env.example
```

Write `README.md`:
```markdown
# MCP Server: [Service Name]

Connects Claude Code to [Service Name] via the Model Context Protocol.

## Setup

1. Install dependencies: `{pm} install`
2. Copy `.env.example` to `.env` and fill in your credentials
3. Build: `{pm} run build`

## Usage with Claude Code

Add to your `.mcp.json` or `~/.claude/settings.json`:

\`\`\`json
{
  "mcpServers": {
    "mcp-[service]": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "env": {
        "[SERVICE]_API_KEY": "your-key"
      }
    }
  }
}
\`\`\`

## Tools

[List of tools will be filled in Step 5]
```

## 4f. Verify Scaffold

Check that the project structure is correct:
- `package.json` exists and has correct fields
- `tsconfig.json` exists
- `node_modules/@modelcontextprotocol/sdk` is installed
- `src/tools/` directory exists

Report:
> "Project scaffolded at `{path}`. Dependencies installed. Moving to implementation."

---

**Next:** Read `steps/05-implement.md`
