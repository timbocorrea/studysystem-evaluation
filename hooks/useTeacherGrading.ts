import { useState, useEffect, useCallback } from 'react';
import { supabaseClient as supabase } from '../services/Dependencies';

export interface PendingAnswer {
    user_id: string;
    lesson_id: string;
    block_id: string;
    answer_text: string;
    updated_at: string;
    student_name: string;
    lesson_title: string;
    course_title: string;
}

export function useTeacherGrading(instructorId: string | undefined) {
    const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPendingAnswers = useCallback(async () => {
        if (!instructorId) return;

        try {
            setIsLoading(true);
            const { data, error: rpcError } = await supabase
                .rpc('get_pending_student_answers', {
                    p_instructor_id: instructorId
                });

            if (rpcError) throw rpcError;
            setPendingAnswers(data || []);
            setError(null);
        } catch (err) {
            console.error('Error loading pending answers:', err);
            setError('Não foi possível carregar as respostas pendentes.');
        } finally {
            setIsLoading(false);
        }
    }, [instructorId]);

    useEffect(() => {
        loadPendingAnswers();
    }, [loadPendingAnswers]);

    const saveFeedback = async (
        userId: string, 
        lessonId: string, 
        blockId: string, 
        grade: string, 
        feedbackText: string
    ) => {
        if (!instructorId) return false;

        try {
            const { error: updateError } = await supabase
                .from('student_answers')
                .update({
                    grade,
                    feedback_text: feedbackText,
                    graded_by: instructorId,
                    graded_at: new Date().toISOString()
                })
                .match({ user_id: userId, lesson_id: lessonId, block_id: blockId });

            if (updateError) throw updateError;

            // Remove from local list
            setPendingAnswers(prev => 
                prev.filter(ans => !(ans.user_id === userId && ans.lesson_id === lessonId && ans.block_id === blockId))
            );

            return true;
        } catch (err) {
            console.error('Error saving feedback:', err);
            return false;
        }
    };

    return {
        pendingAnswers,
        isLoading,
        error,
        saveFeedback,
        refresh: loadPendingAnswers
    };
}
