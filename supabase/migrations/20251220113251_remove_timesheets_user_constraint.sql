/*
  # Remove User Account Requirement for Timesheets

  1. Changes
    - Drop foreign key constraint on user_id
    - Make user_id nullable
    - Add worker_name field for manual name entry
    - Update unique constraint to use worker_name instead of user_id
  
  2. Notes
    - This allows adding timesheet entries without requiring user accounts
    - worker_name will be used for part-time workers who don't need app access
*/

-- Drop existing foreign key constraint
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_user_id_fkey;

-- Make user_id nullable
ALTER TABLE timesheets ALTER COLUMN user_id DROP NOT NULL;

-- Add worker_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheets' AND column_name = 'worker_name'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN worker_name text;
  END IF;
END $$;

-- Drop old unique constraint
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_user_id_work_date_key;

-- Add new unique constraint using worker_name and work_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'timesheets_worker_date_unique'
  ) THEN
    ALTER TABLE timesheets ADD CONSTRAINT timesheets_worker_date_unique 
      UNIQUE (worker_name, work_date);
  END IF;
END $$;

-- Add check constraint to ensure either user_id or worker_name is provided
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_user_or_name_check;
ALTER TABLE timesheets ADD CONSTRAINT timesheets_user_or_name_check 
  CHECK (user_id IS NOT NULL OR worker_name IS NOT NULL);