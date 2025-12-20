/*
  # Create Projects Table

  1. New Tables
    - `projects`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `name` (text, not null)
      - `description` (text, default '')
      - `pic` (text, not null) - Person in charge
      - `thumbnail` (text)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `projects` table
    - Add policy for authenticated users to read projects
    - Add policy for authenticated users to create projects
    - Add policy for authenticated users to update projects
    - Add policy for authenticated users to delete projects
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  pic text NOT NULL,
  thumbnail text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (true);