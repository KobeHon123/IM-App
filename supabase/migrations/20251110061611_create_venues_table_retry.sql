/*
  # Create Venues Table

  1. New Tables
    - `venues`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `project_id` (uuid, references projects, not null)
      - `name` (text, not null)
      - `description` (text, default '')
      - `pic` (text, not null) - Person in charge
      - `thumbnail` (text)
      - `part_quantities` (jsonb, default '{}')
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `venues` table
    - Add policies for authenticated users to manage venues
*/

CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  pic text NOT NULL,
  thumbnail text,
  part_quantities jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read venues"
  ON venues
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create venues"
  ON venues
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update venues"
  ON venues
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete venues"
  ON venues
  FOR DELETE
  TO authenticated
  USING (true);