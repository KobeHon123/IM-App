/*
  # Create Avatars Storage Bucket

  1. Storage Bucket
    - Create public `avatars` bucket for user profile pictures
    - Enable public access for read operations
    - Restrict write operations to authenticated users

  2. Security
    - Add policy for authenticated users to upload their own avatar
    - Add policy for public read access to all avatars
    - Add policy for users to update their own avatar
    - Add policy for users to delete their own avatar

  3. Important Notes
    - Users can only upload/update/delete their own avatar files
    - All users can view avatars (public read access)
    - File naming convention: {user_id}-{timestamp}.{extension}
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
