import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LessonStore {
    // Video/Audio State
    currentTime: number;
    isPlaying: boolean;
    currentAudioIndex: number | null;

    // Content State
    activeBlockId: string | null;
    fontSize: number;
    contentTheme: 'light' | 'dark';

    // UI State
    isCinemaMode: boolean;

    // Media Preferences
    playbackSpeed: number;
    audioEnabled: boolean;

    // Actions
    setCurrentTime: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentAudioIndex: (index: number | null) => void;
    setActiveBlockId: (id: string | null) => void;
    setFontSize: (size: number) => void;
    setContentTheme: (theme: 'light' | 'dark') => void;
    setPlaybackSpeed: (speed: number) => void;
    setAudioEnabled: (enabled: boolean) => void;
    toggleCinemaMode: () => void;
    resetLessonState: () => void;
}

export const useLessonStore = create<LessonStore>()(
    persist(
        (set) => ({
            // Initial State
            currentTime: 0,
            isPlaying: false,
            currentAudioIndex: null,
            activeBlockId: null,
            fontSize: 100,
            contentTheme: 'light',
            isCinemaMode: false,
            playbackSpeed: 1.0,
            audioEnabled: true,

            // Actions
            setCurrentTime: (time) => set({ currentTime: time }),
            setIsPlaying: (playing) => set({ isPlaying: playing }),
            setCurrentAudioIndex: (index) => set({ currentAudioIndex: index }),
            setActiveBlockId: (id) => set({ activeBlockId: id }),
            setFontSize: (size) => set({ fontSize: Math.max(80, Math.min(200, size)) }), // Clamp between 80-200%
            setContentTheme: (theme) => set({ contentTheme: theme }),
            setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
            setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
            toggleCinemaMode: () => set((state) => ({ isCinemaMode: !state.isCinemaMode })),
            resetLessonState: () => set({
                currentTime: 0,
                isPlaying: false,
                currentAudioIndex: null,
                activeBlockId: null,
                // Preferences like fontSize, playbackSpeed, audioEnabled, contentTheme are NOT reset to preserve user choice
            }),
        }),
        {
            name: 'study-system-prefs',
            partialize: (state) => ({
                playbackSpeed: state.playbackSpeed,
                audioEnabled: state.audioEnabled,
                fontSize: state.fontSize,
                contentTheme: state.contentTheme
            }),
        }
    )
);
