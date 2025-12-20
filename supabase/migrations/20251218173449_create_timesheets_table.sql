/*
  # Create Timesheets Table

  1. New Tables
    - `timesheets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `work_date` (date) - The date of the work entry
      - `period` (text) - Work period: 'full', 'am', 'pm', or 'off'
      - `location` (text) - Work location: 'office', 'polyu', 'home', or 'site'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `timesheets` table
    - Add policy for authenticated users to view all timesheets (for transparency)
    - Add policy for authenticated users to insert their own timesheets
    - Add policy for authenticated users to update their own timesheets
    - Add policy for authenticated users to delete their own timesheets
*/

CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  period text NOT NULL CHECK (period IN ('full', 'am', 'pm', 'off')),
  location text CHECK (location IN ('office', 'polyu', 'home', 'site')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, work_date)
);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view timesheets"
  ON timesheets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timesheets"
  ON timesheets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own timesheets"
  ON timesheets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_timesheets_user_date ON timesheets(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(work_date);