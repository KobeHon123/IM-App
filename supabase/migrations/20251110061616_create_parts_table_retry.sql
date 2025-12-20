/*
  # Create Parts Table

  1. New Tables
    - `parts`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `project_id` (uuid, references projects, not null)
      - `parent_part_id` (uuid, references parts, nullable for sub-parts)
      - `name` (text, not null)
      - `type` (text, not null) - Part type (U shape, Straight, etc.)
      - `status` (text, default 'measured')
      - `description` (text, default '')
      - `designer` (text)
      - `dimensions` (jsonb, default '{}')
      - `cad_drawing` (text) - URL to CAD drawing
      - `pictures` (text[], default '{}')
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `parts` table
    - Add policies for authenticated users to manage parts
*/

CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_part_id uuid REFERENCES parts(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'measured',
  description text DEFAULT '',
  designer text,
  dimensions jsonb DEFAULT '{}'::jsonb,
  cad_drawing text,
  pictures text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read parts"
  ON parts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create parts"
  ON parts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update parts"
  ON parts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete parts"
  ON parts
  FOR DELETE
  TO authenticated
  USING (true);