# Team Onboarding — New Developer Productive in Hours, Not Weeks

**Scenario**: A new developer joins a 5-person team working on a multi-tenant SaaS. Instead of reading outdated wikis, they ask their AI — and the AI has the team's collective knowledge.
**Stack**: Next.js 16, Supabase, multi-tenant architecture
**Organism layer**: Brain (Cortex — team memory + thinking sessions)

---

## The Problem

Sarah joins the team on Monday. She's an experienced developer but new to this codebase.

**Without Cortex — Sarah's first week:**

```
Monday AM:     Read README (10 min, covers setup, not architecture)
Monday PM:     Ask Tom: "How does auth work?" (30 min, Tom context-switches)
Tuesday:       Ask Lisa: "Why is the org switcher so complex?" (Lisa is OOO)
               Read Confluence (45 min, half the pages are outdated)
Wednesday:     Try to fix a bug. Break tenant isolation. Tom catches it in PR.
               Tom: "Oh yeah, you need to use the feed pattern for all queries."
               Where is this documented? Nowhere.
Thursday:      Ask Tom: "What's the feed pattern?" (another 30 min of Tom's time)
Friday:        Finally productive, but still doesn't know WHY decisions were made.
```

**Time to productivity: 5 days. Tom lost: ~3 hours of context-switching.**

---

## What Happens With Cortex Team Memory

The team has been using Cortex for 3 months. Every thinking session, every design decision, every debugging investigation persists in the shared memory graph.

**With Cortex — Sarah's first day:**

### 9:00 AM — Setup and First Questions

Sarah installs Composure, connects to the team's Supabase project. Her AI has instant access to the team's memory graph: 847 memory nodes, 23 thinking sessions, 156 design decisions.

```
Sarah: "How does auth work in this project?"

AI (searches team memory):

"Based on the team's documented decisions:

1. Auth uses Supabase Auth with JWT tokens (7-day TTL, auto-refresh).
   Decided in thinking session ATS_045 by Tom (March 15).
   Considered Firebase Auth but chose Supabase for RLS integration.

2. Multi-tenant isolation: every query goes through the 'feed pattern' — 
   an entity_registry table that scopes all data to account_id.
   Designed by Lisa in session ATS_012 (February 8).
   Key insight: 'Direct table queries break tenant isolation. 
   Always join through entity_registry.'

3. Known gotcha: the org switcher re-fetches all data on account change 
   because TanStack Query cache is keyed by account_id. This was intentional 
   (session ATS_023) — stale cross-tenant data is worse than a loading state.

4. Auth flow for CLI users: OAuth 2.1 with PKCE, tokens stored at 
   ~/.composure/credentials.json. Built by Tom in session ATS_058.

Want me to show the thinking session that explains the feed pattern?"
```

Sarah just got in 30 seconds what would take 3 hours of asking Tom and Lisa.

### 10:00 AM — Understanding Why

```
Sarah: "Why did you choose Supabase over Firebase?"

AI (retrieves thinking session ATS_045):

"Tom's analysis (March 15):

Thought 1: Firebase is simpler for auth but doesn't have Row Level Security.
           For multi-tenant apps, we'd need to implement isolation in the 
           application layer — every query would need a WHERE clause.

Thought 2: Supabase's RLS means tenant isolation is enforced at the DATABASE 
           level. Even if application code has a bug, one tenant can't see 
           another's data. This is a compliance requirement for our clients.

Thought 3: Firebase's realtime is better for chat-like features, but 
           Supabase's realtime + RLS combination means realtime events 
           are automatically tenant-scoped.

Conclusion: Supabase wins on security + compliance. Firebase would be 
           faster to prototype but would require manual isolation."
```

Sarah doesn't just know WHAT was chosen — she knows WHY. She won't suggest switching to Firebase because she understands the reasoning.

### 11:00 AM — First Task, With Context

Sarah's first task: "Add a notification preferences page to the settings dashboard."

```
Sarah: "I need to build notification preferences. Where should I put it?"

AI (searches memory + code graph):

"Based on the team's patterns:

1. Settings pages live in src/app/(protected)/settings/
   (from graph: 4 existing settings pages follow this pattern)

2. New settings pages must use the SettingsLayout component 
   (memory: Lisa noted this convention in session ATS_031)

3. Multi-tenant: settings are account-scoped, not user-scoped.
   Use useCurrentAccount() hook, not useAuth().
   (memory: Tom documented this after Sarah's predecessor made the 
   same mistake in sprint 3)

4. Previous notification-related code:
   - Email templates at src/lib/emails/ (graph: 5 template files)
   - Notification preferences type doesn't exist yet
   - Push notifications discussed but deferred (session ATS_041: 
     'Deferred push notifications until mobile app ships')

I'd suggest:
- src/app/(protected)/settings/notifications/page.tsx
- src/lib/types/notification-preferences.ts
- Reuse SettingsLayout, follow the pattern in settings/profile/"
```

Sarah starts building with:
- The right file location (team convention)
- The right component hierarchy (SettingsLayout)
- The right data scoping (account, not user)
- Context on related features (email templates exist, push was deferred)
- A warning about a common mistake (account vs user scoping)

### 2:00 PM — The Mistake That Didn't Happen

Sarah writes a database query without the feed pattern:

```typescript
const { data } = await supabase
  .from('notification_preferences')
  .select('*')
  .eq('user_id', userId);
```

The AI catches it:

```
⚠ This query accesses notification_preferences directly without the feed 
pattern. Per team convention (memory ATS_012, Lisa):
"Direct table queries break tenant isolation. Always join through 
entity_registry."

The correct pattern is:
```typescript
const { data } = await supabase
  .from('entity_registry')
  .select('notification_preferences!inner(*)')
  .eq('account_id', accountId);
```

Sarah's predecessor made this exact mistake in sprint 3 (memory node from Tom).
```

The mistake that would have taken Tom 30 minutes to catch in PR review is prevented at write time.

---

## The Numbers

| Metric | Without Cortex | With Cortex |
|---|---|---|
| **Time to first productive code** | 3-5 days | 2-4 hours |
| **Senior dev time lost to onboarding** | ~8 hours/new hire | ~30 min (answering edge cases) |
| **Common mistakes in first week** | 3-5 (caught in PR review) | 0-1 (caught at write time) |
| **Architecture decisions understood** | 10-20% (what's documented) | 90%+ (thinking sessions persist) |
| **"Why did we..." questions to teammates** | 15-20 in first month | 2-3 (for things not yet in memory) |

### Cost of Onboarding (5-person team, 1 new hire/quarter)

```
Without Cortex:
  New hire ramp-up:        5 days × $600/day = $3,000 of reduced productivity
  Senior dev interruptions: 8 hours × $100/hr = $800
  Bugs from missing context: 3 bugs × 2 hours to fix × $100/hr = $600
  TOTAL PER HIRE: ~$4,400

With Cortex:
  New hire ramp-up:        0.5 days × $600/day = $300
  Senior dev interruptions: 0.5 hours × $100/hr = $50
  Bugs from missing context: 0.5 bugs × 2 hours × $100/hr = $100
  TOTAL PER HIRE: ~$450
  
  SAVINGS PER HIRE: ~$3,950
  SAVINGS PER YEAR (4 hires): ~$15,800
```

The Composure Pro subscription ($12/mo × 5 seats = $720/year) pays for itself with a single new hire.

---

## Why This Only Works With Cortex

- **Confluence/Notion**: Static. Outdated within weeks. Nobody updates it during the sprint.
- **Code comments**: Explain WHAT, not WHY. Don't capture decisions or tradeoffs.
- **PR descriptions**: Buried in GitHub, not searchable by concept, expire with branch deletion.
- **Slack threads**: Ephemeral. Searchable but no structure. Key decisions buried in 200-message threads.
- **Cortex**: Living knowledge graph. Updated automatically as thinking sessions complete. Searchable by concept. Cross-references code entities via graph. Shows the WHY, not just the WHAT. Gets better with every session.
