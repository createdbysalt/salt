-- ============================================================================
-- FIX: Break RLS cycles between clients <-> client_users (and bridge_portals)
-- ============================================================================
--
-- Root cause:
-- - clients RLS policy references client_users
-- - client_users RLS policies (for studio members) reference clients
-- This creates a circular dependency that Postgres reports as:
--   "infinite recursion detected in policy for relation \"clients\""
--
-- Fix strategy:
-- - Denormalize studio_id onto client_users and bridge_portals
-- - Backfill studio_id from clients
-- - Rewrite client_users / bridge_portals RLS to use studio_id (no clients subquery)
-- - Keep clients policy referencing client_users (now one-way, non-recursive)
-- ============================================================================

-- 1) Add studio_id columns (nullable for backfill)
alter table public.client_users
  add column if not exists studio_id uuid;

alter table public.bridge_portals
  add column if not exists studio_id uuid;

-- 2) Backfill studio_id
update public.client_users cu
set studio_id = c.studio_id
from public.clients c
where c.id = cu.client_id
  and cu.studio_id is null;

update public.bridge_portals bp
set studio_id = c.studio_id
from public.clients c
where c.id = bp.client_id
  and bp.studio_id is null;

-- 3) Add FKs + NOT NULL (after backfill)
alter table public.client_users
  add constraint client_users_studio_id_fkey
  foreign key (studio_id) references public.studios(id) on delete cascade;

alter table public.bridge_portals
  add constraint bridge_portals_studio_id_fkey
  foreign key (studio_id) references public.studios(id) on delete cascade;

alter table public.client_users
  alter column studio_id set not null;

alter table public.bridge_portals
  alter column studio_id set not null;

create index if not exists client_users_studio_id_idx on public.client_users(studio_id);
create index if not exists bridge_portals_studio_id_idx on public.bridge_portals(studio_id);

-- 4) Ensure studio_id stays consistent on inserts/updates
create or replace function public.set_client_users_studio_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select c.studio_id into new.studio_id
  from public.clients c
  where c.id = new.client_id;

  if new.studio_id is null then
    raise exception 'client_users.client_id % does not map to a client with a studio_id', new.client_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_client_users_studio_id on public.client_users;
create trigger trg_set_client_users_studio_id
before insert or update of client_id
on public.client_users
for each row
execute function public.set_client_users_studio_id();

create or replace function public.set_bridge_portals_studio_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select c.studio_id into new.studio_id
  from public.clients c
  where c.id = new.client_id;

  if new.studio_id is null then
    raise exception 'bridge_portals.client_id % does not map to a client with a studio_id', new.client_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_bridge_portals_studio_id on public.bridge_portals;
create trigger trg_set_bridge_portals_studio_id
before insert or update of client_id
on public.bridge_portals
for each row
execute function public.set_bridge_portals_studio_id();

-- 5) Rewrite RLS policies to avoid clients <-> client_users recursion
--
-- CLIENT_USERS
drop policy if exists "Studio members can view client users for their clients" on public.client_users;
drop policy if exists "Studio members can manage client users" on public.client_users;
drop policy if exists "Users can view their own client memberships" on public.client_users;
drop policy if exists "Client users can view themselves" on public.client_users;

create policy "Client users can view themselves"
  on public.client_users for select
  using (user_id = auth.uid());

create policy "Studio members can view client users via studio_id"
  on public.client_users for select
  using (
    studio_id in (
      select studio_id
      from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio members can manage client users via studio_id"
  on public.client_users for insert
  with check (
    studio_id in (
      select studio_id
      from public.studio_members
      where user_id = auth.uid()
        and role = any (array['owner'::text, 'admin'::text, 'member'::text])
    )
  );

create policy "Studio members can update client users via studio_id"
  on public.client_users for update
  using (
    studio_id in (
      select studio_id
      from public.studio_members
      where user_id = auth.uid()
        and role = any (array['owner'::text, 'admin'::text, 'member'::text])
    )
  );

create policy "Studio members can delete client users via studio_id"
  on public.client_users for delete
  using (
    studio_id in (
      select studio_id
      from public.studio_members
      where user_id = auth.uid()
        and role = any (array['owner'::text, 'admin'::text, 'member'::text])
    )
  );

-- BRIDGE_PORTALS
drop policy if exists "Studio members can view their bridge portals" on public.bridge_portals;
drop policy if exists "Studio admins can manage bridge portals" on public.bridge_portals;
drop policy if exists "Client users can view their bridge portal" on public.bridge_portals;

create policy "Client users can view their bridge portal"
  on public.bridge_portals for select
  using (
    exists (
      select 1
      from public.client_users cu
      where cu.client_id = bridge_portals.client_id
        and cu.user_id = auth.uid()
    )
  );

create policy "Studio members can view bridge portals via studio_id"
  on public.bridge_portals for select
  using (
    studio_id in (
      select studio_id
      from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio admins can manage bridge portals via studio_id"
  on public.bridge_portals for insert
  with check (
    studio_id in (
      select studio_id
      from public.studio_members
      where user_id = auth.uid()
        and role = any (array['owner'::text, 'admin'::text])
    )
  );

create policy "Studio admins can update bridge portals via studio_id"
  on public.bridge_portals for update
  using (
    studio_id in (
      select studio_id
      from public.studio_members
      where user_id = auth.uid()
        and role = any (array['owner'::text, 'admin'::text])
    )
  );

create policy "Studio admins can delete bridge portals via studio_id"
  on public.bridge_portals for delete
  using (
    studio_id in (
      select studio_id
      from public.studio_members
      where user_id = auth.uid()
        and role = any (array['owner'::text, 'admin'::text])
    )
  );


