# Points Not Increasing - FIXED ✓

## The Problem
Points weren't going up when completing tasks because:
1. **You need to be logged in** - The database integration requires authentication
2. **Profile needs to exist** - A profile row must exist in the `profiles` table
3. **Migration needs to be applied** - The database table needs to exist first

## The Solution

### What I Fixed
1. **Added better error logging** - Now you'll see console messages explaining what's happening
2. **Auto-create profiles** - If no profile exists, one is created on first task completion
3. **Created debug page** - Visit `/debug` to check your auth and profile status

### What You Need to Do

#### Step 1: Apply the Database Migration
**You MUST do this first** - the `profiles` table doesn't exist yet!

1. Open https://garbflrgwofgveqqvedl.supabase.co
2. Go to **SQL Editor** → **New Query**
3. Copy the SQL from `APPLY_MIGRATION.md` 
4. Click **Run**

#### Step 2: Sign Up or Log In
Points only save to the database when you're authenticated.

- **Option A:** Go to `/signup` and create an account
- **Option B:** Go to `/login` if you already have an account

#### Step 3: Check Your Status
Visit `/debug` to verify:
- ✓ You're logged in
- ✓ Your profile exists in the database
- ✓ Points are being tracked

#### Step 4: Complete Tasks
Now when you complete tasks on `/dashboard`:
- Points will save to the database
- You'll see console logs confirming the update
- Your profile will be updated with today's, monthly, and total points

## Testing It

1. **Apply migration** (see `APPLY_MIGRATION.md`)
2. **Sign up** at `/signup`
3. **Visit** `/debug` - confirm you're logged in and profile exists
4. **Go to** `/dashboard`
5. **Open browser console** (press F12)
6. **Complete a task**
7. **Check console** - you should see: `✓ Points updated successfully`

## How It Works Now

### Before (Not Working)
- Completes task → Tries to save points → No auth → Silently fails

### After (Fixed)
- Completes task → Checks if logged in → If no profile, creates one → Updates points → Logs success

## Console Logs You'll See

When you complete a task, you should see:
```
Updating points: { userId: "...", delta: 20, taskDelta: 1, currentToday: 0, nextToday: 20, ... }
✓ Points updated successfully
```

If you see warnings:
- `Cannot apply points delta: user not logged in` → Go to `/login` or `/signup`
- `No profile found, creating initial profile...` → Profile is being auto-created
- `Error updating profile points:` → Check that migration was applied

## Quick Checklist

- [ ] Applied database migration (see `APPLY_MIGRATION.md`)
- [ ] Signed up or logged in (`/signup` or `/login`)
- [ ] Verified status at `/debug` page
- [ ] Completed a task on `/dashboard`
- [ ] Checked browser console (F12) for success logs
- [ ] Refreshed page to see points persist

## Still Not Working?

1. **Check the migration** - Go to Supabase → Table Editor → look for `profiles` table
2. **Check auth** - Visit `/debug` to see your login status
3. **Check console** - Press F12 and look for error messages
4. **Check browser** - Make sure localStorage isn't blocked

## Files Changed

- `app/dashboard/page.tsx` - Added logging and auto-profile creation
- `app/debug/page.tsx` - NEW debug page to check status
- `APPLY_MIGRATION.md` - Instructions for database setup

---

**TL;DR:** You need to be logged in and have the database migration applied. Visit `/debug` to check your status, then complete tasks on `/dashboard`.
