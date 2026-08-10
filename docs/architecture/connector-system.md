# Connector System Architecture

**Last Updated:** 2026-08-07

Salt's connector system enables users to connect third-party services (Gmail, Stripe, Slack, etc.) for data capture, AI-assisted actions, and enrichment. This document covers the architecture and how to add new connectors with velocity.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Decision: DB-Backed Registry](#architecture-decision-db-backed-registry)
3. [Adding a New Connector](#adding-a-new-connector) ← **Start here**
4. [Capture Adapters](#capture-adapters)
5. [Ask Salt Integration](#ask-salt-integration)
6. [Enrichment System](#enrichment-system)
7. [Testing Connectors](#testing-connectors)
8. [Troubleshooting](#troubleshooting)
9. [Trigger Audit Process](#trigger-audit-process)
10. [Reference: Verified Trigger Configuration](#reference-verified-trigger-configuration)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (Source of Truth)                           │
│                                                                              │
│   connector_catalog     1,089 toolkits synced from Composio                 │
│   connector_overrides   Salt metadata: featured, auth_config_id, tier       │
│   tool_classifications  Risk class + approval requirements                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐            ┌───────────────┐
│   CAPTURE     │           │   ASK SALT    │            │  ENRICHMENT   │
│   ADAPTERS    │           │   TOOLS       │            │   REGISTRY    │
│               │           │               │            │               │
│ Category-based│           │ AI tool       │            │ Field mapping │
│ generic extract│          │ access list   │            │ by category   │
└───────────────┘           └───────────────┘            └───────────────┘
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐            ┌───────────────┐
│   Sources     │           │  Ask Salt     │            │   Memory      │
│   Activity    │           │  Chat + Tools │            │   Records     │
└───────────────┘           └───────────────┘            └───────────────┘
```

### Key Principles

1. **Database as Source of Truth** — Connector catalog synced from Composio nightly
2. **Category-Based Adapters** — Adapters accept ANY provider in their category (generic extraction)
3. **Scalable by Default** — Add connectors via DB; no code changes needed
4. **Composio Backend** — OAuth and API execution handled by Composio SDK

### Key Files

| File | Purpose |
|------|---------|
| `app/_lib/composio/connector-registry.ts` | **DB-backed registry** (reads from `connector_catalog` + `connector_overrides`, 5-min cache; fails closed on DB outage with no cache) |

> The code-first `unified-connector-registry.ts` fallback was **deleted 2026-08-08** — the DB is the only registry.
| `app/_lib/composio/classification-store.ts` | Tool classification lookup (DB + heuristic fallback) |
| `app/_lib/composio/tool-classification-heuristics.ts` | Auto-classify tools by slug pattern |
| `app/_lib/composio/connections.ts` | OAuth initiate/callback/disconnect |
| `app/_lib/composio/trigger-subscriptions.ts` | Create/delete Composio triggers |
| `app/_features/capture/adapters/registry.ts` | Route triggers to adapters |
| `app/_features/capture/adapters/categories/` | Category-based capture adapters |
| `app/_features/sources/` | Sources surface shell — hosts the connector UI at `/sources` |
| `app/_lib/composio/enrichment/registry.ts` | Category → field mapping |
| `app/_features/connectors/` | UI components and queries |

### Key Database Tables

| Table | Purpose |
|-------|---------|
| `connector_catalog` | All Composio apps (synced nightly) |
| `connector_overrides` | Salt metadata: phase, featured, auth config ID |
| `connector_trigger_types` | Available triggers per toolkit |
| `tool_classifications` | Risk class, approval requirements |
| `workspace_integrations` | User connections per workspace |
| `workspace_tool_preferences` | Per-tool approval overrides (Trust mode) |
| `connector_rules` | Workspace allow/deny rules ("Always let in" / "Keep out") — see Capture Rules below |
| `connector_entity_profiles` | Workspace-learned entity reputation (P6) |

---

## Architecture Decision: DB-Backed Registry

**Decision Date:** 2026-07-13  
**Updated:** 2026-08-08 (code fallback deleted; DB-only, fails closed)

### Current Approach: Database as Source of Truth

The connector registry lives in the database, served through a 5-minute in-memory cache:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMPOSIO API                                    │
│                       1,089 toolkits, 3000+ tools                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Nightly sync cron
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (Source of Truth)                           │
│                                                                              │
│   connector_catalog      - All Composio apps (synced nightly)               │
│   connector_overrides    - Salt-specific metadata (phase, featured, etc.)   │
│   connector_trigger_types - Available triggers per toolkit                  │
│   tool_classifications   - Risk class + approval requirements               │
│   workspace_integrations - User connections                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 5-minute cache
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   connector-registry.ts  - DB-backed registry (5-min cache, fails closed)   │
│   classification-store.ts - Tool classification with heuristic fallback     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why DB-backed?

| Layer | Source | Fallback | Why |
|-------|--------|----------|-----|
| **Connector catalog** | DB (`connector_catalog`) | Stale in-memory cache (5-min TTL) | 1,089 toolkits synced |
| **Tool classification** | DB (`tool_classifications`) | Heuristics (`tool-classification-heuristics.ts`) | Auto-classify new tools |
| **Trigger subscriptions** | DB (`connector_trigger_types`) | — | Enable new triggers without deploy |
| **Auth configs** | DB (`connector_overrides.auth_config_id`), optional env-var override | — | Per-environment when needed |
| **User connections** | DB (`workspace_integrations`) | — | User data, must persist |

There is no code fallback: if the DB read fails and no warm cache exists, the registry **fails closed** (nothing can connect — the safe direction).

### Auth Config Resolution

Auth config IDs (required for Composio OAuth) live on `connector_overrides` and resolve in `connector-registry.ts#resolveAuthConfigId`:

1. If `auth_config_env_var` is set and that env var exists (`.env.1password` / Vercel), the env value wins — use this for per-environment overrides.
2. Otherwise the pinned `auth_config_id` is used.

```sql
UPDATE connector_overrides
SET auth_config_id = 'ac_xxx',               -- pinned default
    auth_config_env_var = 'COMPOSIO_AUTH_CONFIG_GMAIL'  -- optional env override
WHERE provider_key = 'gmail';
```

### What Lives Where

| Data | Location | Why |
|------|----------|-----|
| Connector definitions | DB (`connector_catalog` + `connector_overrides`) | 1,089 toolkits — code doesn't scale |
| Auth config IDs | DB (`auth_config_id`), env override via `auth_config_env_var` | Per-environment when needed |
| User connections | DB (`workspace_integrations`) | User data, must persist |
| Tool classifications | DB (`tool_classifications`) | Large dataset, Composio-synced |

---

## Connector Categories

Category adapters accept ANY provider in their category. Known providers get specific parsing; unknown providers get generic extraction.

```typescript
type ConnectorCategory =
  | "email"              // Gmail, Outlook, Zoho Mail, ProtonMail, ...
  | "calendar"           // Google Calendar, Calendly, Cal.com, ...
  | "billing"            // Stripe, QuickBooks, Wave, ...
  | "crm"                // HubSpot, Salesforce, Pipedrive, ...
  | "meetings"           // Fireflies, Otter, ...
  | "documents"          // Notion, Google Docs/Sheets/Slides, ...
  | "storage"            // Google Drive, Dropbox, OneDrive, ...
  | "project_management" // Asana, Linear, Jira, Trello, Monday, ...
  | "communication";     // Slack, Discord, ...
```

### Key Registry Functions

```typescript
// DB-backed registry (app/_lib/composio/connector-registry.ts)
await getConnectorRegistryEntry("gmail")     // → ConnectorRegistryEntry | null
await listCatalogEntries()                   // → All visible connectors
await listFeaturedEntries()                  // → Salt-curated connectors
await listConnectableEntries()               // → Connectors with auth config

// Category lookup (app/_lib/composio/enrichment/registry.ts)
getCategoryForConnector("gmail")             // → "email"

// Category adapters (app/_features/capture/adapters/categories/)
getEmailAdapter("protonmail")                // → CaptureAdapter (generic)
getAdapterForCategory("email", "zoho_mail")  // → CaptureAdapter (generic)
```

---

## Connector Lifecycle

### 1. OAuth Connection Flow

```
User clicks "Connect"
        │
        ▼
initiateConnection()
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
  └─ Redirects to /sources
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

### Quick Start (Scalable Approach - No Code Required)

As of Phase 4 (2026-07-13), category adapters accept ANY provider in their category. For most connectors, you only need database changes:

**1. Enable an existing Composio connector (DB only):**

```sql
-- Add to connector_catalog (or update if synced from Composio)
INSERT INTO connector_catalog (provider_key, toolkit_slug, name, description, category, auth_method, meta)
VALUES (
  'zoho_mail',
  'zoho_mail', 
  'Zoho Mail',
  'Email for business — read and send with your approval',
  'email',  -- Category determines which adapter handles it
  'oauth',
  '{"showInCatalog": true, "phase": "2"}'::jsonb
) ON CONFLICT (provider_key) DO UPDATE SET
  meta = connector_catalog.meta || '{"showInCatalog": true}'::jsonb;

-- Add override with auth config
INSERT INTO connector_overrides (provider_key, tier, auth_config_id, featured)
VALUES ('zoho_mail', 'capture', 'your-composio-auth-config-id', false);
```

**2. Verify it works:**
- The email category adapter will automatically handle Zoho Mail payloads
- Generic extraction pulls common fields (id, subject, from, to, timestamp)
- No code changes needed

**How it works:**
- `getCategoryForConnector("zoho_mail")` returns `"email"` from DB
- `getEmailAdapter("zoho_mail")` returns a generic email adapter
- Generic normalizer extracts common email fields

### When Code IS Required

Add provider-specific code only when:
- Generic extraction misses important fields
- Payload structure is non-standard
- You need custom signal derivation

```typescript
// In app/_features/capture/adapters/categories/email.ts
// Add to the switch statement in createEmailCategoryAdapter():

case "zoho_mail":
  return normalizeZohoMail(payload);  // Custom parser

// Add normalizer function:
function normalizeZohoMail(payload: unknown): CaptureEnvelope | null {
  // Custom parsing for Zoho-specific payload structure
}
```

### Quick Checklist (OAuth Connectors)

1. [ ] Add entry to `connector_catalog` with correct `category`
2. [ ] Add `connector_overrides` with `auth_config_id`
3. [ ] Set `showInCatalog: true` in meta to make visible in UI
4. [ ] Test OAuth flow
5. [ ] Test capture pipeline (generic extraction works automatically)
6. [ ] (Optional) Add custom normalizer if generic extraction insufficient

### Quick Checklist (API Key Connectors)

1. [ ] Create API_KEY auth config in Composio (`composio.authConfigs.create(...)`)
2. [ ] Add entry to `connector_catalog` with `auth_method: 'api_key'`
3. [ ] Add `connector_overrides` with `auth_config_id`, `api_key_field_name`, `api_key_form`
4. [ ] Add `connectHelp` in meta with step-by-step instructions
5. [ ] Set `showInCatalog: true` in meta
6. [ ] Test API key connect flow
7. [ ] Test capture pipeline

### Backfill-Only Connectors

Some connectors have no real-time triggers available in Composio:
- **QuickBooks**: No triggers — use Ask Salt read tools + periodic backfill
- **Calendly**: No triggers — poll events via cron
- **Google Sheets**: Triggers require a specific spreadsheet ID (impractical for general capture)

For these, set `triggerSlugs: []` in the registry. Capture happens via scheduled backfill jobs, not webhooks.

### Step 1: Add to Database

Add to `connector_catalog` and `connector_overrides`:

```sql
-- 1. Add to catalog (or verify it's synced from Composio)
INSERT INTO connector_catalog (provider_key, toolkit_slug, name, description, category, auth_method, meta)
VALUES (
  'linear',
  'linear', 
  'Linear',
  'Track issues and projects.',
  'project_management',
  'oauth',
  '{"showInCatalog": true, "tagline": "Track issues and projects.", "developedBy": "Linear"}'::jsonb
) ON CONFLICT (provider_key) DO UPDATE SET
  meta = connector_catalog.meta || '{"showInCatalog": true}'::jsonb;

-- 2. Add override with auth config and Ask Salt exposure
INSERT INTO connector_overrides (provider_key, tier, auth_config_id, ask_salt_slug_prefix, ask_salt_label)
VALUES ('linear', 'capture', 'your-composio-auth-config-id', 'LINEAR_', 'Linear');

-- 3. Add trigger types (if any)
INSERT INTO connector_trigger_types (toolkit_slug, trigger_slug, is_enabled)
VALUES 
  ('linear', 'LINEAR_ISSUE_CREATED_TRIGGER', true),
  ('linear', 'LINEAR_ISSUE_UPDATED_TRIGGER', true);
```

### Step 2: Audit Available Triggers

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

### Step 3: Custom Adapter (Optional)

> **Note:** As of Phase 4, category adapters accept ANY provider with generic extraction.
> You only need custom code if generic extraction is insufficient.

**Check if generic extraction works first:**

```typescript
import { getProjectManagementAdapter } from "./adapters/categories/project-management";

const adapter = getProjectManagementAdapter("linear");
const envelope = adapter.normalize(samplePayload);
console.log(envelope);  // Check if fields are extracted correctly
```

**Add custom normalizer only if needed:**

```typescript
// In app/_features/capture/adapters/categories/project-management.ts
// Add to the normalize switch statement:

case "linear":
  return normalizeLinear(payload);  // Custom parser

// Add normalizer:
function normalizeLinear(payload: unknown): CaptureEnvelope | null {
  // Custom parsing for Linear-specific fields
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

**Creating new category adapter (rarely needed):**

> **Note:** As of Phase 4, new category adapters are rarely needed. Existing adapters
> accept any provider in their category with generic extraction. Only create a new
> category adapter if you're adding an entirely new category (not email, calendar,
> billing, storage, crm, meetings, documents, project_management, or communication).

```typescript
// app/_features/capture/adapters/categories/my-category.ts

import type { CaptureAdapter, CaptureEnvelope } from "../types";

type KnownMyCategoryProvider = "provider1" | "provider2";

const KNOWN_PROVIDERS: KnownMyCategoryProvider[] = ["provider1", "provider2"];

function isKnownProvider(p: string): p is KnownMyCategoryProvider {
  return KNOWN_PROVIDERS.includes(p as KnownMyCategoryProvider);
}

const TRIGGER_SLUGS: Record<KnownMyCategoryProvider, string[]> = {
  provider1: ["PROVIDER1_EVENT_TRIGGER"],
  provider2: ["PROVIDER2_EVENT_TRIGGER"],
};

function normalizeGeneric(payload: unknown, sourceType: string): CaptureEnvelope | null {
  // Generic extraction for unknown providers
}

export function createMyCategoryAdapter(provider: string): CaptureAdapter {
  return {
    sourceType: provider,
    toolkit: provider,
    triggerSlugs: isKnownProvider(provider) ? TRIGGER_SLUGS[provider] : [],
    deriveSignals: (envelopes, context) => new Map(),
    normalize: (payload) => normalizeGeneric(payload, provider),
  };
}

// Always returns an adapter — never null
export function getMyCategoryAdapter(provider: string): CaptureAdapter {
  return createMyCategoryAdapter(provider);
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

### Scalable Design (Phase 4)

Category adapters accept ANY provider in their category:

```typescript
// Known provider → specific parsing
getEmailAdapter("gmail")        // → Gmail-specific normalizer

// Unknown provider → generic extraction  
getEmailAdapter("protonmail")   // → Generic email normalizer
getEmailAdapter("zoho_mail")    // → Generic email normalizer
```

This means you can add new email connectors (Zoho, ProtonMail, FastMail) without writing adapter code. Generic extraction pulls common fields (id, subject, from, to, timestamp).

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
getCategoryForConnector(provider)
  └─ Returns category from DB (e.g., "email")
        │
        ▼
getAdapterForCategory(category, provider)
  └─ Returns category adapter (generic or specific)
        │
        ▼
adapter.normalize(payload)
  └─ Returns CaptureEnvelope (generic extraction if unknown)
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
  noise: CaptureNoiseInput | null;  // For spam detection
}
```

### Trigger vs Backfill

| Mode | How it works | Latency |
|------|--------------|---------|
| **Trigger** | Composio webhook fires on each event | Real-time |
| **Backfill** | Cron job polls API for recent items | Minutes to hours |

Connectors without Composio triggers (Calendly, Dropbox, QuickBooks) are backfill-only.

---

## Capture Rules & Learning (2026-08-10)

User-managed intake policy lives in two layers, both workspace-keyed (never
in `connector_overrides` — that's the global Salt catalog):

### Rules primitive (`connector_rules`)

`app/_features/capture/services/rules-manager.ts` owns CRUD + evaluation
over `connector_rules`: rows are `(workspace, provider|NULL, rule_type,
entity_type, entity_key)` with `rule_type ∈ {allow, deny}`. `entity_type` is
a **category-defined vocabulary** (`sender_email`, `domain`, `organizer`,
`channel`, …) — each capture-category adapter implements
`extractFeedbackEntity(envelope)` once, and the gate, corrections, and
learned profiles all consume that single extraction
(`adapters/feedback-entity.ts`).

**Gate order:** rules run FIRST in the gate pipeline, before every
heuristic — explicit deny > explicit allow > heuristics. A deny match drops
the capture; an allow match signals it at full prominence, bypassing the
memory-first hold. Provider-scoped rows beat workspace-wide (`provider
NULL`) rows; deny beats allow at the same scope. `sender_pattern` rules
glob-match against pattern candidates (e.g. sender display name), never
the entity key.

The legacy workspace blocklist is preserved as a **facade**:
`blocklist-manager.ts` keeps its exported API but delegates to
rules-manager over workspace-wide deny rows; `capture_blocklist` was
backfilled into `connector_rules` by migration
`20260810120000_connector_rules.sql`.

User-facing copy is "Always let in" / "Keep out" on the connector detail
pane's **Customize** tab (`connectors/actions/rules.ts`); engineering
vocabulary stays "rules".

### Learned entity profiles (P6)

Implicit feedback (Kept-Out corrections, Watching/Kept-Out decisions)
adjusts a per-entity reputation via
`app/_features/capture/services/entity-profiles.ts`: `sender_email`
delegates to `capture_sender_profiles`; every other entity type uses
`connector_entity_profiles`. The admission gate reads the reputation as an
`entity_reputation` signal (+20 at ≥70, −20 at ≤30). See
`app/_features/capture/CLAUDE.md`.

### Trigger selection (P7)

For multi-slug providers whose triggers take zero config, per-connection
scoping is the subscribed-slug set itself — see "Per-connection scoping" in
`docs/architecture/connector-platform.md`.

---

## Ask Salt Integration

### How It Works

1. User sends message to Ask Salt
2. System checks `connector_overrides.ask_salt_slug_prefix` for enabled connectors
3. Loads Composio tools for each connected + enabled connector
4. AI uses tools to answer user's question

### Enabling Ask Salt for a Connector

In `connector_overrides`, set:

```sql
UPDATE connector_overrides
SET ask_salt_slug_prefix = 'GMAIL_',
    ask_salt_label = 'Gmail'
WHERE provider_key = 'gmail';
```

Or via the DB-backed registry:

```typescript
// Check if connector is Ask Salt enabled
const entries = await listAskSaltEntries();
// Returns connectors with ask_salt_slug_prefix set
```

### Tool Policy

Tools are auto-classified by slug pattern in `app/_lib/composio/tool-classification-heuristics.ts`:

| Risk | Pattern | Examples | Execution |
|------|---------|----------|-----------|
| `read` | GET_*, LIST_*, SEARCH_* | GMAIL_GET_MESSAGE | Auto-execute |
| `mutating` | CREATE_*, SEND_*, UPDATE_* | GMAIL_SEND_EMAIL | Depends on trust level |
| `destructive` | DELETE_*, REMOVE_* | GMAIL_DELETE_MESSAGE | Never execute |

See `docs/architecture/tool-classification.md` for the full classification system.

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

### Verify New Connector Works (Quick Check)

Run the adapter tests to confirm the infrastructure handles any provider:

```bash
# Run all adapter tests (includes generic adapter tests)
pnpm test app/_features/capture/adapters --run

# Expected output includes:
# ✓ email adapter accepts unknown provider and returns generic adapter
# ✓ generic adapter can normalize a basic payload
```

### Test a Specific Provider

```typescript
// Quick verification in Node REPL or test file
import { getEmailAdapter } from "./app/_features/capture/adapters/categories/email";

const adapter = getEmailAdapter("zoho_mail");
console.log(adapter.sourceType);  // "zoho_mail"

const envelope = adapter.normalize({
  id: "msg-123",
  subject: "Test email from Zoho",
  from: "sender@example.com",
});
console.log(envelope?.externalId);  // "msg-123"
console.log(envelope?.title);       // "Test email from Zoho"
```

### Unit Tests

```typescript
// app/_features/capture/adapters/categories/my-category.test.ts

import { describe, it, expect } from "vitest";
import { createMyCategoryAdapter } from "./my-category";

describe("my-category adapter", () => {
  it("accepts any provider and returns working adapter", () => {
    const adapter = createMyCategoryAdapter("unknown_provider");
    expect(adapter).not.toBeNull();
    expect(adapter.sourceType).toBe("unknown_provider");
  });

  it("normalizes valid payload", () => {
    const adapter = createMyCategoryAdapter("provider1");
    const payload = { id: "123", title: "Test" };
    const envelope = adapter.normalize(payload);
    
    expect(envelope).not.toBeNull();
    expect(envelope?.externalId).toBe("123");
    expect(envelope?.title).toBe("Test");
  });

  it("returns null for invalid payload", () => {
    const adapter = createMyCategoryAdapter("provider1");
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
2. Compares against our configured trigger set
3. Reports invalid triggers (configured but don't exist in Composio)
4. Suggests available triggers we haven't enabled

> ⚠️ `.scratch/audit-connector-triggers.ts` still imports the deleted `unified-connector-registry.ts` — it does not run as-is. The live drift guard is the daily catalog-sync cron's schema-drift watch (`trigger_schema_changed` sync events, Sources plan 5.8); rewrite the script against `connector_trigger_types` if a manual audit is needed.

**Never guess at trigger slugs.** Always verify against Composio's API first.

---

## Reference: Verified Trigger Configuration

*Last audited: 2026-07-13*

| Connector | Configured Triggers | Available | Status |
|-----------|---------------------|-----------|--------|
| Gmail | `GMAIL_NEW_GMAIL_MESSAGE` | 2 | ✅ Verified |
| Outlook | `OUTLOOK_MESSAGE_TRIGGER`, `OUTLOOK_SENT_MESSAGE_TRIGGER` | 4 | ✅ Verified |
| Google Calendar | `GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER` | 7 | ✅ Verified |
| Google Drive | `GOOGLEDRIVE_FILE_CREATED_TRIGGER` | 7 | ✅ Verified |
| Google Docs | `GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER`, `GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER` | 10 | ✅ Verified |
| Google Sheets | `GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER` | 16 | ✅ Verified |
| Google Slides | `GOOGLESLIDES_SLIDE_ADDED_TRIGGER` | 1 | ✅ Verified |
| Slack | `SLACK_CHANNEL_MESSAGE_RECEIVED`, `SLACK_DIRECT_MESSAGE_RECEIVED` | 9 | ✅ Verified |
| HubSpot | `HUBSPOT_CONTACT_CREATED_TRIGGER`, `HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER` | 2 | ✅ Verified |
| Notion | `NOTION_PAGE_CREATED`, `NOTION_PAGE_CONTENT_UPDATED` | 8 | ✅ Verified |
| Stripe | `STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER`, `STRIPE_CHECKOUT_SESSION_COMPLETED_TRIGGER`, `STRIPE_SUBSCRIPTION_ADDED_TRIGGER`, `STRIPE_SUBSCRIPTION_DELETED_TRIGGER`, `STRIPE_CHARGE_FAILED_TRIGGER` | 7+ | ✅ Verified |
| Salesforce | `SALESFORCE_ACCOUNT_CREATED_OR_UPDATED_TRIGGER`, `SALESFORCE_CONTACT_UPDATED_TRIGGER`, `SALESFORCE_LEAD_CREATED_OR_UPDATED_TRIGGER`, `SALESFORCE_OPPORTUNITY_UPDATED_TRIGGER` | 4+ | ⏸ Registry only (`coming_soon`) |
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

> **Canonical source:** the DB — `connector_catalog` + `connector_overrides` (read via `app/_lib/composio/connector-registry.ts`). This table is a point-in-time snapshot (2026-07-13); the DB has since grown well beyond these rows.
>
> **Triggers** = count of trigger slugs Salt configures for capture. **Ask Salt** = `ask_salt_slug_prefix` set. **Phase** = rollout status (`coming_soon` flag / `meta.phase`).

| Provider | Category | Triggers | Ask Salt | Phase |
|----------|----------|----------|----------|-------|
| gmail | email | 1 | ✅ | released |
| outlook | email | 2 | ✅ | beta |
| googlecalendar | calendar | 1 | ✅ | released |
| calendly | calendar | 0 | ✅ | beta |
| cal | calendar | 0 | ✅ | beta |
| googledrive | storage | 1 | ✅ | released |
| dropbox | storage | 0 | ✅ | beta |
| stripe | billing | 5 | ✅ | released |
| quickbooks | billing | 0 | ✅ | beta |
| hubspot | crm | 2 | ✅ | beta |
| salesforce | crm | 4* | ❌ | coming_soon |
| slack | communication | 2 | ✅ | beta |
| notion | documents | 2 | ✅ | beta |
| googledocs | documents | 2 | ✅ | released |
| googlesheets | documents | 1 | ✅ | released |
| googleslides | documents | 1 | ✅ | released |

\*Salesforce triggers are defined in the registry but capture is not shipped yet (`coming_soon`, Ask Salt disabled).

---

## Appendix: DB Schema Reference

### Why User Connections Won't Break

User connections are stored in `workspace_integrations`, not in the registry:

```sql
-- This table stays the same regardless of registry source
workspace_integrations (
  workspace_id,
  provider,           -- "gmail", "stripe", etc.
  composio_connection_id,
  is_active,
  ...
)
```

The registry defines WHAT connectors exist. The integrations table stores WHO is connected. Changing the registry source doesn't touch user data.

### DB Schema (live since 2026-07-13)

These tables ARE the registry now:

```sql
-- Connector definitions (synced from Composio + manual additions)
connector_catalog (
  provider_key TEXT PRIMARY KEY,  -- "gmail"
  toolkit_slug TEXT,              -- "gmail" (Composio toolkit)
  name TEXT,                      -- "Gmail"
  description TEXT,
  category TEXT,                  -- "email"
  auth_method TEXT,               -- "oauth" | "api_key" | "no_auth"
  coming_soon BOOLEAN,
  logo_url TEXT,
  meta JSONB                      -- Display copy, links, etc.
)

-- Salt-specific overrides (tier, auth config, Ask Salt exposure)
connector_overrides (
  provider_key TEXT PRIMARY KEY REFERENCES connector_catalog,
  tier TEXT,                      -- "catalog_only" | "action" | "capture"
  auth_config_id TEXT,            -- Composio auth config ID
  auth_config_env_var TEXT,       -- Env var name for per-environment override
  ask_salt_slug_prefix TEXT,      -- "GMAIL_" for tool filtering
  ask_salt_label TEXT             -- Display name in Ask Salt
)
```

### Catalog Sync

The catalog is maintained by the daily `/api/cron/connector-catalog-sync` cron (`app/_lib/composio/catalog-sync.ts`), which upserts toolkits/triggers from the Composio API and flags schema drift via `connector_sync_events` (`trigger_schema_changed`, Sources plan 5.8). Salt metadata (tier, auth config, Ask Salt exposure) is curated via migrations against `connector_overrides`. The old code-registry seed script (`scripts/generate-connector-seed.ts`) was deleted with the code registry.

### Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-13 | Code-first registry | 15 connectors, small team, simplicity wins |
| 2026-07-13 | Migrate to DB-backed registry | Same day — `connector_catalog` + `connector_overrides` became source of truth |
| 2026-08-08 | Delete code fallback | `unified-connector-registry.ts` removed; registry fails closed on DB outage |
