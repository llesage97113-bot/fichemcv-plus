-- Add one-time verification tokens for recovery email contacts.
-- This does not change Supabase Auth emails or application login identifiers.

create table if not exists public.user_contact_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_contact_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contact_verification_tokens_user_contact_id_fkey'
      and conrelid = 'public.user_contact_verification_tokens'::regclass
  ) then
    alter table public.user_contact_verification_tokens
      add constraint user_contact_verification_tokens_user_contact_id_fkey
      foreign key (user_contact_id)
      references public.user_contacts(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contact_verification_tokens_expires_after_created_check'
      and conrelid = 'public.user_contact_verification_tokens'::regclass
  ) then
    alter table public.user_contact_verification_tokens
      add constraint user_contact_verification_tokens_expires_after_created_check
      check (expires_at > created_at);
  end if;
end $$;

create index if not exists user_contact_verification_tokens_contact_idx
  on public.user_contact_verification_tokens (user_contact_id);

create index if not exists user_contact_verification_tokens_expires_at_idx
  on public.user_contact_verification_tokens (expires_at);

alter table public.user_contact_verification_tokens enable row level security;

drop policy if exists "No direct client access to contact verification tokens"
  on public.user_contact_verification_tokens;

-- No SELECT/INSERT/UPDATE/DELETE policy is created: browser clients cannot
-- access token rows directly. Server routes use the service role.

create or replace function public.confirm_user_contact_verification_token(
  p_token_hash text
)
returns table(status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.user_contact_verification_tokens%rowtype;
  v_contact public.user_contacts%rowtype;
  v_now timestamptz := now();
begin
  select *
  into v_token
  from public.user_contact_verification_tokens
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select 'invalid'::text;
    return;
  end if;

  if v_token.consumed_at is not null then
    return query select 'consumed'::text;
    return;
  end if;

  if v_token.expires_at <= v_now then
    return query select 'expired'::text;
    return;
  end if;

  select *
  into v_contact
  from public.user_contacts
  where id = v_token.user_contact_id
  for update;

  if not found or v_contact.contact_type <> 'email' then
    return query select 'invalid'::text;
    return;
  end if;

  update public.user_contacts
  set verified_at = coalesce(verified_at, v_now)
  where id = v_contact.id;

  update public.user_contact_verification_tokens
  set consumed_at = v_now
  where id = v_token.id
    and consumed_at is null;

  update public.user_contact_verification_tokens
  set consumed_at = coalesce(consumed_at, v_now)
  where user_contact_id = v_contact.id
    and id <> v_token.id
    and consumed_at is null;

  return query select 'success'::text;
end;
$$;

revoke all on function public.confirm_user_contact_verification_token(text)
  from public, anon, authenticated;

grant execute on function public.confirm_user_contact_verification_token(text)
  to service_role;
