-- Add user_id column to comments table
ALTER TABLE comments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX comments_user_id_idx ON comments(user_id);
