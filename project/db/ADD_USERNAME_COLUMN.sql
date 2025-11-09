-- ============================================
-- ADD USERNAME COLUMN TO EXISTING PROFILES TABLE
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add username column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text NULL;

-- Add unique constraint on username
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'username_unique'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT username_unique UNIQUE (username);
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'username';
