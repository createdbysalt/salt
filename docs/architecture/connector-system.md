# Connector System Architecture

**Last Updated:** 2026-07-13

Salt's connector system enables users to connect third-party services (Gmail, Stripe, Slack, etc.) for data capture, AI-assisted actions, and enrichment. This document covers the architecture and how to add new connectors with velocity.

## Table of Contents

1. [System Overview](#system-overview)
2. [The Unified Registry](#the-unified-registry)
3. [Connector Lifecycle](#connector-lifecycle)
4. [Adding a New Connector](#adding-a-new-connector)
5. [Capture Adapters](#capture-adapters)
6. [Ask Salt Integration](#ask-salt-integration)
7. [Enrichment System](#enrichment-system)
8. [Testing Connectors](#testing-connectors)
9. [Troubleshooting](#troubleshooting)
10. [Trigger Audit Process](#trigger-audit-process)
11. [Reference: Verified Trigger Configuration](#reference-verified-trigger-configuration)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UNIFIED CONNECTOR REGISTRY                           │
│                  app/_lib/composio/unified-connector-registry.ts             │
│                                                                              │
│   gmail: { category, triggerSlugs, askSalt, meta, phase }                   │
│   stripe: { ... }                                                           │
│   slack: { ... }                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐            ┌───────────────┐
│   CAPTURE     │           │   ASK SALT    │            │  ENRICHMENT   │
│   ADAPTERS    │           │   MANIFEST    │            │   REGISTRY    │
│               │           │               │            │               │
│ Webhooks →    │           │ AI tool       │            │ Field mapping │
│ capture_events│           │ access list   │            │ by category   │
└───────────────┘           └───────────────┘            └───────────────┘
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐            ┌───────────────┐
│   Plays       │           │  Ask Salt     │            │   Memory      │
│   Activity    │           │  Chat + Tools │            │   Records     │
└───────────────┘           └───────────────┘            └───────────────┘
```

### Key Principles

1. **Single Source of Truth** — The unified registry defines each connector ONCE
2. **Derived Systems** — Capture, Ask Salt, and Enrichment derive from the registry
3. **Category-Based** — Connectors are grouped by category (email, calendar, billing, etc.)
4. **Composio Backend** — OAuth and API execution handled by Composio SDK

### Key Files

| File | Purpose |
|------|---------|
| `app/_lib/composio/unified-connector-registry.ts` | **THE** single source of truth |
| `app/_lib/composio/connections.ts` | OAuth initiate/callback/disconnect |
| `app/_lib/composio/trigger-subscriptions.ts` | Create/delete Composio triggers |
| `app/_features/capture/adapters/registry.ts` | Route triggers to adapters |
| `app/_features/capture/adapters/categories/` | Category-based capture adapters |
| `app/_lib/composio/connector-manifest.ts` | Ask Salt tool access list |
| `app/_lib/composio/enrichment/registry.ts` | Category → field mapping |
| `app/_features/connectors/` | UI components and queries |

---

## The Unified Registry

The unified registry (`app/_lib/composio/unified-connector-registry.ts`) is the single source of truth for all connector definitions.

### Registry Entry Structure

```typescript
export const CONNECTOR_REGISTRY: Record<string, ConnectorDefinition> = {
  gmail: {
    // Database key (workspace_integrations.provider)
    providerKey: "gmail",
    
    // UI catalog ID for display
    catalogId: "google",
    
    // Category for routing (email, calendar, billing, crm, etc.)
    category: "email",
    
    // Authentication method
    authMethod: "oauth",  // or "api_key"
    
    // Composio trigger slugs for real-time capture
    // Empty array = backfill only (no real-time webhooks)
    triggerSlugs: ["GMAIL_NEW_GMAIL_MESSAGE"],
    
    // Ask Salt AI tool configuration
    askSalt: {
      enabled: true,           // Can Ask Salt use this connector?
      slugPrefix: "GMAIL_",    // Tool slug prefix for filtering
    },
    
    // UI display metadata
    meta: {
      displayName: "Gmail",
      tagline: "Search, read, and send email — sends only after you approve.",
      developedBy: "Google",
      links: [
        { label: "Website", href: "https://www.google.com/gmail/about/" },
        { label: "Documentation", href: "https://developers.google.com/workspace/gmail/api/guides" },
        { label: "Support", href: "https://support.google.com/mail" },
      ],
    },
    
    // Release status
    phase: "released",  // or "beta" or "coming_soon"
  },
};
```

### Categories

```typescript
type ConnectorCategory =
  | "email"              // Gmail, Outlook
  | "calendar"           // Google Calendar, Calendly, Cal.com
  | "billing"            // Stripe, QuickBooks
  | "crm"                // HubSpot, Salesforce, Pipedrive
  | "meetings"           // Fireflies, Otter
  | "documents"          // Notion, Google Docs/Sheets/Slides
  | "storage"            // Google Drive, Dropbox
  | "project_management" // Asana, Linear, Jira
  | "communication";     // Slack
```

### Derived Exports

The registry provides helper functions used by other systems:

```typescript
// Get connector by provider key
getConnector("gmail") // → ConnectorDefinition | null

// Get connector by catalog ID (for UI)
getConnectorByCatalogId("google") // → ConnectorDefinition | null

// Get trigger slugs for a provider
getTriggerSlugsForProvider("gmail") // → ["GMAIL_NEW_GMAIL_MESSAGE"]

// Get all providers in a category
getProvidersForCategory("email") // → ["gmail", "outlook"]

// Get category for a provider
getCategoryForProvider("gmail") // → "email"

// Get Ask Salt manifest (only enabled connectors)
getAskSaltManifest() // → AskSaltManifestEntry[]

// Get connector metadata for UI
getConnectorMetaWithFallback("google", "Gmail", "Email service")
```

---

## Connector Lifecycle

### 1. OAuth Connection Flow

```
User clicks "Connect"
        │
        ▼
initiateOAuthConnection()
  └─ Encodes state (workspaceId, provider, returnUrl)
  └─ Gets Composio auth URL
  └─ Redirects to provider (e.g., Google)
        │
        ▼
User authorizes in provider
        │
        ▼
/api/integrations/composio/callback
  └─ Verifies state signature
  └─ Polls Composio for ACTIVE status
  └─ Creates/updates workspace_integrations row
  └─ Auto-enables capture (if adapter exists)
  └─ Creates triggers in Composio
  └─ Redirects to /connections
```

### 2. API Key Connection Flow

Some connectors (Stripe, Shopify, etc.) use API keys instead of OAuth.

```
User enters API key in dialog
        │
        ▼
initiateApiKeyConnection()
  └─ Validates key format
  └─ Sends to Composio (key NEVER stored in Salt DB)
  └─ Creates workspace_integrations row
  └─ Auto-enables capture (if triggers exist)
```

**Security:** API keys go directly to Composio. Salt never stores, logs, or has access to the actual key value after the initial handoff.

**Required database configuration for API key connectors:**

| Table | Field | Value |
|-------|-------|-------|
| `connector_catalog` | `auth_method` | `'api_key'` |
| `connector_overrides` | `auth_config_id` | Composio auth config ID for API_KEY scheme |
| `connector_overrides` | `api_key_field_name` | Field name Composio expects (e.g., `'api_key'`, `'generic_api_key'`) |
| `connector_overrides` | `api_key_form` | JSON with `keyLabel`, `keyPlaceholder`, `extraFields` |
| `connector_catalog` | `meta.connectHelp` | Markdown instructions for getting the API key |

**Creating a Composio auth config for API key:**

```typescript
// Use Composio SDK to create an API_KEY auth config
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
const config = await composio.authConfigs.create("stripe", {
  type: "use_custom_auth",
  name: "Salt Stripe API Key",
  authScheme: "API_KEY",
});
console.log("Auth config ID:", config.id); // Use this in connector_overrides
```

**Example migration for adding API key connector:**

```sql
-- 1. Set auth method in catalog
UPDATE connector_catalog SET auth_method = 'api_key' WHERE provider_key = 'stripe';

-- 2. Configure overrides with auth config and form
UPDATE connector_overrides SET
  auth_config_id = 'ac_XXXXXX',
  api_key_field_name = 'api_key',
  api_key_form = '{"keyLabel": "API key", "keyPlaceholder": "sk_live_…", "extraFields": []}'::jsonb
WHERE provider_key = 'stripe';

-- 3. Add connect help instructions
UPDATE connector_catalog SET
  meta = jsonb_set(meta, '{connectHelp}', '"1. Go to Dashboard\n2. Copy API key\n3. Paste above"'::jsonb)
WHERE provider_key = 'stripe';
```

### 3. Database Schema

```sql
-- workspace_integrations
CREATE TABLE workspace_integrations (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  provider TEXT NOT NULL,              -- "gmail", "stripe", etc.
  is_active BOOLEAN DEFAULT true,
  capture_enabled BOOLEAN DEFAULT false,
  composio_connection_id TEXT,         -- Composio's connection UUID
  composio_status TEXT,                -- "connected", "expired", etc.
  config JSONB,                        -- { captureTriggerIds: [...], userEmail: "..." }
  last_error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (workspace_id, provider)
);
```

---

## Adding a New Connector

### Quick Checklist (OAuth Connectors)

1. [ ] Add entry to unified registry
2. [ ] Add category adapter (or extend existing)
3. [ ] Verify Composio triggers exist (or mark as backfill-only with empty `triggerSlugs: []`)
4. [ ] Test OAuth flow
5. [ ] Test capture pipeline

### Quick Checklist (API Key Connectors)

1. [ ] Create API_KEY auth config in Composio (`composio.authConfigs.create(...)`)
2. [ ] Add entry to unified registry with `authMethod: "api_key"`
3. [ ] Add migration for `connector_catalog` (auth_method) and `connector_overrides` (auth_config_id, api_key_field_name, api_key_form)
4. [ ] Add `connectHelp` markdown with step-by-step instructions
5. [ ] Test API key connect flow
6. [ ] Test capture pipeline (if triggers exist)

### Backfill-Only Connectors

Some connectors have no real-time triggers available in Composio:
- **QuickBooks**: No triggers — use Ask Salt read tools + periodic backfill
- **Calendly**: No triggers — poll events via cron
- **Google Sheets**: Triggers require a specific spreadsheet ID (impractical for general capture)

For these, set `triggerSlugs: []` in the registry. Capture happens via scheduled backfill jobs, not webhooks.

### Step 1: Add to Unified Registry

Edit `app/_lib/composio/unified-connector-registry.ts`:

```typescript
// In CONNECTOR_REGISTRY object:

linear: {
  providerKey: "linear",
  catalogId: "linear",
  category: "project_management",
  authMethod: "oauth",
  triggerSlugs: [
    "LINEAR_ISSUE_CREATED_TRIGGER",
    "LINEAR_ISSUE_UPDATED_TRIGGER",
  ],
  askSalt: { enabled: true, slugPrefix: "LINEAR_" },
  meta: {
    displayName: "Linear",
    tagline: "Track issues and projects.",
    developedBy: "Linear",
    links: [
      { label: "Website", href: "https://linear.app" },
      { label: "Documentation", href: "https://developers.linear.app" },
      { label: "Support", href: "https://linear.app/contact" },
    ],
  },
  phase: "released",
},
```

### Step 2: Audit and Find Available Triggers

**Before making ANY trigger changes**, run the audit script:

```bash
op run --env-file=.env.1password -- pnpm tsx .scratch/audit-connector-triggers.ts
```

This compares our registry against Composio's actual API and reports:
- ❌ Invalid triggers (configured but don't exist)
- ✅ Valid triggers (configured and exist)
- 💡 Available triggers we haven't enabled yet

**To query a specific toolkit:**

```bash
op run --env-file=.env.staging.1password -- npx tsx -e "
import { Composio } from '@composio/core';
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

async function main() {
  const result = await composio.triggers.listTypes({ limit: 500 });
  const matching = (result.items || [])
    .filter(t => t.slug?.startsWith('LINEAR_'))
    .map(t => t.slug);
  console.log('Available triggers:', matching);
}
main();
"
```

### Step 3: Create/Extend Category Adapter

If your connector's category already has an adapter, extend it. Otherwise, create one.

**Extending existing adapter** (`app/_features/capture/adapters/categories/project-management.ts`):

```typescript
type ProjectManagementProvider = "asana" | "linear" | "jira";

const PM_PROVIDERS: ProjectManagementProvider[] = ["asana", "linear", "jira"];

const PM_TRIGGER_SLUGS: Record<ProjectManagementProvider, string[]> = {
  asana: ["ASANA_TASK_CREATED", "ASANA_TASK_UPDATED"],
  linear: ["LINEAR_ISSUE_CREATED_TRIGGER", "LINEAR_ISSUE_UPDATED_TRIGGER"],
  jira: ["JIRA_NEW_ISSUE_TRIGGER", "JIRA_UPDATED_ISSUE_TRIGGER"],
};

// Add normalization function
function normalizeLinear(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId = record.id as string;
  if (!externalId) return null;

  return {
    sourceType: "linear" as CaptureSourceType,
    captureType: "task",
    externalId,
    title: record.title as string | null,
    occurredAt: record.createdAt as string | null,
    participants: [],
    threadId: record.projectId as string | null,
    extracted: {
      title: record.title,
      description: record.description,
      status: record.state?.name,
      assignee: record.assignee?.email,
    },
    raw: { source: "composio_trigger" },
    noise: null,
  };
}
```

**Creating new category adapter:**

```typescript
// app/_features/capture/adapters/categories/my-category.ts

import type { CaptureAdapter, CaptureEnvelope } from "../types";

type MyCategoryProvider = "provider1" | "provider2";

const PROVIDERS: MyCategoryProvider[] = ["provider1", "provider2"];

const TRIGGER_SLUGS: Record<MyCategoryProvider, string[]> = {
  provider1: ["PROVIDER1_EVENT_TRIGGER"],
  provider2: ["PROVIDER2_EVENT_TRIGGER"],
};

function normalize(payload: unknown): CaptureEnvelope | null {
  // Parse payload into standard envelope
}

export function createMyCategoryAdapter(provider: MyCategoryProvider): CaptureAdapter {
  return {
    sourceType: provider,
    toolkit: provider,
    triggerSlugs: TRIGGER_SLUGS[provider] ?? [],
    deriveSignals: (envelopes, context) => new Map(),
    normalize,
  };
}

export function getMyCategoryAdapter(provider: string): CaptureAdapter | null {
  if (!PROVIDERS.includes(provider as MyCategoryProvider)) return null;
  return createMyCategoryAdapter(provider as MyCategoryProvider);
}
```

**Register in categories index** (`app/_features/capture/adapters/categories/index.ts`):

```typescript
import { getMyCategoryAdapter } from "./my-category";

const CATEGORY_ADAPTERS: Partial<Record<ConnectorCategory, CategoryAdapterGetter>> = {
  // ... existing
  my_category: getMyCategoryAdapter,
};

// Add to listCategoryAdapters()
{ category: "my_category", providers: ["provider1", "provider2"] },
```

### Step 4: Add to Connector Catalog UI

The UI catalog is database-driven. Add via admin or migration:

```sql
INSERT INTO connector_catalog (
  id, provider_key, name, description, category, 
  ownership, auth_method, phase, show_in_catalog
) VALUES (
  'linear', 'linear', 'Linear', 'Track issues and projects.',
  'productivity', 'composio', 'oauth', '1a', true
);
```

### Step 5: Test the Flow

1. **OAuth Test**: Connect via UI, verify `workspace_integrations` row created
2. **Trigger Test**: Check `config.captureTriggerIds` populated
3. **Capture Test**: Send test event, verify `capture_events` row created

---

## Capture Adapters

### Architecture

```
Composio Webhook
        │
        ▼
/api/webhooks/composio (route.ts)
  └─ Verify HMAC signature
  └─ Extract trigger slug + payload
        │
        ▼
adapterForTriggerSlug(slug)
  └─ Looks up in BY_TRIGGER_SLUG map
  └─ Returns CaptureAdapter
        │
        ▼
adapter.normalize(payload)
  └─ Returns CaptureEnvelope
        │
        ▼
ingestEnvelope()
  └─ Gate pipeline (spam filter, entity lookup, scoring)
  └─ Insert into capture_events
```

### CaptureEnvelope Schema

```typescript
interface CaptureEnvelope {
  sourceType: CaptureSourceType;  // "gmail", "slack", etc.
  captureType: CaptureType;       // "message", "event", "payment", etc.
  externalId: string;             // Dedupe key
  title: string | null;
  occurredAt: string | null;      // ISO timestamp
  participants: EnvelopeParticipant[];
  threadId: string | null;        // For grouping related captures
  extracted: Record<string, unknown>;  // Provider-specific fields
  raw: Record<string, unknown>;   // Debug info
  noise: NoiseSignals | null;     // For spam detection
}
```

### Trigger vs Backfill

| Mode | How it works | Latency |
|------|--------------|---------|
| **Trigger** | Composio webhook fires on each event | Real-time |
| **Backfill** | Cron job polls API for recent items | Minutes to hours |

Connectors without Composio triggers (Calendly, Dropbox, QuickBooks) are backfill-only.

---

## Ask Salt Integration

### How It Works

1. User sends message to Ask Salt
2. System checks `ASK_SALT_CONNECTOR_MANIFEST` for enabled connectors
3. Loads Composio tools for each connected + enabled connector
4. AI uses tools to answer user's question

### Enabling Ask Salt for a Connector

In the unified registry, set:

```typescript
askSalt: {
  enabled: true,
  slugPrefix: "GMAIL_",  // Must match Composio tool prefix
},
```

### Tool Policy

Tools are classified by risk level in `app/_lib/composio/tool-policy.ts`:

| Risk | Examples | Approval |
|------|----------|----------|
| `read` | GMAIL_GET_MESSAGE | Auto-approved |
| `mutating` | GMAIL_SEND_EMAIL | Requires approval |
| `destructive` | GMAIL_DELETE_MESSAGE | Always blocked |

---

## Enrichment System

### How It Works

The enrichment system pulls data from connected sources to populate Memory records (People, Orgs, Work).

```
Entity Created (Person/Org/Work)
        │
        ▼
enrichEntity({ entityType, seed, workspaceId })
  └─ Determines relevant categories for entity type
  └─ Queries each connected source
  └─ Extracts and normalizes fields
        │
        ▼
applyEnrichmentToEntity()
  └─ Updates Memory record with extracted fields
```

### Category → Entity Field Mapping

Defined in `app/_lib/composio/enrichment/registry.ts`:

```typescript
const CATEGORY_PROVIDES_FIELDS: Record<ConnectorCategory, Partial<Record<EnrichableEntityType, string[]>>> = {
  email: {
    person: ["name", "phone", "title", "organization"],
    org: ["name", "domain"],
  },
  billing: {
    person: ["billing_email", "address"],
    org: ["billing_email", "address"],
    work: ["contract_value_cents", "payment_type"],
  },
  // ...
};
```

---

## Testing Connectors

### Unit Tests

```typescript
// app/_features/capture/adapters/categories/my-category.test.ts

import { describe, it, expect } from "vitest";
import { createMyCategoryAdapter } from "./my-category";

describe("my-category adapter", () => {
  const adapter = createMyCategoryAdapter("provider1");

  it("normalizes valid payload", () => {
    const payload = { id: "123", title: "Test" };
    const envelope = adapter.normalize(payload);
    
    expect(envelope).not.toBeNull();
    expect(envelope?.externalId).toBe("123");
    expect(envelope?.title).toBe("Test");
  });

  it("returns null for invalid payload", () => {
    expect(adapter.normalize(null)).toBeNull();
    expect(adapter.normalize({})).toBeNull();
  });
});
```

### Integration Tests

```bash
# Test OAuth flow
pnpm test:e2e --grep "connector"

# Test webhook handling
curl -X POST http://localhost:3000/api/webhooks/composio \
  -H "Content-Type: application/json" \
  -H "webhook-signature: test" \
  -d '{"trigger_slug": "GMAIL_NEW_GMAIL_MESSAGE", ...}'
```

### Staging Test

1. Deploy to staging
2. Connect via UI
3. Trigger real event in provider
4. Check `capture_events` in Supabase

---

## Troubleshooting

### No Captures Coming Through

1. **Check trigger registration**: Query `workspace_integrations.config.captureTriggerIds`
2. **Check webhook URL**: Verify Composio webhook points to staging/prod, not localhost
3. **Check adapter lookup**: Verify `adapterForTriggerSlug(slug)` returns adapter
4. **Check signature**: Verify `COMPOSIO_WEBHOOK_SECRET` matches Composio dashboard

### OAuth Fails

1. **Check auth config**: Verify Composio has Salt's OAuth client credentials
2. **Check state decoding**: Look for "signature verification failed" in logs
3. **Check callback URL**: Must match exactly what's registered with provider

### Ask Salt Can't Use Connector

1. **Check askSalt.enabled**: Must be `true` in registry
2. **Check connection**: Must be in `workspace_integrations` with `is_active = true`
3. **Check tool loading**: Look for errors in `load-ask-salt-tools.ts`

### Debug Commands

```bash
# List available triggers for an app
op run --env-file=.env.staging.1password -- npx tsx -e "
import { Composio } from '@composio/core';
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
const result = await composio.triggers.listTypes({ limit: 500 });
console.log(result.items?.filter(t => t.slug?.startsWith('SLACK_')));
"

# Check integration status
op run --env-file=.env.staging.1password -- npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await supabase.from('workspace_integrations').select('*').eq('provider', 'gmail');
console.log(data);
"

# List recent captures
op run --env-file=.env.staging.1password -- npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await supabase.from('capture_events').select('*').order('created_at', { ascending: false }).limit(10);
console.log(data);
"
```

---

## Trigger Audit Process

**Before making ANY trigger changes**, run the audit script to verify against Composio's actual API:

```bash
op run --env-file=.env.1password -- pnpm tsx .scratch/audit-connector-triggers.ts
```

The audit script:
1. Queries Composio for all available triggers per toolkit
2. Compares against `unified-connector-registry.ts`
3. Reports invalid triggers (configured but don't exist in Composio)
4. Suggests available triggers we haven't enabled

**Never guess at trigger slugs.** Always verify with the audit script first.

---

## Reference: Verified Trigger Configuration

*Last audited: 2026-07-13*

| Connector | Configured Triggers | Available | Status |
|-----------|---------------------|-----------|--------|
| Gmail | `GMAIL_NEW_GMAIL_MESSAGE` | 2 | ✅ Verified |
| Outlook | `OUTLOOK_EMAIL_TRIGGER`, `OUTLOOK_CALENDAR_EVENT_ADDED_TRIGGER` | 4 | ✅ Verified |
| Google Calendar | `GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER` | 7 | ✅ Verified |
| Google Drive | `GOOGLEDRIVE_FILE_CREATED_TRIGGER` | 7 | ✅ Verified |
| Google Docs | `GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER`, `GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER` | 10 | ✅ Verified |
| Google Sheets | `GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER` | 16 | ✅ Verified |
| Google Slides | `GOOGLESLIDES_SLIDE_ADDED_TRIGGER` | 1 | ✅ Verified |
| Slack | `SLACK_CHANNEL_MESSAGE_RECEIVED`, `SLACK_DIRECT_MESSAGE_RECEIVED` | 9 | ✅ Verified |
| HubSpot | `HUBSPOT_NEW_CONTACT_TRIGGER`, `HUBSPOT_NEW_DEAL_TRIGGER` | 2 | ✅ Verified |
| Notion | `NOTION_PAGE_CREATED`, `NOTION_PAGE_CONTENT_UPDATED` | 8 | ✅ Verified |
| Stripe | 7 triggers (payment events) | 7 | ✅ Verified |
| Calendly | None (backfill-only) | 0 | ✅ Correct |
| QuickBooks | None (backfill-only) | 0 | ✅ Correct |
| Dropbox | None (backfill-only) | 0 | ✅ Correct |

### Backfill-Only Connectors

These connectors have no real-time triggers available in Composio:

| Connector | Reason | Alternative |
|-----------|--------|-------------|
| QuickBooks | No Composio triggers | Periodic API polling via cron |
| Calendly | No Composio triggers | Periodic API polling via cron |
| Dropbox | No Composio triggers | Periodic API polling via cron |
| Cal.com | No Composio triggers | Periodic API polling via cron |

### Triggers Requiring Configuration

Some triggers exist but require specific configuration (spreadsheet ID, search query, etc.) making them impractical for Salt's "connect once, capture everything" model:

| Trigger | Required Config | Why Not Used |
|---------|-----------------|--------------|
| `GOOGLESHEETS_NEW_ROWS_TRIGGER` | Specific spreadsheet ID | Can only watch 1 sheet |
| `GOOGLESHEETS_CELL_RANGE_VALUES_CHANGED_TRIGGER` | Spreadsheet ID + range | Can only watch 1 range |
| `GOOGLEDRIVE_NEW_FILE_MATCHING_QUERY_TRIGGER` | Search query | Requires user configuration |

---

## Reference: Connector Summary

| Provider | Category | Triggers | Ask Salt | Phase |
|----------|----------|----------|----------|-------|
| gmail | email | 1 | ✅ | released |
| outlook | email | 2 | ✅ | released |
| googlecalendar | calendar | 1 | ✅ | released |
| calendly | calendar | 0 | ❌ | beta |
| cal | calendar | 0 | ❌ | beta |
| googledrive | storage | 1 | ✅ | released |
| dropbox | storage | 0 | ❌ | beta |
| stripe | billing | 7 | ✅ | released |
| quickbooks | billing | 0 | ❌ | beta |
| hubspot | crm | 2 | ❌ | beta |
| salesforce | crm | 0 | ❌ | coming_soon |
| slack | communication | 2 | ❌ | released |
| notion | documents | 2 | ❌ | beta |
| googledocs | documents | 2 | ✅ | released |
| googlesheets | documents | 1 | ✅ | released |
| googleslides | documents | 1 | ✅ | released |
