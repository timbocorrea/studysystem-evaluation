import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizResultsModal from '../../components/QuizResultsModal';

vi.mock('../../services/Dependencies', () => ({
    aiService: {
        analyzeQuizPerformance: vi.fn(),
    },
}));

describe('QuizResultsModal pedagogical feedback', () => {
    beforeEach(() => {
        let animationFrameCall = 0;
        window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
            animationFrameCall += 1;
            callback(animationFrameCall === 1 ? 1 : 1501);
            return 1;
        });
    });

    it('renders question feedback as separate safe fields', () => {
        render(
            <QuizResultsModal
                result={{
                    score: 80,
                    passed: true,
                    earnedPoints: 8,
                    totalPoints: 10,
                    questionFeedback: [{
                        questionId: 'question-1',
                        questionText: 'Enunciado sem marcador',
                        userAnswer: 'Resposta escolhida',
                        correctAnswer: 'Resposta correta',
                        justification: 'Explicação pedagógica',
                        isCorrect: false,
                    }],
                }}
                passingScore={70}
                isOpen
                onClose={vi.fn()}
            />
        );

        expect(screen.getByRole('heading', { name: /Revis.*pedag.*gica/ })).toBeInTheDocument();
        expect(screen.getByText('Enunciado sem marcador')).toBeInTheDocument();
        expect(screen.getByText('Resposta escolhida')).toBeInTheDocument();
        expect(screen.getByText('Resposta correta')).toBeInTheDocument();
        expect(screen.getByText(/Explica.*pedag/)).toBeInTheDocument();
        expect(screen.getByText('Resposta incorreta')).toBeInTheDocument();
        expect(screen.queryByText('*Justificativa:*')).not.toBeInTheDocument();
    });

    it('preserves the legacy result layout when feedback is absent', () => {
        render(
            <QuizResultsModal
                result={{ score: 80, passed: true, earnedPoints: 8, totalPoints: 10 }}
                passingScore={70}
                isOpen
                onClose={vi.fn()}
            />
        );

        expect(screen.queryByRole('heading', { name: /Revis.*pedag.*gica/ })).not.toBeInTheDocument();
    });
});
