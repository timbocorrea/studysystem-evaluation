// hooks/useQuizAutoSave.ts
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage local auto-save for quiz answers.
 * Prevents data loss on page refresh or network failure.
 */
export function useQuizAutoSave<T>(quizId: string | undefined, userId: string | undefined, initialAnswers: T) {
  // Unique storage key including userId to avoid conflicts on shared devices
  const storageKey = (quizId && userId) ? `study_system_quiz_draft_${userId}_${quizId}` : null;

  const [answers, setAnswers] = useState<T>(() => {
    if (!storageKey) return initialAnswers;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao ler o auto-save do quiz:', e);
    }
    return initialAnswers;
  });

  const [isRestored, setIsRestored] = useState(false);

  // Check if we restored from local storage on initial load
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setIsRestored(true);
      }
    }
  }, [storageKey]);

  // Save to LocalStorage whenever 'answers' state changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch (e) {
      console.warn('Erro ao salvar o progresso do quiz:', e);
    }
  }, [answers, storageKey]);

  // Clear cache when quiz is submitted successfully
  const clearAutoSave = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      setIsRestored(false);
    } catch (e) {
      console.warn('Erro ao limpar o auto-save do quiz:', e);
    }
  }, [storageKey]);

  return { answers, setAnswers, clearAutoSave, isRestored };
}
