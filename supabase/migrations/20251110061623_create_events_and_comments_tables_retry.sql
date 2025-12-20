/*
  # Create Events and Comments Tables

  1. New Tables
    - `events`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `project_id` (uuid, references projects, not null)
      - `date` (text, not null) - Date in DD-MM-YYYY format
      - `type` (text, not null) - Event type
      - `parts` (text[], default '{}') - Array of part IDs
      - `description` (text, default '')
      - `created_at` (timestamptz, default now())

    - `comments`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `part_id` (uuid, references parts, not null)
      - `venue_id` (uuid, references venues, nullable)
      - `venue_name` (text)
      - `author` (text, not null)
      - `text` (text, not null)
      - `is_pending` (boolean, default true)
      - `is_completed` (boolean, default false)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage events and comments
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date text NOT NULL,
  type text NOT NULL,
  parts text[] DEFAULT '{}'::text[],
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  venue_name text,
  author text NOT NULL,
  text text NOT NULL,
  is_pending boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (true);