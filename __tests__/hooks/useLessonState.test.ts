import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLessonState } from '../../hooks/useLessonState';
import { mockLesson } from '../mocks/lessonMocks';

describe('useLessonState', () => {
    const mockOnSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with provided lesson', () => {
            const { result } = renderHook(() =>
                useLessonState({
                    initialLesson: mockLesson,
                    onSave: mockOnSave
                })
            );

            expect(result.current.lesson).toEqual(mockLesson);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.isSaving).toBe(false);
        });
    });

    describe('updateLessonData', () => {
        it('should update lesson data partially', () => {
            const { result } = renderHook(() =>
                useLessonState({
                    initialLesson: mockLesson,
                    onSave: mockOnSave
                })
            );

            act(() => {
                result.current.updateLessonData({ title: 'New Title' });
            });

            expect(result.current.lesson.title).toBe('New Title');
            expect(result.current.lesson.id).toBe(mockLesson.id); // Other fields unchanged
        });

        it('should preserve other fields when updating partially', () => {
            const { result } = renderHook(() =>
                useLessonState({
                    initialLesson: mockLesson,
                    onSave: mockOnSave
                })
            );

            act(() => {
                result.current.updateLessonData({ title: 'New Title' });
            });

            expect(result.current.lesson.title).toBe('New Title');
            expect(result.current.lesson.module_id).toBe(mockLesson.module_id);
            expect(result.current.lesson.position).toBe(mockLesson.position);
        });
    });

    describe('saveLesson', () => {
        it('should call onSave with current lesson', async () => {
            const { result } = renderHook(() =>
                useLessonState({
                    initialLesson: mockLesson,
                    onSave: mockOnSave
                })
            );

            await act(async () => {
                await result.current.saveLesson();
            });

            expect(mockOnSave).toHaveBeenCalledWith(mockLesson);
            expect(mockOnSave).toHaveBeenCalledTimes(1);
        });

        it('should reset isSaving after save completes', async () => {
            const { result } = renderHook(() =>
                useLessonState({
                    initialLesson: mockLesson,
                    onSave: mockOnSave
                })
            );

            await act(async () => {
                await result.current.saveLesson();
            });

            // After save completes, isSaving should be false
            expect(result.current.isSaving).toBe(false);
        });

        it('should handle save errors gracefully', async () => {
            const mockError = new Error('Save failed');
            const mockFailingSave = vi.fn(() => Promise.reject(mockError));

            const { result } = renderHook(() =>
                useLessonState({
                    initialLesson: mockLesson,
                    onSave: mockFailingSave
                })
            );

            // Expect the save to throw
            await expect(async () => {
                await act(async () => {
                    await result.current.saveLesson();
                });
            }).rejects.toThrow('Save failed');

            // isSaving should be reset to false even after error
            expect(result.current.isSaving).toBe(false);
        });
    });
});
