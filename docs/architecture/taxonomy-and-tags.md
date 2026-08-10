# Taxonomy and Tags Architecture

Salt uses a unified vocabulary system for all categorization fields plus a flexible workspace-scoped tags layer for user/AI customization.

## Overview

Two complementary systems:

1. **Vocabularies (Static)**: Controlled vocabularies for structured fields like relationship type, work status, project stage, etc. These live in code and are the same for all workspaces.

2. **Tags (Dynamic)**: Workspace-scoped labels for people, orgs, and work that users or Salt AI can create. These live in the database.

## Vocabulary Registry

Location: `app/_features/memory/taxonomy/registry.ts`

### Shape

Each vocabulary value follows this shape:

```typescript
interface VocabularyValue {
  slug: string;           // Stable identifier (e.g., "client")
  label: string;          // Display name (e.g., "Client")
  aiDescription: string;  // Natural language for AI context
  scope: string;          // Which entity types can use this
  category: string;       // Logical grouping
  sortOrder: number;      // Display order
  isSystem: boolean;      // System-defined (true) vs user-created (future)
}
```

### Available Vocabularies

| Key | Purpose | Example Values |
|-----|---------|----------------|
| `relationship_type` | Person/org relationship to workspace | client, prospect, partner |
| `work_status` | Work item status | active, completed, paused |
| `work_type` | Type of work | project, retainer, one-off |
| `project_stage` | Stage in project lifecycle | discovery, proposal, active |
| `retainer_stage` | Stage in retainer lifecycle | trial, active, renewing |
| `service_category` | Service offering categories | strategy, design, development |
| `currency` | Monetary currencies | USD, EUR, GBP |
| `payment_terms` | Payment timing | due_on_receipt, net_30 |
| `billing_cycle` | Recurring billing periods | monthly, quarterly, yearly |
| `country` | Countries | US, CA, GB |
| `timezone` | Timezones | America/New_York, Europe/London |

### Validation Helpers

```typescript
import {
  isValidVocabularyValue,
  getVocabularyValue,
  getVocabularyLabel,
  getVocabularyOptions,
} from '@/app/_features/memory/taxonomy/registry';

// Check if a value is valid
isValidVocabularyValue("relationship_type", "client"); // true

// Get full value object
const client = getVocabularyValue("relationship_type", "client");

// Get display label
getVocabularyLabel("work_status", "active"); // "Active"

// Get options for select dropdowns
const options = getVocabularyOptions("relationship_type");
// [{ value: "client", label: "Client" }, ...]
```

## Field Registry

Location: `app/_features/memory/taxonomy/field-registry.ts`

Maps every profile field to its type, vocabulary (if any), and keeper signal behavior.

```typescript
const PERSON_FIELDS: FieldDescriptor[] = [
  {
    key: "relationship_type",
    label: "Relationship",
    type: "select",
    vocabulary: "relationship_type",
    keeperSignal: "infer",
    scope: "person",
  },
  // ...
];
```

## Tags System

Location: `app/_features/memory/tags/`

### Database Schema

```sql
-- Workspace-scoped tag definitions
CREATE TABLE workspace_tags (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  slug TEXT NOT NULL,           -- Normalized identifier
  label TEXT NOT NULL,          -- Display name
  scope TEXT NOT NULL,          -- 'person' | 'org' | 'work' | 'billing' | 'file' | 'all'
  category TEXT NOT NULL,       -- 'segment' | 'signal' | 'priority' | 'custom'
  ai_description TEXT,          -- Natural language for AI
  is_system BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  UNIQUE(workspace_id, slug)
);

-- Tag assignments to entities
CREATE TABLE entity_tag_assignments (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  tag_id UUID REFERENCES workspace_tags(id),
  entity_type TEXT NOT NULL,    -- 'person' | 'org' | 'work' | 'billing'
  entity_id UUID NOT NULL,
  source TEXT NOT NULL,         -- 'manual' | 'care' | 'system' ('keeper' rows normalized to 'care' 2026-08-07)
  confidence FLOAT,             -- 0-1, only for care/system
  because TEXT,                 -- AI reasoning
  source_ref TEXT,              -- Reference to source (meeting_id, etc.)
  UNIQUE(workspace_id, tag_id, entity_type, entity_id)
);
```

### Tag Normalization

Tags are normalized to stable slugs:

```typescript
import { normalizeTagSlug } from '@/app/_features/memory/tags/normalize';

normalizeTagSlug("VIP Clients");   // "vip-client"
normalizeTagSlug("Start-Up");      // "startup"
normalizeTagSlug("agencies");      // "agency"
```

Normalization rules:
- Lowercase
- Kebab-case (spaces/underscores become hyphens)
- Singularize (clients → client, agencies → agency)
- Remove special characters
- Collapse multiple hyphens

### Duplicate Detection

Before creating a tag, check for near-duplicates:

```typescript
import { checkForDuplicate } from '@/app/_features/memory/tags/dedupe';

const result = checkForDuplicate("start-up", existingTags);
// result.action: "reuse" | "unarchive" | "create"
// result.existingTag: matching tag if found
```

Detection methods:
- **Exact slug match**: Reuse existing tag
- **Alias match**: "important" → "vip"
- **Fuzzy match**: Levenshtein distance > 0.85 threshold
- **Archived match**: Offer to unarchive

### AI Tag Creation Guardrails

1. **Confidence threshold**: Tags below threshold are proposed, not auto-created
2. **Cap enforcement**: Maximum AI-created tags per scope
3. **Auto-archive**: Tags unused for 90+ days may be auto-archived
4. **Provenance tracking**: Every AI assignment records source, confidence, and reasoning

### Tag Service

```typescript
import {
  getTags,
  createTag,
  createTagFromAI,
  assignTag,
  unassignTag,
  mergeTags,
} from '@/app/_features/memory/tags';

// Get all tags for workspace
const tags = await getTags();

// Create tag (user-initiated)
const result = await createTag({
  label: "VIP",
  scope: "person",
  category: "priority",
});

// Create tag from AI (with guardrails)
const aiResult = await createTagFromAI({
  label: "Startup Founder",
  scope: "person",
  category: "segment",
  confidence: 0.95,
  because: "Mentioned founding their startup in email thread",
  sourceRef: "conv_123",
});

// Assign tag to entity
await assignTag({
  tagId: "tag_123",
  entityType: "person",
  entityId: "person_456",
  source: "user",
});

// Merge duplicate tags
await mergeTags("tag_old", "tag_target");
```

## UI Components

### TagEditor

Interactive tag assignment for detail pages:

```tsx
import { TagEditor } from '@/app/_features/memory/components/TagEditor';

<TagEditor
  entityType="person"
  entityId={personId}
  scope="person"
/>
```

### IndustrySelect

Hierarchical industry picker:

```tsx
import { IndustrySelect } from '@/app/_features/memory/components/IndustrySelect';

<IndustrySelect
  value={{ parent: "technology", child: "software" }}
  onChange={handleIndustryChange}
/>
```

### Settings

Tag management lives at `/settings/memory`:
- View/create/edit/archive tags
- Merge duplicate tags
- Adjust AI auto-create threshold
- Set max AI tags per scope

## Record Summaries

Tags are included in AI record summaries:

```typescript
const summary = buildPersonSummary({
  displayName: "Jane Doe",
  tags: [
    { slug: "vip", label: "VIP" },
    { slug: "startup-founder", label: "Startup Founder" },
  ],
  // ...
});

// Output: "... Tags: VIP, Startup Founder ..."
```

## Testing

```bash
# Run taxonomy and tags tests
pnpm test app/_features/memory/tags/ app/_features/memory/taxonomy/
```

Key test files:
- `taxonomy/registry.test.ts` - Vocabulary validation
- `tags/normalize.test.ts` - Slug normalization
- `tags/dedupe.test.ts` - Duplicate detection
