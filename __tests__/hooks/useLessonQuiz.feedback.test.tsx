import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Quiz, QuizAttempt, QuizOption, QuizQuestion } from '../../domain/quiz-entities';
import { useLessonQuiz } from '../../hooks/useLessonQuiz';

const mocks = vi.hoisted(() => ({
    quizRepository: {
        getLessonQuizForStudent: vi.fn(),
        submitQuizAttempt: vi.fn(),
        getQuizAttemptFeedback: vi.fn(),
        getLatestQuizAttempt: vi.fn(),
        checkPoolQuizAnswersForStudent: vi.fn(),
    },
    questionBankRepository: {
        getRandomQuestionsForStudent: vi.fn(),
        getRandomQuestions: vi.fn(),
    },
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
}));

vi.mock('../../services/Dependencies', () => ({
    quizRepository: mocks.quizRepository,
    questionBankRepository: mocks.questionBankRepository,
    courseRepository: {},
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

function createStudentQuiz() {
    const options = [
        new QuizOption('option-1', 'question-1', 'Primeira opção', false, 1),
        new QuizOption('option-2', 'question-1', 'Segunda opção', false, 2),
    ];
    const question = new QuizQuestion(
        'question-1',
        'quiz-1',
        'Enunciado sem justificativa no payload',
        'multiple_choice',
        1,
        10,
        options,
        'medium',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
    );

    return new Quiz('quiz-1', 'lesson-1', 'Quiz', 'Descrição', 70, [question]);
}

function createSubsetQuiz() {
    const firstQuestion = new QuizQuestion(
        'question-1',
        'quiz-1',
        'First subset question',
        'multiple_choice',
        1,
        10,
        [
            new QuizOption('option-1', 'question-1', 'First option', false, 1),
            new QuizOption('option-2', 'question-1', 'Second option', false, 2),
        ],
        'medium',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
    );
    const secondQuestion = new QuizQuestion(
        'question-2',
        'quiz-1',
        'Second subset question',
        'multiple_choice',
        2,
        30,
        [
            new QuizOption('option-3', 'question-2', 'First option', false, 1),
            new QuizOption('option-4', 'question-2', 'Second option', false, 2),
        ],
        'medium',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
    );

    return new Quiz('quiz-1', 'lesson-1', 'Quiz', 'Description', 70, [firstQuestion, secondQuestion]);
}

function createAttempt() {
    return new QuizAttempt(
        'attempt-1',
        'student-1',
        'quiz-1',
        50,
        false,
        { 'question-1': 'option-1' },
        1,
        new Date('2026-09-01T20:00:00.000Z')
    );
}

function createServerOwnedAttempt() {
    return new QuizAttempt(
        'attempt-1',
        'student-1',
        'quiz-1',
        80,
        true,
        { 'question-1': 'option-1' },
        1,
        new Date('2026-09-01T20:00:00.000Z'),
        4,
        5
    );
}

function renderStudentQuizHook() {
    return renderHook(() => useLessonQuiz({
        lesson: { id: 'lesson-1' } as any,
        course: { id: 'course-1' } as any,
        user: { id: 'student-1', role: 'STUDENT' } as any,
    }));
}

describe('useLessonQuiz secure feedback flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.quizRepository.getLessonQuizForStudent.mockResolvedValue(createStudentQuiz());
        mocks.quizRepository.getQuizAttemptFeedback.mockResolvedValue([]);
    });

    it('submits before fetching feedback and includes feedback in the result', async () => {
        const attempt = createAttempt();
        const feedback = [{
            questionId: 'question-1',
            questionText: 'Enunciado',
            userAnswer: 'Primeira opção',
            correctAnswer: 'Segunda opção',
            justification: 'Explicação pedagógica',
            isCorrect: false,
        }];
        mocks.quizRepository.submitQuizAttempt.mockResolvedValue(attempt);
        mocks.quizRepository.getQuizAttemptFeedback.mockResolvedValue(feedback);

        const { result } = renderStudentQuizHook();
        await waitFor(() => expect(result.current.quiz).not.toBeNull());

        act(() => result.current.setQuizMode('evaluation'));
        await act(async () => {
            await result.current.handleQuizSubmit({ 'question-1': 'option-1' });
        });

        expect(mocks.quizRepository.submitQuizAttempt).toHaveBeenCalledWith(
            'student-1',
            'quiz-1',
            { 'question-1': 'option-1' }
        );
        expect(mocks.quizRepository.getQuizAttemptFeedback).toHaveBeenCalledWith('attempt-1');
        expect(
            mocks.quizRepository.submitQuizAttempt.mock.invocationCallOrder[0]
        ).toBeLessThan(mocks.quizRepository.getQuizAttemptFeedback.mock.invocationCallOrder[0]);
        expect(result.current.quizResult?.questionFeedback).toEqual(feedback);
    });

    it('uses server-owned score, passed status, and point totals', async () => {
        mocks.quizRepository.submitQuizAttempt.mockResolvedValue(createServerOwnedAttempt());

        const { result } = renderStudentQuizHook();
        await waitFor(() => expect(result.current.quiz).not.toBeNull());

        act(() => result.current.setQuizMode('evaluation'));
        await act(async () => {
            await result.current.handleQuizSubmit({ 'question-1': 'option-1' });
        });

        expect(result.current.quizResult).toMatchObject({
            score: 80,
            passed: true,
            earnedPoints: 4,
            totalPoints: 5,
        });
    });

    it('falls back to points from answered question ids only', async () => {
        mocks.quizRepository.getLessonQuizForStudent.mockResolvedValue(createSubsetQuiz());
        mocks.quizRepository.submitQuizAttempt.mockResolvedValue(createAttempt());

        const { result } = renderStudentQuizHook();
        await waitFor(() => expect(result.current.quiz).not.toBeNull());

        act(() => result.current.setQuizMode('evaluation'));
        await act(async () => {
            await result.current.handleQuizSubmit({ 'question-1': 'option-1' });
        });

        expect(result.current.quizResult).toMatchObject({
            score: 50,
            passed: false,
            earnedPoints: 5,
            totalPoints: 10,
        });
    });

    it('does not request feedback when submit fails', async () => {
        mocks.quizRepository.submitQuizAttempt.mockRejectedValue(new Error('submit failed'));
        const { result } = renderStudentQuizHook();
        await waitFor(() => expect(result.current.quiz).not.toBeNull());

        act(() => result.current.setQuizMode('evaluation'));
        await act(async () => {
            await result.current.handleQuizSubmit({ 'question-1': 'option-1' });
        });

        expect(mocks.quizRepository.getQuizAttemptFeedback).not.toHaveBeenCalled();
        expect(result.current.quizResult).toBeNull();
    });

    it('keeps the persisted result and never resubmits when feedback fails', async () => {
        mocks.quizRepository.submitQuizAttempt.mockResolvedValue(createAttempt());
        mocks.quizRepository.getQuizAttemptFeedback.mockRejectedValue(new Error('feedback failed'));
        const { result } = renderStudentQuizHook();
        await waitFor(() => expect(result.current.quiz).not.toBeNull());

        act(() => result.current.setQuizMode('evaluation'));
        await act(async () => {
            await result.current.handleQuizSubmit({ 'question-1': 'option-1' });
        });

        expect(mocks.quizRepository.submitQuizAttempt).toHaveBeenCalledOnce();
        expect(mocks.quizRepository.getQuizAttemptFeedback).toHaveBeenCalledOnce();
        expect(result.current.quizResult).toMatchObject({
            score: 50,
            passed: false,
            questionFeedback: undefined,
        });
        expect(mocks.toast.error).toHaveBeenCalledWith(
            expect.stringContaining('Tentativa salva')
        );
    });
});
