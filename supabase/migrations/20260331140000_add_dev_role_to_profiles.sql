-- Add 'dev' role to the profiles role constraint
ALTER TABLE profiles
DROP CONSTRAINT profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'dev'));

-- Update the column comment to include 'dev' role
COMMENT ON COLUMN profiles.role IS 'User role - "user" (default), "admin" (can confirm attendance), or "dev" (development/special access).';
