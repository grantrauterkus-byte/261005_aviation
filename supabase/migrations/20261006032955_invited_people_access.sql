-- Invite-only access, part 2: only invited people can read anything, and scenarios are private to their owner.
-- Visitors who are not signed in (anon) have no policy on any table, so row level security returns nothing to them.

-- Reference tables: change the existing read rules to invited people only.
alter policy "Everyone can read jets" on public.jets to authenticated using (public.is_member());
alter policy "Everyone can read jets" on public.jets rename to "Invited people can read jets";
alter policy "Everyone can read assumptions" on public.assumptions to authenticated using (public.is_member());
alter policy "Everyone can read assumptions" on public.assumptions rename to "Invited people can read assumptions";
alter policy "Everyone can read airports" on public.airports to authenticated using (public.is_member());
alter policy "Everyone can read airports" on public.airports rename to "Invited people can read airports";

-- Scenarios saved before this change have no owner and are not visible to anyone until assigned one.
alter table public.scenarios add column owner_id uuid references auth.users (id) on delete cascade default auth.uid();
create index scenarios_owner_idx on public.scenarios (owner_id, updated_at desc);

create policy "Owners read their scenarios" on public.scenarios
  for select to authenticated using (owner_id = auth.uid() and public.is_member());
create policy "Owners add scenarios" on public.scenarios
  for insert to authenticated with check (owner_id = auth.uid() and public.is_member());
create policy "Owners change their scenarios" on public.scenarios
  for update to authenticated using (owner_id = auth.uid() and public.is_member()) with check (owner_id = auth.uid());
create policy "Owners delete their scenarios" on public.scenarios
  for delete to authenticated using (owner_id = auth.uid() and public.is_member());

create policy "Owners read their changes" on public.scenario_changes
  for select to authenticated using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.owner_id = auth.uid()) and public.is_member());
create policy "Owners add changes" on public.scenario_changes
  for insert to authenticated with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.owner_id = auth.uid()) and public.is_member());
create policy "Owners remove changes" on public.scenario_changes
  for delete to authenticated using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.owner_id = auth.uid()) and public.is_member());

grant select, insert, update, delete on public.scenarios to authenticated;
grant select, insert, delete on public.scenario_changes to authenticated;

-- The scenario functions now run as the caller, so the rules above decide what they can reach.
alter function public._set_scenario_changes(uuid, jsonb) security invoker;
alter function public.get_scenario(uuid) security invoker;
alter function public.create_scenario(text, jsonb, jsonb) security invoker;
alter function public.update_scenario(uuid, text, jsonb, jsonb) security invoker;
grant execute on function public._set_scenario_changes(uuid, jsonb) to authenticated;
