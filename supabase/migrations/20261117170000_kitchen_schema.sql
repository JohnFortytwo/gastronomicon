-- Gastronomicon tables. Shares auth.users with another project.
-- Do not rename kitchen_ identifiers.

create table public.kitchen_households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.kitchen_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.kitchen_households (id) on delete set null,
  display_name text,
  default_adults int not null default 2 check (default_adults >= 0),
  default_kids int not null default 2 check (default_kids >= 0),
  default_gourmands int not null default 0 check (default_gourmands >= 0),
  created_at timestamptz not null default now()
);

create table public.kitchen_recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kitchen_households (id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'main' check (category in ('main', 'soup', 'side', 'dessert', 'starter')),
  prep_time_mins int check (prep_time_mins is null or prep_time_mins >= 0),
  cook_time_mins int check (cook_time_mins is null or cook_time_mins >= 0),
  base_portions int not null default 4 check (base_portions > 0),
  calories_per_portion int check (calories_per_portion is null or calories_per_portion >= 0),
  kaloricke_tabulky_name text,
  is_public boolean not null default false,
  image_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.kitchen_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.kitchen_recipes (id) on delete cascade,
  name text not null,
  amount numeric check (amount is null or amount >= 0),
  unit text,
  category text,
  is_hero boolean not null default false
);

create table public.kitchen_recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.kitchen_recipes (id) on delete cascade,
  step_number int not null check (step_number > 0),
  instruction text not null
);

create table public.kitchen_recipe_companions (
  recipe_id uuid not null references public.kitchen_recipes (id) on delete cascade,
  companion_id uuid not null references public.kitchen_recipes (id) on delete cascade,
  relation_type text not null check (relation_type in ('side_dish', 'soup', 'dessert')),
  primary key (recipe_id, companion_id),
  constraint kitchen_recipe_companions_not_self check (recipe_id <> companion_id)
);

create table public.kitchen_ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kitchen_households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action_type text not null,
  created_at timestamptz not null default now()
);

create index kitchen_profiles_household_id_idx on public.kitchen_profiles (household_id);
create index kitchen_recipes_household_id_idx on public.kitchen_recipes (household_id);
create index kitchen_recipes_is_public_idx on public.kitchen_recipes (is_public);
create index kitchen_recipe_ingredients_recipe_id_idx on public.kitchen_recipe_ingredients (recipe_id);
create index kitchen_recipe_ingredients_hero_idx on public.kitchen_recipe_ingredients (recipe_id) where is_hero;
create index kitchen_recipe_steps_recipe_id_idx on public.kitchen_recipe_steps (recipe_id, step_number);
create index kitchen_recipe_companions_companion_id_idx on public.kitchen_recipe_companions (companion_id);
create index kitchen_ai_usage_logs_month_idx on public.kitchen_ai_usage_logs (household_id, created_at);

create or replace function public.kitchen_current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.kitchen_profiles where id = auth.uid()
$$;

create or replace function public.kitchen_create_household(household_name text, display_name text)
returns public.kitchen_households
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.kitchen_households;
begin
  if auth.uid() is null then
    raise exception 'Nejste přihlášeni.';
  end if;
  if length(trim(coalesce(household_name, ''))) = 0 then
    raise exception 'Název domácnosti je povinný.';
  end if;

  insert into public.kitchen_households (name)
  values (trim(household_name))
  returning * into created;

  insert into public.kitchen_profiles (id, household_id, display_name)
  values (auth.uid(), created.id, nullif(trim(coalesce(display_name, '')), ''))
  on conflict (id) do update
    set household_id = excluded.household_id,
        display_name = coalesce(excluded.display_name, public.kitchen_profiles.display_name);

  return created;
end;
$$;

create or replace function public.kitchen_join_household(target_household_id uuid, display_name text)
returns public.kitchen_households
language plpgsql
security definer
set search_path = public
as $$
declare
  found public.kitchen_households;
begin
  if auth.uid() is null then
    raise exception 'Nejste přihlášeni.';
  end if;

  select * into found from public.kitchen_households where id = target_household_id;
  if found.id is null then
    raise exception 'Domácnost neexistuje.';
  end if;

  insert into public.kitchen_profiles (id, household_id, display_name)
  values (auth.uid(), found.id, nullif(trim(coalesce(display_name, '')), ''))
  on conflict (id) do update
    set household_id = excluded.household_id,
        display_name = coalesce(excluded.display_name, public.kitchen_profiles.display_name);

  return found;
end;
$$;

revoke all on function public.kitchen_current_household_id() from public, anon;
revoke all on function public.kitchen_create_household(text, text) from public, anon;
revoke all on function public.kitchen_join_household(uuid, text) from public, anon;
grant execute on function public.kitchen_current_household_id() to authenticated;
grant execute on function public.kitchen_create_household(text, text) to authenticated;
grant execute on function public.kitchen_join_household(uuid, text) to authenticated;

alter table public.kitchen_households enable row level security;
alter table public.kitchen_profiles enable row level security;
alter table public.kitchen_recipes enable row level security;
alter table public.kitchen_recipe_ingredients enable row level security;
alter table public.kitchen_recipe_steps enable row level security;
alter table public.kitchen_recipe_companions enable row level security;
alter table public.kitchen_ai_usage_logs enable row level security;

grant select, insert, update, delete on public.kitchen_households to authenticated;
grant select, insert, update, delete on public.kitchen_profiles to authenticated;
grant select, insert, update, delete on public.kitchen_recipes to authenticated;
grant select, insert, update, delete on public.kitchen_recipe_ingredients to authenticated;
grant select, insert, update, delete on public.kitchen_recipe_steps to authenticated;
grant select, insert, update, delete on public.kitchen_recipe_companions to authenticated;
grant select, insert on public.kitchen_ai_usage_logs to authenticated;

revoke all on public.kitchen_households from anon;
revoke all on public.kitchen_profiles from anon;
revoke all on public.kitchen_recipes from anon;
revoke all on public.kitchen_recipe_ingredients from anon;
revoke all on public.kitchen_recipe_steps from anon;
revoke all on public.kitchen_recipe_companions from anon;
revoke all on public.kitchen_ai_usage_logs from anon;

create policy kitchen_households_select on public.kitchen_households
for select to authenticated
using (id = public.kitchen_current_household_id());

create policy kitchen_households_insert on public.kitchen_households
for insert to authenticated
with check (auth.uid() is not null);

create policy kitchen_households_update on public.kitchen_households
for update to authenticated
using (id = public.kitchen_current_household_id())
with check (id = public.kitchen_current_household_id());

create policy kitchen_profiles_select on public.kitchen_profiles
for select to authenticated
using (id = auth.uid() or household_id = public.kitchen_current_household_id());

create policy kitchen_profiles_insert on public.kitchen_profiles
for insert to authenticated
with check (id = auth.uid());

create policy kitchen_profiles_update on public.kitchen_profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy kitchen_recipes_select on public.kitchen_recipes
for select to authenticated
using (
  household_id = public.kitchen_current_household_id()
  or is_public
);

create policy kitchen_recipes_insert on public.kitchen_recipes
for insert to authenticated
with check (household_id = public.kitchen_current_household_id());

create policy kitchen_recipes_update on public.kitchen_recipes
for update to authenticated
using (household_id = public.kitchen_current_household_id())
with check (household_id = public.kitchen_current_household_id());

create policy kitchen_recipes_delete on public.kitchen_recipes
for delete to authenticated
using (household_id = public.kitchen_current_household_id());

create policy kitchen_recipe_ingredients_select on public.kitchen_recipe_ingredients
for select to authenticated
using (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and (recipe.household_id = public.kitchen_current_household_id() or recipe.is_public)
  )
);

create policy kitchen_recipe_ingredients_write on public.kitchen_recipe_ingredients
for all to authenticated
using (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and recipe.household_id = public.kitchen_current_household_id()
  )
)
with check (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and recipe.household_id = public.kitchen_current_household_id()
  )
);

create policy kitchen_recipe_steps_select on public.kitchen_recipe_steps
for select to authenticated
using (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and (recipe.household_id = public.kitchen_current_household_id() or recipe.is_public)
  )
);

create policy kitchen_recipe_steps_write on public.kitchen_recipe_steps
for all to authenticated
using (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and recipe.household_id = public.kitchen_current_household_id()
  )
)
with check (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and recipe.household_id = public.kitchen_current_household_id()
  )
);

create policy kitchen_recipe_companions_select on public.kitchen_recipe_companions
for select to authenticated
using (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and (recipe.household_id = public.kitchen_current_household_id() or recipe.is_public)
  )
);

create policy kitchen_recipe_companions_write on public.kitchen_recipe_companions
for all to authenticated
using (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and recipe.household_id = public.kitchen_current_household_id()
  )
)
with check (
  exists (
    select 1 from public.kitchen_recipes recipe
    where recipe.id = recipe_id
      and recipe.household_id = public.kitchen_current_household_id()
  )
  and exists (
    select 1 from public.kitchen_recipes companion
    where companion.id = companion_id
      and (companion.household_id = public.kitchen_current_household_id() or companion.is_public)
  )
);

create policy kitchen_ai_usage_logs_select on public.kitchen_ai_usage_logs
for select to authenticated
using (household_id = public.kitchen_current_household_id());

create policy kitchen_ai_usage_logs_insert on public.kitchen_ai_usage_logs
for insert to authenticated
with check (
  household_id = public.kitchen_current_household_id()
  and (user_id is null or user_id = auth.uid())
);
