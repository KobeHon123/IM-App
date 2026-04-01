/*
  # Add On-Call Period To Timesheets

  1. Changes
    - Extend `timesheets.period` constraint to include `on_call`
*/

ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_period_check;
ALTER TABLE timesheets ADD CONSTRAINT timesheets_period_check
  CHECK (period IN ('full', 'am', 'pm', 'off', 'other', 'on_call'));
