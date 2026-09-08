import { SupabaseClient } from '@supabase/supabase-js';
import { IQuizRepository } from './IQuizRepository';
import {
  Quiz,
  QuizQuestion,
  QuizOption,
  QuizAttempt,
  QuizAttemptResult,
  QuizQuestionFeedback
} from '../domain/quiz-entities';
import { DomainError, NotFoundError } from '../domain/errors';

export class SupabaseQuizRepository implements IQuizRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getQuizByLessonId(lessonId: string): Promise<Quiz | null> {
    const { data: quizData, error: quizError } = await this.client
      .from('quizzes')
      .select(`
        id,
        lesson_id,
        title,
        description,
        passing_score,
        is_manually_released,
        questions_count,
        pool_difficulty,
        quiz_questions (
          id,
          quiz_id,
          question_text,
          question_type,
          position,
          points,
          quiz_options (
            id,
            question_id,
            option_text,
            is_correct,
            position
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (quizError) throw new DomainError(`Erro ao buscar quiz: ${quizError.message}`);
    if (!quizData) return null;

    const questions = (quizData.quiz_questions || []).map((q: any) => {
      const options = (q.quiz_options || []).map((o: any) =>
        new QuizOption(o.id, o.question_id, o.option_text, o.is_correct, o.position)
      );
      return new QuizQuestion(q.id, q.quiz_id, q.question_text, q.question_type, q.position, q.points, options);
    });

    return new Quiz(
      quizData.id, 
      quizData.lesson_id, 
      quizData.title, 
      quizData.description, 
      quizData.passing_score, 
      questions, 
      quizData.is_manually_released ?? false, 
      quizData.questions_count, 
      quizData.pool_difficulty
    );
  }

  async getLessonQuizForStudent(lessonId: string): Promise<Quiz | null> {
    const { data: quizData, error } = await this.client.rpc('get_lesson_quiz_for_student', {
      p_lesson_id: lessonId
    });

    if (error) throw new DomainError(`Erro ao buscar quiz seguro do aluno: ${error.message}`);
    if (!quizData) return null;

    const questions = (quizData.quiz_questions || []).map((q: any) => {
      const options = (q.quiz_options || []).map((o: any) =>
        new QuizOption(o.id, o.question_id, o.option_text, false, o.position)
      );

      return new QuizQuestion(
        q.id,
        q.quiz_id,
        q.question_text,
        q.question_type,
        q.position,
        q.points,
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
    });

    return new Quiz(
      quizData.id,
      quizData.lesson_id,
      quizData.title,
      quizData.description,
      quizData.passing_score,
      questions,
      quizData.is_manually_released ?? false,
      quizData.questions_count,
      quizData.pool_difficulty
    );
  }

  async createQuiz(quiz: Quiz): Promise<Quiz> {
    const { data: quizData, error: quizError } = await this.client
      .from('quizzes')
      .insert({
        lesson_id: quiz.lessonId,
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passingScore,
        is_manually_released: quiz.isManuallyReleased,
        questions_count: quiz.questionsCount,
        pool_difficulty: quiz.poolDifficulty
      })
      .select('id')
      .single();

    if (quizError) throw new DomainError(`Erro ao criar quiz: ${quizError.message}`);

    for (const question of quiz.questions) {
      const { data: questionData, error: questionError } = await this.client
        .from('quiz_questions')
        .insert({
          quiz_id: quizData.id,
          question_text: question.questionText,
          question_type: question.questionType,
          position: question.position,
          points: question.points
        })
        .select('id')
        .single();

      if (questionError) throw new DomainError(`Erro ao criar pergunta: ${questionError.message}`);

      const options = question.options.map(o => ({
        question_id: questionData.id,
        option_text: o.optionText,
        is_correct: o.isCorrect,
        position: o.position
      }));

      await this.client.from('quiz_options').insert(options);
    }

    return (await this.getQuizByLessonId(quiz.lessonId))!;
  }

  async updateQuiz(quiz: Quiz): Promise<Quiz> {
    const { error: quizError } = await this.client
      .from('quizzes')
      .update({
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passingScore,
        questions_count: quiz.questionsCount,
        pool_difficulty: quiz.poolDifficulty,
        is_manually_released: quiz.isManuallyReleased
      })
      .eq('id', quiz.id);

    if (quizError) throw new DomainError(`Erro ao atualizar quiz: ${quizError.message}`);

    const { data: currentQuestions } = await this.client
      .from('quiz_questions')
      .select('id')
      .eq('quiz_id', quiz.id);

    const currentQIds = (currentQuestions || []).map(q => q.id);
    const incomingQIds = quiz.questions.map(q => q.id);
    const qIdsToDelete = currentQIds.filter(id => !incomingQIds.includes(id));

    if (qIdsToDelete.length > 0) {
      await this.client.from('quiz_options').delete().in('question_id', qIdsToDelete);
      await this.client.from('quiz_questions').delete().in('id', qIdsToDelete);
    }

    for (const question of quiz.questions) {
      await this.client.from('quiz_questions').upsert({
        id: question.id,
        quiz_id: quiz.id,
        question_text: question.questionText,
        question_type: question.questionType,
        position: question.position,
        points: question.points
      });

      const { data: currentOptions } = await this.client
        .from('quiz_options')
        .select('id')
        .eq('question_id', question.id);

      const currentOIds = (currentOptions || []).map(o => o.id);
      const incomingOIds = question.options.map(o => o.id);
      const oIdsToDelete = currentOIds.filter(id => !incomingOIds.includes(id));

      if (oIdsToDelete.length > 0) {
        await this.client.from('quiz_options').delete().in('id', oIdsToDelete);
      }

      const optionsToUpsert = question.options.map(o => ({
        id: o.id,
        question_id: question.id,
        option_text: o.optionText,
        is_correct: o.isCorrect,
        position: o.position
      }));

      await this.client.from('quiz_options').upsert(optionsToUpsert);
    }

    return (await this.getQuizByLessonId(quiz.lessonId))!;
  }

  async deleteQuiz(quizId: string): Promise<void> {
    const { error } = await this.client.from('quizzes').delete().eq('id', quizId);
    if (error) throw new DomainError(`Erro ao deletar quiz: ${error.message}`);
  }

  async toggleQuizRelease(quizId: string, released: boolean): Promise<void> {
    const { error } = await this.client.from('quizzes').update({ is_manually_released: released }).eq('id', quizId);
    if (error) throw new DomainError(`Erro ao atualizar liberação do quiz: ${error.message}`);
  }

  async submitQuizAttempt(userId: string, quizId: string, answers: Record<string, string>): Promise<QuizAttempt> {
    const { data, error } = await this.client.rpc('submit_quiz_attempt', {
      p_quiz_id: quizId,
      p_answers: answers
    });

    if (error) throw new DomainError(`Erro ao registrar tentativa: ${error.message}`);

    return new QuizAttempt(
      data.id,
      data.user_id,
      data.quiz_id,
      data.score,
      data.passed,
      data.answers,
      data.attempt_number,
      new Date(data.completed_at),
      data.earned_points == null ? undefined : Number(data.earned_points),
      data.total_points == null ? undefined : Number(data.total_points)
    );
  }

  async getQuizAttemptFeedback(attemptId: string): Promise<QuizQuestionFeedback[]> {
    const { data, error } = await this.client.rpc('get_quiz_attempt_feedback', {
      p_attempt_id: attemptId
    });

    if (error) throw new DomainError(`Erro ao buscar feedback da tentativa: ${error.message}`);

    type FeedbackRow = {
      question_id: string;
      question_text: string;
      user_answer: string;
      correct_answer: string;
      justification: string;
      is_correct: boolean;
    };

    return (Array.isArray(data) ? data as FeedbackRow[] : []).map((row) => ({
      questionId: row.question_id,
      questionText: row.question_text,
      userAnswer: row.user_answer,
      correctAnswer: row.correct_answer,
      justification: row.justification,
      isCorrect: row.is_correct
    }));
  }

  async checkPoolQuizAnswersForStudent(quizId: string, answers: Record<string, string>): Promise<QuizAttemptResult> {
    const { data, error } = await this.client.rpc('check_pool_quiz_answers_for_student', {
      p_quiz_id: quizId,
      p_answers: answers
    });

    if (error) throw new DomainError(`Erro ao verificar respostas do simulado: ${error.message}`);

    return {
      score: data.score,
      passed: data.passed,
      earnedPoints: data.earnedPoints,
      totalPoints: data.totalPoints
    };
  }

  async getLatestQuizAttempt(userId: string, quizId: string): Promise<QuizAttempt | null> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new DomainError(`Erro ao buscar tentativa: ${error.message}`);
    if (!data) return null;

    return new QuizAttempt(
      data.id, data.user_id, data.quiz_id, data.score, data.passed, data.answers, data.attempt_number, new Date(data.completed_at)
    );
  }

  async getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw new DomainError(`Erro ao buscar tentativas: ${error.message}`);

    return (data || []).map(row => new QuizAttempt(
      row.id, row.user_id, row.quiz_id, row.score, row.passed, row.answers, row.attempt_number, new Date(row.completed_at)
    ));
  }

  async createQuizReport(report: any): Promise<void> {
    const { error } = await this.client
      .from('quiz_reports')
      .insert({
        quiz_id: report.quizId,
        question_id: report.questionId,
        user_id: report.userId,
        issue_type: report.issueType,
        comment: report.comment,
        status: report.status || 'pending'
      });

    if (error) throw new DomainError(`Erro ao criar report: ${error.message}`);
  }

  async getQuizReports(quizId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('quiz_reports')
      .select(`
        *,
        profiles:user_id ( full_name ),
        quiz_questions:question_id ( question_text )
      `)
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Erro ao buscar reports: ${error.message}`);
    return data || [];
  }
}
