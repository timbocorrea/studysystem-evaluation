import { useState, useEffect } from 'react';
import { AdminService } from '../services/AdminService';
import { CourseRecord, ModuleRecord, LessonRecord } from '../domain/admin';
import { toast } from 'sonner';

export interface UseCourseHierarchyProps {
    adminService: AdminService;
    initialCourseId?: string;
    initialModuleId?: string;
    initialLessonId?: string;
    onHierarchyChange?: (h: { courseId: string; moduleId: string; lessonId: string }) => void;
}

export const useCourseHierarchy = ({
    adminService,
    initialCourseId = '',
    initialModuleId = '',
    initialLessonId = '',
    onHierarchyChange
}: UseCourseHierarchyProps) => {
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [modules, setModules] = useState<ModuleRecord[]>([]);
    const [lessons, setLessons] = useState<LessonRecord[]>([]);

    const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
    const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
    const [selectedLessonId, setSelectedLessonId] = useState(initialLessonId);

    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loadingModules, setLoadingModules] = useState(false);
    const [loadingLessons, setLoadingLessons] = useState(false);

    // Initial load
    useEffect(() => {
        loadCourses();
        if (initialCourseId) {
            loadModules(initialCourseId);
            if (initialModuleId) {
                loadLessons(initialModuleId);
            }
        }
    }, []);

    // Notify listeners when hierarchy changes
    useEffect(() => {
        if (onHierarchyChange) {
            onHierarchyChange({
                courseId: selectedCourseId,
                moduleId: selectedModuleId,
                lessonId: selectedLessonId
            });
        }
    }, [selectedCourseId, selectedModuleId, selectedLessonId]);

    const loadCourses = async () => {
        setLoadingCourses(true);
        try {
            const list = await adminService.listCourses();
            setCourses(list);
        } catch (error) {
            console.error('Error loading courses:', error);
            toast.error('Erro ao carregar cursos');
        } finally {
            setLoadingCourses(false);
        }
    };

    const loadModules = async (courseId: string) => {
        if (!courseId) {
            setModules([]);
            return;
        }
        setLoadingModules(true);
        try {
            const list = await adminService.listModules(courseId);
            setModules(list);
        } catch (error) {
            console.error('Error loading modules:', error);
            toast.error('Erro ao carregar módulos');
        } finally {
            setLoadingModules(false);
        }
    };

    const loadLessons = async (moduleId: string) => {
        if (!moduleId) {
            setLessons([]);
            return;
        }
        setLoadingLessons(true);
        try {
            const list = await adminService.listLessons(moduleId, { summary: true });
            setLessons(list);
        } catch (error) {
            console.error('Error loading lessons:', error);
            toast.error('Erro ao carregar aulas');
        } finally {
            setLoadingLessons(false);
        }
    };

    const handleCourseChange = (courseId: string) => {
        setSelectedCourseId(courseId);
        setSelectedModuleId('');
        setSelectedLessonId('');
        setModules([]);
        setLessons([]);
        if (courseId) {
            loadModules(courseId);
        }
    };

    const handleModuleChange = (moduleId: string) => {
        setSelectedModuleId(moduleId);
        setSelectedLessonId('');
        setLessons([]);
        if (moduleId) {
            loadLessons(moduleId);
        }
    };

    const resetHierarchy = () => {
        setSelectedCourseId('');
        setSelectedModuleId('');
        setSelectedLessonId('');
        setModules([]);
        setLessons([]);
    };

    return {
        courses,
        modules,
        lessons,
        selectedCourseId,
        selectedModuleId,
        selectedLessonId,
        loadingCourses,
        loadingModules,
        loadingLessons,
        setSelectedCourseId: handleCourseChange,
        setSelectedModuleId: handleModuleChange,
        setSelectedLessonId,
        resetHierarchy,
        refreshCourses: loadCourses
    };
};
