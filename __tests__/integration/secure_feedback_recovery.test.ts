import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseQuizRepository } from '../../repositories/SupabaseQuizRepository';

const migrationPath = resolve(
    process.cwd(),
    'supabase/migrations/20260902153936_20260901210000_add_authorized_quiz_feedback.sql'
);
const migration = readFileSync(migrationPath, 'utf8').replace(/\r\n?/g, '\n');
const firstMigration = readFileSync(
    resolve(
        process.cwd(),
        'supabase/migrations/20260902153144_20260901190945_strip_quiz_justification_from_student_payloads.sql'
    ),
    'utf8'
).replace(/\r\n?/g, '\n');
const repositorySource = readFileSync(
    resolve(process.cwd(), 'repositories/SupabaseQuizRepository.ts'),
    'utf8'
).replace(/\r\n?/g, '\n');

const feedbackOutputStart = migration.indexOf('SELECT json_build_object(');
const feedbackOutputEnd = migration.indexOf('FROM parsed_answers', feedbackOutputStart);
const feedbackOutput = migration.slice(feedbackOutputStart, feedbackOutputEnd);

describe('Secure feedback recovery migration contract', () => {
    it('closes direct student reads without changing the canonical question-bank closure', () => {
        expect(migration).toContain('ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;');
        expect(migration).toContain('ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;');
        expect(migration).toContain(
            'REVOKE ALL PRIVILEGES ON TABLE public.quiz_questions FROM PUBLIC, anon, authenticated;'
        );
        expect(migration).toContain(
            'REVOKE ALL PRIVILEGES ON TABLE public.quiz_options FROM PUBLIC, anon, authenticated;'
        );
        expect(migration).toContain('quiz_questions_staff_select');
        expect(migration).toContain('quiz_options_staff_select');
        expect(migration).toContain('public.is_current_user_instructor_or_master()');
        expect(migration).not.toContain('public.is_instructor() OR public.is_master()');
        expect(migration.match(/public\.is_current_user_instructor_or_master\(\)/g)).toHaveLength(10);
        expect(migration).toContain('TO authenticated');
        expect(migration).not.toMatch(/TO\s+(PUBLIC|anon)\b/i);
        for (const table of ['quiz_questions', 'quiz_options']) {
            expect(migration).toContain(
                `DROP POLICY IF EXISTS "Allow public select on ${table}" ON public.${table};`
            );
        }
        expect(migration).not.toMatch(/ALTER TABLE public\.question_bank\b/i);
        expect(migration).not.toMatch(/ALTER TABLE public\.question_bank_options\b/i);
        expect(migration).not.toMatch(/CREATE POLICY question_bank/i);
        expect(migration).not.toMatch(/\b(create|insert|update|delete|truncate)\s+table\b/i);
        expect(migration).toContain('DO $assert_known_quiz_policies$');
        expect(migration).toContain("RAISE EXCEPTION 'Unexpected policy on public.%: %'");
        expect(migration).not.toContain('EXECUTE format(');
        for (const policy of [
            'Show quiz_questions to all authenticated',
            'Show quiz_options to all authenticated',
            'quiz_questions_staff_select',
            'quiz_questions_staff_insert',
            'quiz_questions_staff_update',
            'quiz_questions_staff_delete',
            'quiz_options_staff_select',
            'quiz_options_staff_insert',
            'quiz_options_staff_update',
            'quiz_options_staff_delete',
        ]) {
            expect(migration).toContain(`DROP POLICY IF EXISTS ${policy.includes(' ') ? `"${policy}"` : policy}`);
        }
    });

    it('defines an owner-bound completed-attempt feedback RPC with safe output', () => {
        expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_quiz_attempt_feedback(');
        expect(migration).toContain('p_attempt_id uuid');
        expect(migration).toContain('RETURNS SETOF json');
        expect(migration).toMatch(/SECURITY DEFINER/i);
        expect(migration).toContain('SET search_path = public, pg_temp');
        expect(migration).toContain('v_user_id := auth.uid();');
        expect(migration).toContain('qa.id = p_attempt_id');
        expect(migration).toContain('qa.user_id = v_user_id');
        expect(migration).toContain('qa.completed_at IS NOT NULL');
        expect(migration).toContain('qa.answers');
        expect(migration).toContain('q.questions_count');
        expect(migration).toContain('v_questions_count integer;');
        expect(migration).toContain('v_answers_count integer;');
        expect(migration).toContain('v_available_questions integer;');
        expect(migration).toContain('v_expected_count integer;');
        expect(migration).toContain('jsonb_object_keys(v_answers)');
        expect(migration).not.toMatch(/p_user_id\b/i);
        expect(migration).toContain('public.quiz_questions');
        expect(migration).toContain('public.quiz_options');
        expect(migration).toContain('public.question_bank');
        expect(migration).toContain('public.question_bank_options');
        expect(feedbackOutput).toContain("'question_id'");
        expect(feedbackOutput).toContain("'question_text'");
        expect(feedbackOutput).toContain("'user_answer'");
        expect(feedbackOutput).toContain("'correct_answer'");
        expect(feedbackOutput).toContain("'justification'");
        expect(feedbackOutput).toContain("'is_correct'");
        expect(feedbackOutput).not.toMatch(/'questionId'|'questionText'|'userAnswer'|'correctAnswer'|'isCorrect'/);
        expect(migration).toContain('regexp_match');
        expect(migration).toContain('Justificativa\\s*:\\s*');
    });

    it('requires an exact complete attempt before building feedback output', () => {
        expect(migration).toContain('IF v_answers_count <> v_expected_count THEN');
        expect(migration).toContain(
            "RAISE EXCEPTION 'Incomplete quiz attempt feedback is not allowed';"
        );
        expect(migration).toContain('COALESCE(v_questions_count, v_available_questions)');
        expect(migration).toContain('COALESCE(v_questions_count, 20)');
        expect(migration).toContain(
            'FROM public.quiz_questions qq\n    WHERE qq.quiz_id = v_quiz_id;'
        );
        expect(migration).toContain(
            "FROM public.question_bank qb\n    WHERE coalesce(qb.status, 'active') = 'active'"
        );
        expect(migration).toContain(
            'IF v_expected_count IS NULL OR v_expected_count <= 0 THEN\n    RETURN;\n  END IF;'
        );

        const exactCountValidationIndex = migration.indexOf('IF v_answers_count <> v_expected_count THEN');
        const scopeValidationIndex = migration.indexOf(
            '    -- Cada chave/valor persistido precisa continuar vinculado ao quiz.'
        );
        const feedbackOutputIndex = migration.indexOf('  SELECT json_build_object(');

        expect(exactCountValidationIndex).toBeGreaterThan(-1);
        expect(exactCountValidationIndex).toBeLessThan(scopeValidationIndex);
        expect(scopeValidationIndex).toBeLessThan(feedbackOutputIndex);
    });

    it('keeps the true answer key out of pre-submit payloads', () => {
        expect(firstMigration).toContain("'is_correct', false");
        expect(firstMigration).not.toContain("'is_correct', true");
        const preSubmitAnswerKeyLines = firstMigration.split('\n').filter((line) =>
            line.includes("'is_correct'")
        );
        expect(preSubmitAnswerKeyLines).toHaveLength(1);
        expect(preSubmitAnswerKeyLines[0]).toMatch(/'is_correct'\s*,\s*false\s*$/i);
        expect(repositorySource.split('\n').filter((line) =>
            /quiz_options.*is_correct|question_bank_options.*is_correct/i.test(line)
        )).toEqual([]);
    });

    it('denies public and anonymous execution and grants only authenticated execution', () => {
        expect(migration).toContain(
            'REVOKE ALL ON FUNCTION public.get_quiz_attempt_feedback(uuid) FROM PUBLIC;'
        );
        expect(migration).toContain(
            'REVOKE ALL ON FUNCTION public.get_quiz_attempt_feedback(uuid) FROM anon;'
        );
        expect(migration).toContain(
            'REVOKE ALL ON FUNCTION public.get_quiz_attempt_feedback(uuid) FROM authenticated;'
        );
        expect(migration).toContain(
            'GRANT EXECUTE ON FUNCTION public.get_quiz_attempt_feedback(uuid) TO authenticated;'
        );
        expect(migration).not.toMatch(
            /GRANT EXECUTE ON FUNCTION public\.get_quiz_attempt_feedback\(uuid\) TO (PUBLIC|anon)/i
        );
    });

    it('maps the RPC-only repository contract without accepting a user id', async () => {
        const rpc = vi.fn().mockResolvedValue({
            data: [{
                question_id: 'question-1',
                question_text: 'Enunciado',
                user_answer: 'Resposta do aluno',
                correct_answer: 'Resposta correta',
                justification: 'Explicacao',
                is_correct: false,
            }],
            error: null,
        });
        const repository = new SupabaseQuizRepository({ rpc } as any);

        await expect(repository.getQuizAttemptFeedback('attempt-1')).resolves.toEqual([{
            questionId: 'question-1',
            questionText: 'Enunciado',
            userAnswer: 'Resposta do aluno',
            correctAnswer: 'Resposta correta',
            justification: 'Explicacao',
            isCorrect: false,
        }]);
        expect(rpc).toHaveBeenCalledOnce();
        expect(rpc).toHaveBeenCalledWith('get_quiz_attempt_feedback', {
            p_attempt_id: 'attempt-1',
        });
        expect(rpc.mock.calls[0][1]).not.toHaveProperty('user_id');
        expect(feedbackOutput).toContain("'question_id'");
        expect(feedbackOutput).toContain("'question_text'");
        expect(feedbackOutput).toContain("'user_answer'");
        expect(feedbackOutput).toContain("'correct_answer'");
        expect(feedbackOutput).toContain("'justification'");
        expect(feedbackOutput).toContain("'is_correct'");
    });
});
