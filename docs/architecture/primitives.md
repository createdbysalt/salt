# Salt Primitives: Signals, Tools, Playbooks

> **The LEARN → ACT → GROW loop is built on three primitives that work together.**

Salt's proactive AI architecture separates concerns cleanly:

| Primitive | Role | Analogy |
|-----------|------|---------|
| **Signals** | Observable events from the world | The eyes and ears |
| **Tools** | Atomic, protected capabilities | The hands |
| **Playbooks** | Orchestration logic | The brain |

**Key architectural insight:** Playbooks are pure orchestration (like Claude skills). Protection and thresholds are enforced at the **tool layer**, not in playbooks. This means Ask Salt, playbooks, and the UI all go through the same protected tools.

---

## The Three Primitives

### Signals — The Eyes and Ears

Signals are **observable events** from connected accounts and Salt's internal systems. They're declarative facts about what happened, not instructions about what to do.

```
Signal: billing_payment_matched
  ├── Source: Stripe webhook
  ├── Entity: billing_record abc123
  ├── Evidence: { amount: 2500, customer_id: "cus_xxx" }
  └── Timestamp: 2026-07-12T14:30:00Z
```

**Properties:**
- **Declarative** — what happened, not what to do
- **Immutable** — events are facts, they don't change
- **Source-attributed** — where did we learn this?
- **Time-bound** — when did this happen?

**See:** [Signals Reference](signals.md)

---

### Tools — The Hands

Tools are **atomic capabilities** that do one thing well. Every mutation in Salt goes through a tool, and every tool enforces its own protection.

```typescript
// Tool call (from playbook or Ask Salt)
await memoryUpdateField({
  entityType: "person",
  entityId: "abc123",
  field: "relationship_type",
  value: "client",
  confidence: 95,
  because: "Payment received from Stripe",
});

// Tool enforces protection
if (confidence >= workspaceThreshold) {
  // Apply directly
} else {
  // Accumulate evidence, wait for more signals
}
```

**Properties:**
- **Protected** — thresholds and approvals enforced inside the tool
- **Auditable** — every call logged with evidence chain
- **Composable** — playbooks combine them
- **Risk-classified** — read / mutating / destructive
- **Rollback-capable** — mutations can be undone

**Risk Classes:**

| Class | Execution | Examples |
|-------|-----------|----------|
| `read` | Auto-execute | `get_person`, `list_invoices`, `get_voice_profile` |
| `mutating` | Confidence-gated or approval-required | `memory_update_field`, `draft_email`, `enrich_entity` |
| `destructive` | Never executed by Salt | `delete_customer`, `void_invoice` |

**See:** [Tools Reference](tools.md)

---

### Playbooks — The Brain

Playbooks are **reusable orchestration logic** that respond to signals using tools. They're self-contained packages (like Claude skills) with instructions, triggers, and execution code.

```yaml
# playbooks/v2/billing/payment-received/definition.yaml
name: Payment Received Handler
slug: payment-received
layer: learn              # or "act" for action playbooks
section: billing

triggers:
  - type: signal
    signals: [billing_payment_matched]

tools:
  - memory_update_field   # Protected, threshold-gated
  - get_entity_facts      # Read-only
  - notify                # Creates notifications
```

**Properties:**
- **Pure orchestration** — no protection logic (tools handle that)
- **Trigger-driven** — which signals activate me?
- **Tool-based** — I call tools, I don't mutate directly
- **Voice-aware** — which voice profile should I use?
- **Value-attributed** — what's the potential value?

**Layers:**

| Layer | Purpose | Example |
|-------|---------|---------|
| `learn` | Enrich Memory (not playbooks) | [Memory Care](memory-care.md) — records / hygiene / connections / notes |
| `act` | Take actions, create outputs | invoice-reminder, daily-briefing |

Playbooks are **act-layer only**. Learn-layer Memory enrichment is Memory Care.

**See:** [Playbooks Reference](playbooks.md) · [Memory Care](memory-care.md)

---

## How They Interact

```
1. Event occurs in connected account (Gmail, Stripe, Calendar, etc.)
                │
                ▼
2. Capture processes → emits Signal
   Example: "billing_payment_matched" for person abc123
                │
                ▼
3. Signal dispatch routes:
   - Memory Care records capability (learn layer)
   - cash-celebration playbook (act layer)
                │
                ▼
4. Each system executes using Tools:

   Memory Care · Records:
   ├── get_entity_facts(billing_record)
   ├── evaluate fill_rules (field registry)
   └── memory_update_field(status: "paid", confidence: 95, minThreshold: bar)
       └── Tool checks tiered bar → apply / watch / refuse
   
   cash-celebration:
   ├── get_voice_profile(context: "celebration")
   ├── draft content
   └── notify(type: "celebration")
```

---

## Progressive Autonomy

Salt uses **confidence-based execution** for Memory writes (tiered bars, not an approval queue):

```
┌─────────────────────────────────────────────────────────┐
│              MEMORY CARE DECISION PIPELINE               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Never-touch field (money)                               │
│  └── REFUSE: no write, no evidence, no queue            │
│                                                          │
│  Confidence < tier bar                                   │
│  └── WATCH: accumulate evidence (Filter → Watching)     │
│                                                          │
│  Confidence ≥ tier bar (standard / sensitive / destroy) │
│  └── APPLY: write via memory-tools, log Handled          │
│                                                          │
│  Correction                                              │
│  └── "That's wrong" → rollback + lesson in Rules         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Threshold** is `workspaces.memory_care_auto_apply_threshold` (default 85%). Sensitive and destructive tiers raise the floor to 95. See [Memory Care](memory-care.md) and `app/_lib/learning/field-tiers.ts`.

Act-layer plays (anything leaving Salt) still require Plays Queue approval — that is where approval belongs.

---

## Quick Reference

| Need to... | Use | Example |
|------------|-----|---------|
| React to an event | Signal → Care or Playbook | Payment → Care records; celebration → playbook |
| Perform an action | Tool (via Care, Playbook, or Ask Salt) | `memory_update_field`, `draft_email` |
| Enrich Memory | Memory Care | records / hygiene / connections / notes |
| Create reusable act intelligence | Playbook | invoice-reminder, daily-briefing |
| Enrich entity data | `enrich_entity` tool | Query connected accounts for person info |
| Ensure consistent voice | `get_voice_profile` tool | Get tone for billing reminders |
| See what Salt is learning | Memory → Filter | Watching / Handled / Kept out |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        SIGNALS                                │
│  Observable events from connected accounts and the world      │
│  Examples: person_created, payment_received, meeting_ended    │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
                ▼                              ▼
┌───────────────────────────┐    ┌──────────────────────────────┐
│      MEMORY CARE          │    │         PLAYBOOKS            │
│  Learn-layer enrichment   │    │  Act-layer orchestration     │
│  records / hygiene /      │    │  invoice-reminder,           │
│  connections / notes      │    │  daily-briefing              │
└───────────────┬───────────┘    └──────────────┬───────────────┘
                │                               │
                └───────────────┬───────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                         TOOLS                                 │
│  Atomic, protected capabilities that do one thing well        │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ read        │  │ mutating    │  │ destructive │          │
│  │ Auto-run    │  │ Gated       │  │ BLOCKED     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

---

## See Also

- [Memory Care](memory-care.md) — Learn-layer enrichment (not playbooks)
- [Signals Reference](signals.md) — Full signal taxonomy and registry
- [Tools Reference](tools.md) — Tool contracts and risk classes
- [Playbooks Reference](playbooks.md) — Act-layer playbook structure and execution
- [Memory Trust Layer](../plans/2026-07-11-memory-trust-layer.md) — Evidence chains, conflicts, rollback
- [Playbook Packages](../plans/2026-07-11-playbook-packages.md) — Skill-like playbook architecture
