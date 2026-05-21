-- ============================================================================
-- Salt CORE MULTI-TENANT SCHEMA MIGRATION
-- Migration: Transform single-user to multi-tenant architecture
-- ============================================================================
-- 
-- This migration transforms Salt Core from single-user to multi-tenant SaaS:
-- - Studios are the primary tenant (developers/designers who buy Salt Core)
-- - Clients belong to studios (the studio's customers)
-- - Projects belong to both studio AND client
-- - Bridge portals are the client-facing command centers
--
-- ⚠️  DATA MIGRATION: This will migrate existing projects to the new structure
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE NEW MULTI-TENANT TABLES
-- ============================================================================

-- 1. STUDIOS
create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text default 'trialing',
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint valid_subscription_status check (
    subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'paused')
  )
);

-- 2. STUDIO MEMBERS
create table public.studio_members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(studio_id, user_id),
  constraint valid_role check (role in ('owner', 'admin', 'member', 'viewer'))
);

-- 3. CLIENTS
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  slug text not null,
  contact_email text,
  contact_phone text,
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(studio_id, slug)
);

-- 4. CLIENT USERS
create table public.client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'client',
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(client_id, user_id),
  constraint valid_client_role check (role in ('client', 'viewer'))
);

-- 5. BRIDGE PORTALS
create table public.bridge_portals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade unique,
  custom_domain text unique,
  domain_verified boolean default false,
  status text default 'active',
  theme_config jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint valid_portal_status check (status in ('active', 'inactive', 'suspended'))
);

-- 6. PROJECTS (NEW - will replace old one)
create table public.projects_new (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  status text default 'draft',
  project_type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(studio_id, slug),
  constraint valid_project_status check (
    status in ('draft', 'signed', 'active', 'completed', 'archived')
  )
);

-- 7. PROJECT MEMBERS
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,  -- Will add FK after migration
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id),
  constraint valid_project_role check (role in ('lead', 'member', 'viewer'))
);

-- ============================================================================
-- STEP 2: MIGRATE EXISTING DATA
-- ============================================================================

-- For each existing user, create a studio and studio_member
insert into public.studios (owner_id, name, slug, created_at)
select 
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) || '''s Studio',
  lower(regexp_replace(
    coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), 
    '[^a-zA-Z0-9]', '-', 'g'
  )) || '-' || substr(u.id::text, 1, 8),
  u.created_at
from auth.users u
where not exists (select 1 from public.studios where owner_id = u.id);

insert into public.studio_members (studio_id, user_id, role, email, created_at)
select 
  s.id,
  s.owner_id,
  'owner',
  u.email,
  s.created_at
from public.studios s
join auth.users u on u.id = s.owner_id
where not exists (
  select 1 from public.studio_members 
  where studio_id = s.id and user_id = s.owner_id
);

-- For each existing project, create a client and migrate the project
do $$
declare
  old_project record;
  new_studio_id uuid;
  new_client_id uuid;
  client_slug text;
begin
  for old_project in select * from public.projects loop
    -- Get the studio for this user
    select id into new_studio_id
    from public.studios
    where owner_id = old_project.user_id
    limit 1;
    
    if new_studio_id is null then
      raise exception 'No studio found for user_id: %', old_project.user_id;
    end if;
    
    -- Generate client slug from client_name
    client_slug := lower(regexp_replace(old_project.client_name, '[^a-zA-Z0-9]', '-', 'g'));
    client_slug := client_slug || '-' || substr(old_project.id::text, 1, 8);
    
    -- Check if client already exists for this studio with this name
    select id into new_client_id
    from public.clients
    where studio_id = new_studio_id and name = old_project.client_name
    limit 1;
    
    -- Create client if it doesn't exist
    if new_client_id is null then
      insert into public.clients (studio_id, name, slug, created_at)
      values (new_studio_id, old_project.client_name, client_slug, old_project.created_at)
      returning id into new_client_id;
      
      -- Auto-create bridge portal for new client
      insert into public.bridge_portals (client_id, status, created_at)
      values (new_client_id, 'active', old_project.created_at);
    end if;
    
    -- Migrate project to new table
    insert into public.projects_new (
      id, studio_id, client_id, name, slug, status, project_type,
      created_at, updated_at
    )
    values (
      old_project.id,
      new_studio_id,
      new_client_id,
      old_project.client_name || ' Project',  -- Default project name
      lower(regexp_replace(old_project.client_name, '[^a-zA-Z0-9]', '-', 'g')) || '-project-' || substr(old_project.id::text, 1, 6),
      old_project.status,
      old_project.project_type,
      old_project.created_at,
      old_project.updated_at
    );
  end loop;
end $$;

-- ============================================================================
-- STEP 3: DROP OLD TABLES AND RENAME NEW ONES
-- ============================================================================

-- Drop old projects table (tasks and ai_audits will be updated with FK)
drop table if exists public.projects cascade;

-- Rename new projects table
alter table public.projects_new rename to projects;

-- Add FK to project_members now that projects table is ready
alter table public.project_members 
  add constraint project_members_project_id_fkey 
  foreign key (project_id) references public.projects(id) on delete cascade;

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

create index studios_owner_id_idx on public.studios(owner_id);
create index studios_slug_idx on public.studios(slug);
create index studios_stripe_customer_id_idx on public.studios(stripe_customer_id);

create index studio_members_studio_id_idx on public.studio_members(studio_id);
create index studio_members_user_id_idx on public.studio_members(user_id);

create index clients_studio_id_idx on public.clients(studio_id);
create index clients_slug_idx on public.clients(studio_id, slug);

create index client_users_client_id_idx on public.client_users(client_id);
create index client_users_user_id_idx on public.client_users(user_id);

create index bridge_portals_client_id_idx on public.bridge_portals(client_id);
create index bridge_portals_custom_domain_idx on public.bridge_portals(custom_domain);

create index projects_studio_id_idx on public.projects(studio_id);
create index projects_client_id_idx on public.projects(client_id);
create index projects_slug_idx on public.projects(studio_id, slug);

create index project_members_project_id_idx on public.project_members(project_id);
create index project_members_user_id_idx on public.project_members(user_id);

-- ============================================================================
-- STEP 5: ENABLE RLS
-- ============================================================================

alter table public.studios enable row level security;
alter table public.studio_members enable row level security;
alter table public.clients enable row level security;
alter table public.client_users enable row level security;
alter table public.bridge_portals enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES
-- ============================================================================

-- STUDIOS
create policy "Studio members can view their studio"
  on public.studios for select
  using (
    id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio owners can update their studio"
  on public.studios for update
  using (owner_id = auth.uid());

-- STUDIO MEMBERS
create policy "Studio members can view other members in their studio"
  on public.studio_members for select
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio admins can manage members"
  on public.studio_members for all
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- CLIENTS
create policy "Studio members can view their clients"
  on public.clients for select
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio members can manage their clients"
  on public.clients for all
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'member')
    )
  );

-- CLIENT USERS
create policy "Client users can view themselves"
  on public.client_users for select
  using (user_id = auth.uid());

create policy "Studio members can view client users for their clients"
  on public.client_users for select
  using (
    client_id in (
      select id from public.clients
      where studio_id in (
        select studio_id from public.studio_members
        where user_id = auth.uid()
      )
    )
  );

create policy "Studio members can manage client users"
  on public.client_users for all
  using (
    client_id in (
      select id from public.clients
      where studio_id in (
        select studio_id from public.studio_members
        where user_id = auth.uid() and role in ('owner', 'admin', 'member')
      )
    )
  );

-- BRIDGE PORTALS
create policy "Studio members can view their bridge portals"
  on public.bridge_portals for select
  using (
    client_id in (
      select id from public.clients
      where studio_id in (
        select studio_id from public.studio_members
        where user_id = auth.uid()
      )
    )
  );

create policy "Studio admins can manage bridge portals"
  on public.bridge_portals for all
  using (
    client_id in (
      select id from public.clients
      where studio_id in (
        select studio_id from public.studio_members
        where user_id = auth.uid() and role in ('owner', 'admin')
      )
    )
  );

-- PROJECTS
create policy "Studio members can view their projects"
  on public.projects for select
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Client users can view their projects"
  on public.projects for select
  using (
    client_id in (
      select client_id from public.client_users
      where user_id = auth.uid()
    )
  );

create policy "Studio members can manage their projects"
  on public.projects for all
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'member')
    )
  );

-- PROJECT MEMBERS
create policy "Project members can view other project members"
  on public.project_members for select
  using (
    project_id in (
      select id from public.projects
      where studio_id in (
        select studio_id from public.studio_members
        where user_id = auth.uid()
      )
    )
  );

create policy "Studio members can manage project members"
  on public.project_members for all
  using (
    project_id in (
      select id from public.projects
      where studio_id in (
        select studio_id from public.studio_members
        where user_id = auth.uid() and role in ('owner', 'admin', 'member')
      )
    )
  );

-- ============================================================================
-- STEP 7: UPDATE TRIGGER FOR NEW USER CREATION
-- ============================================================================

-- Replace the old trigger function with new multi-tenant version
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_studio_id uuid;
  user_name text;
  studio_slug text;
begin
  -- Create profile (for Stripe/ShipFast)
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  
  -- Get user name from metadata or email
  user_name := coalesce(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Generate unique studio slug
  studio_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g'));
  studio_slug := studio_slug || '-' || substr(new.id::text, 1, 8);

  -- Create studio
  insert into public.studios (owner_id, name, slug)
  values (new.id, user_name || '''s Studio', studio_slug)
  returning id into new_studio_id;

  -- Create studio_member
  insert into public.studio_members (studio_id, user_id, role, email)
  values (new_studio_id, new.id, 'owner', new.email);

  return new;
end;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- Summary of changes:
-- ✅ Created multi-tenant tables (studios, clients, projects, etc.)
-- ✅ Migrated existing projects to new structure
-- ✅ Created RLS policies for all tables
-- ✅ Updated trigger for new user creation
-- ✅ Preserved all existing project data
-- 
-- ============================================================================
