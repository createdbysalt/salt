# Database Migration Checklist for New Dashboard Features

## Overview
This document outlines the database tables, indexes, and RLS policies needed to wire the new dashboard UI pages (Tasks, Inbox, Studio, Insights) to real data in the future. Currently, these pages use mock data and are UI-only.

## Migration Strategy
- All tables should be created via timestamped SQL migration files under `supabase/migrations/`
- All tables should be studio-scoped (include `studio_id uuid references public.studios(id)`)
- All tables should have RLS policies that enforce multi-tenant security
- Follow existing patterns in the codebase for consistency

---

## 1. Tasks System

### Table: `tasks`
**Purpose**: Store user/team tasks with priorities and assignments

```sql
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_studio_id ON public.tasks(studio_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_user_id) WHERE assignee_user_id IS NOT NULL;
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_at ON public.tasks(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX idx_tasks_project ON public.tasks(project_id) WHERE project_id IS NOT NULL;
```

### RLS Policies for `tasks`
```sql
-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Studio members can view all tasks in their studio
CREATE POLICY "Studio members can view tasks"
  ON public.tasks FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio owners/admins can insert tasks
CREATE POLICY "Studio owners/admins can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Assignees and studio owners/admins can update tasks
CREATE POLICY "Assignees and admins can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
    AND (
      assignee_user_id = auth.uid()
      OR studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

-- Studio owners/admins can delete tasks
CREATE POLICY "Studio owners/admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
```

---

## 2. Inbox System

### Table: `inbox_threads`
**Purpose**: Group messages by client/conversation thread

```sql
CREATE TABLE IF NOT EXISTS public.inbox_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  subject text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbox_threads_studio ON public.inbox_threads(studio_id);
CREATE INDEX idx_inbox_threads_client ON public.inbox_threads(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_inbox_threads_last_message ON public.inbox_threads(last_message_at DESC);
```

### Table: `inbox_messages`
**Purpose**: Individual messages within threads

```sql
CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('studio_member', 'client_user')),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbox_messages_thread ON public.inbox_messages(thread_id);
CREATE INDEX idx_inbox_messages_studio ON public.inbox_messages(studio_id);
CREATE INDEX idx_inbox_messages_created ON public.inbox_messages(created_at DESC);
```

### Table: `notifications`
**Purpose**: System notifications (payments, alerts, deployments)

```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('alert', 'payment', 'system', 'deployment')),
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_studio ON public.notifications(studio_id);
CREATE INDEX idx_notifications_read ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
```

### RLS Policies for Inbox
```sql
-- Enable RLS
ALTER TABLE public.inbox_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Studio members can view their studio's threads
CREATE POLICY "Studio members can view inbox threads"
  ON public.inbox_threads FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can view their studio's messages
CREATE POLICY "Studio members can view inbox messages"
  ON public.inbox_messages FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can view their studio's notifications
CREATE POLICY "Studio members can view notifications"
  ON public.notifications FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Additional INSERT/UPDATE policies for messages and notifications
-- should be restricted to server actions/API endpoints
```

---

## 3. Studio System (Knowledge Base, Assets, Tags)

### Table: `studio_documents`
**Purpose**: Store knowledge base documents (processes, templates)

```sql
CREATE TABLE IF NOT EXISTS public.studio_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  content text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_documents_studio ON public.studio_documents(studio_id);
CREATE INDEX idx_studio_documents_category ON public.studio_documents(category);
```

### Table: `studio_assets`
**Purpose**: Store brand assets (logos, colors, fonts)

```sql
CREATE TABLE IF NOT EXISTS public.studio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('logo', 'color', 'font', 'image', 'file')),
  name text NOT NULL,
  url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_assets_studio ON public.studio_assets(studio_id);
CREATE INDEX idx_studio_assets_kind ON public.studio_assets(kind);
```

### Table: `tags`
**Purpose**: Store custom tags for clients/projects (note: already partially implemented via localStorage in useTagManagement)

```sql
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('client', 'project')),
  color text NOT NULL,
  icon text NOT NULL,
  is_built_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(studio_id, type, label)
);

CREATE INDEX idx_tags_studio ON public.tags(studio_id);
CREATE INDEX idx_tags_type ON public.tags(type);
```

### Table: `tag_assignments`
**Purpose**: Associate tags with clients or projects

```sql
CREATE TABLE IF NOT EXISTS public.tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'project')),
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tag_id, entity_type, entity_id)
);

CREATE INDEX idx_tag_assignments_studio ON public.tag_assignments(studio_id);
CREATE INDEX idx_tag_assignments_tag ON public.tag_assignments(tag_id);
CREATE INDEX idx_tag_assignments_entity ON public.tag_assignments(entity_type, entity_id);
```

### RLS Policies for Studio
```sql
-- Enable RLS
ALTER TABLE public.studio_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_assignments ENABLE ROW LEVEL SECURITY;

-- Studio members can view their studio's documents/assets/tags
CREATE POLICY "Studio members can view documents"
  ON public.studio_documents FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can view assets"
  ON public.studio_assets FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can view tags"
  ON public.tags FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can view tag assignments"
  ON public.tag_assignments FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio owners/admins can manage documents/assets/tags
-- (Similar INSERT/UPDATE/DELETE policies as tasks)
```

---

## 4. Insights System (optional)

### Table: `ai_audits`
**Purpose**: Store AI-generated market/competitor analysis reports

```sql
CREATE TABLE IF NOT EXISTS public.ai_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  industry text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_ai_audits_studio ON public.ai_audits(studio_id);
CREATE INDEX idx_ai_audits_client ON public.ai_audits(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_ai_audits_status ON public.ai_audits(status);
```

### RLS Policies for Insights
```sql
ALTER TABLE public.ai_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Studio members can view ai_audits"
  ON public.ai_audits FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );
```

---

## Implementation Checklist

### Phase 1: Essential Tables (Do First)
- [ ] Create `tasks` table + indexes + RLS
- [ ] Create `tags` table + indexes + RLS
- [ ] Create `tag_assignments` table + indexes + RLS

### Phase 2: Communication (Do Next)
- [ ] Create `inbox_threads` table + indexes + RLS
- [ ] Create `inbox_messages` table + indexes + RLS
- [ ] Create `notifications` table + indexes + RLS

### Phase 3: Studio Assets (Do Last)
- [ ] Create `studio_documents` table + indexes + RLS
- [ ] Create `studio_assets` table + indexes + RLS
- [ ] Create `ai_audits` table + indexes + RLS (optional)

### Migration File Naming Convention
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

Example:
```
20260102010000_create_tasks_table.sql
20260102020000_create_inbox_tables.sql
20260102030000_create_studio_assets.sql
```

### Testing Each Migration
1. Apply migration locally: `supabase db push`
2. Test RLS policies with different user roles
3. Verify indexes are being used: `EXPLAIN ANALYZE SELECT ...`
4. Test cascading deletes work correctly
5. Apply to staging environment
6. Apply to production

---

## Server Actions to Create

Once tables are ready, create server actions in:
- `app/actions/tasks/` - CRUD for tasks
- `app/actions/inbox/` - Message/thread management
- `app/actions/studio/` - Document/asset management
- `app/actions/tags/` - Tag management (migrate from localStorage)

Follow existing patterns in `app/actions/billing/` for error handling and tenancy guards.

---

## Notes
- All tables follow the existing multi-tenant pattern (studio-scoped)
- RLS policies enforce studio membership for all operations
- Indexes are optimized for common query patterns (filtering by studio, status, dates)
- Cascading deletes ensure data integrity
- All timestamps use `timestamptz` for timezone awareness
- JSONB fields allow flexible metadata storage without schema changes

