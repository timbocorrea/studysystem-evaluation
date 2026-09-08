
-- Phase 4: Student Answers Grading & Feedback
-- Adds columns to track instructor feedback and grades on student answers

ALTER TABLE public.student_answers
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS feedback_text TEXT,
ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

-- Drop existing update policy if it doesn't account for instructors
DROP POLICY IF EXISTS student_answers_update_self ON public.student_answers;

-- Aluno pode atualizar sua resposta APENAS se ainda não foi avaliada 
-- (Opcional: se quiser travar. Mas vamos manter flexível por enquanto mas com acesso ao instrutor)
CREATE POLICY student_answers_update_self ON public.student_answers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Nova política: Instrutor/Master pode atualizar para dar nota e feedback
DROP POLICY IF EXISTS student_answers_update_instructor ON public.student_answers;
CREATE POLICY student_answers_update_instructor ON public.student_answers
  FOR UPDATE USING (public.is_instructor()) 
  WITH CHECK (public.is_instructor());

-- Função para buscar respostas pendentes de cursos onde o usuário é instrutor
CREATE OR REPLACE FUNCTION get_pending_student_answers(p_instructor_id UUID)
RETURNS TABLE (
    user_id UUID,
    lesson_id UUID,
    block_id TEXT,
    answer_text TEXT,
    updated_at TIMESTAMPTZ,
    student_name TEXT,
    lesson_title TEXT,
    course_title TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.user_id,
        sa.lesson_id,
        sa.block_id,
        sa.answer_text,
        sa.updated_at,
        p.name as student_name,
        l.title as lesson_title,
        c.title as course_title
    FROM public.student_answers sa
    JOIN public.profiles p ON p.id = sa.user_id
    JOIN public.lessons l ON l.id = sa.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE c.instructor_id = p_instructor_id
    AND sa.feedback_text IS NULL
    ORDER BY sa.updated_at ASC;
END;
$$;
