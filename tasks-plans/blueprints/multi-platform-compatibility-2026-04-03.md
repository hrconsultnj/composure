# Blueprint: Multi-Platform Compatibility — Composure as Universal Code Quality Layer

**Classification**: new-feature (roadmap/backlog)
**Date**: 2026-04-03
**Stack**: MCP servers, shell hooks, platform adapters
**Priority**: Roadmap — strategic initiative, not immediate implementation

---

## Context

With the Native Installation Architecture complete (.composure/ owns all state), Composure is no longer coupled to Claude Code's directory structure. This opens the door to universal compatibility: any AI coding tool that supports MCP servers, hooks, or file system conventions can use Composure for code quality enforcement.

Research conducted on 2026-04-03 across 10+ platforms confirms convergence on MCP as the universal integration protocol.

Research: `composure-pro/docs/expansion.txt`

---

## Platform Compatibility Matrix

| Platform | Hooks | MCP | Rules/Config | Marketplace | Composure Path |
|----------|:-----:|:---:|:------------:|:-----------:|---------------|
| **Claude Code** | Full (Pre/Post/Session) | Full | CLAUDE.md + plugins | Yes | Current — fully integrated |
| **Cursor AI** | Full (.cursor/hooks.json, 1.7+) | Full (stdio/SSE/HTTP) | .cursor/rules/ | Yes (marketplace) | High priority — hooks + MCP + marketplace |
| **Gemini CLI** | Full (BeforeTool/AfterTool, 0.26+) | TBD | Config + extensions | Extensions | Medium — hooks via extension |
| **Codex CLI** | In dev (lifecycle) | Full (STDIO/HTTP) | .codex/config.toml | TBD | Medium — MCP first |
| **Cline** (VS Code) | Yes (.clinerules/hooks/) | Yes | .clinerules | No | Medium — hooks + MCP |
| **Roo Code** (VS Code) | Via MCP only | Full | Custom modes | No | Easy — MCP-only integration |
| **Windsurf** (Codeium) | Yes (Cascade Hooks) | Full | .windsurfrules | JSON config | High — hooks + MCP + rules |
| **Replit** | No | Full | — | MCP only | Medium — MCP-only integration |
| **Lovable** | No | Full (Personal Connectors) | — | MCP for context | Medium — MCP-only integration |
| **Bolt.new** (StackBlitz) | No | Full (bolt.diy) | — | MCP config UI | Medium — MCP via community fork |
| **Dyad.sh** (open source) | No | Full (v0.22+, stdio/HTTP) | — | MCP | Medium — MCP-only, self-hosted |
| **Continue.dev** (VS Code) | No | No | .continue/rules/ | No | Low — rules-only, no runtime enforcement |
| **Aider** | No | No | YAML config | No | Low — config-only |
| **v0** (Vercel) | No | No | tailwind.config only | No | Not viable — no extensibility |
| **Claude Code Web** | Via sandbox | Via sandbox | Same as CLI | Yes | Auto — same plugin system |
| **Claude Code Mobile** | Monitor only | No local | Same as CLI | No | Monitor only — no local enforcement |
| **Claude Desktop** | Full | Full | Same as CLI | Yes | Auto — same plugin system |
| **VS Code Extension** | Full | Full | Same as CLI | Yes | Auto — Claude Code plugin hooks fire |
| **JetBrains Extension** | Full | Full | Same as CLI | Yes | Auto — Claude Code plugin hooks fire |

---

## Architecture: Three Integration Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 3: Platform Adapters (optional, for native hook integration)       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Claude │ │ Cursor │ │Windsurf│ │ Gemini │ │  Cline   │ │   Git    │ │
│  │hooks.js│ │hooks.js│ │Cascade │ │  ext   │ │.clinerule│ │pre-commit│ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: MCP Server (universal — works on all MCP-capable tools)  │
│                                                                     │
│  composure-enforcement MCP server                                   │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────────┐ │
│  │ validate_code()  │ │ get_rules()      │ │ check_decomposition │ │
│  │ run_no_bandaids()│ │ get_stack()      │ │ check_quality()     │ │
│  │ framework_check()│ │ list_violations()│ │ suggest_split()     │ │
│  └──────────────────┘ └──────────────────┘ └─────────────────────┘ │
│                                                                     │
│  composure-graph MCP server (ALREADY EXISTS)                       │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────────┐ │
│  │ query_graph()    │ │ semantic_search()│ │ get_impact_radius() │ │
│  │ build_graph()    │ │ find_large_fns() │ │ run_audit()         │ │
│  └──────────────────┘ └──────────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 1: File System Convention (universal — all tools read files) │
│                                                                     │
│  .composure/                                                        │
│  ├── no-bandaids.json      ← Enforcement rules                    │
│  ├── sentinel.json         ← Security config                      │
│  ├── shipyard.json         ← CI/CD config                         │
│  ├── testbench.json        ← Test config                          │
│  ├── frameworks/           ← Generated reference docs              │
│  └── adapters/             ← Generated platform-native configs     │
│      ├── cursor/           ← .cursor/hooks.json + .cursor/rules/  │
│      ├── cline/            ← .clinerules + .clinerules/hooks/     │
│      └── git/              ← .git/hooks/pre-commit                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Decisions

1. **MCP-first strategy** — The composure-enforcement MCP server is the primary integration path. Every major platform (Claude Code, Cursor, Codex, Roo Code, Cline) supports MCP. One server, all platforms.
2. **Graph MCP is already universal** — composure-graph works on any MCP-capable tool today. No changes needed.
3. **Platform adapters are optional** — For tools with native hooks (Claude Code, Cursor, Gemini, Cline), adapters provide deeper integration. But MCP alone gives 80% of the value.
4. **Git hooks as universal fallback** — For tools without MCP or hooks (Aider, Continue.dev), pre-commit/pre-push git hooks provide basic enforcement.
5. **Cursor is the first expansion target** — Largest user base after Claude Code, full hook + MCP + marketplace support. Composure could ship as a Cursor marketplace plugin.
6. **Mobile/Web are monitor-only** — Claude Code Mobile and Web run in sandboxes. Composure can provide read-only status (via MCP) but not runtime enforcement.

---

## Implementation Phases (Roadmap)

### Phase A: composure-enforcement MCP Server (HIGH — unlocks all platforms)

Create a new MCP server alongside composure-graph that exposes enforcement as tools:

| MCP Tool | What it does | Replaces |
|----------|-------------|----------|
| `validate_code` | Run no-bandaids rules against content | no-bandaids.sh hook |
| `framework_check` | Run framework validation rules | framework-validation.sh hook |
| `check_decomposition` | Analyze file size/complexity | decomposition-check.sh hook |
| `get_stack` | Return detected stack from config | session-stack-note.sh |
| `get_rules` | Return active enforcement rules | Config file read |
| `run_audit` | Full code quality audit | Already in graph MCP |

**Input**: file path + content (or just file path for existing files)
**Output**: violations array with severity, message, line number

This server reads `.composure/no-bandaids.json` and `.composure/frameworks/` — platform-independent.

### Phase B: Cursor Marketplace Plugin (HIGH — largest expansion target)

Package Composure for the Cursor marketplace:
- Bundle composure-graph and composure-enforcement as MCP servers
- Generate `.cursor/rules/` from .composure/no-bandaids.json on init
- Generate `.cursor/hooks.json` from composure hook definitions
- `/composure:initialize` creates .composure/ + .cursor/ adapter files

### Phase C: Gemini CLI Extension (MEDIUM)

Package as a Gemini extension with bundled hooks:
- BeforeTool/AfterTool hooks calling composure-enforcement MCP
- Extension manifest bundles hook definitions

### Phase D: Codex CLI Integration (MEDIUM)

- Register composure-enforcement as MCP server in .codex/config.toml
- Lifecycle hooks call MCP tools for validation

### Phase E: Cline / Roo Code Adapters (MEDIUM)

- Generate .clinerules from .composure/no-bandaids.json
- MCP server registration for both tools

### Phase F: Git Hooks Fallback (LOW — universal baseline)

- `composure-auth init-git-hooks` command
- Generates .git/hooks/pre-commit calling composure-enforcement
- Works with ANY tool, ANY model, ANY workflow

### Phase G: Claude Code Web/Mobile Status (LOW)

- Read-only /composure:health via MCP in sandbox environments
- No runtime enforcement (sandbox limitations)

---

## Key Architectural Insight: Enforcement-as-MCP

The current enforcement architecture is **shell hooks that parse JSON**. This works for Claude Code but doesn't translate to other platforms.

**The shift**: Move enforcement LOGIC into an MCP server (Node.js), keep the shell hooks as thin callers. The hooks become:

```bash
# Current: full logic in bash
INPUT=$(cat)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content')
# ... 250 lines of bash validation ...

# Future: thin hook calling MCP
INPUT=$(cat)
RESULT=$(node "${COMPOSURE_BIN}/composure-enforce.mjs" validate "$FILE_PATH" <<< "$CONTENT")
EXIT_CODE=$?
```

The MCP server and the CLI tool share the same enforcement engine. Hooks are just one way to call it.

---

## Worktrees and Sandboxes

**Worktrees** (from research):
- Default location: `<project-root>/.claude/worktrees/`
- Configurable via Desktop app settings
- Each session gets isolated git worktrees
- **Opportunity**: `.composure/worktrees/` for Composure-managed agent scratch space

**Sandboxes** (Claude Code Web):
- Built on bubblewrap/seatbelt
- Filesystem isolation (CWD read/write only)
- MCP servers CAN run in sandbox (stdio transport)
- **Opportunity**: composure-enforcement MCP works in sandbox since it only reads .composure/ files

**Mobile**:
- Monitor/steer only — execution happens server-side
- MCP tools available for read-only status queries
- No local hook execution

---

## Risks

- **MCP adoption uncertainty** — If a platform drops MCP support, the adapter becomes dead code. Mitigation: MCP is backed by Anthropic as an open standard; adoption is accelerating, not declining.
- **Enforcement parity** — Shell hook enforcement has nuances (exit codes, stderr, JSON systemMessages) that MCP tools may not perfectly replicate. Mitigation: The MCP server IS the source of truth; hooks become thin wrappers.
- **Marketplace fragmentation** — Maintaining separate packages for Claude plugins, Cursor marketplace, Gemini extensions. Mitigation: Single source repo with build targets per platform.
- **Sandbox limitations** — Claude Code Web can't run hooks or access local filesystem beyond CWD. Mitigation: MCP-only enforcement in sandbox; full enforcement on local.

---

## Verification (per phase)

1. **Phase A**: composure-enforcement MCP server → call validate_code with known violations → get correct error array
2. **Phase B**: Install Composure from Cursor marketplace → run enforcement → violations appear in Cursor
3. **Phase F**: Run `git commit` with a violation → pre-commit hook blocks with correct message

---

## Checklist (Roadmap — NOT for immediate implementation)

### Phase A: Enforcement MCP Server
- [ ] Design MCP tool schemas (validate_code, framework_check, etc.)
- [ ] Extract enforcement logic from bash hooks into Node.js modules
- [ ] Create composure-enforcement MCP server
- [ ] Register alongside composure-graph in .mcp.json
- [ ] Verify parity with existing hook behavior

### Phase B: Cursor Marketplace
- [ ] Research Cursor marketplace submission process
- [ ] Create cursor adapter generator (.composure/ → .cursor/)
- [ ] Package as Cursor marketplace plugin
- [ ] Test hooks.json integration in Cursor 1.7+

### Phase C: Gemini Extension
- [ ] Create Gemini extension manifest
- [ ] Bundle BeforeTool/AfterTool hooks
- [ ] Test with Gemini CLI 0.26+

### Phase D: Codex Integration
- [ ] Create .codex/config.toml generator
- [ ] Register MCP servers
- [ ] Test lifecycle hooks

### Phase E: Cline / Roo Code
- [ ] Create .clinerules generator from .composure/ config
- [ ] Test MCP integration in both tools

### Phase F: Git Hooks Fallback
- [ ] Create composure-enforce.mjs CLI wrapper
- [ ] Generate .git/hooks/pre-commit
- [ ] Test with bare git (no AI tool)

### Phase G: Sandbox/Mobile
- [ ] Test composure-graph MCP in Claude Code Web sandbox
- [ ] Verify read-only status queries work
