/*
  # Create Parts Storage Bucket

  1. Storage
    - Create `parts` bucket for part images (CAD drawings and pictures)
    - Enable public access for part images
    - Add RLS policies for authenticated users to upload images

  2. Security
    - Authenticated users can upload/update/delete part images
    - All users can view part images (public access)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('parts', 'parts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload part images
CREATE POLICY "Authenticated users can upload part images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'parts');

-- Allow authenticated users to update part images
CREATE POLICY "Authenticated users can update part images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'parts')
  WITH CHECK (bucket_id = 'parts');

-- Allow authenticated users to delete part images
CREATE POLICY "Authenticated users can delete part images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'parts');

-- Allow public access to view part images
CREATE POLICY "Public can view part images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'parts');
