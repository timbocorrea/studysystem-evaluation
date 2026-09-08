import { useRef, useState, useEffect, useCallback } from 'react';
import { useLessonStore } from '../stores/useLessonStore';
import { Lesson } from '../domain/entities';
import { activityMonitor } from '../services/ActivityMonitor';

interface UseAudioPlayerProps {
    lesson: Lesson;
    onTrackAction?: (action: string) => void;
    onProgressUpdate?: (watchedSeconds: number, lastBlockId?: string) => Promise<void>;
    onAudioListened?: (blockId: string) => void;
    onPlay?: () => void;
}

export const useAudioPlayer = ({ lesson, onTrackAction, onProgressUpdate, onAudioListened, onPlay }: UseAudioPlayerProps) => {
    const {
        activeBlockId,
        setActiveBlockId,
        playbackSpeed,
        audioEnabled,
        setAudioEnabled,
        isPlaying,
        setIsPlaying
    } = useLessonStore();

    const [audioProgress, setAudioProgress] = useState<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const nextAudioRef = useRef<HTMLAudioElement | null>(null);
    const nextAudioReadyRef = useRef<boolean>(false); // True when next audio is fully buffered
    const playbackSpeedRef = useRef<number>(playbackSpeed);

    // 📈 Cumulative audio listening time tracking
    const totalListenedRef = useRef<number>(lesson.watchedSeconds || 0);
    const blockStartTimeRef = useRef<number>(0);
    const lastReportedRef = useRef<number>(0);
    const completedBlocksRef = useRef<Set<number>>(new Set());

    const audioEnabledRef = useRef(audioEnabled);
    const gaplessTriggeredRef = useRef(false); // Prevent double-triggering

    // Sync ref with store for callbacks
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed;
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
        if (nextAudioRef.current) {
            nextAudioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    // Sync audioEnabled ref
    useEffect(() => {
        audioEnabledRef.current = audioEnabled;
    }, [audioEnabled]);

    // Handle audioEnabled toggle
    useEffect(() => {
        if (!audioEnabled && audioRef.current) {
            audioRef.current.pause();
            setActiveBlockId(null);
            setAudioProgress(0);
            setIsPlaying(false);
            if (nextAudioRef.current) {
                nextAudioRef.current = null;
                nextAudioReadyRef.current = false;
            }
        }
    }, [audioEnabled, setActiveBlockId, setIsPlaying]);

    // Helper to find the next block with audio
    const findNextAudioBlockIndex = (startIndex: number): number => {
        const blocks = lesson.contentBlocks;
        if (!blocks) return -1;
        for (let i = startIndex + 1; i < blocks.length; i++) {
            const block = blocks[i];
            if (!block) continue;
            // Robust validation to skip images and dividers
            if (block.audioUrl && typeof block.audioUrl === 'string' && block.audioUrl.trim().length > 5) {
                return i;
            }
        }
        return -1;
    };

    // Convert Dropbox temporary URLs to direct download links
    const convertDropboxUrl = (url: string): string => {
        if (url.includes('dropboxusercontent.com') || url.includes('dropbox.com')) {
            if (url.includes('dl.dropboxusercontent.com')) {
                return url;
            }
            if (url.includes('dropbox.com/s/')) {
                return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                    .replace('dropbox.com', 'dl.dropboxusercontent.com')
                    .replace('?dl=0', '')
                    .replace('?dl=1', '');
            }
        }
        return url;
    };

    // Prefetch next audio — called immediately when current starts playing
    const prefetchNextAudio = useCallback((currentIndex: number) => {
        const blocks = lesson.contentBlocks;
        if (!blocks || !audioEnabledRef.current) return;

        const nextIndex = findNextAudioBlockIndex(currentIndex);
        if (nextIndex === -1) return;

        const nextUrl = convertDropboxUrl(blocks[nextIndex].audioUrl!);

        // Skip if we already prefetched this exact URL
        if (nextAudioRef.current && nextAudioRef.current.src === nextUrl) return;

        // Cleanup old prefetch
        if (nextAudioRef.current) {
            nextAudioRef.current.oncanplaythrough = null;
            nextAudioRef.current = null;
        }
        nextAudioReadyRef.current = false;

        const nextAudio = new Audio(nextUrl);
        nextAudio.preload = 'auto';
        nextAudio.playbackRate = playbackSpeedRef.current;

        // Mark as ready when fully buffered
        nextAudio.oncanplaythrough = () => {
            nextAudioReadyRef.current = true;
            console.log(`✅ Next audio [${nextIndex}] fully buffered and ready`);
        };

        nextAudio.load(); // Force browser to start buffering immediately
        nextAudioRef.current = nextAudio;
    }, [lesson]);

    const playBlock = useCallback((index: number, forcePlay = false) => {
        // Auto-enable audio if manually clicking a block
        if (!audioEnabledRef.current) {
            setAudioEnabled(true);
        }

        const blocks = lesson.contentBlocks;
        if (!blocks || index < 0 || index >= blocks.length) return;

        const block = blocks[index];

        // Validate audio URL
        if (!block.audioUrl || typeof block.audioUrl !== 'string' || block.audioUrl.trim() === '') {
            console.warn(`⚠️ Block ${index} (${block.id}) has no valid audioUrl`);
            setActiveBlockId(null);
            setIsPlaying(false);
            return;
        }

        console.log(`🎵 Attempting to play audio for block ${index}:`, {
            blockId: block.id,
            audioUrl: block.audioUrl,
            urlLength: block.audioUrl.length,
            urlPreview: block.audioUrl.substring(0, 100)
        });

        const audioUrl = convertDropboxUrl(block.audioUrl);
        console.log('🎵 Final audio URL:', audioUrl);

        // Toggle pause if clicking the active block
        if (!forcePlay && activeBlockId === block.id && audioRef.current) {
            if (!audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
                activityMonitor.setMediaPlaying(false);
                onTrackAction?.(`Pausou o áudio no bloco de texto`);
            } else {
                audioRef.current.play().then(() => {
                    onPlay?.();
                }).catch(e => console.error(e));
                setIsPlaying(true);
                activityMonitor.setMediaPlaying(true);
                onTrackAction?.(`Retomou o áudio no bloco de texto`);
            }
            return;
        }

        // Cleanup previous audio quickly
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.ontimeupdate = null;
            audioRef.current.onerror = null;
        }

        setActiveBlockId(block.id);
        setAudioProgress(0);
        setIsPlaying(true);

        // Reset block start time and gapless flag
        blockStartTimeRef.current = 0;
        gaplessTriggeredRef.current = false;

        let audio: HTMLAudioElement;

        // OPTIMIZATION: Reuse prefetched audio if available
        if (nextAudioRef.current && nextAudioRef.current.src === audioUrl) {
            console.log(`✅ Using prefetched audio [${index}]`);
            audio = nextAudioRef.current;
            audio.oncanplaythrough = null; // Remove prefetch listener
            nextAudioRef.current = null;
            nextAudioReadyRef.current = false;
        } else {
            audio = new Audio(audioUrl);
            audio.preload = 'auto';
            audio.load();
        }

        audioRef.current = audio;
        audio.playbackRate = playbackSpeedRef.current;

        // ──────────────────────────────────────────────────────────
        // GAPLESS TRANSITION: Handle near-end detection + onended
        // ──────────────────────────────────────────────────────────

        const handleBlockComplete = (isGapless: boolean) => {
            // 📈 Accumulate completed block duration (only once)
            if (!completedBlocksRef.current.has(index)) {
                completedBlocksRef.current.add(index);
                totalListenedRef.current += audio.duration || 0;
                blockStartTimeRef.current = 0;

                if (onProgressUpdate) {
                    onProgressUpdate(Math.round(totalListenedRef.current), block.id);
                }
                if (onAudioListened) {
                    onAudioListened(block.id);
                }
            }
        };

        const advanceToNext = () => {
            const nextIndex = findNextAudioBlockIndex(index);

            if (nextIndex !== -1 && audioEnabledRef.current) {
                console.log(`➡️ Auto-advancing to block ${nextIndex} (skipping ${nextIndex - index - 1} empty blocks)`);
                playBlock(nextIndex, true);
            } else {
                console.log(`⏹️ Playback finished - All audio complete!`);
                if (onProgressUpdate) {
                    const finalSeconds = Math.max(totalListenedRef.current, lesson.durationSeconds);
                    onProgressUpdate(Math.round(finalSeconds), block.id);
                }
                setIsPlaying(false);
                activityMonitor.setMediaPlaying(false);
                setActiveBlockId(null);
            }
        };

        audio.ontimeupdate = () => {
            if (!audio.duration) return;

            const progress = (audio.currentTime / audio.duration) * 100;
            setAudioProgress(progress);

            // 📈 Track cumulative listening time
            const listenedInBlock = audio.currentTime - blockStartTimeRef.current;
            if (listenedInBlock > 0) {
                const currentTotal = totalListenedRef.current + listenedInBlock;
                if (onProgressUpdate && currentTotal - lastReportedRef.current >= 5) {
                    lastReportedRef.current = currentTotal;
                    onProgressUpdate(Math.round(currentTotal), block.id);
                }
            }

            // ──────────────────────────────────────────────────────
            // GAPLESS: When within 150ms of ending AND next is ready,
            // trigger advance NOW instead of waiting for onended.
            // This eliminates the decode/buffer gap.
            // ──────────────────────────────────────────────────────
            const timeRemaining = audio.duration - audio.currentTime;
            if (
                timeRemaining <= 0.15 &&
                timeRemaining > 0 &&
                !gaplessTriggeredRef.current &&
                nextAudioReadyRef.current
            ) {
                gaplessTriggeredRef.current = true;
                console.log(`🔗 Gapless transition triggered (${Math.round(timeRemaining * 1000)}ms remaining)`);

                handleBlockComplete(true);

                // Remove onended to prevent double-advance
                audio.onended = null;
                audio.ontimeupdate = null;

                advanceToNext();
                return;
            }
        };

        // Handle end of track — fallback for when gapless doesn't trigger
        audio.onended = () => {
            console.log(`🎵 Audio ended for block ${index}`);

            // Skip if gapless already handled this
            if (gaplessTriggeredRef.current) return;

            // Prevent immediate re-trigger for audio that ended too quickly
            if (audio.currentTime < 0.5 && audio.duration > 1) {
                console.warn(`⚠️ Audio ended too quickly (${audio.currentTime}s), skipping auto-advance`);
                setIsPlaying(false);
                activityMonitor.setMediaPlaying(false);
                setActiveBlockId(null);
                return;
            }

            handleBlockComplete(false);
            setAudioProgress(0);
            advanceToNext();
        };

        // Handle errors
        audio.onerror = (e) => {
            console.error("❌ Audio playback error for block", index, {
                blockId: block.id,
                audioUrl: block.audioUrl,
                error: e,
                audioReadyState: audio.readyState,
                audioNetworkState: audio.networkState,
                audioError: audio.error
            });
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
        };

        audio.play().then(() => {
            console.log(`✅ Audio playing successfully for block ${index}`);
            activityMonitor.setMediaPlaying(true);

            // GAPLESS: Prefetch next audio IMMEDIATELY after playback starts
            // Maximum time for buffering = duration of current block
            prefetchNextAudio(index);
        }).catch(err => {
            console.error("❌ Audio playback failed for block", index, {
                blockId: block.id,
                audioUrl: block.audioUrl,
                error: err,
                errorMessage: err.message,
                errorName: err.name
            });
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
        });

        // Track action
        const blockPreview = block.text.replace(/<[^>]*>/g, '').substring(0, 50);
        onTrackAction?.(`Ativou áudio no bloco: "${blockPreview}..."`);
    }, [lesson, activeBlockId, onTrackAction, onProgressUpdate, setAudioEnabled, setActiveBlockId, setIsPlaying, onPlay, prefetchNextAudio]);

    const pauseAudio = useCallback(() => {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
        }
    }, [setIsPlaying]);

    const toggleAudio = useCallback(() => {
        if (!audioRef.current) return;

        if (audioRef.current.paused) {
            audioRef.current.play();
            setIsPlaying(true);
            activityMonitor.setMediaPlaying(true);
            onPlay?.();
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
        }
    }, [setIsPlaying, onPlay]);

    const seek = useCallback((percentage: number) => {
        if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
            const newTime = (audioRef.current.duration * percentage) / 100;
            audioRef.current.currentTime = newTime;
            setAudioProgress(percentage);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.onended = null;
                audioRef.current.ontimeupdate = null;
                audioRef.current.onerror = null;
                audioRef.current = null;
            }
            if (nextAudioRef.current) {
                nextAudioRef.current.oncanplaythrough = null;
                nextAudioRef.current = null;
            }
            nextAudioReadyRef.current = false;
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
        };
    }, [setIsPlaying]);

    return {
        isPlaying,
        progress: audioProgress,
        playBlock,
        toggleAudio,
        pauseAudio,
        seek
    };
};
