-- Jet Ownership Finder: initial schema.
-- Reference tables (jets, assumptions, airports) are readable by everyone and written only by the load script
-- (service role). Scenarios are reached only through the functions at the bottom, which need the scenario's id.

-- Jets -----------------------------------------------------------------------
create table public.jets (
  id text primary key,                       -- e.g. 'challenger-300', matches the prefix of assumption ids
  name text not null unique,
  class text not null check (class in ('Midsize', 'Super-midsize')),
  sort_order integer not null,
  most_sold_build_years text not null,       -- e.g. '2004-2008'
  active_us_fleet integer,
  sales_last_5_years integer,
  sales_per_year_avg numeric
);

-- Assumptions Library (one row per row of data/assumptions.csv) ---------------
create table public.assumptions (
  id text primary key,
  sort_order integer not null,
  item text not null,
  jet text not null,                         -- jet name, 'All jets', 'Midsize' or 'Super-midsize'
  applies_to text not null check (applies_to in ('Plane-specific', 'Class-wide', 'Same for all')),
  value text not null,                       -- numbers, or 'Yes' / 'No'
  low text,
  high text,
  unit text not null,
  type text not null check (type in ('Measured', 'Published', 'Our assumption')),
  source_name text,
  source_url text,
  source_date text,
  confidence text not null check (confidence in ('High', 'Medium', 'Low')),
  notes text
);

-- Airports (from OurAirports) --------------------------------------------------
create table public.airports (
  ident text primary key,                    -- OurAirports identifier, e.g. 'KTEB'
  code text not null,                        -- code shown to people: IATA code if any, else local or ICAO code
  name text not null,
  municipality text,
  country text not null,
  latitude double precision not null,
  longitude double precision not null,
  longest_runway_ft integer
);
create index airports_code_idx on public.airports (upper(code));
create index airports_name_idx on public.airports (lower(name) text_pattern_ops);

-- Scenarios ------------------------------------------------------------------
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  inputs jsonb not null check (pg_column_size(inputs) < 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scenario_changes (
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  assumption_id text not null references public.assumptions (id),
  value text not null check (char_length(value) <= 50),
  primary key (scenario_id, assumption_id)
);

-- Access rules ----------------------------------------------------------------
alter table public.jets enable row level security;
alter table public.assumptions enable row level security;
alter table public.airports enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_changes enable row level security;

create policy "Everyone can read jets" on public.jets for select to anon, authenticated using (true);
create policy "Everyone can read assumptions" on public.assumptions for select to anon, authenticated using (true);
create policy "Everyone can read airports" on public.airports for select to anon, authenticated using (true);
grant select on public.jets, public.assumptions, public.airports to anon, authenticated;
revoke insert, update, delete, truncate on public.jets, public.assumptions, public.airports from anon, authenticated;
revoke all on public.scenarios, public.scenario_changes from anon, authenticated;
-- No policies on scenarios or scenario_changes: they cannot be listed or written directly.
-- They are read and written only through the functions below, which require the scenario's id.

-- Replace a scenario's changed values with the given set ({"assumption id": "value", ...}).
create or replace function public._set_scenario_changes(p_id uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from scenario_changes where scenario_id = p_id;
  if p_changes is not null and jsonb_typeof(p_changes) = 'object' then
    insert into scenario_changes (scenario_id, assumption_id, value)
    select p_id, key, value from jsonb_each_text(p_changes);
  end if;
end;
$$;
revoke all on function public._set_scenario_changes(uuid, jsonb) from public, anon, authenticated;

-- Read one scenario with its changes. Returns nothing if the id is unknown.
create or replace function public.get_scenario(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'inputs', s.inputs,
    'changes', coalesce((select jsonb_object_agg(c.assumption_id, c.value)
                         from scenario_changes c where c.scenario_id = s.id), '{}'::jsonb),
    'created_at', s.created_at,
    'updated_at', s.updated_at
  )
  from scenarios s
  where s.id = p_id;
$$;

-- Create a scenario and return its id.
create or replace function public.create_scenario(p_name text, p_inputs jsonb, p_changes jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into scenarios (name, inputs) values (p_name, p_inputs) returning id into new_id;
  perform _set_scenario_changes(new_id, p_changes);
  return new_id;
end;
$$;

-- Update a scenario the caller holds the id of. Returns false if the id is unknown.
create or replace function public.update_scenario(p_id uuid, p_name text, p_inputs jsonb, p_changes jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update scenarios set name = p_name, inputs = p_inputs, updated_at = now() where id = p_id;
  if not found then
    return false;
  end if;
  perform _set_scenario_changes(p_id, p_changes);
  return true;
end;
$$;

revoke all on function public.get_scenario(uuid) from public;
revoke all on function public.create_scenario(text, jsonb, jsonb) from public;
revoke all on function public.update_scenario(uuid, text, jsonb, jsonb) from public;
grant execute on function public.get_scenario(uuid) to anon, authenticated;
grant execute on function public.create_scenario(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.update_scenario(uuid, text, jsonb, jsonb) to anon, authenticated;
