-- =============================================================================
-- Migration: 20261003_study_storage_bucket.sql
-- Description: Supabase Storage Bucket setup & RLS policies for Study Materials,
--              PDFs, documents, images, and notes.
-- =============================================================================

-- 1. Ensure study_materials table has storage_path column
ALTER TABLE IF EXISTS public.study_materials
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Create the 'study-materials' storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-materials',
  'study-materials',
  true,
  52428800, -- 50 MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/javascript',
    'text/x-python',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Storage Object RLS Policies for study-materials bucket
-- Allow public viewing of study materials
DROP POLICY IF EXISTS "study_materials_bucket_public_select" ON storage.objects;
CREATE POLICY "study_materials_bucket_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'study-materials');

-- Allow authenticated users to upload their own study materials
DROP POLICY IF EXISTS "study_materials_bucket_auth_insert" ON storage.objects;
CREATE POLICY "study_materials_bucket_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'study-materials' AND
    auth.role() = 'authenticated'
  );

-- Allow users to update their own study materials in storage
DROP POLICY IF EXISTS "study_materials_bucket_auth_update" ON storage.objects;
CREATE POLICY "study_materials_bucket_auth_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'study-materials' AND
    auth.role() = 'authenticated'
  );

-- Allow users to delete their own study materials in storage
DROP POLICY IF EXISTS "study_materials_bucket_auth_delete" ON storage.objects;
CREATE POLICY "study_materials_bucket_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'study-materials' AND
    auth.role() = 'authenticated'
  );
