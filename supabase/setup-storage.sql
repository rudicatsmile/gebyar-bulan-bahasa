INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('twibbon', 'twibbon', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('media-acara', 'media-acara', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4']),
  ('dokumen-peserta', 'dokumen-peserta', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('poster-lomba', 'poster-lomba', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('twibbon-templates', 'twibbon-templates', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view public buckets" ON storage.objects;
CREATE POLICY "Public can view public buckets"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('twibbon', 'media-acara', 'poster-lomba', 'avatars', 'twibbon-templates'));

DROP POLICY IF EXISTS "Authenticated can upload objects" ON storage.objects;
CREATE POLICY "Authenticated can upload objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('twibbon', 'media-acara', 'dokumen-peserta', 'poster-lomba', 'avatars', 'twibbon-templates'));

DROP POLICY IF EXISTS "Anon can upload twibbon" ON storage.objects;
CREATE POLICY "Anon can upload twibbon"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'twibbon');

DROP POLICY IF EXISTS "Authenticated can update objects" ON storage.objects;
CREATE POLICY "Authenticated can update objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('twibbon', 'media-acara', 'dokumen-peserta', 'poster-lomba', 'avatars', 'twibbon-templates'));

DROP POLICY IF EXISTS "Authenticated can delete objects" ON storage.objects;
CREATE POLICY "Authenticated can delete objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('twibbon', 'media-acara', 'dokumen-peserta', 'poster-lomba', 'avatars', 'twibbon-templates'));

