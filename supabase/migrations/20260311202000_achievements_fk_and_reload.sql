-- Migration to fix achievements relation and ensure table exists
-- Step 2: Verification of Relations (Foreign Keys)

CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed achievements table from user_achievements to prevent FK violation
-- Only insert if the table already has data that would break the FK
INSERT INTO public.achievements (id, title)
SELECT DISTINCT achievement_id, 'Conquista: ' || achievement_id
FROM public.user_achievements
ON CONFLICT (id) DO NOTHING;

-- Add Foreign Key to user_achievements if it doesn't have it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_achievement' 
        AND table_name = 'user_achievements'
    ) THEN
        ALTER TABLE public.user_achievements
        ADD CONSTRAINT fk_achievement 
        FOREIGN KEY (achievement_id) 
        REFERENCES public.achievements(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Force reload schema to fix PGRST205 and cache issues
NOTIFY pgrst, 'reload schema';
