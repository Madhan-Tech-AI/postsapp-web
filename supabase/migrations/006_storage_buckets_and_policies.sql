-- =============================================================
-- PostsApp V1.0 — Migration 006: Storage buckets and policies
-- =============================================================
-- Buckets: article-featured, article-content, author-avatars,
--          site-assets (all public read), editorial-temp (private)
-- Write/update/delete: restricted by role and folder ownership.
-- =============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('article-featured',  'article-featured',  TRUE,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('article-content',   'article-content',   TRUE,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('author-avatars',    'author-avatars',     TRUE,   2097152, ARRAY['image/jpeg','image/png','image/webp']),
  ('site-assets',       'site-assets',        TRUE,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('editorial-temp',    'editorial-temp',     FALSE, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- Storage RLS policies
-- =============================================================

-- ---- article-featured ----
-- Public read
CREATE POLICY "article_featured_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'article-featured');

-- Authors upload to their own folder (folder = auth.uid())
CREATE POLICY "article_featured_author_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-featured'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_author()
  );

-- Owner or editor can update
CREATE POLICY "article_featured_author_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-featured'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_editor()
    )
  );

-- Owner or editor can delete
CREATE POLICY "article_featured_author_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-featured'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_editor()
    )
  );

-- ---- article-content ----
CREATE POLICY "article_content_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'article-content');

CREATE POLICY "article_content_author_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-content'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_author()
  );

CREATE POLICY "article_content_author_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-content'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_editor()
    )
  );

CREATE POLICY "article_content_author_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-content'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_editor()
    )
  );

-- ---- author-avatars ----
CREATE POLICY "author_avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'author-avatars');

CREATE POLICY "author_avatars_self_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'author-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "author_avatars_self_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'author-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "author_avatars_self_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'author-avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_super_admin()
    )
  );

-- ---- site-assets ---- (SuperAdmin only write; public read)
CREATE POLICY "site_assets_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'site-assets');

CREATE POLICY "site_assets_superadmin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND public.is_super_admin()
  );

CREATE POLICY "site_assets_superadmin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_super_admin());

CREATE POLICY "site_assets_superadmin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_super_admin());

-- ---- editorial-temp ---- (private; authors upload, server cleans up)
CREATE POLICY "editorial_temp_author_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'editorial-temp'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "editorial_temp_author_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'editorial-temp'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_author()
  );

CREATE POLICY "editorial_temp_author_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'editorial-temp'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_editor()
    )
  );
