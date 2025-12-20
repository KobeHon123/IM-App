/*
  # Add Delivery to Event Type Enum

  1. Changes
    - Add 'Delivery' value to the event_type enum
    - This allows events to be created with type 'Delivery'
  
  2. Notes
    - Using ALTER TYPE to add the new enum value
    - This is a non-breaking change - existing data is not affected
*/

-- Add 'Delivery' to the event_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Delivery' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
  ) THEN
    ALTER TYPE event_type ADD VALUE 'Delivery';
  END IF;
END $$;
