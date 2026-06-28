-- Fix ambiguous column references in the password reset token consumption RPC.
-- The raw token is never exposed; callers pass only its SHA-256 hash.

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
  update public.user_password_reset_tokens as reset_token
  set consumed_at = coalesce(reset_token.consumed_at, v_now)
  where reset_token.consumed_at is null
    and reset_token.expires_at <= v_now;

  select reset_token.*
  into v_token
  from public.user_password_reset_tokens as reset_token
  where reset_token.token_hash = p_token_hash
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
    update public.user_password_reset_tokens as reset_token
    set consumed_at = v_now
    where reset_token.id = v_token.id
      and reset_token.consumed_at is null;

    return query select 'expired'::text, null::uuid;
    return;
  end if;

  update public.user_password_reset_tokens as reset_token
  set consumed_at = v_now
  where reset_token.id = v_token.id
    and reset_token.consumed_at is null;

  update public.user_password_reset_tokens as reset_token
  set consumed_at = coalesce(reset_token.consumed_at, v_now)
  where reset_token.user_id = v_token.user_id
    and reset_token.id <> v_token.id
    and reset_token.consumed_at is null;

  return query select 'success'::text, v_token.user_id;
end;
$$;

revoke all on function public.consume_user_password_reset_token(text)
  from public, anon, authenticated;

grant execute on function public.consume_user_password_reset_token(text)
  to service_role;
