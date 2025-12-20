/*
  # Update Timesheets Table for Custom Time Support

  1. Changes
    - Add `custom_start_time` column for custom time entries
    - Add `custom_end_time` column for custom time entries  
    - Update period constraint to include 'other' option
    - Update RLS policies to allow managers to add/edit timesheets for part-time workers
  
  2. Security
    - Allow all authenticated users to insert/update timesheets for any user
    - This enables managers to manage part-time worker schedules
*/

-- Add custom time columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheets' AND column_name = 'custom_start_time'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN custom_start_time time;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheets' AND column_name = 'custom_end_time'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN custom_end_time time;
  END IF;
END $$;

-- Drop existing constraint and recreate with 'other' option
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_period_check;
ALTER TABLE timesheets ADD CONSTRAINT timesheets_period_check 
  CHECK (period IN ('full', 'am', 'pm', 'off', 'other'));

-- Update RLS policies to allow any authenticated user to manage timesheets
DROP POLICY IF EXISTS "Users can insert own timesheets" ON timesheets;
DROP POLICY IF EXISTS "Users can update own timesheets" ON timesheets;
DROP POLICY IF EXISTS "Users can delete own timesheets" ON timesheets;

CREATE POLICY "Authenticated users can insert timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update timesheets"
  ON timesheets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete timesheets"
  ON timesheets FOR DELETE
  TO authenticated
  USING (true);