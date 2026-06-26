/*
  # Change Delivery to Teaching in Event Type Enum

  1. Changes
    - Add 'Teaching' value to the event_type enum
    - Update existing events with type 'Delivery' to 'Teaching'
  
  2. Notes
    - Using ALTER TYPE to add the new enum value
    - This is a non-breaking change - existing data is migrated
*/

-- Add 'Teaching' to the event_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Teaching' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
  ) THEN
    ALTER TYPE event_type ADD VALUE 'Teaching';
  END IF;
END $$;

-- Update existing events with type 'Delivery' to 'Teaching'
UPDATE events 
SET type = 'Teaching' 
WHERE type = 'Delivery';
