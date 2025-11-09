# Apply Profiles Migration to Supabase

## Quick Steps

1. **Open Supabase Dashboard**
   - Go to: https://garbflrgwofgveqqvedl.supabase.co
   - Login with your credentials

2. **Navigate to SQL Editor**
   - In the left sidebar, click **"SQL Editor"**
   - Click **"New Query"**

3. **Copy the SQL below and paste it into the editor**

4. **Click "Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

---

## SQL to Execute

```sql
-- Full profiles table schema
-- This creates the table with all fields for Dashboard, Settings, and Leaderboard integration

-- Drop existing table if you want a clean slate (CAUTION: deletes all data)
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
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
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Delete own profile" ON public.profiles;

-- Create RLS policies for authenticated users
CREATE POLICY "Select own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid()::uuid = id);

CREATE POLICY "Insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::uuid = id);

CREATE POLICY "Update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid()::uuid = id)
  WITH CHECK (auth.uid()::uuid = id);

CREATE POLICY "Delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid()::uuid = id);
```

---

## Verify Migration

After running the SQL, you should see:
- ✓ Table `profiles` created
- ✓ 4 policies created
- ✓ No errors in the output

To verify the table structure:
1. Go to **Table Editor** in the left sidebar
2. Find `profiles` table
3. Check that all columns are present: `id`, `full_name`, `email`, `location`, `bio`, `hobbies`, `profile_icon`, `total_points`, `current_streak`, `total_tasks`, `personal_tasks`, `overall_contentment`, `eco_friendly_score`, `todays_points`, `updated_at`, `last_activity_date`, `month_points`, `streak`

---

## Next Steps

After applying the migration:

1. **Test the application**
   ```powershell
   npm run dev
   ```

2. **Visit these pages:**
   - http://localhost:3000/settings - Save your profile
   - http://localhost:3000/dashboard - Check that stats update
   - http://localhost:3000/leaderboard - Verify leaderboard loads

3. **Check the database**
   - Go to Supabase → Table Editor → profiles
   - You should see your profile row after saving in Settings

---

## Troubleshooting

**Error: relation "profiles" already exists**
- The table already exists. You can either:
  - Skip this migration (if the schema matches)
  - Drop the table first: `DROP TABLE public.profiles CASCADE;` (⚠️ deletes all data)

**Error: policy already exists**
- Policies already exist. The script now includes `DROP POLICY IF EXISTS` to handle this.

**Error: permission denied**
- Make sure you're logged in as the project owner
- Check that you have the correct Supabase project selected

---

## Alternative: Run via Supabase CLI (if Docker is available)

If you have Docker Desktop installed and running:

```powershell
cd project
npx supabase db reset
```

This will automatically apply all migrations in `supabase/migrations/`.
