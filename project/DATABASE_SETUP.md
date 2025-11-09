# Database Setup Guide

## Quick Setup Steps

### 1. Run the Migration in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `db/01_profiles_with_username.sql`
5. Click **Run** (or press Ctrl/Cmd + Enter)

### 2. What This Does

✅ Creates the `profiles` table with all required fields including `username`  
✅ Sets up Row Level Security (RLS) policies so users can only access their own profile  
✅ Creates a database trigger that **automatically creates a profile** when a user signs up  
✅ Adds a unique constraint on username to prevent duplicates

### 3. How It Works Now

#### Signup Flow:
1. User enters email on `/signup` page
2. Supabase sends magic link email
3. User clicks the link to verify
4. **Database automatically creates a profile** with their email and user ID
5. User is redirected to `/onboarding`
6. User chooses a **username** (required) and name (optional)
7. Profile is updated with username
8. User proceeds to dashboard

#### Profile Fields:
- `id` - User's UUID from Supabase Auth (primary key)
- `username` - Unique username (added!)
- `full_name` - User's display name
- `email` - User's email address
- `bio` - User bio
- `hobbies` - Array of hobbies
- `profile_icon` - Avatar identifier
- `total_points`, `month_points`, `todays_points` - Point tracking
- `current_streak`, `streak` - Streak tracking
- `total_tasks`, `personal_tasks` - Task counters
- `overall_contentment`, `eco_friendly_score` - User metrics
- `last_activity_date` - Last activity tracking
- `created_at`, `updated_at` - Timestamps

## Troubleshooting

### "Profile not created" error
- Make sure the migration ran successfully in Supabase
- Check the trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Check your Supabase environment variables are set in `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your-project-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```

### "Username already taken" error
- This is expected behavior - usernames must be unique
- User should choose a different username

### Can't update profile
- Check RLS policies are enabled
- Verify user is authenticated before trying to update profile

## Testing

1. Sign up with a new email
2. Check your email and click the magic link
3. You should be redirected to `/onboarding`
4. Enter a username (required) and name (optional)
5. Continue through onboarding
6. Your profile should now exist in the database!

Check in Supabase:
```sql
SELECT id, username, full_name, email, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;
```
