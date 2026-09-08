import { useState, useCallback } from 'react';
import { LessonRecord } from '../domain/admin';

interface UseLessonStateProps {
    initialLesson: LessonRecord;
    onSave: (updatedLesson: LessonRecord) => void;
}

interface UseLessonStateReturn {
    lesson: LessonRecord;
    isLoading: boolean;
    isSaving: boolean;
    updateLessonData: (updates: Partial<LessonRecord>) => void;
    saveLesson: () => Promise<void>;
}

/**
 * Custom hook to manage lesson state and save logic
 * Follows SRP by handling only lesson data management
 */
export const useLessonState = ({
    initialLesson,
    onSave
}: UseLessonStateProps): UseLessonStateReturn => {
    const [lesson, setLesson] = useState<LessonRecord>(initialLesson);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Update lesson data partially
     */
    const updateLessonData = useCallback((updates: Partial<LessonRecord>) => {
        setLesson(prev => ({
            ...prev,
            ...updates,
            updated_at: new Date().toISOString()
        }));
    }, []);

    /**
     * Save lesson changes
     */
    const saveLesson = useCallback(async () => {
        try {
            setIsSaving(true);
            await onSave(lesson);
        } catch (error) {
            console.error('Error saving lesson:', error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [lesson, onSave]);

    return {
        lesson,
        isLoading,
        isSaving,
        updateLessonData,
        saveLesson
    };
};
