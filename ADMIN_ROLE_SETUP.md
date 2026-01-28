# Admin Role Setup Guide

## What Was Implemented

### 1. Profile Tab Updates
- Added blue checkmark (✓) symbol next to admin usernames
- Checks the `role` column from the profiles table
- Blue tick displays only for users with `role = 'admin'`

### 2. Supabase Migration
- Created migration file: `20260115_add_role_to_profiles.sql`
- Adds `role` column to profiles table with two options: 'user' (default) or 'admin'
- Includes validation constraint and performance index

### 3. Timesheet Confirmation System (Previously Implemented)
- Admins can confirm worker attendance with a checkbox
- Confirmed entries show with black circle outline on calendar
- Only visible to users with admin role

---

## Setup Instructions

### Step 1: Apply Migration to Supabase

You have two options to add the `role` column:

#### Option A: Using Supabase SQL Editor (Recommended)
1. Go to your Supabase dashboard
2. Click on "SQL Editor"
3. Click "New Query"
4. Copy and paste this SQL:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

COMMENT ON COLUMN profiles.role IS 'User role - either "user" or "admin". Admins can confirm worker attendance.';
```

5. Click "Run" to execute

#### Option B: Migration File
- The file `supabase/migrations/20260115_add_role_to_profiles.sql` contains the SQL
- If you have Supabase CLI set up, run: `supabase db push`

### Step 2: Assign Admin Role

Once the migration is applied, you can assign admin roles:

#### In Supabase Dashboard:
1. Go to "Database" → "Tables" → "profiles"
2. Find the user you want to make admin
3. Click on the row and set the `role` column to `'admin'`
4. Click Save

#### Using Supabase SQL:
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

### Step 3: Verify in App

The blue tick (✓) will appear next to the username in the Profile tab for users with `role = 'admin'`

---

## How It Works

### Profile Tab (app/(tabs)/profile/index.tsx)
- Reads the `role` field from the user's profile
- If `role === 'admin'`, displays blue checkmark next to username
- Blue tick styling: Blue color (#2563EB), bold, positioned next to name

### Timesheet Tab (app/(tabs)/management/part-time-timesheet.tsx)
- Checks admin role on app load via `loadData()`
- Only shows confirmation checkbox for admins in "Selected Date Details"
- Confirmed entries display with black circle outline on calendar symbols
- Non-admins cannot see or use the confirmation feature

---

## Database Schema

The profiles table now includes:

```
Column: role
Type: TEXT
Default: 'user'
Constraint: CHECK (role IN ('user', 'admin'))
Index: idx_profiles_role (for performance)
```

---

## Admin Features

### Current Admin Capabilities:
✓ Confirm worker attendance via checkbox in Selected Date Details
✓ Confirmed entries show with black outline on calendar symbols
✓ Blue tick badge appears on their profile

### Future Admin Features You Could Add:
- View attendance reports
- Export timesheet data
- Manage user roles
- Edit other users' entries
- View audit logs

---

## Troubleshooting

**Q: The blue tick doesn't appear next to my name**
A: 
1. Make sure the migration was applied to Supabase
2. Verify the `role` column exists in the profiles table
3. Check that your profile's `role` is set to 'admin' (case-sensitive)
4. Try refreshing the app

**Q: The confirmation checkbox doesn't appear in timesheet**
A: Same as above - verify the migration was applied and your role is set to 'admin'

**Q: I want to remove admin access from someone**
A:
```sql
UPDATE profiles
SET role = 'user'
WHERE email = 'user@example.com';
```

---

## File Changes

### Created:
- `supabase/migrations/20260115_add_role_to_profiles.sql` - Database migration

### Modified:
- `app/(tabs)/profile/index.tsx` - Added admin tick display
- `app/(tabs)/management/part-time-timesheet.tsx` - Added admin role checking (from previous work)
