import { QuizQuestion, QuestionDifficulty } from '../domain/quiz-entities';

export type QuestionBankFilters = {
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
    difficulty?: QuestionDifficulty;
    keyword?: string;
};

export type QuestionBankPagination = {
    page: number;
    pageSize: number;
};

export interface IQuestionBankRepository {
    getQuestions(filters: QuestionBankFilters): Promise<QuizQuestion[]>;

    getQuestionsPage(
        filters: QuestionBankFilters,
        pagination: QuestionBankPagination
    ): Promise<{ questions: QuizQuestion[]; total: number }>;

    getQuestionById(id: string): Promise<QuizQuestion | null>;

    createQuestion(question: QuizQuestion, hierarchy: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
    }): Promise<QuizQuestion>;

    createQuestions(questions: QuizQuestion[], hierarchy: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
    }): Promise<void>;

    updateQuestion(question: QuizQuestion, hierarchy: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
    }): Promise<QuizQuestion>;

    deleteQuestion(id: string): Promise<void>;

    getRandomQuestions(count: number, filters: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
        difficulty?: QuestionDifficulty;
        excludeIds?: string[];
    }): Promise<QuizQuestion[]>;

    getRandomQuestionsForStudent(count: number, filters: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
        difficulty?: QuestionDifficulty;
        excludeIds?: string[];
    }): Promise<QuizQuestion[]>;
}
