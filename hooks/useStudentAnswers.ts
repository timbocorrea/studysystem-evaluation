import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient as supabase } from '../services/Dependencies';

interface StudentAnswer {
    blockId: string;
    answerText: string;
    updatedAt: string;
    grade?: string | null;
    feedbackText?: string | null;
    gradedBy?: string | null;
    gradedAt?: string | null;
}

interface UseStudentAnswersProps {
    userId: string;
    lessonId: string;
}

export const useStudentAnswers = ({ userId, lessonId }: UseStudentAnswersProps) => {
    const [answers, setAnswers] = useState<Map<string, StudentAnswer>>(new Map());
    const [loading, setLoading] = useState(true);
    const [savingBlocks, setSavingBlocks] = useState<Set<string>>(new Set());
    const loadedRef = useRef(false);

    // Load answers on mount
    useEffect(() => {
        if (!userId || !lessonId) {
            setLoading(false);
            return;
        }

        // Avoid duplicate loads
        if (loadedRef.current) return;
        loadedRef.current = true;

        const loadAnswers = async () => {
            try {
                const { data, error } = await supabase
                    .from('student_answers')
                    .select('block_id, answer_text, updated_at, grade, feedback_text, graded_by, graded_at')
                    .eq('user_id', userId)
                    .eq('lesson_id', lessonId);

                if (error) {
                    console.error('❌ Error loading student answers:', error);
                    return;
                }

                if (data && data.length > 0) {
                    const answersMap = new Map<string, StudentAnswer>();
                    data.forEach((row: any) => {
                        answersMap.set(row.block_id, {
                            blockId: row.block_id,
                            answerText: row.answer_text,
                            updatedAt: row.updated_at,
                            grade: row.grade,
                            feedbackText: row.feedback_text,
                            gradedBy: row.graded_by,
                            gradedAt: row.graded_at
                        });
                    });
                    setAnswers(answersMap);
                }
            } catch (err) {
                console.error('❌ Error loading student answers:', err);
            } finally {
                setLoading(false);
            }
        };

        loadAnswers();
    }, [userId, lessonId]);

    // Reset when lesson changes
    useEffect(() => {
        loadedRef.current = false;
        setAnswers(new Map());
        setLoading(true);
    }, [lessonId]);

    const saveAnswer = useCallback(async (blockId: string, answerText: string) => {
        if (!userId || !lessonId) return false;

        // Se já foi avaliado, não permitimos editar via este hook de aluno (opcional mas seguro)
        const existing = answers.get(blockId);
        if (existing?.feedbackText) {
            console.warn('Cannot edit a graded answer');
            return false;
        }

        setSavingBlocks(prev => new Set(prev).add(blockId));

        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('student_answers')
                .upsert({
                    user_id: userId,
                    lesson_id: lessonId,
                    block_id: blockId,
                    answer_text: answerText,
                    updated_at: now
                }, {
                    onConflict: 'user_id,lesson_id,block_id'
                });

            if (error) {
                console.error('❌ Error saving student answer:', error);
                return false;
            }

            // Update local state
            setAnswers(prev => {
                const next = new Map(prev);
                next.set(blockId, {
                    ...existing,
                    blockId,
                    answerText,
                    updatedAt: now
                });
                return next;
            });

            return true;
        } catch (err) {
            console.error('❌ Error saving student answer:', err);
            return false;
        } finally {
            setSavingBlocks(prev => {
                const next = new Set(prev);
                next.delete(blockId);
                return next;
            });
        }
    }, [userId, lessonId, answers]);

    const getAnswer = useCallback((blockId: string): StudentAnswer | undefined => {
        return answers.get(blockId);
    }, [answers]);

    return {
        answers,
        loading,
        savingBlocks,
        saveAnswer,
        getAnswer
    };
};
