-- Invite-only access, part 1: the people table and helper functions.
-- People are added (and their temporary passwords set) by the "people" edge function, which checks the caller is an admin.
create table public.people (
  id uuid primary key references auth.users (id) on delete cascade,
  sign_in_as text not null unique,            -- what the person types to sign in: an email, a phone number or a name
  kind text not null check (kind in ('Email', 'Phone', 'Name')),
  display_name text not null check (char_length(display_name) between 1 and 100),
  is_admin boolean not null default false,
  must_change_password boolean not null default true,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.people enable row level security;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from people where id = auth.uid()); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from people where id = auth.uid() and is_admin); $$;

-- Called after a person replaces their temporary password.
create or replace function public.mark_password_changed()
returns void language sql security definer set search_path = public
as $$ update people set must_change_password = false where id = auth.uid(); $$;

create policy "People see themselves; admins see everyone" on public.people
  for select to authenticated using (id = auth.uid() or public.is_admin());
revoke all on public.people from anon, authenticated;
grant select on public.people to authenticated;

revoke all on function public.is_member() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.mark_password_changed() from public, anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.mark_password_changed() to authenticated;
