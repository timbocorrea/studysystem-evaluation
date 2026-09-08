import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import LessonViewer from '@/components/features/classroom/LessonViewer';
import LessonSkeleton from './skeletons/LessonSkeleton';
import { useLessonStore } from '../stores/useLessonStore';
import { User, Lesson } from '../domain/entities';
import { useTheme } from '../contexts/ThemeContext';

interface LessonLoaderProps {
    user: User;
    onTrackAction: (action: string) => void;
    onToggleSidebar?: () => void;
}

const LessonLoader: React.FC<LessonLoaderProps> = ({ user, onTrackAction, onToggleSidebar }) => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const {
        activeCourse,
        activeLesson,
        selectLesson,
        updateProgress,
        markBlockAsRead,
        markVideoWatched,
        markAudioListened,
        isLoadingCourses
    } = useCourse();

    const [sidebarTab, setSidebarTab] = React.useState<'materials' | 'notes' | 'forum'>('materials');

    // Sync URL tab -> sidebarTab
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const tab = queryParams.get('tab');
        if (tab === 'forum' || tab === 'materials' || tab === 'notes') {
            setSidebarTab(tab as any);
        }
    }, [lessonId]);
    const { contentTheme, setContentTheme } = useLessonStore();
    const { theme } = useTheme();

    // Check for preview mode
    const [previewData, setPreviewData] = React.useState<any>(null);
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('preview') === 'true' && lessonId) {
            try {
                const stored = localStorage.getItem(`preview_lesson_${lessonId}`);
                if (stored) {
                    setPreviewData(JSON.parse(stored));
                }
            } catch (e) {
                console.error("Failed to load preview data", e);
            }
        }
    }, [lessonId]);

    // Sync URL -> Context
    useEffect(() => {
        if (lessonId && activeCourse) {
            // Only select if not already active or different
            if (activeLesson?.id !== lessonId) {
                selectLesson(lessonId);
            }
        }
    }, [lessonId, activeCourse, activeLesson, selectLesson]);

    // Sync content theme with global theme on change.
    useEffect(() => {
        setContentTheme(theme);
    }, [theme, setContentTheme]);

    // Merge preview data into activeLesson if available
    // MUST BE BEFORE CONDITIONAL RETURNS!
    const displayLesson = React.useMemo(() => {
        if (!activeLesson && !previewData) return null;

        if (!previewData) return activeLesson;

        const baseLesson = activeLesson || { id: previewData.lessonId } as any;

        const mergedData = {
            id: previewData.lessonId || baseLesson.id,
            title: previewData.title !== undefined ? previewData.title : baseLesson.title,
            videoUrl: previewData.video_url !== undefined ? previewData.video_url : baseLesson.videoUrl,
            videoUrls: previewData.video_urls !== undefined ? previewData.video_urls : baseLesson.videoUrls,
            audioUrl: previewData.audio_url !== undefined ? previewData.audio_url : baseLesson.audioUrl,
            durationSeconds: previewData.duration_seconds !== undefined ? previewData.duration_seconds : baseLesson.durationSeconds,
            imageUrl: previewData.image_url !== undefined ? previewData.image_url : baseLesson.imageUrl,
            contentBlocks: previewData.content_blocks !== undefined ? previewData.content_blocks : baseLesson.contentBlocks,
            content: baseLesson.content,
            resources: baseLesson.resources,
            watchedSeconds: baseLesson.watchedSeconds,
            isCompleted: baseLesson.isCompleted,
            position: baseLesson.position,
            lastAccessedBlockId: baseLesson.lastAccessedBlockId,
            hasQuiz: baseLesson.hasQuiz,
            quizPassed: baseLesson.quizPassed,
            isLoaded: baseLesson.isLoaded,
            textBlocksRead: baseLesson.textBlocksRead ? Array.from(baseLesson.textBlocksRead) : [],
            videosWatched: baseLesson.videosWatched ? Array.from(baseLesson.videosWatched) : [],
            audiosListened: baseLesson.audiosListened ? Array.from(baseLesson.audiosListened) : []
        };

        return new Lesson(mergedData as any);
    }, [activeLesson, previewData]);

    if (isLoadingCourses) {
        return <LessonSkeleton />;
    }

    if (!activeCourse) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <i className="fas fa-exclamation-circle text-4xl text-slate-300"></i>
                <p className="text-slate-500">Curso não carregado.</p>
                <button onClick={() => navigate('/courses')} className="text-indigo-600 font-bold hover:underline">
                    Ir para Meus Cursos
                </button>
            </div>
        );
    }

    if (!activeLesson && !previewData) {
        return <LessonSkeleton />;
    }

    if (!displayLesson) return <LessonSkeleton />;

    return (
        <LessonViewer
            course={activeCourse}
            lesson={displayLesson as any}
            user={user}
            onLessonSelect={(l) => navigate(`/course/${activeCourse.id}/lesson/${l.id}`)}
            onProgressUpdate={async (secs, blockId) => await updateProgress(secs, blockId)}
            onBlockRead={markBlockAsRead}
            onVideoWatched={markVideoWatched}
            onAudioListened={markAudioListened}
            onBackToLessons={() => navigate(`/course/${activeCourse.id}`)}
            onBackToModules={() => navigate(`/course/${activeCourse.id}`)}
            sidebarTab={sidebarTab}
            setSidebarTab={setSidebarTab}
            onTrackAction={onTrackAction}
            onToggleSidebar={onToggleSidebar}
        />
    );
};

export default LessonLoader;
