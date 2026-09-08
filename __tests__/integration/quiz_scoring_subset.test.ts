import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
    process.cwd(),
    'supabase/migrations/20260902210230_20260902170000_harden_quiz_attempt_scoring_subset.sql'
);
const migration = readFileSync(migrationPath, 'utf8').replace(/\r\n?/g, '\n');
const hookSource = readFileSync(resolve(process.cwd(), 'hooks/useLessonQuiz.ts'), 'utf8')
    .replace(/\r\n?/g, '\n');
const repositorySource = readFileSync(
    resolve(process.cwd(), 'repositories/SupabaseQuizRepository.ts'),
    'utf8'
).replace(/\r\n?/g, '\n');
const modalSource = readFileSync(resolve(process.cwd(), 'components/QuizResultsModal.tsx'), 'utf8')
    .replace(/\r\n?/g, '\n');

const functionStart = migration.indexOf('create or replace function public.submit_quiz_attempt(');
const functionEnd = migration.indexOf('$$;', functionStart);
const submitFunction = migration.slice(functionStart, functionEnd);
const staticStart = submitFunction.indexOf('  if v_has_static_questions then');
const poolStart = submitFunction.indexOf('\n  else', staticStart);
const staticBranch = submitFunction.slice(staticStart, poolStart);
const compact = (source: string) => source.replace(/\s+/g, ' ').trim();

describe('Server-side subset scoring contract', () => {
    it('requires a complete configured static subset before scoring', () => {
        expect(functionStart).toBeGreaterThan(-1);
        expect(functionEnd).toBeGreaterThan(functionStart);
        expect(poolStart).toBeGreaterThan(staticStart);

        expect(compact(submitFunction)).toContain(
            'language plpgsql security definer set search_path = public, pg_temp'
        );
        expect(submitFunction).toContain('v_user_id := auth.uid();');
        expect(submitFunction).toContain('if p_answers is null or jsonb_typeof(p_answers) <> \'object\' then');
        expect(submitFunction).toContain('from jsonb_object_keys(p_answers);');
        expect(submitFunction).toContain('if v_answers_count = 0 then');
        expect(submitFunction).toContain('if v_answers_count > 200 then');

        expect(compact(staticBranch)).toContain(
            'select count(*) into v_available_questions from public.quiz_questions qq where qq.quiz_id = p_quiz_id;'
        );
        expect(staticBranch).toMatch(
            /v_expected_count\s*:=\s*least\(\s*coalesce\(v_questions_count, v_available_questions\),\s*v_available_questions\s*\);/i
        );
        expect(staticBranch).toContain(
            'if v_available_questions <= 0 or v_expected_count <= 0 then'
        );
        expect(staticBranch).toContain('if v_answers_count <> v_expected_count then');
        expect(staticBranch).toContain(
            "raise exception 'Complete quiz attempt required: expected %, got %',"
        );

        const expectedCountIndex = staticBranch.indexOf('v_expected_count := least');
        const exactCountIndex = staticBranch.indexOf('if v_answers_count <> v_expected_count then');
        const subsetIterationIndex = staticBranch.indexOf('from jsonb_each_text(p_answers)');
        expect(expectedCountIndex).toBeLessThan(exactCountIndex);
        expect(exactCountIndex).toBeLessThan(subsetIterationIndex);
        expect(staticBranch).not.toContain('for quiz_q in');
    });

    it('scores only submitted questions and rejects foreign question or option ids', () => {
        expect(staticBranch).toMatch(
            /from public\.quiz_questions qq\s+where qq\.id = v_q_id\s+and qq\.quiz_id = p_quiz_id/i
        );
        expect(staticBranch).toMatch(
            /from public\.quiz_options qo\s+where qo\.id = v_opt_id\s+and qo\.question_id = v_q_id/i
        );

        const questionLookupIndex = staticBranch.indexOf('from public.quiz_questions qq');
        const questionRejectIndex = staticBranch.indexOf('if not found then', questionLookupIndex);
        const optionLookupIndex = staticBranch.indexOf('from public.quiz_options qo');
        const optionRejectIndex = staticBranch.indexOf('if not found then', optionLookupIndex);
        expect(questionRejectIndex).toBeGreaterThan(questionLookupIndex);
        expect(optionRejectIndex).toBeGreaterThan(optionLookupIndex);

        expect(staticBranch).toContain('v_total_points := v_total_points + v_points;');
        expect(staticBranch).toContain('v_earned_points := v_earned_points + v_points;');
        expect(staticBranch).toContain('if v_total_points <= 0 then');
        expect(submitFunction).toContain(
            'v_score_percent := round((v_earned_points / v_total_points) * 100, 2);'
        );
        expect(submitFunction).toContain('v_passed := v_score_percent >= v_passing_score;');

        const subsetOutcomes = [
            { correct: 5, score: 100, passed: true },
            { correct: 4, score: 80, passed: true },
            { correct: 3, score: 60, passed: false },
        ];
        expect(subsetOutcomes.map(({ correct }) => (correct / 5) * 100)).toEqual([100, 80, 60]);
        expect([4, 6].map((answerCount) => answerCount === 5)).toEqual([false, false]);
    });

    it('preserves the attempt row and adds server-owned point totals', () => {
        const insertIndex = submitFunction.indexOf('insert into public.quiz_attempts');
        const returnIndex = submitFunction.indexOf('return (', insertIndex);

        expect(insertIndex).toBeGreaterThan(-1);
        expect(returnIndex).toBeGreaterThan(insertIndex);
        expect(submitFunction).toContain('returning row_to_json(quiz_attempts.*)');
        expect(submitFunction).toContain("'earned_points', v_earned_points");
        expect(submitFunction).toContain("'total_points', v_total_points");
        expect(submitFunction).toContain('v_result::jsonb || jsonb_build_object(');
        expect(submitFunction).toContain('id');
        expect(submitFunction).toContain('user_id');
        expect(submitFunction).toContain('quiz_id');
        expect(submitFunction).toContain('attempt_number');
        expect(submitFunction).toContain('completed_at');

        expect(migration).toContain(
            'revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public;'
        );
        expect(migration).toContain(
            'revoke all on function public.submit_quiz_attempt(uuid, jsonb) from anon;'
        );
        expect(migration).toContain(
            'grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;'
        );
        expect(migration).not.toMatch(/grant execute on function public\.submit_quiz_attempt\(uuid, jsonb\) to (public|anon)/i);
    });

    it('does not change schema, RLS, or the existing pool path contract', () => {
        expect(migration).toMatch(/create or replace function public\.submit_quiz_attempt\(/i);
        expect((migration.match(/create or replace function/gi) ?? [])).toHaveLength(1);
        expect(migration).not.toMatch(/\b(alter table|create table|drop table|add column)\b/i);
        expect(migration).not.toMatch(/\b(enable row level security|create policy|drop policy)\b/i);

        expect(submitFunction).toContain('from public.question_bank qb');
        expect(submitFunction).toContain('from public.question_bank_options qo');
        expect(submitFunction).toContain('if v_answers_count > v_expected_count then');
        expect(submitFunction).toContain('Access denied to this quiz content');
    });
});

describe('Server authority and frontend compatibility contract', () => {
    it('maps server-owned point fields and never uses the global quiz total for subset fallback', () => {
        expect(repositorySource).toContain('data.earned_points');
        expect(repositorySource).toContain('data.total_points');
        expect(hookSource).toContain('score: attempt.score');
        expect(hookSource).toContain('passed: attempt.passed');
        expect(hookSource).toContain('const attemptedQuestionIds = new Set(Object.keys(answers));');
        expect(hookSource).toContain('const attemptedTotalPoints = quiz.questions');
        expect(hookSource).toContain('.filter(question => attemptedQuestionIds.has(question.id))');
        expect(hookSource).toContain('const totalPoints = attempt.totalPoints ?? attemptedTotalPoints;');
        expect(hookSource).toContain(
            'const earnedPoints = attempt.earnedPoints ?? Number(((attempt.score / 100) * totalPoints).toFixed(2));'
        );
        expect(hookSource).not.toContain('const totalPoints = quiz.getTotalPoints();');
    });

    it('keeps feedback after submit, avoids resubmission on feedback failure, and fixes confirmed mojibake', () => {
        const submitIndex = hookSource.indexOf('await quizRepository.submitQuizAttempt(');
        const feedbackIndex = hookSource.indexOf('await quizRepository.getQuizAttemptFeedback(', submitIndex);
        expect(submitIndex).toBeGreaterThan(-1);
        expect(feedbackIndex).toBeGreaterThan(submitIndex);
        expect(hookSource).toContain('Tentativa salva, mas não foi possível carregar a revisão agora.');
        expect(modalSource).toContain('Revisão pedagógica');
        expect(hookSource).not.toContain('nÃ£o foi possÃ­vel carregar a revisÃ£o agora.');
        expect(modalSource).not.toContain('RevisÃ£o pedagÃ³gica');
    });
});
