-- Full profiles table schema
-- Run this in Supabase SQL editor (Project -> SQL) or apply via migrations

create table if not exists public.profiles (
  id uuid not null,
  created_at timestamp with time zone null default now(),
  full_name text null,
  email text null,
  location text null,
  bio text null,
  hobbies text[] null,
  profile_icon text null,
  total_points integer null default 0,
  current_streak integer null default 0,
  total_tasks integer null default 0,
  personal_tasks integer null default 0,
  overall_contentment integer null default 0,
  eco_friendly_score integer null default 0,
  todays_points integer null default 0,
  updated_at timestamp with time zone null default now(),
  last_activity_date date null,
  month_points integer null default 0,
  streak integer null,
  constraint profiles_pkey primary key (id)
) TABLESPACE pg_default;

-- Enable Row Level Security (RLS) - keep it enabled, but allow service_role to bypass
alter table public.profiles enable row level security;

-- Allow authenticated users to SELECT their own profile
create policy "Select own profile"
  on public.profiles
  for select
  using (auth.uid()::uuid = id);

-- Allow authenticated users to INSERT their own profile (only for their id)
create policy "Insert own profile"
  on public.profiles
  for insert
  with check (auth.uid()::uuid = id);

-- Allow authenticated users to UPDATE their own profile
create policy "Update own profile"
  on public.profiles
  for update
  using (auth.uid()::uuid = id)
  with check (auth.uid()::uuid = id);

-- Optional: allow authenticated users to DELETE their own profile
create policy "Delete own profile"
  on public.profiles
  for delete
  using (auth.uid()::uuid = id);

-- Example seed (replace uuid with a real auth user id):
/*
insert into public.profiles (
  id,
  full_name,
  email,
  location,
  bio,
  hobbies,
  profile_icon,
  total_points,
  month_points
) values (
  '00000000-0000-0000-0000-000000000000',
  'Test User',
  'test@example.com',
  'San Francisco, CA',
  'I love sustainable living and mindful practices.',
  ARRAY['hiking', 'gardening', 'meditation'],
  'avatar-Alex',
  0,
  0
);
*/