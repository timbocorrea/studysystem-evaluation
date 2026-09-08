import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import { ModernLoader } from './ModernLoader';

const CourseLayout: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const { selectCourse, activeCourse, isLoadingCourses } = useCourse();

    useEffect(() => {
        if (courseId && (!activeCourse || activeCourse.id !== courseId)) {
            selectCourse(courseId);
        }
    }, [courseId, activeCourse, selectCourse]);

    if (isLoadingCourses) {
        return <ModernLoader message="Carregando cursos..." />;
    }

    return (
        <div className="w-full h-full">
            <Outlet />
        </div>
    );
};

export default CourseLayout;
