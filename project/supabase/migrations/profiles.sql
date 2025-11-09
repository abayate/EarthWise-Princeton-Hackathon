-- Create profiles table used by the app
-- Run this in Supabase SQL editor (Project -> SQL)

create table if not exists public.profiles (
  id uuid primary key,
  created_at timestamptz default now(),
  full_name text,
  email text,
  location text,
  bio text,                    -- Added bio field
  hobbies text[],             -- Added hobbies as a text array
  profile_icon text,
  total_points integer default 0,
  current_streak integer default 0,
  total_tasks integer default 0,
  personal_tasks integer default 0,
  overall_contentment integer default 0,
  eco_friendly_score integer default 0,
  todays_points integer default 0,
  updated_at timestamptz default now()
);

-- Enable Row Level Security so auth controls access
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

-- Optional: allow authenticated users to delete their own profile
create policy "Delete own profile"
  on public.profiles
  for delete
  using (auth.uid()::uuid = id);

-- Example seed with new fields (replace uuid with a real auth user id):
/*
insert into public.profiles (
  id,
  full_name,
  email,
  location,
  bio,
  hobbies,
  profile_icon,
  total_points
) values (
  '00000000-0000-0000-0000-000000000000',
  'Test User',
  'test@example.com',
  'San Francisco, CA',
  'I love sustainable living and mindful practices.',
  ARRAY['hiking', 'gardening', 'meditation'],
  'avatar-Alex',
  0
);
*/