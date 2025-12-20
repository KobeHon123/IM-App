/*
  # Create Universal Part Counters Table

  1. New Tables
    - `part_type_counters`
      - `id` (uuid, primary key)
      - `part_type_prefix` (text, unique) - The letter prefix (U, K, S, B, P, C, X, G)
      - `current_number` (integer) - The current counter value
      - `last_updated_at` (timestamptz) - Timestamp of last update

  2. Initialization
    - Calculate maximum part number for each type across all projects
    - Initialize counters with these values

  3. Security
    - Enable RLS on `part_type_counters` table
    - Add policies for authenticated users to read counters
    - Add policies for the system to update counters

  4. Indexes
    - Add unique index on `part_type_prefix` for fast lookups
*/

-- Create the part_type_counters table
CREATE TABLE IF NOT EXISTS part_type_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_type_prefix text UNIQUE NOT NULL,
  current_number integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_part_type_counters_prefix
  ON part_type_counters(part_type_prefix);

-- Enable RLS
ALTER TABLE part_type_counters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read counters
CREATE POLICY "Authenticated users can read part counters"
  ON part_type_counters
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update counters (for atomic increments)
CREATE POLICY "Authenticated users can update part counters"
  ON part_type_counters
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert counters (for initialization)
CREATE POLICY "Authenticated users can insert part counters"
  ON part_type_counters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Initialize counters by analyzing existing parts
DO $$
DECLARE
  prefix_map jsonb := '{"U shape": "U", "Straight": "S", "Knob": "K", "Button": "B", "Push Pad": "P", "Cover": "C", "X - Special Design": "X", "Gadget": "G"}';
  v_part_type text;
  v_prefix text;
  v_max_num integer;
BEGIN
  -- Loop through each part type
  FOR v_part_type, v_prefix IN SELECT key, value FROM jsonb_each_text(prefix_map)
  LOOP
    -- Find the maximum number used for this prefix across all parts
    -- Extract the number from part names like "U15", "K3a", etc.
    SELECT COALESCE(
      MAX(
        CAST(
          regexp_replace(
            regexp_replace(name, '^' || v_prefix, ''),  -- Remove prefix
            '[a-z]+$', ''  -- Remove letter suffixes for sub-parts
          ) AS INTEGER
        )
      ),
      0
    )
    INTO v_max_num
    FROM parts
    WHERE parts.type::text = v_part_type
      AND name ~ ('^' || v_prefix || '[0-9]+[a-z]*$');  -- Match pattern like U1, U15a, etc.

    -- Insert the counter with the max value found
    INSERT INTO part_type_counters (part_type_prefix, current_number, last_updated_at)
    VALUES (v_prefix, v_max_num, now())
    ON CONFLICT (part_type_prefix)
    DO UPDATE SET
      current_number = GREATEST(part_type_counters.current_number, v_max_num),
      last_updated_at = now();

    RAISE NOTICE 'Initialized counter for prefix % (type: %) with value: %', v_prefix, v_part_type, v_max_num;
  END LOOP;
END $$;

-- Create a function to get and increment the next part number atomically
CREATE OR REPLACE FUNCTION get_next_part_number(p_prefix text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num integer;
BEGIN
  -- Atomically increment and return the next number
  UPDATE part_type_counters
  SET current_number = current_number + 1,
      last_updated_at = now()
  WHERE part_type_prefix = p_prefix
  RETURNING current_number INTO next_num;

  -- If no row was found, initialize it
  IF next_num IS NULL THEN
    INSERT INTO part_type_counters (part_type_prefix, current_number, last_updated_at)
    VALUES (p_prefix, 1, now())
    RETURNING current_number INTO next_num;
  END IF;

  RETURN next_num;
END;
$$;

-- Create a function to get the current counter value without incrementing
CREATE OR REPLACE FUNCTION get_current_part_number(p_prefix text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  curr_num integer;
BEGIN
  SELECT current_number INTO curr_num
  FROM part_type_counters
  WHERE part_type_prefix = p_prefix;

  -- If no row found, return 0
  RETURN COALESCE(curr_num, 0);
END;
$$;
