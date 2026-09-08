import { courseRepository, quizRepository } from '@/services/Dependencies';
// Fixed syntax
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Course, Lesson, User, UserProgress } from '@/domain/entities';
import VideoPlayer, { VideoPlayerRef } from '@/components/features/classroom/VideoPlayer';
import SlideViewer from '@/components/SlideViewer';
import LessonMaterialsSidebar from '@/components/LessonMaterialsSidebar';
import BuddyContextModal from '@/components/BuddyContextModal';
import NotesPanelPrototype from '@/components/NotesPanelPrototype';
// import GeminiBuddy from '@/components/GeminiBuddy'; // Removed: Uses global now
import QuizOptionsModal from '@/components/QuizOptionsModal';
import QuizModal from '@/components/QuizModal';
import { useCourse } from '@/contexts/CourseContext';

import QuizResultsModal from '@/components/QuizResultsModal';
import { QuizAttemptResult } from '@/domain/quiz-entities';
import { LessonNotesRepository } from '@/repositories/LessonNotesRepository';
import { useLessonStore } from '@/stores/useLessonStore';
import ContentReader from '@/components/lesson/ContentReader';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useLessonQuiz } from '@/hooks/useLessonQuiz';
import { useLessonNavigation } from '@/hooks/useLessonNavigation';
import { MobileToolsFab } from '@/components/lesson/MobileToolsFab';
import { useStudentAnswers } from '@/hooks/useStudentAnswers';
import LessonForum from './LessonForum';
import { toast } from 'sonner';
import { isDocumentFile } from '@/utils/mediaUtils';

interface LessonViewerProps {
    course: Course;
    lesson: Lesson;
    user: User;
    onLessonSelect: (lesson: Lesson) => void;
    onProgressUpdate: (watchedSeconds: number, lastBlockId?: string) => Promise<void>;
    onBlockRead?: (blockId: string) => void;
    onVideoWatched?: (videoUrl: string) => void;
    onAudioListened?: (blockId: string) => void;
    onBackToLessons: () => void;
    onBackToModules: () => void;
    sidebarTab: 'materials' | 'notes' | 'forum';
    setSidebarTab: (tab: 'materials' | 'notes' | 'forum') => void;
    userProgress?: UserProgress[];
    onTrackAction?: (action: string) => void;
    onToggleSidebar?: () => void;
}


const LessonViewer: React.FC<LessonViewerProps> = ({
    course,
    lesson,
    user,
    onLessonSelect,
    onProgressUpdate,
    onBlockRead,
    onVideoWatched,
    onAudioListened,
    onBackToLessons,
    onBackToModules,
    sidebarTab,
    setSidebarTab,
    userProgress = [],
    onTrackAction,
    onToggleSidebar
}) => {
    // Global state from Zustand store
    const {
        activeBlockId,
        setActiveBlockId,
        fontSize,
        setFontSize,
        isCinemaMode,
        toggleCinemaMode,
        playbackSpeed,
        setPlaybackSpeed,
        audioEnabled,
        setAudioEnabled,
        contentTheme,
        setContentTheme
    } = useLessonStore();
    
    // Initialize previous and next lesson variables
    let previousLesson: Lesson | null = null;
    let nextLesson: Lesson | null = null;

    if (course?.modules) {
        for (const module of course.modules) {
            const index = module.lessons?.findIndex(l => l.id === lesson.id);
            if (index !== -1 && index !== undefined) {
                if (index > 0) previousLesson = module.lessons[index - 1];
                if (index < module.lessons.length - 1) nextLesson = module.lessons[index + 1];
                break;
            }
        }
    }

    const { prefetchLesson } = useCourse();

    // Custom Hooks
    // Audio Player hook moved down to access handleProgressUpdateInternal

    // Local state (kept here as they're specific to this component instance)
    const [lastAccessedId, setLastAccessedId] = useState<string | null>(null);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(false);
    const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState<boolean>(false);
    const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const optionsMenuRef = useRef<HTMLDivElement | null>(null);
    const speedMenuRef = useRef<HTMLDivElement | null>(null);

    // Image Viewer Modal State
    const [showImageViewerModal, setShowImageViewerModal] = useState(false);
    const [viewerImageUrl, setViewerImageUrl] = useState('');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, text: string, range?: Range } | null>(null);
    const [showBuddyModal, setShowBuddyModal] = useState(false);
    const [buddyContext, setBuddyContext] = useState('');

    // Notes Panel Trigger (to pass text)
    const [noteDraftWithRange, setNoteDraftWithRange] = useState<{ text: string, range?: Range } | null>(null);

    // Video switcher state
    const activeVideoRef = useRef<VideoPlayerRef>(null);

    const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);

    const [showQuizOptionsModal, setShowQuizOptionsModal] = useState(false);

    // Materials/Notes panel state (overlay on desktop)
    const [isMaterialsPanelOpen, setIsMaterialsPanelOpen] = useState(false);

    // Video Collapse State
    const [isVideoCollapsed, setIsVideoCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Audio playback state (persists across panel open/close)
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [audioTitle, setAudioTitle] = useState<string | undefined>();
    const handleAudioStateChange = useCallback((playing: boolean, title?: string) => {
        setIsAudioActive(playing);
        setAudioTitle(title);
    }, []);

    // Quiz State - Managed by custom hook
    const {
        quiz,
        showQuizModal,
        quizResult,
        isSubmittingQuiz,
        quizMode,
        showPracticeConfigModal,
        practiceQuestionCount,
        setQuiz,
        setShowQuizModal,
        setQuizResult,
        setIsSubmittingQuiz,
        setQuizMode,
        setShowPracticeConfigModal,
        setPracticeQuestionCount,
        handleStartQuiz,
        handleStartPracticeQuiz,
        handleQuizSubmit
    } = useLessonQuiz({ lesson, course, user, onTrackAction });

    // Mobile Navigation State - Managed by custom hook
    const {
        activeMobileTab,
        focusedNoteId,
        handleOpenDrawer,
        handleCloseDrawer,
        setFocusedNoteId
    } = useLessonNavigation();

    // Supabase Egress Optimizer (Thumbnail Compress)
    const getOptimizedUrl = (url?: string, width: number = 400) => {
        if (!url) return '';
        if (url.includes('supabase.co/storage/v1/object/public')) {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}width=${width}&quality=80&format=webp`;
        }
        return url;
    };

    // Fullscreen Management
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Prevent main scroll in Cinema Mode
    useEffect(() => {
        if (isCinemaMode) {
            document.body.style.overflow = 'hidden';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isCinemaMode]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Monitorar quiz para atualizar estado do objeto Lesson
    useEffect(() => {
        if (quiz) {
            lesson.setHasQuiz(true);

            // Verificar se já passou (opcional, já que o hook poderia prover isso)
            const checkCompletion = async () => {
                const attempt = await quizRepository.getLatestQuizAttempt(user.id, quiz.id);
                if (attempt?.passed) {
                    lesson.setQuizPassed(true);
                }
            };
            checkCompletion();
        }
    }, [quiz, lesson, user.id]);

    // Handle Resources Display

    /**
     * Intercepta a atualizacao de progresso para verificar se precisa abrir o quiz
     */
    const handleProgressUpdateInternal = useCallback(async (watchedSeconds: number, lastBlockId?: string) => {
        // Check combined progress from the lesson entity
        const progressPercent = lesson.calculateProgressPercentage();
        const isCompletingNow = progressPercent >= 90;

        // 🚀 Prefetch next lesson when reaching 70% of current
        if (progressPercent >= 70 && nextLesson && !nextLesson.isLoaded) {
            prefetchLesson(nextLesson.id);
        }

        if (isCompletingNow && quiz && !lesson.quizPassed) {
            await onProgressUpdate(watchedSeconds, lastBlockId);

            if (!showQuizModal && !quizResult) {
                handleStartQuiz();
            }
        } else {
            await onProgressUpdate(watchedSeconds, lastBlockId);
        }
    }, [lesson, quiz, showQuizModal, quizResult, onProgressUpdate, nextLesson, prefetchLesson]);

    // --- IntersectionObserver for Text Reading Detection ---
    useEffect(() => {
        if (!lesson.contentBlocks || lesson.contentBlocks.length === 0) return;
        if (!onBlockRead) return;

        const blockTimers = new Map<string, NodeJS.Timeout>();
        const alreadyRead = new Set(lesson.textBlocksRead);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const blockId = (entry.target as HTMLElement).dataset.blockId;
                    if (!blockId || alreadyRead.has(blockId)) return;

                    if (entry.isIntersecting) {
                        // Block is >50% visible — start 3-second timer
                        if (!blockTimers.has(blockId)) {
                            const timer = setTimeout(() => {
                                alreadyRead.add(blockId);
                                onBlockRead(blockId);
                                blockTimers.delete(blockId);
                            }, 3000);
                            blockTimers.set(blockId, timer);
                        }
                    } else {
                        // Block scrolled out — cancel timer
                        const timer = blockTimers.get(blockId);
                        if (timer) {
                            clearTimeout(timer);
                            blockTimers.delete(blockId);
                        }
                    }
                });
            },
            { threshold: 0.5 }
        );

        // Observe all block elements after a small delay for refs to be populated
        const observeTimer = setTimeout(() => {
            const refs = blockRefs.current;
            Object.values(refs).forEach((el) => {
                if (el) observer.observe(el);
            });
        }, 500);

        return () => {
            clearTimeout(observeTimer);
            observer.disconnect();
            blockTimers.forEach((timer) => clearTimeout(timer));
            blockTimers.clear();
        };
    }, [lesson.id, lesson.contentBlocks.length, onBlockRead]);

    const {
        isPlaying,
        progress,
        playBlock,
        toggleAudio,
        pauseAudio,
        seek
    } = useAudioPlayer({
        lesson,
        onTrackAction,
        onProgressUpdate: handleProgressUpdateInternal,
        onAudioListened,
        onPlay: () => {
            activeVideoRef.current?.pause();
        }
    });

    // Student text answer blocks
    const studentAnswerData = useStudentAnswers({ userId: user.id, lessonId: lesson.id });

    const handleBlockClick = useCallback((_blockId: string, index: number) => {
        playBlock(index);
    }, [playBlock]);

    const lessonProgress = userProgress.find(p => p.lessonId === lesson.id);

    const contentScrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBlockSafely = useCallback((element: HTMLElement) => {
        const container = contentScrollContainerRef.current;
        
        if (container && window.innerWidth >= 1024) {
             // Desktop: Scrolling within the constrained side panel
             const containerRect = container.getBoundingClientRect();
             const elementRect = element.getBoundingClientRect();
             const relativeTop = elementRect.top - containerRect.top;
             const targetScroll = container.scrollTop + relativeTop - (container.clientHeight / 2) + (elementRect.height / 2);
             
             container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        } else {
             // Mobile/Cinema Mode: Scrolling the entire window
             const rect = element.getBoundingClientRect();
             const scrollTop = window.scrollY || document.documentElement.scrollTop;
             // Discount approx 60px for fixed headers
             const targetScroll = scrollTop + rect.top - (window.innerHeight / 2) + (rect.height / 2) - 60;
             
             window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        }
    }, []);

    // Initial Resume Logic (Scroll and Focus)
    useEffect(() => {
        if (lessonProgress?.lastAccessedBlockId) {
            const blockId = lessonProgress.lastAccessedBlockId;
            setLastAccessedId(blockId);

            setTimeout(() => {
                const element = blockRefs.current[blockId];
                if (element) {
                    scrollToBlockSafely(element);
                }
            }, 500);
        }
    }, [lesson.id]);

    // Auto-scroll to active block
    // Auto-scroll to active block
    useEffect(() => {
        if (activeBlockId) {
            const element = blockRefs.current[activeBlockId];
            if (element) {
                // Use setTimeout to ensure UI has settled before natively scrolling
                setTimeout(() => {
                    scrollToBlockSafely(element);
                }, 100);
            }
        }
    }, [activeBlockId]);

    // State for highlights
    const [highlights, setHighlights] = useState<{ id: string; text: string; color: 'yellow' | 'green' | 'blue' | 'pink'; onClick: () => void }[]>([]);

    // Fetch and prepare highlights
    useEffect(() => {
        let isMounted = true;

        const loadHighlights = async () => {
            if (!user.id || !lesson.id) return;

            try {
                const dbNotes = await LessonNotesRepository.loadNotes(user.id, lesson.id);
                if (!isMounted) return;

                const formattedHighlights: any[] = [];

                dbNotes.forEach(note => {
                    // Add primary highlight
                    if (note.has_highlight && note.highlighted_text) {
                        formattedHighlights.push({
                            id: note.id,
                            text: note.highlighted_text,
                            color: note.highlight_color as 'yellow' | 'green' | 'blue' | 'pink',
                            onClick: () => {
                                setFocusedNoteId(note.id);
                                setSidebarTab('notes');
                                setIsMaterialsPanelOpen(true);
                                handleOpenDrawer('notes');
                            }
                        });
                    }

                    // Add extra highlights (from unifications)
                    if (note.extra_highlights && Array.isArray(note.extra_highlights)) {
                        note.extra_highlights.forEach((extra: any) => {
                            if (extra.text) {
                                formattedHighlights.push({
                                    id: note.id, // Linked to the same note ID
                                    text: extra.text,
                                    color: extra.color || 'yellow',
                                    onClick: () => {
                                        setFocusedNoteId(note.id);
                                        setSidebarTab('notes');
                                        setIsMaterialsPanelOpen(true);
                                        handleOpenDrawer('notes');
                                    }
                                });
                            }
                        });
                    }
                });

                setHighlights(formattedHighlights);
            } catch (err) {
                console.error("Error loading highlights:", err);
            }
        };

        loadHighlights();

        return () => { isMounted = false; };
    }, [lesson.id, user.id]);

    const handleNotesChange = (updatedNotesData: any[]) => {
        const formattedHighlights: any[] = [];

        updatedNotesData.forEach(note => {
            // Add primary highlight
            if (note.hasHighlight && note.highlightedText) {
                formattedHighlights.push({
                    id: note.id,
                    text: note.highlightedText,
                    color: note.highlightColor as 'yellow' | 'green' | 'blue' | 'pink',
                    onClick: () => {
                        setFocusedNoteId(note.id);
                        setSidebarTab('notes');
                        setIsMaterialsPanelOpen(true);
                        handleOpenDrawer('notes');
                    }
                });
            }

            // Add extra highlights
            if (note.extraHighlights && Array.isArray(note.extraHighlights)) {
                note.extraHighlights.forEach((extra: any) => {
                    if (extra.text) {
                        formattedHighlights.push({
                            id: note.id,
                            text: extra.text,
                            color: extra.color || 'yellow',
                            onClick: () => {
                                setFocusedNoteId(note.id);
                                setSidebarTab('notes');
                                setIsMaterialsPanelOpen(true);
                                handleOpenDrawer('notes');
                            }
                        });
                    }
                });
            }
        });

        setHighlights(formattedHighlights);
    };

    // Fechar menu de opções ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setIsOptionsMenuOpen(false);
            }
            if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
                setIsSpeedMenuOpen(false);
            }
        };

        if (isOptionsMenuOpen || isSpeedMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOptionsMenuOpen, isSpeedMenuOpen]);

    // Setup global function for opening image modal
    useEffect(() => {
        (window as any).openImageModal = (imageUrl: string) => {
            console.log('🖼️ openImageModal chamada com URL:', imageUrl);
            setViewerImageUrl(imageUrl);
            setShowImageViewerModal(true);
        };

        return () => {
            delete (window as any).openImageModal;
        };
    }, []);

    // Utility function for image optimization



    // Determine which video URL to use
    const hasMultipleVideos = lesson.videoUrls && lesson.videoUrls.length > 1;
    const currentVideoUrl = (lesson.videoUrls && lesson.videoUrls.length > 0)
        ? lesson.videoUrls[activeVideoIndex]?.url
        : lesson.videoUrl;

    // Determine if current active item is a slide presentation
    const activePlaylistItem = (lesson.videoUrls && lesson.videoUrls.length > 0) ? lesson.videoUrls[activeVideoIndex] : null;
    const isSlideActive = activePlaylistItem?.type === 'slides' || 
                         isDocumentFile(activePlaylistItem?.fileUrl || activePlaylistItem?.url || '');

    // Playlist Renderer for reuse in Cinema Mode
    const renderPlaylist = () => (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800">
                <i className="fas fa-film text-indigo-500 text-xs"></i>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Playlist</h3>
                <div className="ml-auto flex items-center gap-2">
                    {/* Materials Button */}
                    <button
                        onClick={() => {
                            setSidebarTab('materials');
                            setIsMaterialsPanelOpen(true);
                            onTrackAction?.('Abriu Materiais');
                        }}
                        className={`flex items-center justify-center gap-1.5 h-6 px-2.5 rounded-md transition-colors text-[10px] font-bold border uppercase tracking-wider ${sidebarTab === 'materials' && isMaterialsPanelOpen ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'}`}
                        title="Materiais de Apoio"
                    >
                        <i className="fas fa-book-reader"></i>
                        <span className="hidden sm:inline">Materiais</span>
                    </button>

                    {/* Notes Button */}
                    <button
                        onClick={() => {
                            setSidebarTab('notes');
                            setIsMaterialsPanelOpen(true);
                            onTrackAction?.('Abriu Minhas Notas');
                        }}
                        className={`flex items-center justify-center gap-1.5 h-6 px-2.5 rounded-md transition-colors text-[10px] font-bold border uppercase tracking-wider ${sidebarTab === 'notes' && isMaterialsPanelOpen ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'}`}
                        title="Minhas Notas"
                    >
                        <i className="fas fa-sticky-note"></i>
                        <span className="hidden sm:inline">Notas</span>
                    </button>

                    {/* Forum Button */}
                    <button
                        onClick={() => {
                            setSidebarTab('forum');
                            setIsMaterialsPanelOpen(true);
                            onTrackAction?.('Abriu Fórum');
                        }}
                        className={`flex items-center justify-center gap-1.5 h-6 px-2.5 rounded-md transition-colors text-[10px] font-bold border uppercase tracking-wider ${sidebarTab === 'forum' && isMaterialsPanelOpen ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'}`}
                        title="Fórum de Discussão"
                    >
                        <i className="fas fa-comments"></i>
                        <span className="hidden sm:inline">Fórum</span>
                    </button>

                    {/* Video Index Indicator */}
                    {lesson.videoUrls && lesson.videoUrls.length > 1 && (
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {activeVideoIndex + 1} / {lesson.videoUrls.length}
                        </span>
                    )}
                </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {(lesson.videoUrls && lesson.videoUrls.length > 0 ? lesson.videoUrls : [{ url: lesson.videoUrl, title: lesson.title }]).map((video: any, index: number) => (
                    <button
                        key={index}
                        onClick={() => {
                            setActiveVideoIndex(index);
                            onTrackAction?.(`Trocou para conteúdo: ${video.title}`);
                        }}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-all border-b last:border-b-0 ${activeVideoIndex === index
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                            }`}
                    >
                        {/* Thumbnail */}
                        <div className="w-16 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 relative">
                            {video.imageUrl ? (
                                <img src={getOptimizedUrl(video.imageUrl, 150)} alt={video.title} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <i className={`fas ${video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? 'fa-images text-amber-400' : 'fa-play'} text-xs ${activeVideoIndex === index ? (video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? 'text-amber-400' : 'text-indigo-400') : (video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? 'text-amber-500/50' : 'text-white/30')}`}></i>
                                </div>
                            )}
                            {activeVideoIndex === index && (
                                <div className={`absolute inset-0 ${video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? 'bg-amber-500/20' : 'bg-indigo-600/20'} flex items-center justify-center`}>
                                    <i className={`fas ${video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? 'fa-images' : 'fa-volume-up'} text-white text-xs animate-pulse`}></i>
                                </div>
                            )}
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                            <p className={`text-xs font-semibold truncate ${activeVideoIndex === index ? (video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400') : 'text-slate-700 dark:text-slate-300'}`}>
                                {video.title || (video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? `Slides ${index + 1}` : `Vídeo ${index + 1}`)}
                            </p>
                            {activeVideoIndex === index && (
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? 'text-amber-500' : 'text-indigo-500'}`}>
                                    {video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '') ? 'Apresentação' : 'Reproduzindo'}
                                </span>
                            )}
                            {(video.type === 'slides' || isDocumentFile(video.fileUrl || video.url || '')) && activeVideoIndex !== index && (
                                <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-wider">Slides</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    // Loading State (Partial Content)
    if (lesson.isLoaded === false) {
        return (
            <div className="w-full max-w-[1920px] mx-auto px-2 md:px-6 py-4 md:py-8 space-y-6 animate-pulse">
                {/* Header Skeleton */}
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="flex justify-between">
                        <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                </div>
                {/* Content Skeleton: Flex 2 Colunas (40% Vídeo | 60% Texto) */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Coluna Esquerda: Vídeo (40%) */}
                    <div className="lg:w-[40%] shrink-0 space-y-3">
                        <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    </div>
                    {/* Coluna Direita: Texto (60%) */}
                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                        <div className="space-y-3">
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-11/12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                        <div className="space-y-3 mt-4">
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1920px] mx-auto px-2 md:px-6 py-4 md:py-6 space-y-4">
            {/* Header: Título + Botões de Navegação */}
            <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Hamburger + Title */}
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Hamburger - opens sidebar overlay (desktop) */}
                        <button
                            onClick={onToggleSidebar}
                            className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                            title="Menu de Navegação"
                        >
                            <i className="fas fa-bars text-sm"></i>
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-sm md:text-xl font-black text-slate-800 dark:text-white tracking-tight leading-tight truncate">{lesson.title}</h2>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                    {course.title}
                                </p>
                                {course.instructorName && (
                                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest shrink-0">
                                        <i className="fas fa-user-tie text-[10px]"></i>
                                        <span>Instrutor: {course.instructorName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Status Indicator */}
                        <div className="hidden md:flex items-center gap-2">
                            <div
                                className={`w-2 h-2 rounded-full ${lesson.isCompleted ? 'bg-green-500' : 'bg-indigo-500 animate-pulse'
                                    }`}
                            ></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {lesson.isCompleted ? 'Concluída' : 'Em andamento'}
                            </span>
                        </div>

                        {/* Quiz Button (desktop) */}
                        <div className="hidden lg:flex items-center gap-2">
                            {quiz && (
                                <button
                                    onClick={() => setShowQuizOptionsModal(true)}
                                    className="flex items-center gap-2 h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 transition-colors text-xs font-bold border border-emerald-200 dark:border-emerald-800"
                                    title="Quiz da Aula"
                                >
                                    <i className="fas fa-graduation-cap text-xs"></i>
                                    <span>Quiz</span>
                                </button>
                            )}
                        </div>

                        {/* Back Button */}
                        <ShimmerButton
                            onClick={onBackToLessons}
                            className="h-9 px-4 shadow-lg transition-all hover:scale-105 active:scale-95"
                            background="radial-gradient(ellipse 80% 80% at 50% -20%,rgba(79,70,229,0.3),rgba(15,23,42,1))"
                            shimmerColor="#818cf8"
                            shimmerSize="0.1em"
                            borderRadius="12px"
                        >
                            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white">
                                <i className="fas fa-arrow-left"></i> <span className="hidden sm:inline">Voltar</span>
                            </span>
                        </ShimmerButton>
                        <a
                            href="/courses"
                            className="h-9 px-4 flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all hover:scale-105 active:scale-95"
                            title="Ir para o Dashboard"
                        >
                            <i className="fas fa-home text-sm"></i>
                            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">Home</span>
                        </a>
                        <button
                            onClick={toggleFullscreen}
                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all hover:scale-105 active:scale-95 shrink-0"
                            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                        >
                            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout Principal: Flex 2 Colunas (Vídeo 40% | Texto 60%) em Desktop */}
            <div className={`flex flex-col ${!isCinemaMode ? 'lg:flex-row' : ''} gap-4 relative`}>

                {/* Coluna Esquerda: Vídeo + Playlist (40% desktop, 100% mobile, hidden cinema mode) */}
                {!isCinemaMode && !isVideoCollapsed && (
                    <div className="lg:w-[40%] shrink-0 space-y-3 animate-in fade-in slide-in-from-left duration-500">
                        <div className="lg:sticky lg:top-4 space-y-3">
                            {/* Player or SlideViewer */}
                            <div className="w-full">
                                {isSlideActive ? (
                                    <SlideViewer
                                        title={activePlaylistItem!.title || 'Apresentação'}
                                        slides={activePlaylistItem!.slides}
                                        fileUrl={activePlaylistItem!.fileUrl || activePlaylistItem!.url}
                                        fileType={activePlaylistItem!.fileType || (activePlaylistItem!.fileUrl?.toLowerCase().includes('.pptx') || activePlaylistItem!.url?.toLowerCase().includes('.pptx') ? 'pptx' : 'pdf')}
                                    />
                                ) : (
                                    <VideoPlayer
                                        ref={activeVideoRef}
                                        lesson={lesson}
                                        videoUrl={currentVideoUrl}
                                        onProgress={handleProgressUpdateInternal}
                                        onPlay={() => {
                                            pauseAudio();
                                            onTrackAction?.(`Reproduziu vídeo: ${currentVideoUrl || lesson.title}`);
                                        }}
                                    />
                                )}
                            </div>

                            {/* Cinema Mode Toggle & Collapse Button */}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setIsVideoCollapsed(true);
                                        onTrackAction?.('Colapsou Vídeo');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors hidden lg:flex items-center gap-2 text-xs font-medium"
                                    title="Ocultar Vídeo (Focar no Texto)"
                                >
                                    <i className="fas fa-columns text-xs"></i>
                                    <span className="hidden sm:inline">Focar Texto</span>
                                </button>
                                <button
                                    onClick={() => {
                                        toggleCinemaMode();
                                        onTrackAction?.(isCinemaMode ? 'Desativou Modo Cinema' : 'Ativou Modo Cinema');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-medium"
                                    title={isCinemaMode ? 'Sair do Modo Cinema' : 'Ativar Modo Cinema'}
                                >
                                    <i className={`fas ${isCinemaMode ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
                                    <span className="hidden sm:inline">{isCinemaMode ? 'Sair do Cinema' : 'Modo Cinema'}</span>
                                </button>
                            </div>

                            {/* Playlist Vertical de Vídeos */}
                            {renderPlaylist()}
                        </div>
                    </div>
                )}

                {/* Cinema Mode: Player fullwidth + Playlist below */}
                {isCinemaMode && (
                    <div className="w-full space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto px-4">
                        <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 relative aspect-[4/3] max-h-[75vh] min-h-[400px] flex items-center justify-center">
                            {isSlideActive ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                    <SlideViewer
                                        title={activePlaylistItem?.title || 'Apresentação'}
                                        slides={activePlaylistItem?.slides}
                                        fileUrl={activePlaylistItem?.fileUrl || activePlaylistItem?.url}
                                        fileType={activePlaylistItem?.fileType || (activePlaylistItem?.fileUrl?.toLowerCase().includes('.pptx') || activePlaylistItem?.url?.toLowerCase().includes('.pptx') ? 'pptx' : 'pdf')}
                                    />
                                </div>
                            ) : (
                                <VideoPlayer
                                    ref={activeVideoRef}
                                    lesson={lesson}
                                    videoUrl={currentVideoUrl}
                                    onProgress={handleProgressUpdateInternal}
                                    onPlay={() => {
                                        pauseAudio();
                                        onTrackAction?.(`Reproduziu vídeo: ${currentVideoUrl || lesson.title}`);
                                    }}
                                />
                            )}
                        </div>

                        {/* Controls & Exit */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    toggleCinemaMode();
                                    onTrackAction?.('Desativou Modo Cinema');
                                }}
                                className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md text-white transition-all flex items-center gap-2 text-xs font-bold border border-white/10 shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                                title="Sair do Modo Cinema"
                            >
                                <i className="fas fa-compress text-xs text-indigo-400"></i>
                                <span>Fechar Modo Cinema</span>
                            </button>
                        </div>

                        {/* Playlist Below Player in Cinema Mode */}
                        <div className="max-w-4xl mx-auto w-full pb-12">
                            <div className="flex items-center gap-3 mb-4 px-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <i className="fas fa-list-ul"></i>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Conteúdo Recomendado</h4>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Continue sua jornada de aprendizado</p>
                                </div>
                            </div>
                            {renderPlaylist()}
                        </div>
                    </div>
                )}

                {/* Collapsed Video Sidebar (Vertical Bar) */}
                {isVideoCollapsed && !isCinemaMode && (
                    <div className="hidden lg:flex flex-col gap-4 animate-in fade-in slide-in-from-left duration-300">
                        <button
                            onClick={() => setIsVideoCollapsed(false)}
                            className="w-12 h-full min-h-[500px] rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group flex flex-col items-center py-8 gap-4"
                            title="Mostrar Vídeo"
                        >
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <i className="fas fa-chevron-right text-indigo-600 dark:text-indigo-400"></i>
                            </div>
                            <div className="flex-1 w-px bg-slate-300 dark:bg-slate-800 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 transition-colors"></div>
                            <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }} className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                Mostrar Vídeo
                            </span>
                            <div className="flex-1 w-px bg-slate-300 dark:bg-slate-800 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 transition-colors"></div>
                            <i className="fas fa-video text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"></i>
                        </button>
                    </div>
                )}

                {/* Coluna Central: Conteúdo da Aula (65% desktop, 100% mobile) */}
                <div className={`flex-1 min-w-0 ${isCinemaMode ? 'hidden' : ''} transition-all duration-500 ease-in-out`}>

                    {/* Conteúdo da Matéria (Texto Rico OU Blocos de Áudio) */}
                    <div className={`rounded-3xl border shadow-sm transition-colors flex flex-col min-h-[300px] lg:h-[calc(100vh-140px)] ${contentTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className={`flex-shrink-0 flex items-center justify-between p-4 md:p-6 border-b ${contentTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${contentTheme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                                    <i className={`fas fa-book-open ${contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}></i>
                                </div>
                                <div>
                                    <h3 className={`text-lg font-black ${contentTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Conteúdo da Aula</h3>
                                    <p className={`text-xs ${contentTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {lesson.contentBlocks?.length > 0 ? 'Leitura em Blocos com Áudio' : 'Material de apoio e orientações'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4">
                                {/* Botão Mostrar Vídeo (Mobile) */}
                                {isVideoCollapsed && !isCinemaMode && (
                                    <button
                                        onClick={() => setIsVideoCollapsed(false)}
                                        className={`lg:hidden h-9 px-2 sm:px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase shadow-sm border ${contentTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-indigo-600 border-indigo-500 text-white'
                                            }`}
                                        title="Mostrar Vídeo"
                                    >
                                        <i className="fas fa-video text-[10px]"></i>
                                        <span className="hidden sm:inline">Vídeo</span>
                                    </button>
                                )}

                                {/* Leitura por Áudio */}
                                {lesson.contentBlocks && lesson.contentBlocks.length > 0 && (
                                    <button
                                        onClick={() => setAudioEnabled(!audioEnabled)}
                                        className={`w-9 h-9 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center text-[10px] uppercase shadow-sm border ${audioEnabled
                                            ? (contentTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-indigo-600 border-indigo-500 text-white')
                                            : (contentTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200')
                                            }`}
                                        title={audioEnabled ? 'Desativar Leitura por Áudio' : 'Ativar Leitura por Áudio'}
                                    >
                                        <i className={`fas ${audioEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-[12px]`}></i>
                                    </button>
                                )}

                                {/* Theme Toggle */}
                                <button
                                    onClick={() => setContentTheme(contentTheme === 'light' ? 'dark' : 'light')}
                                    className={`w-9 h-9 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center text-[10px] uppercase shadow-sm border ${contentTheme === 'dark'
                                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    title={contentTheme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                                >
                                    <i className={`fas ${contentTheme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[12px]`}></i>
                                </button>

                                {/* Speed Control Standalone */}
                                <div className="relative" ref={speedMenuRef}>
                                    <button
                                        onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                                        className={`h-9 px-2 sm:px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 border transition-all duration-300 text-[10px] uppercase tracking-wider shadow-sm hover:shadow-md ${isSpeedMenuOpen
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : (contentTheme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                                            }`}
                                    >
                                        <i className={`fas fa-tachometer-alt text-[10px] ${isSpeedMenuOpen ? 'text-white' : (contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600')}`}></i>
                                        <span className="font-bold">{playbackSpeed === 1.0 ? '1x' : `${playbackSpeed}x`}</span>
                                    </button>

                                    {/* Speed Dropdown Menu */}
                                    {isSpeedMenuOpen && (
                                        <div className={`absolute right-0 mt-3 w-40 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${contentTheme === 'dark'
                                            ? 'bg-slate-900 border-slate-800'
                                            : 'bg-white border-slate-100'
                                            }`}>
                                            <div className="p-2 space-y-1">
                                                <p className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest ${contentTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Velocidade</p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5].map(speed => (
                                                        <button
                                                            key={speed}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPlaybackSpeed(speed);
                                                                setIsSpeedMenuOpen(false);
                                                            }}
                                                            className={`py-2 text-[10px] font-bold rounded-lg transition-all ${playbackSpeed === speed
                                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                                : (contentTheme === 'dark'
                                                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                                                    : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100')
                                                                }`}
                                                        >
                                                            {speed === 1.0 ? '1x' : `${speed}x`}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="relative" ref={optionsMenuRef}>
                                    <button
                                        onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
                                        className={`w-9 h-9 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center border transition-all duration-300 text-[10px] uppercase tracking-wider shadow-sm hover:shadow-md ${isOptionsMenuOpen
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : (contentTheme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                                            }`}
                                        title="Opções"
                                    >
                                        <i className={`fas fa-cog text-[12px] transition-transform duration-500 ${isOptionsMenuOpen ? 'rotate-90' : ''}`}></i>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isOptionsMenuOpen && (
                                        <div className={`absolute right-0 mt-3 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${contentTheme === 'dark'
                                            ? 'bg-slate-900 border-slate-800'
                                            : 'bg-white border-slate-100'
                                            }`}>
                                            <div className="p-3 space-y-2">
                                                <p className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${contentTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Ajustes do Leitor</p>


                                                {/* Tamanho da Fonte */}
                                                <div className={`flex flex-col gap-2 p-3 rounded-xl ${contentTheme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas fa-text-height text-xs ${contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}></i>
                                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${contentTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Tamanho da Fonte</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <button
                                                            onClick={() => setFontSize(Math.max(80, fontSize - 10))}
                                                            disabled={fontSize <= 80}
                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${contentTheme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30' : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-100 disabled:opacity-30'}`}
                                                        >
                                                            <i className="fas fa-minus"></i>
                                                        </button>
                                                        <span className={`text-xs font-bold px-3 ${contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                            {fontSize}%
                                                        </span>
                                                        <button
                                                            onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                                                            disabled={fontSize >= 200}
                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${contentTheme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30' : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-100 disabled:opacity-30'}`}
                                                        >
                                                            <i className="fas fa-plus"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Content area - Inner Scroll */}
                        <div
                            ref={contentScrollContainerRef}
                            className="flex-1 lg:overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-slate-700 p-0 md:p-6 relative"
                            onContextMenu={(e) => {
                                const selection = window.getSelection();
                                const text = selection?.toString().trim();

                                // Se houver texto selecionado, previne menu padrao e mostra o nosso
                                if (text && text.length > 0) {
                                    e.preventDefault();

                                    // Calcular posicao para nao sair da tela
                                    let x = e.clientX;
                                    let y = e.clientY;

                                    // Capture range immediately to prevent loss on click
                                    let range: Range | undefined;
                                    if (selection && selection.rangeCount > 0) {
                                        range = selection.getRangeAt(0).cloneRange();
                                    }

                                    setContextMenu({ x, y, text, range });
                                }
                            }}
                            onClick={(e) => {
                                setContextMenu(null);

                                // Check if clicked element is a highlight
                                const target = e.target as HTMLElement;
                                const mark = target.closest('mark[data-note-id]');

                                if (mark) {
                                    const noteId = mark.getAttribute('data-note-id');
                                    if (noteId) {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        // Open Notes Panel
                                        setSidebarTab('notes');
                                        setIsMaterialsPanelOpen(true); // Desktop
                                        handleOpenDrawer('notes');     // Mobile

                                        // Focus Note
                                        setFocusedNoteId(noteId);
                                    }
                                }
                            }}
                        >
                            <ContentReader
                                lesson={lesson}
                                highlights={highlights}
                                onBlockClick={handleBlockClick}
                                onTrackAction={onTrackAction}
                                currentProgress={progress}
                                blockRefs={blockRefs}
                                onSeek={seek}
                                studentAnswers={studentAnswerData.answers}
                                onSaveAnswer={async (blockId, answerText) => {
                                    const success = await studentAnswerData.saveAnswer(blockId, answerText);
                                    if (success) {
                                        toast.success('Resposta salva com sucesso!');
                                    } else {
                                        toast.error('Erro ao salvar resposta.');
                                    }
                                }}
                                savingBlockIds={studentAnswerData.savingBlocks}
                            />

                            {/* Context Menu Overlay */}
                            {contextMenu && createPortal(
                                <div
                                    className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 flex flex-col min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
                                    style={{ top: contextMenu.y, left: contextMenu.x }}
                                    onClick={(e) => e.stopPropagation()}
                                    onContextMenu={(e) => e.preventDefault()} // Prevent native menu on custom menu
                                >
                                    <button
                                        onClick={() => {
                                            setBuddyContext(contextMenu.text);
                                            setShowBuddyModal(true);
                                            setContextMenu(null);
                                            onTrackAction?.('Usou Menu Contexto: Perguntar para IA');
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <i className="fas fa-robot text-xs"></i>
                                        </div>
                                        <span className="font-semibold">Perguntar para IA</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            // Use captured range from state instead of trying to get it again
                                            if (contextMenu.range) {
                                                setNoteDraftWithRange({ text: contextMenu.text, range: contextMenu.range });
                                            } else {
                                                // If no range, create a draft without it
                                                setNoteDraftWithRange({ text: contextMenu.text, range: undefined });
                                            }

                                            setSidebarTab('notes');
                                            setIsMaterialsPanelOpen(true); // Ensure desktop panel opens
                                            handleOpenDrawer('notes');     // Ensure mobile drawer opens
                                            setContextMenu(null);
                                            onTrackAction?.('Usou Menu Contexto: Criar Nota com Seleção');
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-md bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                                            <i className="fas fa-sticky-note text-xs"></i>
                                        </div>
                                        <span className="font-semibold">Criar Nota com Seleção</span>
                                    </button>

                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2"></div>

                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(contextMenu.text);
                                            setContextMenu(null);
                                            toast.success('Copiado para área de transferência');
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 transition-colors"
                                    >
                                        <i className="fas fa-copy w-6 text-center"></i>
                                        Copiar Texto
                                    </button>
                                </div>,
                                document.body
                            )}

                            {/* Buddy Context Modal */}
                            <BuddyContextModal
                                isOpen={showBuddyModal}
                                onClose={() => setShowBuddyModal(false)}
                                initialContext={buddyContext}
                                fullLessonContent={lesson.content}
                                courseId={course.id}
                                lessonId={lesson.id}
                                userName={user?.name}
                                onAddToNote={(text) => {
                                    setNoteDraftWithRange({ text });
                                    setSidebarTab('notes');
                                    handleOpenDrawer('notes');
                                    setShowBuddyModal(false);
                                }}
                            />

                            {/* Lesson Navigation Buttons */}
                            <div className="mt-12 mb-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 mr-4">
                                {previousLesson ? (
                                    <button
                                        onClick={() => onLessonSelect(previousLesson!)}
                                        className="flex-1 flex flex-col items-start gap-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group max-w-[48%]"
                                    >
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i> Aula Anterior
                                        </span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-left">
                                            {previousLesson.title}
                                        </span>
                                    </button>
                                ) : <div className="flex-1"></div>}

                                {nextLesson ? (
                                    <button
                                        onClick={() => onLessonSelect(nextLesson!)}
                                        className="flex-1 flex flex-col items-end gap-1 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all group max-w-[48%]"
                                    >
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                            Próxima Aula <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                        </span>
                                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 truncate w-full text-right">
                                            {nextLesson.title}
                                        </span>
                                    </button>
                                ) : <div className="flex-1"></div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Mini Audio Player (when panel closed + audio playing) */}
                {!isMaterialsPanelOpen && isAudioActive && (
                    <button
                        onClick={() => {
                            setSidebarTab('materials');
                            setIsMaterialsPanelOpen(true);
                        }}
                        className="hidden lg:flex fixed right-4 bottom-6 z-[55] items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-500/30 transition-all hover:scale-105 animate-in slide-in-from-right duration-300"
                        title="Abrir player de áudio"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <i className="fas fa-music text-sm animate-pulse"></i>
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Reproduzindo</p>
                            <p className="text-xs font-bold truncate max-w-[150px]">{audioTitle || 'Áudio'}</p>
                        </div>
                    </button>
                )}

                {/* Overlay: Painel Materiais/Notas/Quiz (Desktop Only) - Always mounted for audio persistence */}
                <>

                    {/* Panel - rendered as a Left bottom-up drawer reaching the video base under Desktop Layout  */}
                    <div
                        className={`hidden fixed left-0 bottom-0 top-[10vh] w-[90%] md:w-[70%] lg:w-[40%] z-[65] flex-col bg-white dark:bg-slate-900 border-t border-r border-slate-200 dark:border-slate-800 rounded-tr-3xl shadow-[5px_-5px_30px_rgba(0,0,0,0.1)] transition-transform duration-300 ${isMaterialsPanelOpen ? 'lg:flex translate-y-0' : 'lg:flex translate-y-full pointer-events-none invisible'}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 flex flex-1">
                                <button
                                    onClick={() => {
                                        setSidebarTab('materials');
                                        onTrackAction?.('Acessou os Materiais da aula');
                                    }}
                                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${sidebarTab === 'materials'
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                        }`}
                                >
                                    Materiais
                                </button>
                                <button
                                    onClick={() => {
                                        setSidebarTab('notes');
                                        onTrackAction?.('Acessou Minhas Notas');
                                    }}
                                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${sidebarTab === 'notes'
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                        }`}
                                >
                                    Minhas Notas
                                </button>
                                <button
                                    onClick={() => {
                                        setSidebarTab('forum');
                                        onTrackAction?.('Acessou o Fórum');
                                    }}
                                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${sidebarTab === 'forum'
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                        }`}
                                >
                                    Fórum
                                </button>
                            </div>
                            <button
                                onClick={() => setIsMaterialsPanelOpen(false)}
                                className="ml-3 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-4">
                            {sidebarTab === 'materials' ? (
                                <LessonMaterialsSidebar lesson={lesson} onTrackAction={onTrackAction} onAudioStateChange={handleAudioStateChange} />
                            ) : sidebarTab === 'notes' ? (
                                <NotesPanelPrototype
                                    userId={user.id}
                                    lessonId={lesson.id}
                                    refreshTrigger={activeBlockId}
                                    externalDraft={noteDraftWithRange}
                                    onNotesChange={handleNotesChange}
                                />
                            ) : (
                                <LessonForum lessonId={lesson.id} user={user} />
                            )}

                        </div>
                    </div>
                </>
            </div>


            {/* Mobile Footer Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] bg-slate-100 dark:bg-slate-950 border-t border-slate-300 dark:border-slate-800 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="grid grid-cols-4 h-16">
                    <button
                        onClick={() => handleOpenDrawer('materials')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeMobileTab === 'materials'
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        <i className="fas fa-folder-open text-lg"></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Materiais</span>
                    </button>

                    <button
                        onClick={() => handleOpenDrawer('notes')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeMobileTab === 'notes'
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        <i className="fas fa-sticky-note text-lg"></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Notas</span>
                    </button>

                    <button
                        onClick={() => handleOpenDrawer('quiz')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeMobileTab === 'quiz'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        <i className="fas fa-graduation-cap text-lg"></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Quiz</span>
                    </button>

                    <button
                        onClick={() => handleOpenDrawer('forum')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeMobileTab === 'forum'
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        <i className="fas fa-comments text-lg"></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Fórum</span>
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            {
                activeMobileTab && (
                    <div className="lg:hidden fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                            onClick={handleCloseDrawer}
                        ></div>

                        {/* Drawer Content */}
                        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 mb-16 sm:mb-0">
                            {/* Handle / Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                                <div className="w-10"></div> {/* Spacer */}
                                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                <button
                                    onClick={handleCloseDrawer}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                                {activeMobileTab === 'materials' && (
                                    <LessonMaterialsSidebar lesson={lesson} onTrackAction={onTrackAction} />
                                )}

                                {activeMobileTab === 'notes' && (
                                    <NotesPanelPrototype
                                        userId={user.id}
                                        lessonId={lesson.id}
                                        refreshTrigger={activeBlockId}
                                        onNoteSelect={handleCloseDrawer}
                                        focusedNoteId={focusedNoteId}
                                        externalDraft={noteDraftWithRange}
                                        onNotesChange={handleNotesChange}
                                    />
                                )}

                                {activeMobileTab === 'forum' && (
                                    <div className="h-[60vh]">
                                        <LessonForum lessonId={lesson.id} user={user} />
                                    </div>
                                )}
                                {activeMobileTab === 'quiz' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-center text-slate-800 dark:text-white">Quiz da Aula</h3>
                                        <div className="p-4 flex flex-col items-center justify-center gap-4">
                                            <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                                                Acesse o Quiz da aula para praticar ou ser avaliado.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setShowQuizOptionsModal(true);
                                                    handleCloseDrawer();
                                                    onTrackAction?.('Abriu opções do quiz pelo drawer mobile');
                                                }}
                                                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg"
                                            >
                                                Abrir Opções do Quiz
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Espaçamento extra no fundo apenas no mobile para o menu fixo */}
            <div className="h-20 lg:hidden"></div>

            {/* Practice Configuration Modal */}
            {
                showPracticeConfigModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                            <i className="fas fa-dumbbell text-2xl text-blue-500"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Modo Prática</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Configure seu treino</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPracticeConfigModal(false)}
                                        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Info Alert */}
                                <div className="p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl">
                                    <div className="flex gap-3">
                                        <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                                        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                            <p className="font-bold">Este modo NÃO concede XP nem afeta seu ranking.</p>
                                            <p className="text-blue-600 dark:text-blue-400">Use para treinar e testar seus conhecimentos!</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Question Quantity Selector */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Quantas questões você quer praticar?
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[5, 10, 15, 20, 25, 30].map(count => (
                                            <button
                                                key={count}
                                                onClick={() => setPracticeQuestionCount(count)}
                                                className={`p-4 rounded-xl font-bold text-sm transition-all ${practiceQuestionCount === count
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Start Button */}
                                <button
                                    onClick={handleStartPracticeQuiz}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <i className="fas fa-play"></i>
                                        <span>Iniciar Prática ({practiceQuestionCount} questões)</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showQuizOptionsModal && quiz && (
                    <QuizOptionsModal
                        isOpen={showQuizOptionsModal}
                        onClose={() => setShowQuizOptionsModal(false)}
                        quiz={quiz}
                        lesson={lesson}
                        onStartEvaluative={() => {
                            setShowQuizOptionsModal(false);
                            handleStartQuiz();
                        }}
                        onConfigurePractice={() => {
                            setShowQuizOptionsModal(false);
                            setShowPracticeConfigModal(true);
                        }}
                    />
                )
            }

            {
                showQuizModal && quiz && (
                    <QuizModal
                        quiz={quiz}
                        isOpen={showQuizModal}
                        onClose={() => setShowQuizModal(false)}
                        onSubmit={handleQuizSubmit}
                        isSubmitting={isSubmittingQuiz}
                    />
                )
            }

            {/* Modal de Resultado */}
            {
                quizResult && quiz && (
                    <QuizResultsModal
                        result={quizResult}
                        passingScore={quiz.passingScore}
                        isOpen={!!quizResult}
                        onClose={() => setQuizResult(null)}
                        quizMode={quizMode}
                        lessonTitle={lesson.title}
                        onRetry={() => {
                            setQuizResult(null);
                            if (quizMode === 'practice') {
                                setShowPracticeConfigModal(true);
                            } else {
                                handleStartQuiz();
                            }
                        }}
                    />
                )
            }

            {/* Image Viewer Modal */}
            {
                showImageViewerModal && (
                    <div
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setShowImageViewerModal(false)}
                    >
                        <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
                            {/* Close Button */}
                            <button
                                onClick={() => setShowImageViewerModal(false)}
                                className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl border border-white/20"
                                title="Fechar"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>

                            {/* Image */}
                            <img
                                src={getOptimizedUrl(viewerImageUrl, 1200)}
                                alt="Visualização"
                                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-105"
                                onClick={(e) => e.stopPropagation()}
                            />

                            {/* Image Info */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                                <p className="text-xs text-white/80 font-medium">
                                    Clique fora da imagem para fechar
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Menu Flutuante de Ferramentas (Apenas Mobile) */}
            <MobileToolsFab isPlaying={isPlaying} toggleAudio={toggleAudio} />
        </div >
    );
};

export default LessonViewer;
