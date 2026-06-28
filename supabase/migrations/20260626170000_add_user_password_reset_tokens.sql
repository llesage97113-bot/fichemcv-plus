-- Add one-time password reset tokens for verified recovery email flows.
-- The raw token is never stored; only its SHA-256 hash is persisted.

create extension if not exists pgcrypto;

create table if not exists public.user_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
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
    where conname = 'user_password_reset_tokens_user_id_fkey'
      and conrelid = 'public.user_password_reset_tokens'::regclass
  ) then
    alter table public.user_password_reset_tokens
      add constraint user_password_reset_tokens_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_password_reset_tokens_expires_after_created_check'
      and conrelid = 'public.user_password_reset_tokens'::regclass
  ) then
    alter table public.user_password_reset_tokens
      add constraint user_password_reset_tokens_expires_after_created_check
      check (expires_at > created_at);
  end if;
end $$;

create index if not exists user_password_reset_tokens_user_created_idx
  on public.user_password_reset_tokens (user_id, created_at desc);

create index if not exists user_password_reset_tokens_expires_at_idx
  on public.user_password_reset_tokens (expires_at);

alter table public.user_password_reset_tokens enable row level security;

drop policy if exists "No direct client access to password reset tokens"
  on public.user_password_reset_tokens;

-- No SELECT/INSERT/UPDATE/DELETE policy is created: browser clients cannot
-- access token rows directly. Server routes use the service role.

create or replace function public.consume_user_password_reset_token(
  p_token_hash text
)
returns table(status text, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.user_password_reset_tokens%rowtype;
  v_now timestamptz := now();
begin
  update public.user_password_reset_tokens
  set consumed_at = coalesce(consumed_at, v_now)
  where consumed_at is null
    and expires_at <= v_now;

  select *
  into v_token
  from public.user_password_reset_tokens
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  if v_token.consumed_at is not null then
    if v_token.expires_at <= v_now then
      return query select 'expired'::text, null::uuid;
    end if;

    return query select 'consumed'::text, null::uuid;
    return;
  end if;

  if v_token.expires_at <= v_now then
    update public.user_password_reset_tokens
    set consumed_at = v_now
    where id = v_token.id
      and consumed_at is null;

    return query select 'expired'::text, null::uuid;
    return;
  end if;

  update public.user_password_reset_tokens
    set consumed_at = v_now
    where id = v_token.id
      and consumed_at is null;

  update public.user_password_reset_tokens
  set consumed_at = coalesce(consumed_at, v_now)
  where user_id = v_token.user_id
    and id <> v_token.id
    and consumed_at is null;

  return query select 'success'::text, v_token.user_id;
end;
$$;

create or replace function public.invalidate_expired_user_password_reset_tokens()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.user_password_reset_tokens
  set consumed_at = coalesce(consumed_at, now())
  where consumed_at is null
    and expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.consume_user_password_reset_token(text)
  from public, anon, authenticated;
revoke all on function public.invalidate_expired_user_password_reset_tokens()
  from public, anon, authenticated;

grant execute on function public.consume_user_password_reset_token(text)
  to service_role;
grant execute on function public.invalidate_expired_user_password_reset_tokens()
  to service_role;
