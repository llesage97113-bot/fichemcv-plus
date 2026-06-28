-- Patch 8: short student login identifiers and explicit recovery consent.
-- Apply manually in Supabase SQL Editor. Do not run Supabase local reset for this project.

create table if not exists public.student_login_identifiers (
  identifier text primary key,
  auth_email text not null unique,
  user_id uuid null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_login_identifiers_user_id_fkey'
      and conrelid = 'public.student_login_identifiers'::regclass
  ) then
    alter table public.student_login_identifiers
      add constraint student_login_identifiers_user_id_fkey
      foreign key (user_id)
      references public.app_users(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_login_identifiers_identifier_check'
      and conrelid = 'public.student_login_identifiers'::regclass
  ) then
    alter table public.student_login_identifiers
      add constraint student_login_identifiers_identifier_check
      check (identifier ~ '^[a-z0-9]+[0-9]{4}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_login_identifiers_auth_email_check'
      and conrelid = 'public.student_login_identifiers'::regclass
  ) then
    alter table public.student_login_identifiers
      add constraint student_login_identifiers_auth_email_check
      check (auth_email = identifier || '@fichemcv.local');
  end if;
end $$;

create index if not exists student_login_identifiers_user_id_idx
  on public.student_login_identifiers (user_id);

alter table public.student_login_identifiers enable row level security;

drop policy if exists "No direct client access to student login identifiers"
  on public.student_login_identifiers;

-- Short identifiers are managed only by server-side service-role routes.

alter table public.user_contacts
  add column if not exists can_be_used_for_recovery boolean not null default false;

-- Backfill limité aux contacts email historiques créés par le formulaire
-- dédié de récupération d'adresse. Le modèle Patch 6/7 n'exposait pas d'autre
-- writer applicatif pour `user_contacts` de type email.
update public.user_contacts
set can_be_used_for_recovery = true
where contact_type = 'email'
  and can_be_used_for_recovery = false;

create index if not exists user_contacts_recovery_email_idx
  on public.user_contacts (user_id, verified_at)
  where contact_type = 'email' and can_be_used_for_recovery;

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
