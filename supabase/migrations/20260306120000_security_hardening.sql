-- =============================================================================
-- Security Hardening Migration
-- Applies least privilege to Storage, Achievements and System Settings.
-- =============================================================================

-- =============================================================================
-- 1. Storage: Restrict DELETE on lesson-resources
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can delete lesson resources" ON storage.objects;

CREATE POLICY "Authenticated users can delete own or admin lesson resources"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'lesson-resources' 
    AND (
        owner_id = auth.uid()::text 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'instructor')
        )
    )
);

-- =============================================================================
-- 2. Achievements: Restrict INSERT to self
-- =============================================================================
DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;

CREATE POLICY "Users can insert their own achievements"
ON public.user_achievements FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 3. System Settings: Restrict Public Exposure
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='system_settings' 
          AND column_name='is_public'
    ) THEN
        ALTER TABLE public.system_settings ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
END $$;

DROP POLICY IF EXISTS "Allow public read access" ON public.system_settings;

CREATE POLICY "Conditional public read for system settings"
ON public.system_settings FOR SELECT
USING (
    is_public = true 
    OR auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
);
