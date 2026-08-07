# Tools Reference

> **Tools are atomic, protected capabilities that do one thing well.**

Tools are the "hands" of Salt's proactive AI. Every mutation goes through a tool, and every tool enforces its own protection. This ensures that playbooks, Ask Salt, and the UI all use the same safety model.

---

## Tool Contract

Every tool MUST declare:

| Property | Description | Example |
|----------|-------------|---------|
| `risk` | Risk classification | `read`, `mutating`, `destructive` |
| `external_effect` | Whether executing the tool produces an effect outside Salt | `true` for `GMAIL_SEND_EMAIL`, `false` for `memory_update_field` |
| `inputs` | Required parameters with types | `{ entityId: string, field: string, value: string }` |
| `outputs` | Return type | `{ action: "applied" \| "accumulated", confidence: number }` |
| `protection` | How safety is enforced | Confidence threshold, approval required, blocked |
| `audit` | What gets logged | Evidence chain, provenance record |

---

## Risk Classes

| Class | Execution Model | Protection | Examples |
|-------|----------------|------------|----------|
| `read` | Auto-execute always | None needed | `get_person`, `list_invoices`, `get_voice_profile` |
| `mutating` | Confidence-gated OR approval-required | Threshold check, ask-first fields | `memory_update_field`, `draft_email`, `enrich_entity` |
| `destructive` | Never executed by Salt | Blocked at tool layer | `delete_customer`, `void_invoice`, `remove_permission` |

**Destructive tools are unreachable.** They're defined in the policy registry but Salt cannot execute them. Users must perform destructive actions in the source application (Stripe, Gmail, etc.).

---

## External Effect (the billable boundary)

`external_effect` is orthogonal to `risk`. Risk decides whether a tool may run; external effect decides whether running it costs the customer a play.

A play is billable when **at least one tool it executed carries `external_effect: true`**. Deriving billability from tool contracts gives metering exactly one classification point — there are no per-play judgement calls, and a hybrid play with internal and external steps bills exactly once.

| `external_effect` | Meaning | Examples |
|---|---|---|
| `true` | Leaves Salt — a third party can observe it | `GMAIL_SEND_EMAIL`, `GOOGLECALENDAR_CREATE_EVENT`, `SLACK_SEND_MESSAGE`, `STRIPE_CREATE_INVOICE` |
| `false` | Internal, or housekeeping inside the user's own account | All Memory tools, all `read` tools, `GMAIL_ADD_LABEL_TO_EMAIL` |

**Memory tools are never billable.** Memory mutations, entity linking, and Memory Care maintenance are LEARN-layer work. They are still metered with `billable: false` so the margin monitor can see the spend, but they never reach an invoice — charging for them would be charging the user for Salt organizing itself.

**Resolution order** (`app/_lib/composio/external-effect.ts`):

1. `tool_classifications.external_effect` when explicitly set
2. Slug overrides — mailbox housekeeping is internal; drafts written into an external mailbox are external
3. Risk class — `read` is internal, everything else is external, since Composio tools act on third-party systems by definition

The fallback direction is toward *not* billing. See [Billing & Metering](./billing-metering.md) for how the ledger consumes this and [Pricing Proposal §1](../reference/pricing-proposal-tiered-plays.md) for the business rules it implements.

---

## Memory Tools

Located in `app/_lib/memory-tools/`.

### memory_update_field

Updates a Memory record field with confidence-gated protection.

```typescript
interface UpdateFieldInput {
  workspaceId: string;
  entityType: "person" | "organization" | "work" | "billing" | "meeting" | "file";
  entityId: string;
  field: string;
  value: string;
  confidence: number;          // 0-100
  because: string;             // Human-readable reason
  source: "playbook" | "ask_salt" | "manual" | "enrichment";
  evidenceChain?: EvidenceChainItem[];
}

interface UpdateFieldResult {
  action: "applied" | "accumulated" | "rejected";
  threshold: number;
  confidence: number;
  evidenceId?: string;
  previousValue?: unknown;
}
```

**Protection:**
- Checks `confidence >= workspaceThreshold` (default 85%)
- Ask-first fields always require approval
- First-time classifications require approval
- Destructive value changes require approval

**Audit:**
- Creates provenance record with evidence chain
- Stores `previous_value` for rollback
- Logs to `entity_evidence` table

### memory_accumulate_evidence

Stores evidence without triggering threshold check.

```typescript
interface AccumulateEvidenceInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  fieldPath: string;
  proposedValue: unknown;
  confidence: number;
  source: string;
  because: string;
}
```

### memory_get_facts

Retrieves current entity state and computed signals.

```typescript
interface GetFactsInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
}

// Returns: Record<string, unknown> with current field values and signal states
```

### memory_rollback_field

Reverts a field to a previous value.

```typescript
interface RollbackFieldInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  field: string;
  toProvenanceId?: string;  // Specific version, or latest-1 if omitted
  reason: string;
}
```

### memory_record_correction

Records a user correction for calibration learning.

```typescript
interface RecordCorrectionInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  field: string;
  originalValue: unknown;
  correctedValue: unknown;
  originalProvenanceId: string;
  correctionReason?: string;
}
```

---

## Composio Tools (Connected Accounts)

Located in `app/_lib/composio/tool-policy-registry.ts`.

### Gmail

| Tool | Risk | Approval | Purpose |
|------|------|----------|---------|
| `GMAIL_SEND_EMAIL` | mutating | Required | Send email |
| `GMAIL_CREATE_DRAFT` | mutating | Not required | Create draft (invisible until user sends) |
| `GMAIL_LIST_MESSAGES` | read | Auto | List inbox messages |
| `GMAIL_GET_MESSAGE` | read | Auto | Get single message |
| `GMAIL_LIST_LABELS` | read | Auto | List labels |

### Google Calendar

| Tool | Risk | Approval | Purpose |
|------|------|----------|---------|
| `GOOGLECALENDAR_CREATE_EVENT` | mutating | Required | Create calendar event |
| `GOOGLECALENDAR_LIST_EVENTS` | read | Auto | List events |
| `GOOGLECALENDAR_UPDATE_EVENT` | mutating | Required | Update event |
| `GOOGLECALENDAR_DELETE_EVENT` | destructive | Blocked | Delete event |

### Google Drive

| Tool | Risk | Approval | Purpose |
|------|------|----------|---------|
| `GOOGLEDRIVE_FIND_FILE` | read | Auto | Search files |
| `GOOGLEDRIVE_LIST_FILES` | read | Auto | List files |
| `GOOGLEDRIVE_GET_FILE_METADATA` | read | Auto | Get file info |
| `GOOGLEDRIVE_MOVE_FILE` | mutating | Required | Move file |
| `GOOGLEDRIVE_CREATE_FOLDER` | mutating | Required | Create folder |
| `GOOGLEDRIVE_COPY_FILE` | mutating | Required | Copy file |
| `GOOGLEDRIVE_DELETE_FILE` | destructive | Blocked | Delete file |
| `GOOGLEDRIVE_SHARE_FILE` | destructive | Blocked | Share file (exfiltration risk) |

### Stripe (User's Account)

| Tool | Risk | Approval | Purpose |
|------|------|----------|---------|
| `STRIPE_LIST_CUSTOMERS` | read | Auto | List customers |
| `STRIPE_RETRIEVE_CUSTOMER` | read | Auto | Get customer |
| `STRIPE_LIST_INVOICES` | read | Auto | List invoices |
| `STRIPE_CREATE_CUSTOMER` | mutating | Required | Create customer |
| `STRIPE_CREATE_INVOICE` | mutating | Required | Create draft invoice |
| `STRIPE_CREATE_REFUND` | mutating | Required | Create refund |
| `STRIPE_DELETE_CUSTOMER` | destructive | Blocked | Delete customer |

**Note:** `STRIPE_CREATE_INVOICE` has `auto_advance` pinned to `false`. Salt only creates draft invoices — they become customer-visible only when the user finalizes in Stripe.

---

## Enrichment Tools

Located in `app/_lib/composio/enrichment/`.

### enrich_entity

Queries connected accounts to enrich an entity.

```typescript
interface EnrichInput {
  workspaceId: string;
  entityType: "person" | "organization" | "work";
  entityId: string;
  seed: Record<string, unknown>;  // Starting data (name, email, etc.)
}

interface EnrichResult {
  email?: string;
  title?: string;
  company?: string;
  // ... other enriched fields
  scanSummary: ScanSummaryItem[];
  sourcesQueried: string[];
}
```

**Behavior:**
- Queries connected providers in priority order (waterfall)
- Returns enriched data with confidence scores
- Does NOT apply changes (caller uses `memory_update_field`)

### apply_enrichment

Applies enrichment results to an entity using Memory tools.

```typescript
interface ApplyEnrichmentInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  entityLabel: string;
  enrichmentResult: EnrichResult;
}

interface ApplyEnrichmentResult {
  appliedFields: string[];
  accumulatedFields: string[];
  skippedFields: string[];
  summary: string;
}
```

---

## Voice Tools

Voice tools ensure consistent brand voice across all Salt outputs.

### get_voice_profile

Returns context-aware brand voice settings.

```typescript
interface GetVoiceInput {
  workspaceId: string;
  context: VoiceContext;
  recipientId?: string;      // For relationship-aware tone
  recipientType?: "person" | "organization";
  urgency?: "low" | "normal" | "high";
}

type VoiceContext = 
  | "billing"      // Invoice reminders, payment requests
  | "follow-up"    // Check-ins, status updates
  | "celebration"  // Wins, milestones, thank-yous
  | "reminder"     // Gentle nudges, deadline alerts
  | "brief"        // Daily briefings, summaries
  | "proposal"     // Quotes, proposals, pitches
  | "onboarding"   // Welcome, setup instructions
  | "support";     // Help, troubleshooting

interface VoiceProfile {
  tone: string;              // e.g., "warm but direct"
  formality: "casual" | "professional" | "formal";
  personality: string[];     // e.g., ["helpful", "confident", "concise"]
  avoid: string[];           // e.g., ["legal jargon", "exclamation marks"]
  prefer: string[];          // e.g., ["active voice", "contractions OK"]
  maxLength?: number;        // Word limit for this context
  signature: string;         // How to sign off
  greeting?: string;         // How to open
  examples: VoiceExample[];  // Real examples for this context
}

interface VoiceExample {
  label: string;
  content: string;
  context?: string;          // When to use this example
}
```

**Risk class:** `read` (no mutations)

**Behavior:**
1. Load workspace voice settings from `workspace_settings.voice_profile`
2. Load operator voice from `profiles.voice_settings`
3. Merge with context-specific defaults
4. If `recipientId` provided, adjust for relationship history
5. Return combined profile

**Voice Inheritance:**
```
Workspace defaults → Operator overrides → Context adjustments → Recipient adjustments
```

**Implementation location:** `app/_lib/voice/` (to be created)

**Data sources:**
- `workspace_settings.voice_profile` — Business-level voice
- `profiles.voice_settings` — Operator personal voice
- `voice_contexts` table — Per-context overrides
- Playbook `voice` field — Which context to use

### apply_voice

Rewrites content to match a voice profile. (Future tool)

```typescript
interface ApplyVoiceInput {
  workspaceId: string;
  content: string;
  profile: VoiceProfile;
  preserveStructure?: boolean;
}

interface ApplyVoiceResult {
  rewritten: string;
  changes: string[];  // What was adjusted
}
```

---

## Notification Tools

### notify

Creates a notification in HQ inbox.

```typescript
interface NotifyInput {
  workspaceId: string;
  type: "finding" | "conflict" | "recommendation" | "celebration";
  title: string;
  body: string;
  priority: "low" | "normal" | "high" | "urgent";
  entityRef?: { type: string; id: string };
  actions?: Array<{ label: string; action: string }>;
}
```

---

## Tool Policy Enforcement

Tools are protected at call time, not at playbook definition time:

```typescript
// In tool-policy.ts
export function assertComposioToolAllowed(
  toolSlug: string,
  options?: ComposioToolAllowOptions,
): ComposioToolPolicy {
  const policy = getComposioToolPolicy(toolSlug);
  
  if (!policy) {
    throw new Error(`Tool not approved: ${toolSlug}`);
  }

  if (policy.risk === "destructive") {
    throw new Error(`Tool ${toolSlug} is destructive and cannot be executed`);
  }

  if (options?.unattended && policy.risk !== "read") {
    throw new Error(`Tool ${toolSlug} cannot run unattended`);
  }

  // ... additional checks
}
```

---

## Tool Composition Patterns

Tools are designed to be composed together. Here are common patterns:

### Pattern 1: Enrich → Update

Query connected accounts, then apply findings to Memory.

```typescript
// 1. Enrich the entity
const enrichment = await enrichEntity({
  workspaceId,
  entityType: "person",
  entityId: personId,
  seed: { name: "Jane Example" },
});

// 2. Apply each enriched field through protected tool
for (const field of enrichment.fields) {
  await memoryUpdateField({
    workspaceId,
    entityType: "person",
    entityId: personId,
    field: field.name,
    value: field.value,
    confidence: field.confidence,
    because: `Enriched from ${field.source}`,
    source: "enrichment",
  });
}
```

### Pattern 2: Voice → Draft → Notify

Get voice profile, draft content, then notify user.

```typescript
// 1. Get voice for this context
const voice = await getVoiceProfile({
  workspaceId,
  context: "billing",
  recipientId: clientId,
  urgency: "normal",
});

// 2. Draft content using voice profile (LLM step in playbook)
const draft = await generateContent({
  template: "invoice_reminder",
  voice,
  data: { invoiceNumber, amount, dueDate },
});

// 3. Create notification or draft email
await notify({
  workspaceId,
  type: "recommendation",
  title: `Send reminder for Invoice #${invoiceNumber}`,
  body: draft,
  priority: "normal",
  entityRef: { type: "billing", id: invoiceId },
  actions: [
    { label: "Send", action: "send_email" },
    { label: "Edit", action: "edit_draft" },
  ],
});
```

### Pattern 3: Facts → Rules → Conditional Update

Load current state, evaluate rules, apply if conditions met.

```typescript
// 1. Get current facts
const facts = await memoryGetFacts({
  workspaceId,
  entityType: "person",
  entityId: personId,
});

// 2. Evaluate fill rules
for (const rule of fillRules) {
  if (evaluateCondition(rule.when, facts)) {
    // 3. Apply through protected tool
    await memoryUpdateField({
      workspaceId,
      entityType: "person",
      entityId: personId,
      field: rule.field,
      value: rule.set.value,
      confidence: rule.confidence,
      because: rule.because,
      source: "playbook",
    });
  }
}
```

### Pattern 4: Conflict Detection → User Resolution

Detect conflicts, surface to user, apply resolution.

```typescript
// 1. Check for conflicts
const conflicts = await memoryGetConflicts({
  workspaceId,
  entityType: "person",
  entityId: personId,
});

if (conflicts.length > 0) {
  // 2. Surface to user
  await notify({
    workspaceId,
    type: "conflict",
    title: `Conflicting data for ${personName}`,
    body: formatConflicts(conflicts),
    priority: "high",
    entityRef: { type: "person", id: personId },
    actions: conflicts[0].candidates.map(c => ({
      label: `Use "${c.value}"`,
      action: `resolve_${c.value}`,
    })),
  });
}
```

### Pattern 5: Hygiene Scan → Batch Notify

Find incomplete records, batch into a single notification.

```typescript
// 1. Find hygiene issues
const incomplete = await memoryGetIncomplete({
  workspaceId,
  entityType: "person",
  limit: 10,
});

const stale = await memoryGetStale({
  workspaceId,
  entityType: "person",
  daysSinceActivity: 90,
  limit: 10,
});

// 2. Batch into daily briefing
if (incomplete.length > 0 || stale.length > 0) {
  await notify({
    workspaceId,
    type: "finding",
    title: "Memory Hygiene Report",
    body: formatHygieneReport({ incomplete, stale }),
    priority: "low",
  });
}
```

### Tool Composition Rules

1. **Read before mutate** — Always `get_facts` before `update_field`
2. **One tool, one job** — Don't combine enrichment + application
3. **Protected tools enforce safety** — Caller doesn't check thresholds
4. **Audit everything** — Every tool call should be logged
5. **Fail fast** — Validate inputs with Zod before execution

---

## Adding New Tools

1. **Memory tools:** Add to `app/_lib/memory-tools/`
2. **Composio tools:** Add to `tool-policy-registry.ts` with risk classification
3. **Ask Salt tools:** Register in `app/_features/ask-salt/` tool files
4. **Document:** Update this file with the new tool

**Checklist for new tools:**
- [ ] Risk class defined (`read` / `mutating` / `destructive`)
- [ ] `external_effect` confirmed — the heuristic default is correct for most tools, but override it in `external-effect.ts` when the tool is housekeeping inside the user's own account
- [ ] Input validation (Zod schema)
- [ ] Output type defined
- [ ] Protection logic implemented
- [ ] Audit logging added
- [ ] Tests written

---

## See Also

- [Primitives Overview](primitives.md) — How tools fit in the architecture
- [Signals Reference](signals.md) — What triggers tool calls
- [Playbooks Reference](playbooks.md) — How playbooks use tools
- [Composio CLAUDE.md](../../app/_lib/composio/CLAUDE.md) — Composio integration details
- [Memory Tools CLAUDE.md](../../app/_lib/memory-tools/CLAUDE.md) — Memory tool contracts
