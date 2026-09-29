/*
  # Create Projects Storage Bucket

  1. Storage Bucket
    - Create public `projects` bucket for project thumbnails
    - Enable public access for read operations
    - Allow authenticated users to upload/update/delete project thumbnails

  2. Security
    - All users can view project thumbnails
    - Authenticated users can manage project thumbnail files
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('projects', 'projects', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload project thumbnails"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'projects');

CREATE POLICY "Authenticated users can update project thumbnails"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'projects')
  WITH CHECK (bucket_id = 'projects');

CREATE POLICY "Authenticated users can delete project thumbnails"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'projects');

CREATE POLICY "Public can view project thumbnails"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'projects');
