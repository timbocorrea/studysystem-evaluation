import { ValidationError } from './errors';

// ============ QUIZ SYSTEM INTERFACES & TYPES ============

export interface QuizQuestionFeedback {
    questionId: string;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    justification: string;
    isCorrect: boolean;
}

export interface QuizAttemptResult {
    score: number;
    passed: boolean;
    earnedPoints: number;
    totalPoints: number;
    questionFeedback?: QuizQuestionFeedback[];
    wrongAnswers?: Array<{
        question: string;
        userAnswer: string;
        correctAnswer: string;
    }>;
}

export type QuestionType = 'multiple_choice' | 'true_false';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

// ============ QUIZ ENTITIES ============

/**
 * QuizReport - Relatório de erro em uma questão
 */
export interface QuizReport {
    id?: string;
    quizId: string;
    questionId: string;
    userId: string;
    issueType: 'no_correct' | 'multiple_correct' | 'confusing' | 'other';
    comment?: string;
    status: 'pending' | 'resolved' | 'ignored';
    createdAt?: Date;
}

/**
 * QuizOption - Opção de resposta para uma pergunta
 */
export class QuizOption {
    constructor(
        public readonly id: string,
        public readonly questionId: string,
        public readonly optionText: string,
        public readonly isCorrect: boolean,
        public readonly position: number
    ) { }
}

/**
 * QuizQuestion - Pergunta de um questionário
 */
export class QuizQuestion {
    constructor(
        public readonly id: string,
        public readonly quizId: string,
        public readonly questionText: string,
        public readonly questionType: QuestionType,
        public readonly position: number,
        public readonly points: number,
        public readonly options: QuizOption[],
        public readonly difficulty: QuestionDifficulty = 'medium',
        public readonly imageUrl?: string,
        public readonly imageAlt?: string,
        public readonly courseId?: string,
        public readonly moduleId?: string,
        public readonly lessonId?: string,
        public readonly courseName?: string,
        public readonly moduleName?: string,
        public readonly lessonName?: string,
        public readonly answerKeyHidden: boolean = false
    ) {
        if (points <= 0) {
            throw new ValidationError('Pontos da questão devem ser maiores que zero.');
        }
        if (options.length < 2) {
            throw new ValidationError('Questão deve ter pelo menos 2 opções.');
        }
        const correctOptions = options.filter(o => o.isCorrect);
        if (!answerKeyHidden && correctOptions.length === 0) {
            throw new ValidationError('Questão deve ter pelo menos uma opção correta.');
        }
    }

    /**
     * Verifica se a resposta selecionada está correta
     */
    public isCorrectAnswer(selectedOptionId: string): boolean {
        const option = this.options.find(o => o.id === selectedOptionId);
        return option?.isCorrect ?? false;
    }

    /**
     * Retorna a(s) opção(ões) correta(s)
     */
    public getCorrectOptions(): QuizOption[] {
        return this.options.filter(o => o.isCorrect);
    }
}

/**
 * Quiz - Questionário associado a uma aula
 */
export class Quiz {
    constructor(
        public id: string,
        public lessonId: string,
        public title: string,
        public description: string,
        public passingScore: number,
        public questions: QuizQuestion[],
        public isManuallyReleased: boolean = false,
        public questionsCount: number | null = null,
        public poolDifficulty: QuestionDifficulty | null = null
    ) {
        if (passingScore < 0 || passingScore > 100) {
            throw new ValidationError('Nota de aprovação deve estar entre 0 e 100.');
        }
    }

    /**
     * Calcula pontuação total possível do quiz
     */
    public getTotalPoints(): number {
        return this.questions.reduce((sum, q) => sum + q.points, 0);
    }

    public validateAttempt(userAnswers: Record<string, string>): QuizAttemptResult {
        if (this.questions.some(question => question.answerKeyHidden)) {
            throw new ValidationError('Gabarito não disponível no cliente. Use a validação server-side do quiz.');
        }

        let earnedPoints = 0;
        const totalPoints = this.getTotalPoints();
        const wrongAnswers: Array<{question: string, userAnswer: string, correctAnswer: string}> = [];

        this.questions.forEach(question => {
            const userAnswerId = userAnswers[question.id];
            if (userAnswerId && question.isCorrectAnswer(userAnswerId)) {
                earnedPoints += question.points;
            } else {
                // Populate wrong answers for predictive analysis
                const userAnswerOption = question.options.find(o => o.id === userAnswerId);
                const correctOptions = question.getCorrectOptions();
                const correctText = correctOptions.length > 0 
                    ? correctOptions.map(o => o.optionText).join(' ou ') 
                    : 'Nenhuma resposta configurada como correta';
                
                wrongAnswers.push({
                    question: question.questionText,
                    userAnswer: userAnswerOption ? userAnswerOption.optionText : 'Nenhuma resposta enviada',
                    correctAnswer: correctText
                });
            }
        });

        const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
        const passed = score >= this.passingScore;

        return { score, passed, earnedPoints, totalPoints, wrongAnswers };
    }

    /**
     * Retorna número de questões
     */
    get questionCount(): number {
        return this.questions.length;
    }
}

/**
 * QuizAttempt - Tentativa de um usuário em um questionário
 */
export class QuizAttempt {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly quizId: string,
        public readonly score: number,
        public readonly passed: boolean,
        public readonly answers: Record<string, string>,
        public readonly attemptNumber: number,
        public readonly completedAt: Date,
        public readonly earnedPoints?: number,
        public readonly totalPoints?: number
    ) {
        if (score < 0 || score > 100) {
            throw new ValidationError('Score deve estar entre 0 e 100.');
        }
        if (attemptNumber < 1) {
            throw new ValidationError('Número da tentativa deve ser maior que zero.');
        }
    }

    /**
     * Verifica se passou no quiz
     */
    get isPassing(): boolean {
        return this.passed;
    }

    /**
     * Retorna mensagem de resultado
     */
    get resultMessage(): string {
        if (this.passed) {
            return `Parabéns! Você obteve ${this.score.toFixed(1)}% e foi aprovado!`;
        }
        return `Você obteve ${this.score.toFixed(1)}%. Continue estudando e tente novamente!`;
    }
}

export { ValidationError };
