# Step 0d: Stack Options — Present Choices with Trade-offs

Based on the intent analysis (0b) and ecosystem research (0c), present the user with technology options for each layer of their project. This is a DECISION step — the user chooses, not you.

## Layers to address

Present options for each layer that's relevant to the project. Skip layers that are obvious or already decided.

| Layer | When to present | When to skip |
|---|---|---|
| **Framework** | Always for empty projects | User already said "I want Next.js" |
| **Database** | Always if data persistence needed | User already said "use Supabase" |
| **Auth** | If project has user accounts | Single-user/personal tools |
| **Project structure** | If 2+ distinct concerns | Single-concern projects |
| **Hosting** | Can defer — "TBD after MVP" is fine | |

## Presentation format

Use the format from `templates/00d-stack-options.md`. For each layer:

1. **Lead with a recommendation** — based on what you learned about the user's needs
2. **Show 2-3 alternatives** — with "Best for" and "Trade-off" columns
3. **Explain your recommendation** — connect it to the user's specific requirements, not generic advice
4. **Flag hidden costs** — "you manage backups", "cold starts on free tier", "vendor lock-in"

## Connecting research to options

The ecosystem research from Step 0c should directly inform your recommendations:

- **OAuth2 integration required** → framework needs server-side routes (Next.js > Vite for this)
- **Rate limits found** → database should cache API data locally (not just proxy every request)
- **No official SDK** → needs custom API client → shared package in monorepo
- **Webhooks available** → backend needs webhook endpoints → affects hosting choice (needs always-on server or serverless with webhook support)

## Safety guardrails

Present warnings (not blocks) when the user's choices create tension:

| User choice | Tension | Warning |
|---|---|---|
| Vanilla HTML + API integration | API keys exposed in client-side code | "API keys in client-side JavaScript are visible to anyone. Consider adding server-side routes to proxy API calls securely." |
| No database + OAuth integration | OAuth tokens need persistent storage | "OAuth tokens need to be stored somewhere persistent — browser storage isn't safe for refresh tokens. Even SQLite would work for this." |
| No database + "users sign up" | Auth requires persistent user records | "User accounts need a database. Supabase bundles auth + Postgres, or you could use Auth.js + SQLite as a lighter alternative." |
| Self-hosted DB + no DevOps experience | Operational burden | "Self-hosting means you manage backups, scaling, and security patches. Managed services (Supabase, Neon, PlanetScale) handle this for you." |

## Design-heavy projects

If the user's description involves visual design concerns — "website", "landing page", "portfolio", "dashboard with visual flair", "animations", "interactive experience" — mention Design Forge:

> "For premium design patterns (generative backgrounds, glassmorphism, scroll animations, 3D integration, micro-interactions), the **Design Forge** plugin provides production-ready components with accessibility built in. Use `/design-forge` to browse patterns or `/ux-researcher` to research design approaches first."

If Design Forge is not installed, suggest:
> "Design Forge isn't installed yet. After scaffolding, run: `claude plugin install design-forge@my-claude-plugins`"

This is informational — don't block on it. The user can always add Design Forge later.

## Ask the user

After presenting all layers, use **AskUserQuestion**:

> "Here are my recommendations based on your project. What works for you? Feel free to mix and match — or tell me if you'd prefer a simpler/different approach."

**BLOCKING** — wait for the user's response.

## Handle pushback gracefully

If the user says:
- **"Too complex"** → scale down: "Got it — let me simplify. Vite + SQLite keeps everything local and simple."
- **"I just want X"** → respect it: use their choice, note trade-offs but don't argue
- **"What do you recommend?"** → commit to your recommendation with confidence
- **"I don't know"** → offer a default path: "For what you described, I'd go with [X]. We can always change later — scaffolding isn't permanent."

---

**Next:** Read `steps/00e-requirements-confirm.md`
