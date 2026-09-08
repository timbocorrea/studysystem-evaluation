-- Migration: 20260311093500_strict_storage_policies.sql
-- Description: Hardens the lesson-resources bucket to explicitly block dangerous file extensions at the database level.

-- Drop the old overly permissive INSERT policy if it exists (from 20260305_storage_rls_policies.sql)
DROP POLICY IF EXISTS "Authenticated users can upload safe files to lesson resources" ON storage.objects;

-- Recreate with stricter rules explicitly blocking .svg, .html, .exe, etc.
CREATE POLICY "Authenticated users can upload strictly safe files to lesson resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lesson-resources'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN ('pdfs', 'images', 'audios', 'files')
    AND storage.extension(name) IN (
        -- Allowed strictly
        'pdf', 
        'png', 'jpg', 'jpeg', 'webp', 'gif', -- No SVG allowed
        'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm',
        'txt', 'csv', 'docx', 'xlsx', 'pptx'
    )
);
