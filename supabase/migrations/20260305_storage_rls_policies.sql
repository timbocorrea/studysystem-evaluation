-- =============================================================================
-- Storage RLS Policies for 'lesson-resources' bucket
-- Restricts uploads to authenticated users with file type/size validation.
-- =============================================================================

-- Enable RLS on storage.objects (usually enabled by default in Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Authenticated users can read any file in the bucket
DROP POLICY IF EXISTS "Authenticated users can read lesson resources" ON storage.objects;
CREATE POLICY "Authenticated users can read lesson resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lesson-resources');

-- 2. INSERT: Only authenticated users, with file extension + size validation
DROP POLICY IF EXISTS "Authenticated users can upload safe files to lesson resources" ON storage.objects;
CREATE POLICY "Authenticated users can upload safe files to lesson resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lesson-resources'
    AND (storage.foldername(name))[1] IN ('pdfs', 'images', 'audios', 'files')
    AND (
        -- PDF files
        (name ILIKE '%.pdf')
        -- Image files
        OR (name ILIKE '%.png')
        OR (name ILIKE '%.jpg')
        OR (name ILIKE '%.jpeg')
        OR (name ILIKE '%.webp')
        OR (name ILIKE '%.gif')
        -- Audio files
        OR (name ILIKE '%.mp3')
        OR (name ILIKE '%.wav')
        OR (name ILIKE '%.ogg')
        OR (name ILIKE '%.m4a')
        OR (name ILIKE '%.aac')
        OR (name ILIKE '%.flac')
        OR (name ILIKE '%.webm')
        -- Document files
        OR (name ILIKE '%.txt')
        OR (name ILIKE '%.csv')
        OR (name ILIKE '%.docx')
        OR (name ILIKE '%.xlsx')
        OR (name ILIKE '%.pptx')
    )
);

-- 3. UPDATE: Authenticated users can update metadata of their own uploads
DROP POLICY IF EXISTS "Authenticated users can update own lesson resources" ON storage.objects;
CREATE POLICY "Authenticated users can update own lesson resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-resources' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'lesson-resources' AND owner_id = auth.uid()::text);

-- 4. DELETE: Authenticated users can delete files (instructors manage content)
DROP POLICY IF EXISTS "Authenticated users can delete lesson resources" ON storage.objects;
CREATE POLICY "Authenticated users can delete lesson resources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-resources');

-- =============================================================================
-- NOTE: For maximum file size enforcement (e.g. 50MB), configure the bucket
-- settings via Supabase Dashboard > Storage > lesson-resources > Settings
-- or via the Supabase management API:
--   supabase storage update lesson-resources --file-size-limit 52428800
-- =============================================================================
