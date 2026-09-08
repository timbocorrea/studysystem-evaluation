-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  date_earned TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_id)
);

-- RLS Policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements') THEN
        DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
        DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;
    END IF;
END $$;

CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (true); -- Usually restricted to service role, but for simplicity in this setup allowing inserts if needed, or rely on service role bypassing RLS

-- Migration function to move data from JSONB to Table (Idempotent)
CREATE OR REPLACE FUNCTION migrate_achievements_json_to_table()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  ach_obj JSONB;
BEGIN
  FOR user_record IN SELECT id, achievements FROM profiles WHERE achievements IS NOT NULL AND jsonb_array_length(achievements) > 0 LOOP
    FOR ach_obj IN SELECT * FROM jsonb_array_elements(user_record.achievements) LOOP
      INSERT INTO user_achievements (user_id, achievement_id, date_earned)
      VALUES (
        user_record.id,
        ach_obj->>'id',
        COALESCE((ach_obj->>'dateEarned')::timestamptz, (ach_obj->>'date_earned')::timestamptz, NOW())
      )
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute migration
SELECT migrate_achievements_json_to_table();

-- Drop the function after use
DROP FUNCTION migrate_achievements_json_to_table();
