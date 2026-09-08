-- Add image_alt column to question_bank table
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- Update existing records to have empty string instead of null if preferred, or just leave as null
-- For now, Null is fine for accessibility fields.
