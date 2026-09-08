-- ============================================================
-- USER PROFILE ENHANCEMENT: AVATAR & PERMISSIONS
-- ============================================================

-- 1. ADD AVATAR_URL TO PROFILES
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. CREATE AVATARS STORAGE BUCKET
-- ------------------------------------------------------------
-- Note: This is usually done via Supabase UI, but we can attempt to insert directly 
-- into the storage schemas if the user has permissions, or just declare it 
-- as a requirement. For this case study, we assume the bucket 'avatars' is created.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. STORAGE POLICIES (RLS for Avatars)
-- ------------------------------------------------------------

-- Allow anyone to see avatars (Public bucket)
CREATE POLICY "Public Access for avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to upload their own avatar
CREATE POLICY "User can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own avatar
CREATE POLICY "User can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "User can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

NOTIFY pgrst, 'reload schema';
