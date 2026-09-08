import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCourse } from '../contexts/CourseContext';
import { Course, Module } from '../domain/entities';

// We need to access the repository. 
// Ideally, avoiding importing Context inside the hook that the Context uses would be circular.
// Use Service pattern instantiated in Context, or passed here.
// But React Query hooks usually live outside context or used BY context.
// Let's assume we pass the service or use a Service Locator/Hook.
// For now, to solve the circular dependency (Context uses Hook uses Service from Context),
// we will instantiate the hook inside the Context or make sure the service is available.
// In CourseContext.tsx, we instantiate CourseService.
// Let's adapt this hook to accept the service or user ID.

import { CourseService } from '../services/CourseService';
// We need to get the instance of service. 
// Since we used `createSupabaseClient` directly in Context, let's export a singleton or hook for service.
// Or just let the Context handle the queries using `useQuery` directly for simplicity in Phase 3 refactor.
// BUT the plan was to create `useCourses`.

// Let's refactor CourseContext to instantiate the service and specific React Query calls.
// And create this file as a collection of query definitions if we can pass the service.

export const useCoursesList = (service: CourseService, userId: string | undefined, enabled: boolean) => {
    return useQuery({
        queryKey: ['courses', 'list', userId],
        queryFn: async () => {
            if (!userId) return [];
            const summaries = await service.getCoursesSummary(userId);
            // Map summary to Course entity with lightweight modules/lessons (titles only)
            // This satisfies the UI expectation of Course[] without the heavy load
            return summaries.map(s => {
                const modules = (s.modules || [])
                    .slice()
                    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
                    .map((m: any) => {
                        const lessons = (m.lessons || [])
                            .slice()
                            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
                            .map((l: any) => ({
                                id: l.id,
                                title: l.title || 'Aula sem titulo',
                                videoUrl: '',
                                durationSeconds: 0,
                                isCompleted: l.isCompleted || false,
                                position: l.position || 0
                            } as any)); // Stub lesson
                        return new Module(m.id, m.title || 'Modulo sem titulo', lessons);
                    });

                return new Course(
                    s.id,
                    s.title,
                    s.description,
                    s.imageUrl,
                    s.color || null,
                    s.color_legend || null,
                    modules
                );
            });
        },
        enabled: enabled && !!userId,
        staleTime: 1000 * 60 * 15, // 15 minutes (aggressively cached)
        gcTime: 1000 * 60 * 60 * 2, // 2 hours
    });
};

export const useCourseDetails = (service: CourseService, courseId: string | null, userId: string | undefined) => {
    return useQuery({
        queryKey: ['course', courseId, userId],
        queryFn: async () => {
            if (!courseId) return null;
            // Changed to load structure only for performance
            // The context will handle loading lesson content on demand
            return service.loadCourseStructure(courseId, userId);
        },
        enabled: !!courseId && !!userId,
        staleTime: 1000 * 60 * 60, // 1 hour (course structure rarely changes)
        gcTime: 1000 * 60 * 60 * 4, // 4 hours
    });
};
