import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { useCoursesList } from './useCourses';
import { CourseService } from '../services/CourseService';
import { Course } from '../domain/entities';

// Mock Dependencies
const mockGetCoursesSummary = vi.fn();

const mockService = {
    getCoursesSummary: mockGetCoursesSummary,
} as unknown as CourseService;

// Wrapper for React Query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useCoursesList Hook', () => {
    it('returns empty list or undefined when userId is undefined', async () => {
        const { result } = renderHook(() => useCoursesList(mockService, undefined, true), {
            wrapper: createWrapper(),
        });

        // When userId is undefined, query is disabled -> status: pending, fetchStatus: idle
        expect(result.current.status).toBe('pending');
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches and transforms summary data into Course objects', async () => {
        const mockSummaries = [
            { id: '1', title: 'Course 1', description: 'Desc 1', imageUrl: 'img1.jpg' },
            { id: '2', title: 'Course 2', description: 'Desc 2', imageUrl: null },
        ];

        mockGetCoursesSummary.mockResolvedValue(mockSummaries);

        const { result } = renderHook(() => useCoursesList(mockService, 'user-123', true), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const courses = result.current.data as Course[];
        expect(courses).toHaveLength(2);
        expect(courses[0]).toBeInstanceOf(Course);
        expect(courses[0].id).toBe('1');
        expect(courses[0].title).toBe('Course 1');
        expect(courses[0].modules).toEqual([]); // Should be empty as per our lightweight logic mapping
    });
});
