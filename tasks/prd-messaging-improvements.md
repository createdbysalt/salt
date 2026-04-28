# PRD: Messaging Feature Improvements

## Introduction

Enhance SALT's messaging system to deliver a premium, async-first communication experience between studios and clients. The current foundation is solid (real-time via Supabase, email fallback, read tracking, RLS isolation), but the UX needs polish to match competitors like Copilot and Linear.

Research confirms async-first is correct for premium B2B clients who want flexibility, not real-time pressure. The gaps are UX polish: rich text, threading, knowledge-linked files, context, and search.

**Key architectural decision:** File attachments flow through the Knowledge Base first, then are mentioned/linked in messages. This turns every shared file into organized, searchable knowledge rather than ephemeral chat clutter.

---

## Goals

- Enable full-text search across all user conversations with filters
- Allow sharing files via Knowledge Base mentions in messages
- Support markdown formatting for professional communication
- Show expected response time to build trust without presence pressure
- Implement single-level message threading to reduce clutter
- Provide client context sidebar for studios (reduce context-switching)
- Surface read receipts for studio users only
- Enable @mentions for lightweight team collaboration
- Implement notification batching to prevent fatigue
- Add typing indicators (studio-side only) for awareness without client pressure

---

## User Stories

### Phase 1: Core UX Improvements

#### US-001: Add full-text search index to messages
**Description:** As a developer, I need to add PostgreSQL tsvector indexing so message search is fast and accurate at scale.

**Acceptance Criteria:**
- [ ] Add `content_tsv` tsvector column to messages table (generated from content)
- [ ] Create GIN index on `content_tsv` for fast full-text search
- [ ] Migration runs successfully without data loss
- [ ] Existing messages are indexed on migration
- [ ] Typecheck passes

---

#### US-002: Implement full-text search server action
**Description:** As a user, I want to search across all my conversations so I can find past discussions quickly.

**Acceptance Criteria:**
- [ ] Create `searchMessagesFullText` action using tsvector
- [ ] Support search across all user's accessible conversations
- [ ] Return results grouped by conversation with highlighted matches
- [ ] Support optional date range filter (from/to)
- [ ] Support optional sender filter
- [ ] Limit results (default 50, max 100)
- [ ] Handle empty queries gracefully
- [ ] Typecheck passes

---

#### US-003: Connect search UI to full-text backend
**Description:** As a user, I want the search input to use real full-text search so results are relevant and fast.

**Acceptance Criteria:**
- [ ] Update `MessageSearchInput` to call `searchMessagesFullText`
- [ ] Show search results in `MessageSearchResults` component
- [ ] Display conversation name, message preview, and timestamp
- [ ] Clicking result navigates to that conversation/message
- [ ] Show "No results" empty state when query returns nothing
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to /dashboard/messages
- Type "project deadline" in search input
- Verify results appear grouped by conversation
- Click a result and verify navigation to that message
- Search for gibberish and verify empty state appears

---

#### US-004: Add search filters UI
**Description:** As a user, I want to filter search by date range and sender so I can narrow down results.

**Acceptance Criteria:**
- [ ] Add expandable filters section below search input
- [ ] Include date range picker (from/to)
- [ ] Include sender dropdown (populated from conversation participants)
- [ ] Filters apply immediately on change
- [ ] "Clear filters" button resets all filters
- [ ] Filter state persists in URL params
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to /dashboard/messages and search for a term
- Expand filters and select a date range
- Verify results update to only show messages in that range
- Select a sender filter and verify results narrow further
- Click "Clear filters" and verify all results return

---

#### US-005: Create knowledge mention system for messages
**Description:** As a user, I want to mention knowledge base items in messages so I can share files without duplicating them.

**Acceptance Criteria:**
- [ ] Add `knowledge_mentions` JSONB column to messages table
- [ ] Store array of `{ knowledgeId, title, type }` objects
- [ ] Create `KnowledgeMentionPicker` component (triggered by `@` or button)
- [ ] Picker searches user's accessible knowledge items
- [ ] Selected items appear as chips in composer
- [ ] Mentions saved with message on send
- [ ] Typecheck passes

---

#### US-006: Display knowledge mentions in messages
**Description:** As a user, I want to see linked knowledge items in messages so I can access shared files.

**Acceptance Criteria:**
- [ ] Create `KnowledgeMentionCard` component for message display
- [ ] Show file icon, title, and type (document, image, etc.)
- [ ] Clicking card opens knowledge item detail/preview
- [ ] Handle deleted/inaccessible items gracefully (show "Item unavailable")
- [ ] Support multiple mentions per message
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation with knowledge mentions
- Verify mention cards display with correct icon and title
- Click a mention and verify it opens the knowledge item
- Verify multiple mentions display correctly in a single message

---

#### US-007: Add quick file upload to knowledge base from composer
**Description:** As a user, I want to drag a file into the composer and have it saved to the knowledge base, so sharing files is seamless.

**Acceptance Criteria:**
- [ ] Add drop zone to `MessageComposer`
- [ ] Dropping file opens "Add to Knowledge Base" modal
- [ ] Modal pre-fills title from filename
- [ ] User can add tags and description (optional)
- [ ] On save, file uploads to KB and auto-adds mention to message
- [ ] Show upload progress indicator
- [ ] Handle upload errors gracefully
- [ ] Respect file size limits (10MB per file)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation composer
- Drag a PDF file onto the composer
- Verify "Add to Knowledge Base" modal opens with filename as title
- Add a tag and click Save
- Verify file uploads and mention chip appears in composer
- Send message and verify mention displays in thread

---

#### US-008: Create RichMarkdownEditor component
**Description:** As a user, I want to format messages with markdown so my communication looks professional.

**Acceptance Criteria:**
- [ ] Create `RichMarkdownEditor` component based on textarea
- [ ] Support keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+K (link)
- [ ] Support syntax: **bold**, *italic*, `code`, ```code blocks```, - lists, [links](url)
- [ ] Optional format toolbar (bold, italic, code, link buttons)
- [ ] Maintain 5000 character limit
- [ ] Mobile-friendly (toolbar collapses or hides)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation
- Type `**bold**` and verify preview shows bold
- Use Ctrl+B shortcut and verify text wraps in **
- Test code blocks with triple backticks
- Verify character count still works

---

#### US-009: Create MarkdownRenderer component
**Description:** As a user, I want to see formatted markdown in messages so text is readable and professional.

**Acceptance Criteria:**
- [ ] Create `MarkdownRenderer` component using react-markdown
- [ ] Render: bold, italic, code, code blocks, lists, links
- [ ] Sanitize HTML to prevent XSS (no raw HTML allowed)
- [ ] Style code blocks with syntax highlighting (optional)
- [ ] Links open in new tab with noopener
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- View a message with markdown formatting
- Verify **bold** renders as bold text
- Verify code blocks have distinct styling
- Verify links are clickable and open in new tab
- Attempt to inject HTML and verify it's sanitized

---

#### US-010: Integrate markdown editor into MessageComposer
**Description:** As a user, I want the message composer to support markdown so I can format messages.

**Acceptance Criteria:**
- [ ] Replace plain Textarea with `RichMarkdownEditor` in `MessageComposer`
- [ ] Add toggle for "Preview" mode to see rendered output
- [ ] Maintain existing send behavior (Enter to send, Shift+Enter for newline)
- [ ] Preserve character count and limit functionality
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation
- Type markdown in composer
- Toggle Preview mode and verify formatting renders
- Send message and verify it displays formatted in thread

---

#### US-011: Add expected response time to conversations
**Description:** As a studio owner, I want to set expected response times so clients know when to expect replies.

**Acceptance Criteria:**
- [ ] Add `expected_response_time` interval column to conversations table
- [ ] Create server action to update expected response time
- [ ] Calculate average response time from last 20 messages (fallback)
- [ ] Allow studio override per conversation
- [ ] Typecheck passes

---

#### US-012: Display response time indicator to clients
**Description:** As a client, I want to see "Typically responds within X" so I know what to expect.

**Acceptance Criteria:**
- [ ] Create `ResponseTimeIndicator` component
- [ ] Display in conversation header (client view only)
- [ ] Format nicely: "within 2 hours", "within 1 business day"
- [ ] Show calculated average if no override set
- [ ] Hide if no data available yet
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Log in as client user
- Navigate to a conversation with response time set
- Verify "Typically responds within X" displays in header
- Verify it does NOT show for studio users

---

### Phase 2: Threading & Context

#### US-013: Create message threading database schema
**Description:** As a developer, I need to store message reply relationships for threading.

**Acceptance Criteria:**
- [ ] Add `reply_to_id` column to messages table (nullable, FK to messages.id)
- [ ] Add index on `reply_to_id` for query performance
- [ ] Add RLS policy for reply access (same as parent message)
- [ ] Migration runs successfully
- [ ] Typecheck passes

---

#### US-014: Add reply action to messages
**Description:** As a user, I want to reply to a specific message so conversations stay organized.

**Acceptance Criteria:**
- [ ] Add "Reply" button to message actions menu
- [ ] Clicking Reply focuses composer with reply context shown
- [ ] Show "Replying to [sender]: [preview]" above composer
- [ ] Cancel button clears reply context
- [ ] Sending reply includes `reply_to_id` in message
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation with messages
- Click Reply on a message
- Verify "Replying to..." context appears above composer
- Type and send a reply
- Verify reply is associated with parent message

---

#### US-015: Display threaded replies in message list
**Description:** As a user, I want to see replies grouped under their parent message so I can follow conversations.

**Acceptance Criteria:**
- [ ] Create `MessageReply` component for compact reply display
- [ ] Show reply count on parent messages ("2 replies")
- [ ] Click to expand/collapse replies inline
- [ ] Replies indented visually under parent
- [ ] Maintain chronological order within thread
- [ ] Collapsed by default, remembers expand state
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to conversation with threaded replies
- Verify parent message shows "X replies" indicator
- Click to expand and verify replies appear indented
- Click to collapse and verify replies hide
- Refresh page and verify expand state persists

---

#### US-016: Create ConversationContextSidebar component
**Description:** As a studio user, I want to see client context alongside conversations so I don't have to switch screens.

**Acceptance Criteria:**
- [ ] Create `ConversationContextSidebar` component
- [ ] Display sections: Client info, Active projects, Pending invoices, Last meeting
- [ ] Include quick actions: "Create Invoice", "Schedule Meeting"
- [ ] Fetch all data in single optimized query
- [ ] Collapsible on tablet breakpoint (< 1024px)
- [ ] Hidden on mobile (< 768px)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation as studio user
- Verify context sidebar displays on right side
- Verify client info, projects, invoices sections populate
- Click "Create Invoice" and verify modal opens
- Resize browser to tablet and verify sidebar collapses
- Resize to mobile and verify sidebar hidden

---

#### US-017: Surface read receipts for studio users
**Description:** As a studio user, I want to see when clients read my messages so I know they're engaged.

**Acceptance Criteria:**
- [ ] Create `ReadReceiptIndicator` component
- [ ] Show "Seen [relative time]" on messages read by recipient
- [ ] Only visible to studio users (not clients)
- [ ] Use existing `read_at` column data
- [ ] Aggregate for group conversations ("Seen by 2 of 3")
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Log in as studio user
- Navigate to conversation where client has read messages
- Verify "Seen X ago" appears on read messages
- Log in as client and verify read receipts do NOT show

---

#### US-018: Implement @mention detection in composer
**Description:** As a user, I want to @mention team members so they get notified.

**Acceptance Criteria:**
- [ ] Detect `@` character in composer input
- [ ] Show autocomplete dropdown with matching team members
- [ ] Filter as user types after @
- [ ] Arrow keys navigate, Enter selects
- [ ] Selected mention appears as styled chip
- [ ] Store mentions in message metadata
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation
- Type "@" and verify autocomplete dropdown appears
- Type partial name and verify list filters
- Select a user and verify chip appears in composer
- Send message and verify mention is styled in thread

---

#### US-019: Create notifications for @mentions
**Description:** As a team member, I want to be notified when mentioned so I don't miss important messages.

**Acceptance Criteria:**
- [ ] Create notification record when message with mention is sent
- [ ] Notification links to specific message
- [ ] Show in notification center with mention context
- [ ] Mark as read when user views the message
- [ ] Respect user notification preferences
- [ ] Typecheck passes

---

#### US-020: Highlight mentions in rendered messages
**Description:** As a user, I want @mentions to be visually distinct so they're easy to spot.

**Acceptance Criteria:**
- [ ] Style @mentions with distinct background color
- [ ] Make mentions clickable (show user profile tooltip)
- [ ] Highlight current user's mentions more prominently
- [ ] Works with markdown rendering
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- View a message with @mentions
- Verify mentions have distinct styling
- Verify your own mentions are highlighted differently
- Click a mention and verify profile tooltip appears

---

### Phase 3: Polish & Intelligence

#### US-021: Implement notification batching system
**Description:** As a user, I want notifications batched into digests so I'm not overwhelmed.

**Acceptance Criteria:**
- [ ] Create `notification_preferences` table with batching settings
- [ ] Options: immediate, hourly digest, daily digest
- [ ] Default to immediate for high-priority, daily for low-priority
- [ ] Batch unread notifications into single digest email
- [ ] Include message previews and direct links
- [ ] Typecheck passes

---

#### US-022: Add quiet hours configuration
**Description:** As a user, I want to set quiet hours so I'm not disturbed outside work hours.

**Acceptance Criteria:**
- [ ] Add quiet hours fields to notification preferences
- [ ] Support start/end time and timezone
- [ ] Support day-of-week selection
- [ ] Hold notifications during quiet hours, deliver after
- [ ] Override available for urgent messages
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to notification settings
- Set quiet hours (e.g., 6pm-8am)
- Verify settings save successfully
- Verify UI shows current quiet hours status

---

#### US-023: Add urgency flags to messages
**Description:** As a studio user, I want to mark messages as urgent so they bypass quiet hours.

**Acceptance Criteria:**
- [ ] Add `is_urgent` boolean to messages table
- [ ] Add "Mark as Urgent" option in composer
- [ ] Urgent messages show visual indicator (red dot/badge)
- [ ] Urgent messages bypass recipient's quiet hours
- [ ] Limit urgent messages (prevent abuse)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation
- Toggle "Mark as Urgent" option in composer
- Send message and verify urgent indicator displays
- Verify recipient receives immediate notification

---

#### US-024: Surface intelligence insights in context sidebar
**Description:** As a studio user, I want to see relevant client insights in the sidebar so I have context.

**Acceptance Criteria:**
- [ ] Add "Insights" section to `ConversationContextSidebar`
- [ ] Display top 3 recent insights for client
- [ ] Show insight type, title, and brief summary
- [ ] Link to full intelligence report
- [ ] Update when new insights are generated
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to conversation with client who has insights
- Verify Insights section displays in context sidebar
- Verify insight cards show title and summary
- Click insight and verify navigation to full report

---

#### US-025: Implement typing indicators for studio users
**Description:** As a studio user, I want to see when clients are typing so I know they're engaged.

**Acceptance Criteria:**
- [ ] Create Supabase Realtime presence channel per conversation
- [ ] Broadcast typing state on keystroke (debounced)
- [ ] Clear typing state after 3s of no input or on send
- [ ] Show "[Name] is typing..." indicator in thread
- [ ] Only visible to studio users (not clients)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Open conversation in two browsers (studio + client)
- Type in client browser
- Verify studio browser shows "Client is typing..."
- Stop typing and verify indicator disappears after 3s
- Verify client browser does NOT see studio typing

---

#### US-026: Add conversation archiving
**Description:** As a studio user, I want to archive old conversations so my inbox stays clean.

**Acceptance Criteria:**
- [ ] Add `is_archived` boolean to conversations table (already in plan)
- [ ] Add "Archive" action to conversation menu
- [ ] Archived conversations hidden from main list by default
- [ ] Add "Show archived" filter toggle
- [ ] Unarchive action available
- [ ] New message in archived conversation unarchives it
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to conversations list
- Archive a conversation via menu
- Verify it disappears from main list
- Toggle "Show archived" and verify it appears
- Unarchive and verify it returns to main list

---

#### US-027: Add conversation tags for organization
**Description:** As a studio user, I want to tag conversations so I can organize and filter them.

**Acceptance Criteria:**
- [ ] Use existing `tags` array column on conversations
- [ ] Create tag management UI in conversation settings
- [ ] Add tag filter to conversation list
- [ ] Allow multiple tags per conversation
- [ ] Suggest existing tags as user types
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation's settings
- Add tags "urgent" and "project-alpha"
- Verify tags display on conversation in list
- Filter list by tag and verify correct conversations show

---

#### US-028: Add studio notes to conversations
**Description:** As a studio user, I want to add private notes to conversations that clients can't see.

**Acceptance Criteria:**
- [ ] Use existing `studio_notes` text column on conversations
- [ ] Add "Notes" expandable section in context sidebar
- [ ] Auto-save notes on blur or debounced
- [ ] Notes never visible to clients
- [ ] Support basic formatting (or plain text)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to a conversation as studio user
- Expand Notes section in sidebar
- Type a note and blur
- Refresh page and verify note persists
- Log in as client and verify notes section does NOT exist

---

## Functional Requirements

### Search
- FR-1: Add `content_tsv` tsvector column to messages table with GIN index
- FR-2: Implement full-text search using `@@` operator with `plainto_tsquery`
- FR-3: Support date range filtering on search results
- FR-4: Support sender filtering on search results
- FR-5: Return results grouped by conversation with match highlighting

### Knowledge Mentions
- FR-6: Add `knowledge_mentions` JSONB column to messages table
- FR-7: Knowledge picker searches user's accessible knowledge items
- FR-8: File drops auto-upload to knowledge base before mention
- FR-9: Mention cards display file type icon, title, and link

### Rich Text
- FR-10: Support markdown syntax: bold, italic, code, code blocks, lists, links
- FR-11: Sanitize all rendered markdown to prevent XSS
- FR-12: Keyboard shortcuts for common formatting (Ctrl+B, Ctrl+I, Ctrl+K)
- FR-13: Maintain 5000 character limit with counter

### Response Time
- FR-14: Add `expected_response_time` interval column to conversations
- FR-15: Calculate average from last 20 messages when no override
- FR-16: Display formatted response time to clients only

### Threading
- FR-17: Add `reply_to_id` column to messages table
- FR-18: Single-level threading only (no reply to reply)
- FR-19: Replies displayed indented under parent, collapsible
- FR-20: Reply count shown on parent messages

### Context Sidebar
- FR-21: Display client info, projects, invoices, meetings in sidebar
- FR-22: Quick actions: Create Invoice, Schedule Meeting
- FR-23: Sidebar collapsible on tablet, hidden on mobile

### Read Receipts
- FR-24: Surface existing `read_at` data in UI
- FR-25: Show "Seen [time]" on messages, studio users only
- FR-26: Aggregate for multiple recipients

### @Mentions
- FR-27: Detect `@` trigger and show autocomplete
- FR-28: Store mentions in message metadata
- FR-29: Create notification for mentioned users
- FR-30: Highlight mentions in rendered messages

### Notifications
- FR-31: Support batching options: immediate, hourly, daily
- FR-32: Support quiet hours with timezone
- FR-33: Urgent messages bypass quiet hours
- FR-34: Limit urgent messages per sender per day

### Typing Indicators
- FR-35: Broadcast typing via Supabase Realtime presence
- FR-36: Show typing indicator to studio users only
- FR-37: Auto-clear after 3s of no input

### Organization
- FR-38: Support conversation archiving with auto-unarchive on new message
- FR-39: Support conversation tags with filter
- FR-40: Support private studio notes

---

## Non-Goals (Out of Scope)

- **Reply by email** - Requires significant email parsing infrastructure
- **Nested threading** - Only single-level replies supported
- **Typing indicators for clients** - Intentionally hidden to reduce pressure
- **Video/audio messages** - Text and files only
- **Message editing** - Send only, no edits
- **Message deletion** - Archive conversations instead
- **AI-generated responses** - Future consideration
- **Translation** - English only for now
- **Read receipts for clients** - Studios only
- **Custom emoji reactions** - Keep it professional

---

## Design Considerations

### UI Components to Reuse
- `@repo/ui` primitives: Button, Input, Textarea, Card, Badge, Dropdown
- `@repo/patterns`: EmptyState, PageHeader
- Existing `FileUploadZone` for knowledge uploads
- Existing `MessageThread`, `MessageComposer` as base

### New Components Needed
| Component | Purpose |
|-----------|---------|
| `RichMarkdownEditor` | Markdown input with toolbar/shortcuts |
| `MarkdownRenderer` | Safe markdown display |
| `KnowledgeMentionPicker` | @ trigger autocomplete for KB items |
| `KnowledgeMentionCard` | Display linked KB item in message |
| `MessageReply` | Compact reply display |
| `ConversationContextSidebar` | Client context panel |
| `ResponseTimeIndicator` | "Typically responds in X" |
| `ReadReceiptIndicator` | "Seen X ago" |
| `TypingIndicator` | "[Name] is typing..." |

### UX Principles
- Async-first: No real-time pressure on clients
- Progressive disclosure: Advanced features (filters, threading) expandable
- Mobile-friendly: Core features work on mobile, advanced features tablet+
- Keyboard-first: Power users can navigate without mouse

---

## Technical Considerations

### Database Changes
```sql
-- Messages table additions
ALTER TABLE messages ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX messages_content_search_idx ON messages USING GIN (content_tsv);
ALTER TABLE messages ADD COLUMN knowledge_mentions JSONB DEFAULT '[]';
ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN is_urgent BOOLEAN DEFAULT false;

-- Conversations table additions (some may exist)
ALTER TABLE conversations ADD COLUMN expected_response_time INTERVAL;
ALTER TABLE conversations ADD COLUMN is_archived BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN studio_notes TEXT;
ALTER TABLE conversations ADD COLUMN title VARCHAR(255);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  batching TEXT DEFAULT 'immediate', -- immediate, hourly, daily
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT,
  quiet_hours_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- Mon-Fri
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Dependencies
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown support
- `DOMPurify` or similar - HTML sanitization
- Supabase Realtime - Already in use, extend for presence

### Performance Considerations
- Context sidebar: Single query with joins, not N+1
- Search: tsvector index handles scale
- Typing indicators: Debounce to prevent channel spam
- Knowledge mentions: Eager load mentioned items with message

---

## Success Metrics

### Phase 1 Success
- Users can search messages with <500ms response time
- File sharing via KB mentions used in 50%+ of file shares
- Markdown formatting used in 20%+ of messages
- Response time indicator shown to all clients

### Phase 2 Success
- 30%+ of messages are replies (threading adoption)
- Context sidebar reduces screen switches by 50%
- Read receipts viewed by 80%+ of studio users
- @mentions create notifications with 100% delivery

### Phase 3 Success
- Notification batching reduces email volume by 40%
- Quiet hours respected with 0 violations
- Typing indicators increase studio response rate
- Messaging NPS score improves 20+ points

### Overall Success
- Messaging feels "premium and professional"
- Context-switching reduced by 50%+
- Support tickets about messaging decrease 30%
- Feature parity with Copilot/Linear messaging

---

## Open Questions

1. **Search ranking:** Should search prioritize recent messages or relevance score?
2. **Knowledge mention permissions:** Can clients mention KB items, or studio only?
3. **Typing indicator channel:** One channel per conversation or global presence?
4. **Notification batching job:** Cron job or queue-based?
5. **Mobile composer:** Show full markdown toolbar or simplified?

---

## Appendix: Migration SQL

```sql
-- Full migration script for messaging improvements
-- Run via: pnpm dlx supabase db push

-- 1. Full-text search
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS messages_content_search_idx ON messages USING GIN (content_tsv);

-- 2. Knowledge mentions
ALTER TABLE messages ADD COLUMN IF NOT EXISTS knowledge_mentions JSONB DEFAULT '[]';

-- 3. Threading
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id);
CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON messages(reply_to_id);

-- 4. Urgency
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

-- 5. Conversation enhancements
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS expected_response_time INTERVAL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS studio_notes TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- 6. Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batching TEXT DEFAULT 'immediate' CHECK (batching IN ('immediate', 'hourly', 'daily')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT DEFAULT 'UTC',
  quiet_hours_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 7. RLS for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- 8. Indexes for common queries
CREATE INDEX IF NOT EXISTS conversations_is_archived_idx ON conversations(is_archived);
CREATE INDEX IF NOT EXISTS conversations_tags_idx ON conversations USING GIN(tags);
CREATE INDEX IF NOT EXISTS messages_is_urgent_idx ON messages(is_urgent) WHERE is_urgent = true;
```
