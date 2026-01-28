-- Add confirmed column to timesheets table
ALTER TABLE timesheets
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;

-- Create an index on the confirmed column for better query performance
CREATE INDEX IF NOT EXISTS idx_timesheets_confirmed ON timesheets(confirmed);

-- Add comment to the column
COMMENT ON COLUMN timesheets.confirmed IS 'Whether this timesheet entry has been confirmed by an admin';
