import { useState, useEffect } from 'react';
import { Quiz, QuizAttemptResult } from '../domain/quiz-entities';
import { QuizQuestion } from '../domain/quiz-entities';
import { Course, Lesson, User } from '../domain/entities';
import { toast } from 'sonner';
import { courseRepository, questionBankRepository, quizRepository } from '../services/Dependencies';

interface UseLessonQuizProps {
    lesson: Lesson;
    course: Course;
    user: User;
    onTrackAction?: (action: string) => void;
}

interface UseLessonQuizReturn {
    // State
    quiz: Quiz | null;
    showQuizModal: boolean;
    quizResult: QuizAttemptResult | null;
    isSubmittingQuiz: boolean;
    quizMode: 'practice' | 'evaluation' | null;
    showPracticeConfigModal: boolean;
    practiceQuestionCount: number;

    // Actions
    setQuiz: (quiz: Quiz | null) => void;
    setShowQuizModal: (show: boolean) => void;
    setQuizResult: (result: QuizAttemptResult | null) => void;
    setIsSubmittingQuiz: (submitting: boolean) => void;
    setQuizMode: (mode: 'practice' | 'evaluation' | null) => void;
    setShowPracticeConfigModal: (show: boolean) => void;
    setPracticeQuestionCount: (count: number) => void;
    handleStartQuiz: () => Promise<void>;
    handleStartPracticeQuiz: () => Promise<void>;
    handleQuizSubmit: (answers: Record<string, string>) => Promise<void>;
}

export const useLessonQuiz = ({
    lesson,
    course,
    user,
    onTrackAction
}: UseLessonQuizProps): UseLessonQuizReturn => {
    // State
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizResult, setQuizResult] = useState<QuizAttemptResult | null>(null);
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
    const [quizMode, setQuizMode] = useState<'practice' | 'evaluation' | null>(null);
    const [showPracticeConfigModal, setShowPracticeConfigModal] = useState(false);
    const [practiceQuestionCount, setPracticeQuestionCount] = useState<number>(10);

    // Load quiz when lesson changes
    useEffect(() => {
        async function loadQuiz() {
            try {
                const loadedQuiz = user.role === 'STUDENT'
                    ? await quizRepository.getLessonQuizForStudent(lesson.id)
                    : await quizRepository.getQuizByLessonId(lesson.id);

                setQuiz(loadedQuiz);
            } catch (error) {
                console.error('Erro ao carregar quiz:', error);
                setQuiz(null);
            }
        }

        loadQuiz();
    }, [lesson.id, user.id, user.role]);

    // Handle quiz submission
    const handleQuizSubmit = async (answers: Record<string, string>) => {
        if (!quiz) return;

        setIsSubmittingQuiz(true);

        try {
            let result: QuizAttemptResult;
            const isStudentEvaluation = user.role === 'STUDENT' && quizMode === 'evaluation';
            const isStudentPractice = user.role === 'STUDENT' && quizMode === 'practice';
            const hasHiddenAnswerKey = quiz.questions.some(question => question.answerKeyHidden);

            if (isStudentEvaluation) {
                const attempt = await quizRepository.submitQuizAttempt(
                    user.id,
                    quiz.id,
                    answers
                );

                const attemptedQuestionIds = new Set(Object.keys(answers));
                const attemptedTotalPoints = quiz.questions
                    .filter(question => attemptedQuestionIds.has(question.id))
                    .reduce((sum, question) => sum + question.points, 0);
                const totalPoints = attempt.totalPoints ?? attemptedTotalPoints;
                const earnedPoints = attempt.earnedPoints ?? Number(((attempt.score / 100) * totalPoints).toFixed(2));
                let questionFeedback: QuizAttemptResult['questionFeedback'];

                try {
                    questionFeedback = await quizRepository.getQuizAttemptFeedback(attempt.id);
                } catch (feedbackError) {
                    console.error('Tentativa salva, mas o feedback pos-submit falhou:', feedbackError);
                    toast.error('Tentativa salva, mas não foi possível carregar a revisão agora.');
                }

                result = {
                    score: attempt.score,
                    passed: attempt.passed,
                    earnedPoints,
                    totalPoints,
                    questionFeedback
                };
            } else if (isStudentPractice && hasHiddenAnswerKey) {
                console.log('[QUIZ] Student practice mode with hidden answer key: evaluating server-side.');
                result = await quizRepository.checkPoolQuizAnswersForStudent(
                    quiz.id,
                    answers
                );
            } else {
                if (user.role === 'STUDENT') {
                    console.log('[QUIZ] Skipping persistence for student practice mode.');
                } else {
                    console.log(`[QUIZ] Skipping persistence for role: ${user.role}`);
                }

                result = quiz.validateAttempt(answers);
            }

            setQuizResult(result);
            setShowQuizModal(false);

            // Only show XP message if in evaluation mode and student
            if (quizMode === 'evaluation') {
                if (user.role === 'STUDENT') {
                    const pointsEarned = result.passed ? result.earnedPoints : 0;
                    toast.success(`Quiz concluído! ${result.passed ? `${pointsEarned} pontos ganhos` : 'Tente novamente para ganhar XP'}`);
                } else {
                    toast.success(`Simulação concluída! Resultados não persistentes para cargos ${user.role}.`);
                }
            } else {
                // Practice mode - no XP
                toast.success('Modo Prática concluído! XP não concedido.');
            }

            setIsSubmittingQuiz(false);
        } catch (error) {
            console.error('Error submitting quiz:', error);
            toast.error('Erro ao enviar quiz. Tente novamente.');
            setIsSubmittingQuiz(false);
        }
    };

    // Handle practice quiz start
    const handleStartPracticeQuiz = async () => {
        if (!quiz) return;

        toast.loading('Preparando modo prática...');
        try {
            const isStudent = user.role === 'STUDENT';
            const bankQuestions = isStudent
                ? await questionBankRepository.getRandomQuestionsForStudent(
                    practiceQuestionCount,
                    {
                        courseId: course.id,
                        lessonId: lesson.id
                    }
                )
                : await questionBankRepository.getRandomQuestions(
                    practiceQuestionCount,
                    {
                        courseId: course.id,
                        lessonId: lesson.id
                    }
                );

            if (bankQuestions.length === 0) {
                toast.dismiss();
                toast.error('Não há questões suficientes no banco para este modo.');
                return;
            }

            // Shuffle array utility
            const shuffleArray = <T,>(array: T[]): T[] => {
                const shuffled = [...array];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
            };

            // Create practice quiz with shuffled questions and options
            const practiceQuestions = shuffleArray(bankQuestions).map((bq, idx) => new QuizQuestion(
                bq.id,
                quiz.id,
                bq.questionText,
                'multiple_choice',
                idx,
                bq.points,
                shuffleArray(bq.options.map((o, optIdx) => ({
                    id: o.id,
                    questionId: bq.id,
                    optionText: o.optionText,
                    isCorrect: o.isCorrect,
                    position: optIdx
                }))),
                bq.difficulty,
                bq.imageUrl,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                isStudent
            ));

            quiz.questions = practiceQuestions;
            setQuizMode('practice');
            setShowPracticeConfigModal(false);
            setShowQuizModal(true);

            toast.dismiss();
            toast.success(`Modo Prática: ${practiceQuestions.length} questões!`);
            onTrackAction?.('Iniciou Quiz em Modo Prática');
        } catch (error) {
            console.error('Erro ao preparar modo prática:', error);
            toast.dismiss();
            toast.error('Erro ao preparar modo prática.');
        }
    };

    // Handle evaluation quiz start
    const handleStartQuiz = async () => {
        if (!quiz) return;

        if (quiz.questions.length === 0 && quiz.questionsCount) {
            // Pool Mode detected
            toast.loading('Sorteando questões do banco...');
            try {
                // Check for previous failed attempt to exclude questions
                let excludeIds: string[] = [];
                try {
                    const lastAttempt = await quizRepository.getLatestQuizAttempt(user.id, quiz.id);
                    if (lastAttempt && !lastAttempt.passed && lastAttempt.answers) {
                        excludeIds = Object.keys(lastAttempt.answers);
                        console.log('Excluding questions from previous failed attempt:', excludeIds);
                    }
                } catch (err) {
                    console.error('Error fetching previous attempt for exclusion:', err);
                    // Continue without exclusion if error occurs
                }

                // Default to 20 questions if not specified, or use the configured count
                const countToFetch = quiz.questionsCount > 0 ? quiz.questionsCount : 20;

                const isStudent = user.role === 'STUDENT';
                const bankQuestions = isStudent
                    ? await questionBankRepository.getRandomQuestionsForStudent(
                        countToFetch,
                        {
                            difficulty: quiz.poolDifficulty || undefined,
                            courseId: course.id,
                            lessonId: lesson.id,
                            excludeIds: excludeIds.length > 0 ? excludeIds : undefined
                        }
                    )
                    : await questionBankRepository.getRandomQuestions(
                        countToFetch,
                        {
                            difficulty: quiz.poolDifficulty || undefined,
                            courseId: course.id,
                            lessonId: lesson.id,
                            excludeIds: excludeIds.length > 0 ? excludeIds : undefined
                        }
                    );

                if (bankQuestions.length === 0) {
                    toast.dismiss();
                    toast.error('Não encontramos questões suficientes no banco para este critério.');
                    return;
                }

                // Converter para QuizQuestion entities
                quiz.questions = bankQuestions.map((bq, idx) => new QuizQuestion(
                    bq.id,
                    quiz.id,
                    bq.questionText,
                    'multiple_choice',
                    idx,
                    bq.points,
                    bq.options.map((o, optIdx) => ({
                        id: o.id,
                        questionId: bq.id,
                        optionText: o.optionText,
                        isCorrect: o.isCorrect,
                        position: optIdx
                    })),
                    bq.difficulty,
                    bq.imageUrl,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    isStudent
                ));

                toast.dismiss();
                toast.success(`${bankQuestions.length} questões sorteadas!`);
            } catch (error) {
                console.error('Erro ao buscar questões do banco:', error);
                toast.dismiss();
                toast.error('Erro ao sortear questões do banco.');
                return;
            }
        }

        setQuizMode('evaluation');
        setShowQuizModal(true);
        onTrackAction?.('Abriu o Quiz da aula em Modo Avaliativo');
    };

    return {
        // State
        quiz,
        showQuizModal,
        quizResult,
        isSubmittingQuiz,
        quizMode,
        showPracticeConfigModal,
        practiceQuestionCount,

        // Actions
        setQuiz,
        setShowQuizModal,
        setQuizResult,
        setIsSubmittingQuiz,
        setQuizMode,
        setShowPracticeConfigModal,
        setPracticeQuestionCount,
        handleStartQuiz,
        handleStartPracticeQuiz,
        handleQuizSubmit
    };
};
