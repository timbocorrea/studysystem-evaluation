-- ============================================================
-- OPTIMIZATION: Performance Tuning for Audit and Questions
-- ============================================================

-- 1. INDICES FOR PERFORMANCE
-- ------------------------------------------------------------

-- 1.1 Audit Logs: Optimization for dashboard and recent activity lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
-- Ensuring user_id index exists (already likely exists, but for safety)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 1.2 Question Bank: Optimization for filters
-- Renaming/Ensuring indices follow a consistent pattern if missing
CREATE INDEX IF NOT EXISTS idx_question_bank_course_id ON public.question_bank(course_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON public.question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON public.question_bank(created_at DESC);

-- 1.3 Adding status column to question_bank for better filtering (as per optimization plan)
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON public.question_bank(status);

-- 2. RLS OPTIMIZATION WITH JWT CLAIMS
-- ------------------------------------------------------------

-- 2.1 Optimized Instructor function: Checks JWT first, then table (Fallback)
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (auth.jwt() ->> 'role') = 'INSTRUCTOR' OR 
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'INSTRUCTOR'
    );
$$;

-- 3. UPDATED POLICIES FOR QUESTION BANK
-- ------------------------------------------------------------

-- Ensure RLS is enabled
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Allow students to view active questions if they are logged in
DROP POLICY IF EXISTS "Users can view active questions" ON public.question_bank;
CREATE POLICY "Users can view active questions" 
ON public.question_bank
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND status = 'active'
);

-- Allow instructors full access to all questions
DROP POLICY IF EXISTS "Instructors can manage all questions" ON public.question_bank;
CREATE POLICY "Instructors can manage all questions" 
ON public.question_bank
FOR ALL
USING (public.is_instructor());

-- 4. ADDITIONAL INDICES FOR DASHBOARD AGGREGATIONS
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_passed ON public.quiz_attempts(user_id, passed) WHERE passed = true;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_completed ON public.lesson_progress(user_id, is_completed) WHERE is_completed = true;

-- Final Step: Force schema reload if necessary (optional but common in Supabase triggers)
NOTIFY pgrst, 'reload schema';
