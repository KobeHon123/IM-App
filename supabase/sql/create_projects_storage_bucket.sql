/*
  Create a dedicated storage bucket for project thumbnails
  - Separate from the `parts` bucket
  - Public read access
  - Authenticated users can upload/update/delete
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('projects', 'projects', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload project thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update project thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project thumbnails" ON storage.objects;

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
