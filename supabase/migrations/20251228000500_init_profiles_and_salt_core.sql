-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- PROFILES TABLE (Required by ShipFast for Stripe integration)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  customer_id text unique,
  price_id text,
  has_access boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles RLS Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- SALT CORE TABLES (Studio Management System)
-- ============================================================================

-- Projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  status text not null default 'draft',
  project_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure status is one of the valid values
  constraint valid_status check (status in ('draft', 'signed', 'active', 'archived'))
);

-- Enable RLS on projects
alter table public.projects enable row level security;

-- Projects RLS Policies
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Index for faster queries
create index projects_user_id_idx on public.projects(user_id);
create index projects_status_idx on public.projects(status);

-- Tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium',
  status text not null default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure priority and status are valid values
  constraint valid_priority check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint valid_task_status check (status in ('open', 'in_progress', 'completed', 'blocked', 'cancelled'))
);

-- Enable RLS on tasks
alter table public.tasks enable row level security;

-- Tasks RLS Policies (access via project ownership)
create policy "Users can view tasks for own projects"
  on public.tasks for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create tasks for own projects"
  on public.tasks for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update tasks for own projects"
  on public.tasks for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete tasks for own projects"
  on public.tasks for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Index for faster queries
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_status_idx on public.tasks(status);
create index tasks_priority_idx on public.tasks(priority);

-- AI Audits table
create table public.ai_audits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  audit_data jsonb not null,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on ai_audits
alter table public.ai_audits enable row level security;

-- AI Audits RLS Policies (access via project ownership)
create policy "Users can view audits for own projects"
  on public.ai_audits for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = ai_audits.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create audits for own projects"
  on public.ai_audits for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = ai_audits.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete audits for own projects"
  on public.ai_audits for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = ai_audits.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Index for faster queries
create index ai_audits_project_id_idx on public.ai_audits(project_id);
create index ai_audits_generated_at_idx on public.ai_audits(generated_at);

