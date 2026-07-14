# Tool Classification System

**Last Updated:** 2026-07-13

Salt automatically classifies Composio tools by risk level to enforce safety policies. This document covers the classification system, heuristics, and how to add manual overrides.

## Overview

Every Composio tool (e.g., `GMAIL_SEND_EMAIL`, `STRIPE_CREATE_INVOICE`) is classified by:

1. **Risk Class** — read, mutating, or destructive
2. **Approval Requirement** — whether human confirmation is required

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMPOSIO TOOLS                                  │
│                           (3000+ tools synced)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLASSIFICATION PIPELINE                              │
│                                                                              │
│   1. Check DB (tool_classifications) for manual override                    │
│   2. Apply heuristics (slug pattern matching)                               │
│   3. Cache result (60s TTL)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POLICY ENFORCEMENT                                 │
│                                                                              │
│   read        → Auto-execute, no approval needed                            │
│   mutating    → Trust mode: check tool/step approval; Ask mode: always ask  │
│   destructive → NEVER execute (deletions happen in source app)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Risk Classes

| Class | Description | Examples | Execution |
|-------|-------------|----------|-----------|
| **read** | Read-only, no side effects | `GMAIL_GET_MESSAGE`, `STRIPE_LIST_INVOICES` | Auto-execute |
| **mutating** | Creates or modifies data | `GMAIL_SEND_EMAIL`, `STRIPE_CREATE_INVOICE` | Depends on trust level |
| **destructive** | Deletes data | `GMAIL_DELETE_MESSAGE`, `STRIPE_DELETE_CUSTOMER` | Never execute |

### Why Destructive Tools Never Execute

Destructive actions are irreversible and high-risk. Salt's policy is that deletions should happen in the source app (Gmail, Stripe, etc.) where the user has full context and undo capabilities. Salt will never execute `DELETE_*` or `REMOVE_*` tools, even with explicit approval.

## Heuristic Classification

New tools are automatically classified by slug pattern:

```typescript
// tool-classification-heuristics.ts

function classifyToolByHeuristic(slug: string): ToolRiskClass {
  // Destructive patterns
  if (/^DELETE_|_DELETE$|^REMOVE_|_REMOVE$/i.test(slug)) {
    return "destructive";
  }
  
  // Read-only patterns
  if (/^(GET|LIST|SEARCH|FETCH|RETRIEVE|FIND|READ)_/i.test(slug)) {
    return "read";
  }
  
  // Mutating patterns
  if (/^(CREATE|UPDATE|SEND|POST|ADD|INSERT|WRITE|MODIFY|PATCH)_/i.test(slug)) {
    return "mutating";
  }
  
  // Conservative default
  return "mutating";
}
```

### Pattern Priority

1. **Destructive** — DELETE_*, REMOVE_* always classified as destructive
2. **Read** — GET_*, LIST_*, SEARCH_* always classified as read
3. **Mutating** — CREATE_*, SEND_*, UPDATE_* classified as mutating
4. **Default** — Unknown patterns default to mutating (conservative)

## Manual Overrides

Some tools don't follow standard patterns. Add manual overrides to the database:

```sql
-- Example: GMAIL_CREATE_DRAFT is mutating but doesn't need approval
-- (drafts are invisible until the user sends them in Gmail)
INSERT INTO tool_classifications (
  tool_slug,
  risk,
  requires_human_confirmation,
  source,
  status
) VALUES (
  'GMAIL_CREATE_DRAFT',
  'mutating',
  false,
  'manual',
  'approved'
);
```

### Override Sources

| Source | Meaning |
|--------|---------|
| `manual` | Explicitly set by Salt team |
| `heuristic` | Auto-classified by pattern matching |
| `composio` | Synced from Composio metadata (future) |

### Common Overrides

| Tool | Heuristic | Override | Reason |
|------|-----------|----------|--------|
| `GMAIL_CREATE_DRAFT` | mutating | `confirmation: false` | Invisible until sent |
| `GOOGLEDRIVE_SHARE_FILE` | mutating | `confirmation: true` | Data exfiltration risk |
| `STRIPE_CREATE_DRAFT_INVOICE` | mutating | `confirmation: false` | Draft, not sent |

## Approval Requirements

The `requires_human_confirmation` field determines if a tool needs approval:

| Trust Level | Read | Mutating | Destructive |
|-------------|------|----------|-------------|
| **Read** | ❌ No execute | ❌ No execute | ❌ No execute |
| **Ask** | Auto | Always ask | Never |
| **Trust** | Auto | Check tool/step | Never |

### Trust Mode Logic

In Trust mode, approval is required if:

1. Tool has `requires_human_confirmation = true` in `tool_classifications`
2. Workspace has override in `workspace_tool_preferences`
3. Playbook step has `approval: required`

```typescript
// Simplified logic from ask-salt-tools.ts
function needsApproval(tool, trustLevel, workspaceOverrides, stepApproval) {
  if (trustLevel === "ask") return true;  // Ask mode: always
  if (stepApproval === "required") return true;  // Playbook escalation
  if (workspaceOverrides[tool.slug]) return true;  // User preference
  return tool.requiresHumanConfirmation;  // Tool default
}
```

## Database Schema

```sql
CREATE TABLE tool_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_slug text UNIQUE NOT NULL,
  risk text NOT NULL CHECK (risk IN ('read', 'mutating', 'destructive')),
  requires_human_confirmation boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'heuristic',
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE workspace_tool_preferences (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tool_slug text NOT NULL,
  requires_approval boolean NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (workspace_id, tool_slug)
);
```

## Key Files

| File | Purpose |
|------|---------|
| `app/_lib/composio/tool-classification-heuristics.ts` | Pattern-based classification |
| `app/_lib/composio/classification-store.ts` | DB lookup with heuristic fallback |
| `app/_lib/composio/tool-policy.ts` | Policy enforcement |
| `app/_lib/composio/tool-policy-registry.ts` | ⚠️ Deprecated manual registry |

## Adding a New Override

1. **Check current classification:**
   ```sql
   SELECT * FROM tool_classifications WHERE tool_slug = 'TOOL_NAME';
   ```

2. **Insert or update override:**
   ```sql
   INSERT INTO tool_classifications (tool_slug, risk, requires_human_confirmation, source, status)
   VALUES ('TOOL_NAME', 'mutating', true, 'manual', 'approved')
   ON CONFLICT (tool_slug) DO UPDATE SET
     risk = EXCLUDED.risk,
     requires_human_confirmation = EXCLUDED.requires_human_confirmation,
     source = 'manual',
     updated_at = now();
   ```

3. **Invalidate cache:**
   ```typescript
   import { invalidateClassificationCache } from "@/app/_lib/composio/classification-store";
   invalidateClassificationCache("TOOL_NAME");
   ```

## Troubleshooting

### Tool not executing (unexpected block)

1. Check classification: `SELECT * FROM tool_classifications WHERE tool_slug = ?`
2. Verify trust level: Is workspace in Read mode?
3. Check risk class: Is it classified as destructive?

### Tool executing without approval

1. Check `requires_human_confirmation` in DB
2. Verify workspace trust level (Ask mode always requires approval)
3. Check workspace_tool_preferences for overrides

### New tool not classified

1. Verify the tool synced: `SELECT * FROM connector_tools WHERE slug = ?`
2. Check heuristic result: Does slug match known patterns?
3. Add manual override if heuristic is wrong
