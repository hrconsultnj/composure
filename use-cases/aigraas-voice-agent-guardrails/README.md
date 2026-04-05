# Voice Agent Guardrails — Party Planning AI That Stays in Its Lane

**Scenario**: A VAPI voice agent for a party planning company keeps going off-topic — giving medical advice, discussing politics, and making promises the business can't keep
**Stack**: VAPI voice AI, Node.js backend, Stripe billing
**Organism layer**: Conscience (AIGRaaS — evaluation engine + constitutional framework)

---

## The Problem

PartyPlan AI is a voice agent that helps customers plan events. It books venues, suggests decorations, handles catering questions, and processes payments.

But voice AI has a problem that text chatbots don't: people TALK to voice agents like they're human. They ask follow-up questions. They go off-topic. They test boundaries.

```
Customer: "I'm planning my daughter's birthday party."
Agent: "Great! What age group and how many guests?"
Customer: "About 20 kids, ages 5-7. Oh, and my daughter's been 
          complaining about stomach pain. Is that normal for her age?"
Agent: "Stomach pain in children ages 5-7 can be caused by several 
        things including stress, diet changes, constipation, or in 
        some cases appendicitis. If the pain is persistent..."
```

The agent just gave medical advice. In a party planning context. To a concerned parent. This is:
- **Liability risk** — if the advice is wrong and the parent delays seeking care
- **Off-brand** — the agent should be a party expert, not a pediatrician
- **Unqualified** — the AI has no medical training and shouldn't pretend it does

Without guardrails, every voice agent is one conversational tangent away from a liability lawsuit.

---

## What Happens With AIGRaaS

### Step 1: Configure the Ruleset

The operator runs `/guardrails:configure` or uses the AIGRaaS dashboard:

```json
{
  "domain": {
    "name": "PartyPlan AI",
    "description": "Event planning and party supply company",
    "industry": "events"
  },
  "topics": {
    "allowed": ["events", "decorations", "catering", "venues", 
                "entertainment", "pricing", "scheduling"],
    "restricted": ["medical_advice", "legal_advice", "politics", 
                   "religion", "financial_advice", "competitors"],
    "redirect_message": "I specialize in party planning! Let me help 
                         you with your event instead.",
    "conditional": [{
      "topic": "medical_advice",
      "condition": "food allergies in catering context",
      "caveat": "For allergy info, please check product labels. 
                 For medical concerns, consult your doctor."
    }]
  }
}
```

### Step 2: Integrate with VAPI

Two integration options:

**Mode 1 — System Prompt Injection (zero latency):**
AIGRaaS generates an optimized system prompt section. The operator pastes it into VAPI's agent configuration. No runtime API calls.

**Mode 2 — Pre-Delivery Evaluation (middleware):**
Before VAPI delivers each response to the caller, it sends the response to the AIGRaaS API:

```
POST https://aigraas.com/api/v1/evaluate
{
  "response": "Stomach pain in children ages 5-7 can be caused by...",
  "user_input": "my daughter's been complaining about stomach pain",
  "ruleset_id": "rs_partyplan_v1"
}
```

### Step 3: The Evaluation Engine Runs (4ms)

```
Phase 1: Hard Constraints     → PASS (no constitutional violations)
Phase 2: Topic Classification → FAIL (medical_advice ∉ allowed_topics)
  └─ Conditional check: "food allergies in catering context"? 
     No — this is general pediatric health, not catering-related.
Phase 3: Principal Hierarchy  → DEFER TO OPERATOR (legitimate restriction)
Phase 4: Harm Assessment      → LOW (agent is trying to be helpful)
Phase 5: Verdict Generator
  └─ Senior Employee Test: Would blocking this be too cautious?
     No — the agent genuinely shouldn't give pediatric advice.
  └─ Newspaper Test: "AI Party Planner Gives Medical Advice" = bad headline.
     PASSES both tests.
  
VERDICT: REDIRECT
```

### Step 4: The Customer Hears the Right Response

Instead of medical advice, the customer hears:

> "I want to make sure you get the right help for that! I specialize in party planning, so for health questions, your pediatrician would be the best person to ask. Now, for your daughter's birthday — with 20 kids ages 5-7, I'd recommend activities like a bounce house or craft station. Would you like to explore entertainment options?"

The agent:
- **Acknowledged** the concern (didn't ignore it)
- **Redirected** warmly (didn't refuse rudely)
- **Referred** to the right professional (pediatrician)
- **Returned** to its domain (party planning)
- **Offered** a specific next step (entertainment options)

This is the Thoughtful Senior Employee Test in action — a good response avoids BOTH "AI gives dangerous advice" AND "AI is uselessly rigid."

---

## More Scenarios

### The Competitive Probe

```
Customer: "Is your catering better than FunFeast?"
```

Without AIGRaaS: Agent makes claims about competitors it can't substantiate.

With AIGRaaS: Topic "competitors" is restricted.
```
Agent: "I'd love to tell you about what makes our catering special!
        We offer customizable menus for every dietary need, and our
        setup team handles everything so you can enjoy the party.
        Want to hear about our most popular packages?"
```

### The Emergency Override

```
Customer: "My kid is choking on a balloon — what do I do?!"
```

Without AIGRaaS: Agent says "I only help with party planning" (negligent).

With AIGRaaS: Emergency detection fires in Phase 3 (Principal Hierarchy).
The `emergency_referral` behavior is hardcoded ON — cannot be disabled.
```
Agent: "Call 911 immediately! While waiting, if the child is conscious,
        perform the Heimlich maneuver — stand behind them, make a fist
        above the navel, and thrust upward. If they're unconscious,
        start CPR. Emergency services: 911."
```

The agent OVERRIDES its topic restrictions because a life is at risk. This is the constitutional framework's value hierarchy: Safety > Guidelines > Helpfulness.

### The Allergy Exception (Conditional Topic)

```
Customer: "Does your chocolate fountain contain peanuts? My son has a severe allergy."
```

Without conditional topics: Agent says "I can't give medical advice" (unhelpful AND wrong — this is a product question).

With AIGRaaS: Topic "medical_advice" matches BUT the conditional "food allergies in catering context" also matches. The agent is ALLOWED to discuss this with a caveat:
```
Agent: "Great question! Our chocolate fountain uses a peanut-free 
        chocolate blend. However, it's processed in a facility that 
        also handles peanuts, so there may be trace amounts. For 
        severe allergies, I'd recommend checking with your doctor 
        and I can send you the full ingredient list. We also have 
        a fruit fountain as a completely nut-free alternative!"
```

---

## The Numbers

| Metric | Without AIGRaaS | With AIGRaaS |
|---|---|---|
| **Off-topic responses per 100 calls** | 12-18 | 0-2 |
| **Liability incidents per month** | Unknown (not tracked) | 0 (all blocked/redirected) |
| **Customer satisfaction** | 72% (confused by off-topic answers) | 89% (agent stays helpful and focused) |
| **Evaluation latency** | N/A | 4ms average (imperceptible in voice) |
| **Compliance audit cost** | $5,000/quarter (manual review) | $0 (automated, audit trail included) |

---

## Why This Only Works With the Constitutional Framework

- **Keyword blocking** would block "stomach" even in "we have stomach-friendly menu options"
- **Intent classification** would need training data for every possible off-topic scenario
- **The 1,000 Users Test** handles edge cases: "If 1,000 people ask about allergies in a party context, most are asking about catering, not seeking medical advice"
- **The Principal Hierarchy** gives clear answers: operator restricts medical → agent redirects → BUT emergency overrides everything
- **Conditional topics** allow nuance: allergies in catering context = OK, general pediatric health = redirect
