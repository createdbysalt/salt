# Entity Context System

**Purpose:** Unified pattern for passing entity context to Ask Salt chat when clicking "Ask Salt" from any record.

## Overview

When users click "Ask Salt" from a record (Person, Org, Work, Play, Capture, Billing, Meeting, File), the system:

1. Converts the entity to a normalized `EntityContext`
2. Creates a context message that appears as a **user message** (right side of chat)
3. Salt acknowledges the context and shows **suggested action chips**
4. Clicking a chip auto-submits the associated prompt

```
┌─────────────────────────────────────────────────────────────────┐
│                        Ask Salt Chat                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                              ┌──────────────────────────────┐   │
│                              │ [User icon] Discussing Person│   │
│                              │ RT-person 1783118679289      │   │
│                              │ unknown · New          View  │   │
│                              └──────────────────────────────┘   │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ [Salt] I'm looking at RT-person 1783118679289.             │  │
│ │ What would you like to do?                                 │  │
│ │                                                            │  │
│ │ ┌───────────────────┐ ┌───────────────────┐                │  │
│ │ │ Draft follow-up   │ │ Schedule meeting  │ ...            │  │
│ │ └───────────────────┘ └───────────────────┘                │  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture

### Type System

```typescript
// app/_features/ask-salt/types/entity-context.ts

interface EntityContext {
  type: 'person' | 'org' | 'work' | 'play' | 'capture' | 'billing' | 'meeting' | 'file' | 'files';
  id: string;
  title: string;
  actionLabel: string;  // "Discussing Person", "Editing Play", etc.
  subtitle?: string;    // "customer · at Northwind Studio"
  details?: string[];   // Additional metadata
  href?: string;        // Link to view the record
}

interface SuggestedAction {
  label: string;
  prompt: string;
}
```

### File Structure

```
app/_features/ask-salt/
├── types/
│   └── entity-context.ts       # EntityContext, SuggestedAction types
├── utils/
│   ├── entity-adapters.ts      # toEntityContext(), ENTITY_TYPE_CONFIG
│   └── suggested-actions.ts    # SUGGESTED_ACTIONS registry, getSuggestedActions()
├── components/
│   ├── EntityContextCard.tsx   # Visual card component
│   └── SuggestedActionChips.tsx # Clickable action chips
└── message-adapters.ts         # createContextUIMessage()
```

### Data Flow

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Hero Component │────▶│  toEntityContext()  │────▶│  EntityContext   │
│   (PersonHero)   │     │  (adapter function) │     │  (normalized)    │
└──────────────────┘     └─────────────────────┘     └────────┬─────────┘
                                                              │
                         ┌────────────────────────────────────┘
                         ▼
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  AskSaltPanel    │◀────│ createContextUI-    │◀────│ buildContextual- │
│  (auto-submit)   │     │ Message()           │     │ PromptFromEntity │
└────────┬─────────┘     └─────────────────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────────┐
│ AskSaltMessage   │────▶│ EntityContextCard   │  (renders as user message)
│ (renders parts)  │     │ (visual component)  │
└────────┬─────────┘     └─────────────────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────────┐
│ Salt Response    │────▶│ Suggested Actions   │  (chips below response)
│ (acknowledgment) │     │ (from metadata)     │
└──────────────────┘     └─────────────────────┘
```

## Implementation Details

### 1. Entity Adapters

Each entity type has an adapter that normalizes it to `EntityContext`:

```typescript
// app/_features/ask-salt/utils/entity-adapters.ts

export const ENTITY_TYPE_CONFIG = {
  person: { icon: User, label: 'Discussing Person' },
  org: { icon: Building2, label: 'Discussing Organization' },
  work: { icon: Briefcase, label: 'Discussing Work' },
  play: { icon: Play, label: 'Editing Play' },
  capture: { icon: Inbox, label: 'Reviewing Capture' },
  billing: { icon: WalletCards, label: 'Reviewing Invoice' },
  meeting: { icon: Calendar, label: 'Discussing Meeting' },
  file: { icon: FileText, label: 'Reviewing File' },
  files: { icon: Files, label: 'Reviewing Files' },
};

export function toEntityContext(context: AskSaltContext): EntityContext {
  // Normalizes legacy context shapes to EntityContext
}
```

### 2. Suggested Actions

Actions are registered per entity type:

```typescript
// app/_features/ask-salt/utils/suggested-actions.ts

export const SUGGESTED_ACTIONS: Record<EntityContext['type'], SuggestedAction[]> = {
  person: [
    { label: 'Draft a follow-up email to this person', prompt: 'Draft a follow-up email to this person' },
    { label: 'Help me schedule a meeting with this person', prompt: 'Help me schedule a meeting with this person' },
    { label: 'Show me recent activity and interactions with this person', prompt: 'Show me recent activity and interactions with this person' },
  ],
  // ... other entity types
};
```

### 3. Context Card Rendering

The `EntityContextCard` renders in user messages via `AskSaltMessage`:

```typescript
// app/_features/ask-salt/components/chat/AskSaltMessage.tsx

if (message.role === 'user') {
  const entityContext = metadata?.entityContext as EntityContext | undefined;
  
  if (entityContext) {
    return (
      <div className="flex justify-end" data-role="user">
        <div className="max-w-[92%]">
          <EntityContextCard context={entityContext} />
        </div>
      </div>
    );
  }
}
```

### 4. Auto-Submit Flow

When Ask Salt opens with context, a `useEffect` auto-submits:

```typescript
// app/_features/shell/components/AskSaltPanel.tsx

useEffect(() => {
  if (!isOpen || !context || hasAutoSubmittedRef.current) return;
  
  // Convert to EntityContext
  const entityCtx = toEntityContext(context);
  
  // Create context message
  const contextPrompt = buildContextualPromptFromEntity(entityCtx);
  const contextMessage = createContextUIMessage(contextPrompt, entityCtx);
  
  // Add to chat + acknowledgment with suggestions
  const suggestedActions = getTopSuggestedActions(entityCtx);
  const suggestions = suggestedActions.map(a => a.prompt);
  
  appendLocalMessage('user', contextMessage);
  appendLocalMessage('assistant', `I'm looking at ${entityCtx.title}. What would you like to do?`, { suggestions });
  
  hasAutoSubmittedRef.current = true;
}, [isOpen, context]);
```

### 5. Chip Click Handling

Chips are rendered via the existing `optionsSlot` pattern in `AskSaltMessages`:

```typescript
// Chips appear when message metadata has `suggestions` array
if (lastMetadata?.suggestions) {
  // Renders as clickable options that call onOptionSelect(prompt)
}
```

## Adding a New Entity Type

1. **Add type to `EntityContext['type']`** in `types/entity-context.ts`

2. **Add config** to `ENTITY_TYPE_CONFIG` in `entity-adapters.ts`:
   ```typescript
   newType: { icon: SomeIcon, label: 'Action Label' },
   ```

3. **Add adapter case** in `toEntityContext()` if needed

4. **Add suggested actions** in `suggested-actions.ts`:
   ```typescript
   newType: [
     { label: 'Action 1', prompt: 'Do action 1' },
     { label: 'Action 2', prompt: 'Do action 2' },
     { label: 'Action 3', prompt: 'Do action 3' },
   ],
   ```

5. **Wire up the Hero** to pass context to Ask Salt

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Card as user message | User sees exactly what Salt received — trustworthy |
| No extra DB storage | Context persisted naturally as first message metadata |
| 3 suggested actions | Avoids overwhelming; focused on most common tasks |
| Auto-submit on panel open | Reduces friction; Salt immediately acknowledges |
| Chips below Salt response | Natural conversation flow; clear next steps |

## Related Files

- `app/_features/ask-salt/types/entity-context.ts` — Type definitions
- `app/_features/ask-salt/utils/entity-adapters.ts` — Normalization adapters
- `app/_features/ask-salt/utils/suggested-actions.ts` — Action registry
- `app/_features/ask-salt/components/EntityContextCard.tsx` — Card UI
- `app/_features/ask-salt/components/SuggestedActionChips.tsx` — Chips UI
- `app/_features/ask-salt/message-adapters.ts` — Message creation
- `app/_features/shell/components/AskSaltPanel.tsx` — Panel integration
