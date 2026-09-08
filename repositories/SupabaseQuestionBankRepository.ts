import { SupabaseClient } from '@supabase/supabase-js';
import { IQuestionBankRepository, QuestionBankFilters, QuestionBankPagination } from './IQuestionBankRepository';
import { QuizQuestion, QuizOption, QuestionDifficulty } from '../domain/quiz-entities';
import { DomainError } from '../domain/errors';

export class SupabaseQuestionBankRepository implements IQuestionBankRepository {
    constructor(private client: SupabaseClient) { }

    private readonly QUESTION_SELECT = `
        id,
        question_text,
        image_url,
        image_alt,
        difficulty,
        points,
        course_id,
        module_id,
        lesson_id,
        question_bank_options ( id, question_id, option_text, is_correct, position ),
        courses:course_id ( title ),
        modules:module_id ( title ),
        lessons:lesson_id ( title )
    `;

    private mapQuestion(row: any): QuizQuestion {
        const options = (row.question_bank_options || []).map((o: any) =>
            new QuizOption(o.id, o.question_id, o.option_text, o.is_correct, o.position)
        );
        return new QuizQuestion(
            row.id,
            'BANK', // Virtual quiz ID for bank questions
            row.question_text,
            'multiple_choice',
            0, // Position is not critical for bank pool
            row.points || 1,
            options,
            row.difficulty as QuestionDifficulty,
            row.imageUrl || row.image_url,
            row.imageAlt || row.image_alt,
            row.course_id,
            row.module_id,
            row.lesson_id,
            row.courses?.title,
            row.modules?.title,
            row.lessons?.title
        );
    }

    private mapQuestionForStudent(row: any): QuizQuestion {
        const options = (row.question_bank_options || []).map((o: any) =>
            new QuizOption(o.id, o.question_id, o.option_text, false, o.position)
        );
        return new QuizQuestion(
            row.id,
            'BANK',
            row.question_text,
            'multiple_choice',
            0,
            row.points || 1,
            options,
            row.difficulty as QuestionDifficulty,
            row.imageUrl || row.image_url,
            row.imageAlt || row.image_alt,
            row.course_id,
            row.module_id,
            row.lesson_id,
            row.courses?.title,
            row.modules?.title,
            row.lessons?.title,
            true // answerKeyHidden = true
        );
    }
    private buildQuestionsQuery(filters: QuestionBankFilters, withCount: boolean = false) {
        let query = withCount
            ? this.client.from('question_bank').select(this.QUESTION_SELECT, { count: 'exact' })
            : this.client.from('question_bank').select(this.QUESTION_SELECT);

        if (filters.courseId) query = query.eq('course_id', filters.courseId);
        if (filters.moduleId) query = query.eq('module_id', filters.moduleId);
        if (filters.lessonId) query = query.eq('lesson_id', filters.lessonId);
        if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
        if (filters.keyword) query = query.ilike('question_text', '%' + filters.keyword + '%');

        return query;
    }

    private mapQuestionsRows(rows: any[] | null): QuizQuestion[] {
        const questions: QuizQuestion[] = [];
        (rows || []).forEach(row => {
            try {
                questions.push(this.mapQuestion(row));
            } catch (e) {
                console.warn(`[SupabaseQuestionBankRepository] Skipping invalid question ${row.id}:`, e);
            }
        });
        return questions;
    }

    async getQuestions(filters: QuestionBankFilters): Promise<QuizQuestion[]> {
        const { data, error } = await this.buildQuestionsQuery(filters)
            .order('created_at', { ascending: false });

        if (error) throw new DomainError(`Erro ao buscar questões do banco: ${error.message}`);

        return this.mapQuestionsRows(data);
    }

    async getQuestionsPage(
        filters: QuestionBankFilters,
        pagination: QuestionBankPagination
    ): Promise<{ questions: QuizQuestion[]; total: number }> {
        const safePage = Math.max(1, Math.floor(pagination.page || 1));
        const safePageSize = Math.min(100, Math.max(1, Math.floor(pagination.pageSize || 20)));
        const from = (safePage - 1) * safePageSize;
        const to = from + safePageSize - 1;

        const { data, error, count } = await this.buildQuestionsQuery(filters, true)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw new DomainError(`Erro ao buscar questões paginadas: ${error.message}`);

        return {
            questions: this.mapQuestionsRows(data),
            total: count || 0
        };
    }

    async getQuestionById(id: string): Promise<QuizQuestion | null> {
        const { data, error } = await this.client
            .from('question_bank')
            .select(this.QUESTION_SELECT)
            .eq('id', id)
            .maybeSingle();

        if (error) throw new DomainError(`Erro ao buscar questão: ${error.message}`);
        if (!data) return null;

        return this.mapQuestion(data);
    }

    async createQuestion(question: QuizQuestion, hierarchy: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
    }): Promise<QuizQuestion> {
        const { data, error } = await this.client
            .from('question_bank')
            .insert({
                course_id: hierarchy.courseId,
                module_id: hierarchy.moduleId,
                lesson_id: hierarchy.lessonId,
                question_text: question.questionText,
                image_url: question.imageUrl,
                image_alt: question.imageAlt,
                difficulty: question.difficulty,
                points: question.points
            })
            .select('id')
            .single();

        if (error) throw new DomainError(`Erro ao criar questão no banco: ${error.message}`);

        const options = question.options.map((o, idx) => ({
            question_id: data.id,
            option_text: o.optionText,
            is_correct: o.isCorrect,
            position: o.position ?? idx
        }));

        const { error: optionsError } = await this.client
            .from('question_bank_options')
            .insert(options);

        if (optionsError) throw new DomainError(`Erro ao criar opções no banco: ${optionsError.message}`);

        const created = await this.getQuestionById(data.id);
        if (!created) throw new DomainError('Erro ao recuperar questão criada');
        return created;
    }

    async createQuestions(questions: QuizQuestion[], hierarchy: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
    }): Promise<void> {
        // We do this in a loop because we need the ID of each question to insert options.
        // For very large imports, this could be optimized with a single RPC or bulk insert if IDs were pre-generated,
        // but for typical quiz sizes (5-20), sequential or Promise.all is fine.
        for (const q of questions) {
            await this.createQuestion(q, hierarchy);
        }
    }

    async updateQuestion(question: QuizQuestion, hierarchy: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
    }): Promise<QuizQuestion> {
        const { error } = await this.client
            .from('question_bank')
            .update({
                course_id: hierarchy.courseId,
                module_id: hierarchy.moduleId,
                lesson_id: hierarchy.lessonId,
                question_text: question.questionText,
                image_url: question.imageUrl,
                image_alt: question.imageAlt,
                difficulty: question.difficulty,
                points: question.points
            })
            .eq('id', question.id);

        if (error) throw new DomainError(`Erro ao atualizar questão no banco: ${error.message}`);

        // Delete old options and insert new ones (simpler than syncing)
        await this.client.from('question_bank_options').delete().eq('question_id', question.id);

        const options = question.options.map(o => ({
            question_id: question.id,
            option_text: o.optionText,
            is_correct: o.isCorrect,
            position: o.position
        }));

        const { error: optionsError } = await this.client
            .from('question_bank_options')
            .insert(options);

        if (optionsError) throw new DomainError(`Erro ao atualizar opções no banco: ${optionsError.message}`);

        const updated = await this.getQuestionById(question.id);
        if (!updated) throw new DomainError('Erro ao recuperar questão atualizada');
        return updated;
    }

    async deleteQuestion(id: string): Promise<void> {
        // Explicitly delete options first to ensure no foreign key issues
        // (even if cascade is on, this is safer for debugging)
        const { error: optionsError } = await this.client
            .from('question_bank_options')
            .delete()
            .eq('question_id', id);

        if (optionsError) {
            console.error('Error deleting options:', optionsError);
            throw new DomainError(`Erro ao deletar opções da questão: ${optionsError.message}`);
        }

        const { error } = await this.client.from('question_bank').delete().eq('id', id);
        if (error) throw new DomainError(`Erro ao deletar questão: ${error.message}`);
    }

    async getRandomQuestions(count: number, filters: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
        difficulty?: QuestionDifficulty;
        excludeIds?: string[];
    }): Promise<QuizQuestion[]> {
        // Supabase doesn't have a direct 'order by random' with filter in simple API
        // We'll use a RPC or fetch all IDs and then select random ones, 
        // but for now, we can fetch a pool and shuffle in memory if the pool is small.
        // Better: Use a custom RPC 'get_random_bank_questions' for performance.

        const { data, error } = await this.client.rpc('get_random_bank_questions', {
            p_count: count,
            p_course_id: filters.courseId || null,
            p_module_id: filters.moduleId || null,
            p_lesson_id: filters.lessonId || null,
            p_difficulty: filters.difficulty || null,
            p_exclude_ids: filters.excludeIds || null
        });

        if (error) {
            console.error('RPC get_random_bank_questions failed:', error);
            // Fallback bounded pool to avoid large egress when RPC/migration is missing.
            const fallbackPoolSize = Math.min(Math.max(count * 3, 30), 200);
            let fallbackQuery = this.client
                .from('question_bank')
                .select(`
                    id,
                    question_text,
                    image_url,
                    image_alt,
                    difficulty,
                    points,
                    course_id,
                    module_id,
                    lesson_id,
                    question_bank_options ( id, question_id, option_text, is_correct, position ),
                    courses:course_id ( title ),
                    modules:module_id ( title ),
                    lessons:lesson_id ( title )
                `);

            if (filters.courseId) fallbackQuery = fallbackQuery.eq('course_id', filters.courseId);
            if (filters.moduleId) fallbackQuery = fallbackQuery.eq('module_id', filters.moduleId);
            if (filters.lessonId) fallbackQuery = fallbackQuery.eq('lesson_id', filters.lessonId);
            if (filters.difficulty) fallbackQuery = fallbackQuery.eq('difficulty', filters.difficulty);

            const { data: fallbackData, error: fallbackError } = await fallbackQuery
                .order('created_at', { ascending: false })
                .limit(fallbackPoolSize);

            if (fallbackError) {
                throw new DomainError(`Erro ao buscar questões aleatórias (fallback): ${fallbackError.message}`);
            }

            const excludeSet = new Set(filters.excludeIds || []);
            const fallbackQuestions: QuizQuestion[] = [];
            (fallbackData || [])
                .filter((row: any) => !excludeSet.has(row.id))
                .forEach((row: any) => {
                    try {
                        fallbackQuestions.push(this.mapQuestion(row));
                    } catch (e) {
                        console.warn(`[SupabaseQuestionBankRepository] Skipping invalid fallback question ${row.id}:`, e);
                    }
                });

            return fallbackQuestions
                .sort(() => Math.random() - 0.5)
                .slice(0, count);
        }

        const questions: QuizQuestion[] = [];
        (data || []).forEach((row: any) => {
            try {
                questions.push(this.mapQuestion(row));
            } catch (e) {
                console.warn(`[SupabaseQuestionBankRepository] Skipping invalid random question ${row.id}:`, e);
            }
        });

        return questions;
    }

    async getRandomQuestionsForStudent(count: number, filters: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
        difficulty?: QuestionDifficulty;
        excludeIds?: string[];
    }): Promise<QuizQuestion[]> {
        const { data, error } = await this.client.rpc('get_random_bank_questions_for_student', {
            p_count: count,
            p_course_id: filters.courseId || null,
            p_module_id: filters.moduleId || null,
            p_lesson_id: filters.lessonId || null,
            p_difficulty: filters.difficulty || null,
            p_exclude_ids: filters.excludeIds || null
        });

        if (error) {
            console.error('[SupabaseQuestionBankRepository] Student random questions RPC failed.');
            throw new DomainError('Não foi possível carregar as questões do estudante.');
        }

        const questions: QuizQuestion[] = [];
        (data || []).forEach((row: any) => {
            try {
                questions.push(this.mapQuestionForStudent(row));
            } catch (e) {
                console.warn(`[SupabaseQuestionBankRepository] Skipping invalid random question ${row.id}:`, e);
            }
        });

        return questions;
    }
}
