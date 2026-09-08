import { describe, expect, it, vi } from 'vitest';
import { SupabaseQuizRepository } from '../../repositories/SupabaseQuizRepository';
import { Quiz, QuizQuestion, QuizOption } from '../../domain/quiz-entities';

function createMockClient(rpcData: any = null, rpcError: any = null) {
    const rpc = vi.fn().mockResolvedValue({
        data: rpcData,
        error: rpcError,
    });
    return {
        client: { rpc },
        spies: { rpc },
    };
}

describe('Quiz Pool Submission & Verification (FASE 14K-5)', () => {
    it('submitQuizAttempt calls submit_quiz_attempt RPC', async () => {
        const mockAttempt = {
            id: 'attempt-1',
            user_id: 'user-1',
            quiz_id: 'quiz-1',
            score: 80,
            passed: true,
            answers: { 'q-1': 'opt-1' },
            attempt_number: 1,
            completed_at: new Date().toISOString()
        };

        const { client, spies } = createMockClient(mockAttempt);
        const repo = new SupabaseQuizRepository(client as any);

        const attempt = await repo.submitQuizAttempt('user-1', 'quiz-1', { 'q-1': 'opt-1' });

        expect(spies.rpc).toHaveBeenCalledWith('submit_quiz_attempt', {
            p_quiz_id: 'quiz-1',
            p_answers: { 'q-1': 'opt-1' }
        });
        expect(attempt.score).toBe(80);
        expect(attempt.passed).toBe(true);
    });

    it('checkPoolQuizAnswersForStudent calls check_pool_quiz_answers_for_student RPC', async () => {
        const mockResult = {
            score: 90,
            passed: true,
            earnedPoints: 9,
            totalPoints: 10
        };

        const { client, spies } = createMockClient(mockResult);
        const repo = new SupabaseQuizRepository(client as any);

        const result = await repo.checkPoolQuizAnswersForStudent('quiz-1', { 'q-1': 'opt-1' });

        expect(spies.rpc).toHaveBeenCalledWith('check_pool_quiz_answers_for_student', {
            p_quiz_id: 'quiz-1',
            p_answers: { 'q-1': 'opt-1' }
        });
        expect(result.score).toBe(90);
        expect(result.passed).toBe(true);
        expect(result.earnedPoints).toBe(9);
        expect(result.totalPoints).toBe(10);
    });

    it('Quiz.validateAttempt throws ValidationError if any question has answerKeyHidden = true', () => {
        const option = new QuizOption('opt-1', 'q-1', 'Option 1', false, 1);
        const question = new QuizQuestion(
            'q-1',
            'quiz-1',
            'Question 1',
            'multiple_choice',
            1,
            10,
            [option, new QuizOption('opt-2', 'q-1', 'Option 2', false, 2)],
            'medium',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            true // answerKeyHidden = true
        );

        const quiz = new Quiz(
            'quiz-1',
            'lesson-1',
            'Quiz Title',
            'Quiz Desc',
            70,
            [question]
        );

        expect(() => quiz.validateAttempt({ 'q-1': 'opt-1' })).toThrow();
    });
});
