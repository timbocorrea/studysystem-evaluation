import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Course, Lesson, Module } from '../domain/entities';
import { useAuth } from './AuthContext';
import { useCoursesList, useCourseDetails } from '../hooks/useCourses';
import { adminService, courseService } from '../services/Dependencies';
import { CourseService } from '../services/CourseService';
import { useGamificationStore } from '../stores/useGamificationStore';

interface CourseContextType {
    availableCourses: any[]; // CourseSummary[] | Course[] - relaxed for transition
    enrolledCourses: Course[];
    activeCourse: Course | null;
    activeModule: Module | null;
    activeLesson: Lesson | null;
    isLoadingCourses: boolean;

    selectCourse: (courseId: string) => void;
    selectModule: (moduleId: string) => void;
    selectLesson: (lessonId: string) => void;
    updateProgress: (watchedSeconds: number, lastBlockId?: string) => Promise<void>;
    markBlockAsRead: (blockId: string) => void;
    markVideoWatched: (videoUrl: string) => void;
    markAudioListened: (blockId: string) => void;
    enrollInCourse: (courseId: string) => Promise<void>;
    prefetchLesson: (lessonId: string) => void;

    courseService: CourseService;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    // State for Active Items
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [activeModule, setActiveModule] = useState<Module | null>(null);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

    // Service is imported from Dependencies.ts
    // 1. Fetch Lists (Summary)
    const coursesListQuery = useCoursesList(courseService, user?.id, !!user);
    const availableCourses = (coursesListQuery.data || []) as unknown as Course[];

    // 2. Fetch Active Course Details
    const courseDetailsQuery = useCourseDetails(courseService, activeCourseId, user?.id);
    const activeCourse = courseDetailsQuery.data || null;

    const isLoadingCourses = coursesListQuery.isLoading || courseDetailsQuery.isLoading;

    const enrolledCourses = React.useMemo(() => {
        return (coursesListQuery.data || []) as Course[];
    }, [coursesListQuery.data]);

    const filteredActiveCourse = activeCourse;

    // Reset module/lesson when course changes (handled partly effectively by activeCourse changing, 
    // but explicit reset on ID change is good).
    useEffect(() => {
        if (!activeCourseId) {
            setActiveModule(null);
            setActiveLesson(null);
        }
    }, [activeCourseId]);

    const selectCourse = (courseId: string) => {
        if (activeCourseId !== courseId) {
            setActiveCourseId(courseId);
            setActiveModule(null);
            setActiveLesson(null);
        }
    };

    const selectModule = (moduleId: string) => {
        if (!activeCourse) return;
        const mod = activeCourse.modules.find(m => m.id === moduleId);
        if (mod) {
            setActiveModule(mod);
            setActiveLesson(null);
        }
    };

    const queryClient = useQueryClient();

    const selectLesson = async (lessonId: string) => {
        if (!activeCourse) return;

        let foundMod: Module | null = null;
        let foundLesson: Lesson | null = null;

        for (const mod of activeCourse.modules) {
            const l = mod.lessons.find(l => l.id === lessonId);
            if (l) {
                foundMod = mod;
                foundLesson = l;
                break;
            }
        }

        if (!foundLesson || !foundMod) return;

        // Set active items immediately (Skeleton will show if !isLoaded)
        setActiveModule(foundMod);
        setActiveLesson(foundLesson);

        // Fetch content if missing
        if (!foundLesson.isLoaded && user?.id) {
            try {
                const fullLesson = await courseService.loadLessonContent(lessonId, user.id);
                if (fullLesson) {
                    // Update Active Lesson State
                    setActiveLesson(fullLesson);

                    // Update Course in Query Cache to persist loaded content
                    const newModules = activeCourse.modules.map(m => {
                        if (m.id === foundMod!.id) {
                            const newLessons = m.lessons.map(l => l.id === lessonId ? fullLesson : l);
                            return new Module(m.id, m.title, newLessons);
                        }
                        return m;
                    });

                    const newCourse = new Course(
                        activeCourse.id,
                        activeCourse.title,
                        activeCourse.description,
                        activeCourse.imageUrl,
                        activeCourse.color,
                        activeCourse.colorLegend,
                        newModules
                    );

                    queryClient.setQueryData(['course', activeCourse.id, user.id], newCourse);
                }
            } catch (err) {
                console.error("Failed to load lesson content", err);
                // Optional: Toast error
            }
        }
    };

    const prefetchLesson = async (lessonId: string) => {
        if (!activeCourse || !user?.id) return;

        // Find the lesson in structure
        let foundLesson: Lesson | null = null;
        for (const mod of activeCourse.modules) {
            const l = mod.lessons.find(l => l.id === lessonId);
            if (l) {
                foundLesson = l;
                break;
            }
        }

        if (foundLesson && !foundLesson.isLoaded) {
            console.log(`🚀 Prefetching lesson: ${lessonId}`);
            try {
                const fullLesson = await courseService.loadLessonContent(lessonId, user.id);
                if (fullLesson) {
                    const newModules = activeCourse.modules.map(m => {
                        const lessonInModule = m.lessons.find(l => l.id === lessonId);
                        if (lessonInModule) {
                            const newLessons = m.lessons.map(l => l.id === lessonId ? fullLesson : l);
                            return new Module(m.id, m.title, newLessons);
                        }
                        return m;
                    });

                    const newCourse = new Course(
                        activeCourse.id,
                        activeCourse.title,
                        activeCourse.description,
                        activeCourse.imageUrl,
                        activeCourse.color,
                        activeCourse.colorLegend,
                        newModules
                    );

                    queryClient.setQueryData(['course', activeCourse.id, user.id], newCourse);
                }
            } catch (err) {
                console.error("Prefetch failed", err);
            }
        }
    };

    const updateProgress = async (watchedSeconds: number, lastBlockId?: string) => {
        if (!activeLesson || !activeCourse || !user) return;

        // 🔍 Admin/Instructor check: Non-students do not track progress
        if (user.role !== 'STUDENT') return;

        // Optimistic: returns true only when lesson JUST became completed
        const becameCompleted = activeLesson.updateProgress(watchedSeconds);

        // Trigger React re-render by cloning the modified lesson (Immutability)
        setActiveLesson(activeLesson.clone());

        // Server update — pass the CORRECT becameCompleted flag
        const result = await courseService.updateUserProgress(user, activeLesson, activeCourse, becameCompleted, lastBlockId);

        // Handle Level Up Animation
        if (result.levelUp) {
            useGamificationStore.getState().showLevelUp(result.newLevel, result.unlockedAchievements);
        }

        // If it was just completed, refresh course data in cache
        if (becameCompleted) {
            queryClient.invalidateQueries({ queryKey: ['course', activeCourse.id, user.id] });
        }
    };

    const checkAndTriggerCompletion = async (lesson: Lesson) => {
        if (!activeCourse || !user || user.role !== 'STUDENT') return;
        const wasCompleted = lesson.isCompleted;
        // Check if dynamic progress just reached 90%
        if (!wasCompleted && lesson.calculateProgressPercentage() >= 90) {
            // This triggers the full completion flow including XP via RPC
            const becameCompleted = lesson.updateProgress(lesson.watchedSeconds);
            setActiveLesson(lesson.clone());
            if (becameCompleted) {
                const result = await courseService.updateUserProgress(user, lesson, activeCourse, true);
                
                // Handle Level Up Animation
                if (result.levelUp) {
                    useGamificationStore.getState().showLevelUp(result.newLevel, result.unlockedAchievements);
                }

                queryClient.invalidateQueries({ queryKey: ['course', activeCourse.id, user.id] });
            }
        }
    };

    const markBlockAsRead = (blockId: string) => {
        if (!activeLesson || !user || user.role !== 'STUDENT') return;
        activeLesson.markBlockAsRead(blockId);
        setActiveLesson(activeLesson.clone());
        // Persist (fire-and-forget)
        courseService.markTextBlockAsRead(user.id, activeLesson.id, blockId).catch(console.error);
        // Check if this read pushed us to completion
        checkAndTriggerCompletion(activeLesson);
    };

    const markVideoWatched = (videoUrl: string) => {
        if (!activeLesson) return;
        activeLesson.markVideoWatched(videoUrl);
        setActiveLesson(activeLesson.clone());
        checkAndTriggerCompletion(activeLesson);
    };

    const markAudioListened = (blockId: string) => {
        if (!activeLesson) return;
        activeLesson.markAudioListened(blockId);
        setActiveLesson(activeLesson.clone());
        checkAndTriggerCompletion(activeLesson);
    };

    const enrollInCourse = async (courseId: string) => {
        if (!user) return;
        await courseService.enrollUserInCourse(courseId);
        // Invalidate course list to show the new course in "My Courses"
        queryClient.invalidateQueries({ queryKey: ['courses', 'list', user.id] });
    };

    const value = {
        availableCourses: availableCourses as any, // Type adaptation
        enrolledCourses: enrolledCourses as any,
        activeCourse: filteredActiveCourse,
        activeModule,
        activeLesson,
        isLoadingCourses,
        selectCourse,
        selectModule,
        selectLesson,
        updateProgress,
        markBlockAsRead,
        markVideoWatched,
        markAudioListened,
        enrollInCourse,
        prefetchLesson,
        courseService
    };

    return (
        <CourseContext.Provider value={value}>
            {children}
        </CourseContext.Provider>
    );
};

export const useCourse = () => {
    const context = useContext(CourseContext);
    if (context === undefined) {
        throw new Error('useCourse must be used within a CourseProvider');
    }
    return context;
};
