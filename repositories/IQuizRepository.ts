import { Quiz, QuizAttempt, QuizAttemptResult, QuizQuestionFeedback } from '../domain/quiz-entities';

export interface IQuizRepository {
  getQuizByLessonId(lessonId: string): Promise<Quiz | null>;
  getLessonQuizForStudent(lessonId: string): Promise<Quiz | null>;
  createQuiz(quiz: Quiz): Promise<Quiz>;
  updateQuiz(quiz: Quiz): Promise<Quiz>;
  deleteQuiz(quizId: string): Promise<void>;
  toggleQuizRelease(quizId: string, released: boolean): Promise<void>;
  
  submitQuizAttempt(userId: string, quizId: string, answers: Record<string, string>): Promise<QuizAttempt>;
  getQuizAttemptFeedback(attemptId: string): Promise<QuizQuestionFeedback[]>;
  checkPoolQuizAnswersForStudent(quizId: string, answers: Record<string, string>): Promise<QuizAttemptResult>;
  getLatestQuizAttempt(userId: string, quizId: string): Promise<QuizAttempt | null>;
  getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]>;

  createQuizReport(report: {
    quizId: string;
    questionId: string;
    userId: string;
    issueType: 'no_correct' | 'multiple_correct' | 'confusing' | 'other';
    comment?: string;
    status?: 'pending' | 'resolved' | 'rejected';
  }): Promise<void>;
  getQuizReports(quizId: string): Promise<any[]>;
}
