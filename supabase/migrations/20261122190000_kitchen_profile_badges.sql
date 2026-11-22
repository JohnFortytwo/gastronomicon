-- Earned kitchen badges live on the profile, same shape as the other app:
-- a jsonb map of badge id -> timestamp, or a text list of "id|timestamp".
-- The catalog in src/lib/kitchen/badges.ts is empty until the kitchen badges exist.

alter table public.kitchen_profiles
  add column if not exists badges jsonb not null default '{}'::jsonb;
