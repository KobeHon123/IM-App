-- Add role column to profiles table if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create an index on the role column for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add comment to the column
COMMENT ON COLUMN profiles.role IS 'User role - either "user" or "admin". Admins can confirm worker attendance.';
