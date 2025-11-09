-- ============================================
-- PROFILES TABLE WITH USERNAME SUPPORT
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop the table if it exists (WARNING: This deletes all data!)
-- Comment this out if you want to keep existing data
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create the profiles table with username field
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  username text NULL,
  full_name text NULL,
  email text NULL,
  location text NULL,
  bio text NULL,
  hobbies text[] NULL,
  profile_icon text NULL,
  total_points integer NULL DEFAULT 0,
  current_streak integer NULL DEFAULT 0,
  total_tasks integer NULL DEFAULT 0,
  personal_tasks integer NULL DEFAULT 0,
  overall_contentment integer NULL DEFAULT 0,
  eco_friendly_score integer NULL DEFAULT 0,
  todays_points integer NULL DEFAULT 0,
  updated_at timestamp with time zone NULL DEFAULT now(),
  last_activity_date date NULL,
  month_points integer NULL DEFAULT 0,
  streak integer NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT username_unique UNIQUE (username)
) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Delete own profile" ON public.profiles;

-- Allow authenticated users to SELECT their own profile
CREATE POLICY "Select own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid()::uuid = id);

-- Allow authenticated users to INSERT their own profile (only for their id)
CREATE POLICY "Insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::uuid = id);

-- Allow authenticated users to UPDATE their own profile
CREATE POLICY "Update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid()::uuid = id)
  WITH CHECK (auth.uid()::uuid = id);

-- Allow authenticated users to DELETE their own profile
CREATE POLICY "Delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid()::uuid = id);

-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to automatically insert profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- DONE!
-- ============================================
-- Now when users sign up via Supabase Auth, 
-- a profile will be automatically created.
-- They can then set their username during onboarding.
