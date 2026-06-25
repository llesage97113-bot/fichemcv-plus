-- Prepare the application-side contact model for future account recovery.
-- This migration does not change Supabase Auth users, credentials, roles, or login flows.

create extension if not exists pgcrypto;

alter table public.app_users
  add column if not exists account_status text not null default 'active',
  add column if not exists legacy_login_email text null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_account_status_check'
      and conrelid = 'public.app_users'::regclass
  ) then
    alter table public.app_users
      add constraint app_users_account_status_check
      check (
        account_status in (
          'pending',
          'active',
          'suspended',
          'recovery_required',
          'disabled'
        )
      );
  end if;
end $$;

update public.app_users
set legacy_login_email = email
where legacy_login_email is null
  and email is not null
  and lower(email) like '%@fichemcv.local';

create table if not exists public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_type text not null,
  contact_value text not null,
  normalized_value text not null,
  is_primary boolean not null default false,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_user_id_fkey'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    alter table public.user_contacts
      add constraint user_contacts_user_id_fkey
      foreign key (user_id)
      references public.app_users(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_contact_value_not_blank_check'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    alter table public.user_contacts
      add constraint user_contacts_contact_value_not_blank_check
      check (btrim(contact_value) <> '');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_normalized_value_not_blank_check'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    alter table public.user_contacts
      add constraint user_contacts_normalized_value_not_blank_check
      check (btrim(normalized_value) <> '');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_contact_type_check'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    alter table public.user_contacts
      add constraint user_contacts_contact_type_check
      check (contact_type in ('email', 'phone'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_contact_type_normalized_value_key'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    alter table public.user_contacts
      add constraint user_contacts_contact_type_normalized_value_key
      unique (contact_type, normalized_value);
  end if;
end $$;

create unique index if not exists user_contacts_one_primary_per_user_type_idx
  on public.user_contacts (user_id, contact_type)
  where is_primary;

create index if not exists user_contacts_user_id_idx
  on public.user_contacts (user_id);

create index if not exists user_contacts_type_normalized_value_idx
  on public.user_contacts (contact_type, normalized_value);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Supabase/PostgREST executes browser requests with JWT role claim "anon"
-- before sign-in and "authenticated" after sign-in; PostgREST also switches
-- the database role accordingly for ordinary client requests. Requests made
-- with the server service role carry an elevated role claim and are not
-- treated as those client roles. This helper checks both current_user and the
-- PostgREST JWT role claim to block direct client changes even if table-level
-- UPDATE privileges are granted elsewhere.
create or replace function public.is_client_api_role()
returns boolean
language sql
stable
as $$
  select current_user in ('anon', 'authenticated')
    or current_setting('request.jwt.claim.role', true) in ('anon', 'authenticated');
$$;

create or replace function public.protect_app_users_client_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_client_api_role() then
    if new.account_status is distinct from old.account_status then
      raise exception 'account_status cannot be changed by client roles';
    end if;

    if new.legacy_login_email is distinct from old.legacy_login_email then
      raise exception 'legacy_login_email cannot be changed by client roles';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_app_users_client_admin_fields on public.app_users;
create trigger protect_app_users_client_admin_fields
before update on public.app_users
for each row
execute function public.protect_app_users_client_admin_fields();

drop trigger if exists set_app_users_updated_at on public.app_users;
create trigger set_app_users_updated_at
before update on public.app_users
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_contacts_updated_at on public.user_contacts;
create trigger set_user_contacts_updated_at
before update on public.user_contacts
for each row
execute function public.set_updated_at();

create or replace function public.protect_user_contacts_client_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_client_api_role() then
    if tg_op = 'INSERT' and new.verified_at is not null then
      raise exception 'verified_at cannot be set by client roles';
    end if;

    if tg_op = 'UPDATE' then
      if new.user_id is distinct from old.user_id then
        raise exception 'user_id cannot be changed by client roles';
      end if;

      if new.verified_at is distinct from old.verified_at then
        raise exception 'verified_at cannot be changed by client roles';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_user_contacts_client_fields on public.user_contacts;
create trigger protect_user_contacts_client_fields
before insert or update on public.user_contacts
for each row
execute function public.protect_user_contacts_client_fields();

alter table public.user_contacts enable row level security;

drop policy if exists "Users can read their own contacts" on public.user_contacts;
create policy "Users can read their own contacts"
on public.user_contacts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own unverified contacts" on public.user_contacts;
drop policy if exists "Users can update their own unverified contacts" on public.user_contacts;
drop policy if exists "Users can delete their own non-primary contacts" on public.user_contacts;

-- No client INSERT/UPDATE/DELETE policies are created in this patch.
-- Writes to user_contacts are temporarily reserved for future server routes
-- that will normalize contact_value into normalized_value and run the
-- verification workflow before marking a contact as verified.
revoke update (account_status) on public.app_users from anon, authenticated;
revoke update (legacy_login_email) on public.app_users from anon, authenticated;
