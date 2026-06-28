-- Allow short identifiers to point to legacy Supabase Auth emails.
-- Safe to run after Patch 8 has already been applied.

alter table public.student_login_identifiers
  drop constraint if exists student_login_identifiers_auth_email_check;

do $$
begin
  if exists (
    select 1
    from public.student_login_identifiers
    where user_id is not null
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Cannot create unique student_login_identifiers user_id index: duplicate user_id values exist.';
  end if;
end $$;

create unique index if not exists student_login_identifiers_user_id_unique_idx
  on public.student_login_identifiers (user_id)
  where user_id is not null;
