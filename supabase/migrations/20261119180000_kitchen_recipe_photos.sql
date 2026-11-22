-- Dish photos for kitchen recipes.
-- One public bucket, files at {user_id}/{recipe_id}.jpg.
-- Cap is 40 photos per user. Keep that number in sync with
-- MAX_RECIPE_PHOTOS_PER_USER in src/lib/kitchen/constants.ts.
-- The trigger returns early for every other bucket, so the shared
-- Supabase project is left alone.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kitchen-recipe-photos',
  'kitchen-recipe-photos',
  true,
  2097152,
  array['image/jpeg']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists kitchen_recipe_photos_select on storage.objects;
drop policy if exists kitchen_recipe_photos_insert on storage.objects;
drop policy if exists kitchen_recipe_photos_update on storage.objects;
drop policy if exists kitchen_recipe_photos_delete on storage.objects;

create policy kitchen_recipe_photos_select on storage.objects
for select to authenticated
using (
  bucket_id = 'kitchen-recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy kitchen_recipe_photos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'kitchen-recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy kitchen_recipe_photos_update on storage.objects
for update to authenticated
using (
  bucket_id = 'kitchen-recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'kitchen-recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy kitchen_recipe_photos_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'kitchen-recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.kitchen_enforce_recipe_photo_limit()
returns trigger
language plpgsql
set search_path = public, storage
as $$
declare
  owner_folder text;
  file_name text;
  recipe_uuid uuid;
  existing_count int;
begin
  if new.bucket_id is distinct from 'kitchen-recipe-photos' then
    return new;
  end if;

  owner_folder := split_part(new.name, '/', 1);
  file_name := split_part(new.name, '/', 2);

  if owner_folder is distinct from auth.uid()::text
     or split_part(new.name, '/', 3) <> ''
     or file_name !~* '^[0-9a-f-]{36}\.jpg$'
  then
    raise exception 'kitchen_photo_path';
  end if;

  begin
    recipe_uuid := replace(file_name, '.jpg', '')::uuid;
  exception
    when others then
      raise exception 'kitchen_photo_path';
  end;

  if not exists (
    select 1
    from public.kitchen_recipes recipe
    where recipe.id = recipe_uuid
      and recipe.created_by = auth.uid()
      and recipe.household_id = public.kitchen_current_household_id()
  ) then
    raise exception 'kitchen_photo_recipe';
  end if;

  select count(*)::int
    into existing_count
  from storage.objects
  where bucket_id = 'kitchen-recipe-photos'
    and split_part(name, '/', 1) = owner_folder
    and name is distinct from new.name;

  if existing_count >= 40 then
    raise exception 'kitchen_photo_limit';
  end if;

  return new;
end;
$$;

drop trigger if exists kitchen_recipe_photos_limit on storage.objects;
create trigger kitchen_recipe_photos_limit
  before insert on storage.objects
  for each row
  execute function public.kitchen_enforce_recipe_photo_limit();

create or replace function public.kitchen_delete_recipe_photo()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = 'kitchen-recipe-photos'
    and name like '%/' || old.id::text || '.jpg';
  return old;
exception
  when others then
    return old;
end;
$$;

revoke all on function public.kitchen_delete_recipe_photo() from public, anon, authenticated;

drop trigger if exists kitchen_recipes_delete_photo on public.kitchen_recipes;
create trigger kitchen_recipes_delete_photo
  after delete on public.kitchen_recipes
  for each row
  execute function public.kitchen_delete_recipe_photo();
