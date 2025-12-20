/*
  # Add Authorization Check to Existing Tables

  1. RLS Policy Updates
    - Update all existing tables to check if user is authorized
    - Only users with is_authorized = true can access data
    - Tables to update: projects, venues, parts, comments, events

  2. Security Changes
    - Drop existing public access policies
    - Add new policies that check authorization status
    - Ensure all data operations require authorized users

  3. Important Notes
    - All data access now requires is_authorized = true in profiles table
    - Unauthorized users cannot read or write any project data
    - Users must be manually authorized by admin in Supabase Dashboard
*/

DROP POLICY IF EXISTS "Enable all access for all users" ON projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for all users" ON projects;
DROP POLICY IF EXISTS "Enable update for all users" ON projects;
DROP POLICY IF EXISTS "Enable delete for all users" ON projects;

CREATE POLICY "Authorized users can read projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can insert projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

DROP POLICY IF EXISTS "Enable all access for all users" ON venues;
DROP POLICY IF EXISTS "Enable read access for all users" ON venues;
DROP POLICY IF EXISTS "Enable insert for all users" ON venues;
DROP POLICY IF EXISTS "Enable update for all users" ON venues;
DROP POLICY IF EXISTS "Enable delete for all users" ON venues;

CREATE POLICY "Authorized users can read venues"
  ON venues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can insert venues"
  ON venues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can update venues"
  ON venues
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can delete venues"
  ON venues
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

DROP POLICY IF EXISTS "Enable all access for all users" ON parts;
DROP POLICY IF EXISTS "Enable read access for all users" ON parts;
DROP POLICY IF EXISTS "Enable insert for all users" ON parts;
DROP POLICY IF EXISTS "Enable update for all users" ON parts;
DROP POLICY IF EXISTS "Enable delete for all users" ON parts;

CREATE POLICY "Authorized users can read parts"
  ON parts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can insert parts"
  ON parts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can update parts"
  ON parts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can delete parts"
  ON parts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

DROP POLICY IF EXISTS "Enable all access for all users" ON comments;
DROP POLICY IF EXISTS "Enable read access for all users" ON comments;
DROP POLICY IF EXISTS "Enable insert for all users" ON comments;
DROP POLICY IF EXISTS "Enable update for all users" ON comments;
DROP POLICY IF EXISTS "Enable delete for all users" ON comments;

CREATE POLICY "Authorized users can read comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can insert comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can update comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can delete comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

DROP POLICY IF EXISTS "Enable all access for all users" ON events;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Enable insert for all users" ON events;
DROP POLICY IF EXISTS "Enable update for all users" ON events;
DROP POLICY IF EXISTS "Enable delete for all users" ON events;

CREATE POLICY "Authorized users can read events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );

CREATE POLICY "Authorized users can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_authorized = true
    )
  );
