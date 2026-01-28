-- Add site_name column to timesheets table
ALTER TABLE timesheets
ADD COLUMN site_name TEXT DEFAULT NULL;
