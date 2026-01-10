# PRD: User-Client Messaging System

## Overview
A real-time messaging feature enabling direct communication between studio users (freelancers/agencies) and their clients. Studio users message through the user dashboard while clients message through the Bridge portal. Messages are organized by conversation threads tied to client relationships, with support for real-time updates via Supabase Realtime.

## Branch Name
ralph/messaging-system

## Skills

```skill
~/.claude/skills/dev-browser
```

## Testing Requirements

Use the `dev-browser` skill to verify UI implementations. Browser testing is required for all UI-related user stories (US-003 through US-008).

**Test Authentication Setup:**

> **IMPORTANT:** The dev server MUST run on `localhost:3000`. Supabase auth is configured for this URL only. If port 3000 is occupied, kill the process using it before starting the dev server, otherwise authentication will fail.
> ```bash
> # Kill any process on port 3000 if needed
> lsof -ti:3000 | xargs kill -9
> ```

Before browser testing, run the seed script to create test accounts:
```bash
npm run seed:test-users
```

| Context   | Login URL     | Email                      | Password       |
|-----------|---------------|----------------------------|----------------|
| Dashboard | `/dev-login`  | test-studio@saltcore.dev   | teststudio123  |
| Bridge    | `/dev-login`  | test-client@saltcore.dev   | testclient123  |

Authentication flow for browser testing:
1. Ensure dev server is running on `http://localhost:3000` (required for Supabase auth)
2. Navigate to `/dev-login` (development-only password login page)
3. Click "Studio User" or "Client User" to auto-fill credentials
4. Click "Sign In"—redirects to `/dashboard` (studio) or `/bridge` (client)
5. Session persists—subsequent navigations stay authenticated
6. For real-time testing, use separate browser pages for Dashboard and Bridge

**Testing approach:**
1. After implementing each UI component or page, navigate to it in the browser
2. Test all interactive elements (buttons, forms, navigation)
3. Take screenshots of key states (empty, loading, populated, error)
4. For real-time features, open multiple browser sessions to verify sync

**Required verifications:**
- Message composer: Send on Enter, Shift+Enter newline, character limit enforcement
- Message thread: Correct alignment (sent right, received left), date separators, scroll behavior
- Conversation list: Sorting by recent, unread badges, active state styling
- Real-time: Messages appear without refresh in both dashboard and Bridge
- Responsive: Test mobile breakpoints (< 768px) for layout changes

## Codebase Integration Notes

This PRD is aligned with the existing Salt Core architecture:

### Supabase Setup
- **Server client**: `import { createClient } from "@/libs/supabase/server"`
- **Browser client**: `import { createClient } from "@/libs/supabase/client"`
- **Realtime**: Enabled in `supabase/config.toml` but not yet used - this feature will be the first to use it

### Tenancy & Auth Patterns
- **Context**: `import { getTenantContext } from "@/libs/tenancy"`
- **Guards**: `import { requireStudioMember, requireClientUser } from "@/libs/tenancy/guards"`
- **Studio actions**: Always filter with `.eq("studio_id", studio.id)`
- **Bridge actions**: Query `client_users` table, filter with `.eq("client_id", clientUser.client_id)`

### Server Action Patterns
- All actions start with `"use server"` directive
- Zod schemas for validation (inline or in separate file)
- Return type: `{ success: true, data: T }` or `{ error: string }`
- Use `revalidatePath()` after mutations
- Standard imports: `createClient`, `getTenantContext`, `requireStudioMember`, `z`

### UI Patterns
- Components: shadcn/ui + Radix UI in `/components/ui/`
- Shared patterns: `/components/patterns/` (EmptyState, PageHeader, StatCard)
- Icons: `lucide-react`
- Loading: Skeleton components
- Forms: `react-hook-form` + `zod`
- Toasts: `sonner`

### Email
- Provider: Resend via `libs/resend.ts`
- Bridge emails: `libs/bridge-emails.ts` with studio branding support
- No notification preferences system exists (yet)

---

## User Stories

### US-001: Database Schema for Conversations and Messages
**Priority:** 1
**Description:** Create the database migration for the messaging system including conversations table, messages table, and appropriate RLS policies.

**Acceptance Criteria:**
- [ ] Create migration file: `supabase/migrations/20260109000000_create_messaging_tables.sql`
- [ ] Create `conversations` table:
  ```sql
  create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    studio_id uuid not null references public.studios(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    last_message_at timestamptz,
    last_message_preview text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(studio_id, client_id)
  );
  ```
- [ ] Create `messages` table:
  ```sql
  create table public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id uuid not null references auth.users(id),
    sender_type text not null check (sender_type in ('studio_user', 'client_user')),
    content text not null check (char_length(content) <= 5000),
    read_at timestamptz,
    created_at timestamptz default now()
  );
  ```
- [ ] Create indexes: `conversation_id`, `created_at DESC`, `studio_id`, `client_id`
- [ ] Create RLS policies following existing patterns:
  - Studio members can SELECT/INSERT on conversations where `studio_id` matches their studio
  - Client users can SELECT/INSERT on conversations where `client_id` matches their client
  - Same pattern for messages via conversation join
- [ ] Enable Realtime for messages table: `alter publication supabase_realtime add table messages;`

**Technical Notes:**
- Follow existing migration patterns in `supabase/migrations/`
- Use `studio_id` denormalization like `tasks`, `client_meetings` tables
- RLS policies should reference `studio_members` and `client_users` tables

---

### US-002: Message Server Actions
**Priority:** 2
**Description:** Implement core server actions for messaging following existing action patterns.

**Acceptance Criteria:**
- [ ] Create `app/actions/messaging/conversation-actions.ts`:
  ```typescript
  "use server";
  import { createClient } from "@/libs/supabase/server";
  import { getTenantContext } from "@/libs/tenancy";
  import { requireStudioMember } from "@/libs/tenancy/guards";

  export async function getOrCreateConversation(clientId: string) {
    // Returns existing or creates new conversation
  }

  export async function getConversations() {
    // Returns all conversations for current user (studio or client context)
  }
  ```
- [ ] Create `app/actions/messaging/message-actions.ts`:
  ```typescript
  export async function sendMessage(conversationId: string, content: string) {
    // Validates, creates message, updates conversation metadata
  }

  export async function getMessages(conversationId: string, cursor?: string) {
    // Cursor-based pagination, 50 messages default
  }

  export async function markMessagesAsRead(conversationId: string) {
    // Marks all unread messages as read
  }
  ```
- [ ] Create `app/actions/messaging/unread-actions.ts`:
  ```typescript
  export async function getUnreadCounts() {
    // Returns { total: number, byConversation: Record<string, number> }
  }
  ```
- [ ] Zod validation: `content` max 5000 chars, `conversationId` uuid
- [ ] Return pattern: `{ success: true, data }` or `{ error: string }`
- [ ] Use `revalidatePath("/dashboard/messages")` after mutations

**Technical Notes:**
- Follow patterns from `app/actions/meetings/create-meeting.ts`
- Studio context: `const { context } = await getTenantContext(); const studio = requireStudioMember(context);`
- Client context: Query `client_users` table directly (see `app/bridge/requests/actions.ts`)

---

### US-003: Shared Message Components
**Priority:** 3
**Description:** Create reusable messaging components for both dashboard and Bridge.

**Acceptance Criteria:**
- [ ] Create `components/messaging/MessageThread.tsx`:
  - Display messages in chronological order
  - Date separators between days
  - Sent messages right-aligned, received left-aligned
  - Show sender avatar (from `profiles` table or initials), timestamp
  - Loading skeleton while fetching
  - "Load more" button for pagination (scroll-based can come later)
- [ ] Create `components/messaging/MessageComposer.tsx`:
  - Textarea with placeholder "Type a message..."
  - Send on Enter (Shift+Enter for newline)
  - Send button with Loader2 spinner while sending
  - Character count when > 4500 chars
  - Disable when empty or > 5000 chars
  - Use `sonner` toast for errors
- [ ] Create `components/messaging/ConversationListItem.tsx`:
  - Client/studio name and avatar
  - Last message preview (truncated)
  - Relative timestamp (use `date-fns`)
  - Unread badge (number)
  - Active state styling

**Technical Notes:**
- Use existing UI components: `Card`, `Button`, `Textarea`, `Badge`, `Skeleton`
- Icons from `lucide-react`: `Send`, `Loader2`, `MessageSquare`
- Follow existing component patterns in `/components/patterns/`

**Browser Verification:**
- [ ] Navigate to a test page with MessageComposer mounted
- [ ] Type a message and press Enter—verify it triggers send
- [ ] Press Shift+Enter—verify it creates a newline instead of sending
- [ ] Type 4500+ characters—verify character count appears
- [ ] Type 5000+ characters—verify send button becomes disabled
- [ ] Screenshot the composer in empty, typing, and error states

---

### US-004: Dashboard Messages Page
**Priority:** 4
**Description:** Create the messages section in the user dashboard.

**Acceptance Criteria:**
- [ ] Create `app/(user_dashboard)/dashboard/messages/page.tsx`:
  - Fetch conversations via `getConversations()`
  - Two-column layout: conversation list (left 1/3), thread area (right 2/3)
  - Empty state when no conversations: "No messages yet" with icon
  - Use `PageHeader` or `PageGreetingHeader` component
- [ ] Create `app/(user_dashboard)/dashboard/messages/[conversationId]/page.tsx`:
  - Fetch messages via `getMessages(conversationId)`
  - Render `MessageThread` and `MessageComposer`
  - Header showing client name with back button on mobile
  - Mark messages as read on mount
- [ ] Create `app/(user_dashboard)/dashboard/messages/layout.tsx`:
  - Shared layout for conversation list sidebar (desktop)
  - Responsive: show list OR thread on mobile
- [ ] Add "Messages" link to dashboard sidebar navigation

**Technical Notes:**
- Follow layout patterns from existing dashboard pages
- Use `Skeleton` components in loading.tsx
- Mobile responsive: use Tailwind `hidden md:block` patterns

**Browser Verification:**
- [ ] Navigate to `/dashboard/messages` with no conversations—verify empty state displays
- [ ] Create test conversation and navigate again—verify it appears in list
- [ ] Click a conversation—verify thread loads with messages
- [ ] Send a message—verify it appears in thread immediately
- [ ] Resize browser to mobile width (<768px)—verify layout switches to single-column
- [ ] Screenshot: empty state, conversation list, active thread, mobile view

---

### US-005: Bridge Messages Page
**Priority:** 5
**Description:** Create the messages section in the Bridge client portal.

**Acceptance Criteria:**
- [ ] Create `app/(client_bridge)/messages/page.tsx`:
  - Fetch conversations for current client
  - List view of conversations (client may have one or multiple with different studios)
  - Use Bridge styling/theming
  - Empty state matching Bridge design
- [ ] Create `app/(client_bridge)/messages/[conversationId]/page.tsx`:
  - Reuse `MessageThread` and `MessageComposer` components
  - Header showing studio name
  - Back navigation to messages list
- [ ] Add "Messages" link to Bridge navigation

**Technical Notes:**
- Follow patterns from `app/(client_bridge)/requests/page.tsx`
- Use `PageGreetingHeader` with `variant="bridge"`
- Client context: Query `client_users` table for auth

**Browser Verification:**
- [ ] Navigate to Bridge messages page as a client user
- [ ] Verify conversation list shows studio name (not client name)
- [ ] Send a message from Bridge—verify it appears in thread
- [ ] Verify Bridge styling/theming is applied (not dashboard styling)
- [ ] Test back navigation from conversation to list
- [ ] Screenshot: Bridge messages list, active conversation with Bridge theme

---

### US-006: Supabase Realtime Integration
**Priority:** 6
**Description:** Add real-time message updates using Supabase Realtime subscriptions.

**Acceptance Criteria:**
- [ ] Create `libs/hooks/use-realtime-messages.ts`:
  ```typescript
  export function useRealtimeMessages(conversationId: string) {
    // Subscribe to INSERT on messages table
    // Filter by conversation_id
    // Return new messages as they arrive
    // Cleanup subscription on unmount
  }
  ```
- [ ] Create `libs/hooks/use-realtime-conversations.ts`:
  ```typescript
  export function useRealtimeConversations(studioId: string) {
    // Subscribe to UPDATE on conversations table
    // Return updated conversation metadata
  }
  ```
- [ ] Update `MessageThread` to use `useRealtimeMessages`:
  - Append new messages to list in real-time
  - Auto-scroll to bottom on new message
- [ ] Update conversation list to use `useRealtimeConversations`:
  - Update last_message_preview and last_message_at live
  - Re-sort list when new message arrives

**Technical Notes:**
- Use browser client for Realtime: `import { createClient } from "@/libs/supabase/client"`
- Supabase Realtime pattern:
  ```typescript
  supabase
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, handleNewMessage)
    .subscribe()
  ```
- Handle reconnection with `onClose` callback

**Browser Verification (Critical):**
- [ ] Open two browser windows: Dashboard in one, Bridge in another
- [ ] Send message from Dashboard—verify it appears in Bridge without refresh
- [ ] Send message from Bridge—verify it appears in Dashboard without refresh
- [ ] Verify conversation list updates (last_message_preview, timestamp) in real-time
- [ ] Verify conversation list re-sorts when new message arrives
- [ ] Test auto-scroll: when viewing thread, new messages should scroll into view
- [ ] Screenshot: side-by-side showing real-time sync between Dashboard and Bridge

---

### US-007: Unread Badge in Navigation
**Priority:** 7
**Description:** Display unread message count badges in dashboard and Bridge navigation.

**Acceptance Criteria:**
- [ ] Create `libs/hooks/use-unread-count.ts`:
  - Poll `getUnreadCounts()` every 30 seconds (or use Realtime)
  - Expose `totalUnread` and `byConversation` counts
  - Cache result to avoid flicker
- [ ] Update dashboard sidebar to show badge next to "Messages" link
- [ ] Update Bridge navigation to show badge
- [ ] Badge styling: small red circle with white number (use `Badge` component)
- [ ] Hide badge when count is 0

**Technical Notes:**
- Consider React Context for global unread state
- Or use React Query / SWR for caching and polling
- Badge component: `<Badge variant="destructive" className="h-5 w-5 text-xs">{count}</Badge>`

**Browser Verification:**
- [ ] Send a message from Bridge while viewing Dashboard sidebar
- [ ] Verify unread badge appears/updates on "Messages" nav link
- [ ] Click into the conversation and read messages
- [ ] Verify badge count decreases after marking as read
- [ ] Verify badge hides completely when count reaches 0
- [ ] Screenshot: sidebar with unread badge visible, badge after clearing

---

### US-008: Quick Message from Client Page
**Priority:** 8
**Description:** Add quick-action button on client detail pages to open/start messaging.

**Acceptance Criteria:**
- [ ] Add "Message" button to client detail page header in dashboard
- [ ] Button shows unread count badge if there are unread messages from this client
- [ ] Clicking navigates to `/dashboard/messages/[conversationId]`
- [ ] If no conversation exists, create one first via `getOrCreateConversation`
- [ ] Icon: `MessageSquare` from lucide-react

**Technical Notes:**
- Update `app/(user_dashboard)/dashboard/clients/[id]/page.tsx`
- Use existing button patterns from client page actions

**Browser Verification:**
- [ ] Navigate to a client detail page (`/dashboard/clients/[id]`)
- [ ] Verify "Message" button appears in header actions
- [ ] Click button—verify navigation to `/dashboard/messages/[conversationId]`
- [ ] For client with no prior conversation, verify conversation is created
- [ ] If client has unread messages, verify badge shows on the Message button
- [ ] Screenshot: client page header with Message button (with and without badge)

---

### US-009: Email Notification for New Messages
**Priority:** 9
**Description:** Send email notification when users receive new messages while offline.

**Acceptance Criteria:**
- [ ] Create `sendNewMessageEmail()` function in `libs/bridge-emails.ts`:
  - For client users: Use studio branding (logo, colors)
  - For studio users: Use Salt Core branding
  - Include: sender name, message preview (truncated), link to conversation
- [ ] Add email sending to `sendMessage` action:
  - Only send if recipient hasn't been active in last 5 minutes
  - Check `profiles.last_seen_at` or similar field (may need to add)
  - Don't send if recipient is currently viewing the conversation
- [ ] Respect potential future notification preferences

**Technical Notes:**
- Follow patterns from existing bridge emails in `libs/bridge-emails.ts`
- Use `getStudioBranding()` for client-facing emails
- Consider: May want to batch notifications (future enhancement)
- May need to add `last_seen_at` column to profiles table

---

### US-010: Message Search (Optional Enhancement)
**Priority:** 10
**Description:** Allow users to search through their message history.

**Acceptance Criteria:**
- [ ] Add search input to messages page header
- [ ] Create `searchMessages(query: string)` server action
- [ ] Use PostgreSQL full-text search or ILIKE for simple implementation
- [ ] Show results grouped by conversation
- [ ] Clicking result navigates to message in thread
- [ ] Debounce search input (300ms)

**Technical Notes:**
- May need GIN index on messages.content for full-text search
- Consider adding in future migration if performance is needed
- Lower priority - can be added later

---

## Out of Scope
- File/image attachments in messages (future enhancement)
- Message reactions/emoji responses
- Message editing or deletion
- Group conversations (multiple clients in one thread)
- Message threading/replies to specific messages
- Typing indicators
- Video/voice calling
- Message forwarding
- AI/chatbot integration
- Message templates/canned responses
- Notification preferences UI (infrastructure only)

## Dependencies
- Existing Supabase setup with Realtime enabled ✅
- Existing authentication system (studio users and client users) ✅
- Existing tenancy context (`libs/tenancy/context.ts`) ✅
- Resend email provider (`libs/resend.ts`) ✅

## File Structure

```
app/
├── actions/
│   └── messaging/
│       ├── conversation-actions.ts
│       ├── message-actions.ts
│       └── unread-actions.ts
├── (user_dashboard)/
│   └── dashboard/
│       └── messages/
│           ├── page.tsx
│           ├── layout.tsx
│           ├── loading.tsx
│           └── [conversationId]/
│               └── page.tsx
└── (client_bridge)/
    └── messages/
        ├── page.tsx
        └── [conversationId]/
            └── page.tsx

components/
└── messaging/
    ├── MessageThread.tsx
    ├── MessageComposer.tsx
    ├── ConversationListItem.tsx
    └── ConversationList.tsx

libs/
├── hooks/
│   ├── use-realtime-messages.ts
│   ├── use-realtime-conversations.ts
│   └── use-unread-count.ts
└── bridge-emails.ts  # Add sendNewMessageEmail()

supabase/
└── migrations/
    └── 20260109000000_create_messaging_tables.sql
```
