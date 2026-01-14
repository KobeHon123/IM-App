/*
  # Add public profile read access

  Allow authenticated users to read all profiles (for contacts list)
*/

CREATE POLICY "Users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
