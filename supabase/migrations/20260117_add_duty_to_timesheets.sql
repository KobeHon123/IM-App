-- Add duty column to timesheets table
ALTER TABLE timesheets
ADD COLUMN duty TEXT DEFAULT NULL;
