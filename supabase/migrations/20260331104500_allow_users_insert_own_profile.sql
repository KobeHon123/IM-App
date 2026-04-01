/*
  # Allow Users To Insert Their Own Profile

  1. Purpose
    - Lets authenticated users recreate their own missing `profiles` row.
    - Supports recovery if a profile row is manually deleted.

  2. Security
    - Insert is only allowed when `auth.uid() = id`.
*/

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
