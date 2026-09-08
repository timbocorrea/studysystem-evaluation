import { useEffect, useRef, useState } from 'react';

type MobileLessonTab = 'materials' | 'notes' | 'quiz' | 'forum';

const LESSON_DRAWER_HISTORY_STATE = '__lessonDrawerOpen';

interface UseLessonNavigationReturn {
    // State
    activeMobileTab: MobileLessonTab | null;
    focusedNoteId: string | null;

    // Actions
    handleOpenDrawer: (tab: MobileLessonTab) => void;
    handleCloseDrawer: () => void;
    setFocusedNoteId: (id: string | null) => void;
}

export const useLessonNavigation = (): UseLessonNavigationReturn => {
    // State
    const [activeMobileTab, setActiveMobileTab] = useState<MobileLessonTab | null>(null);
    const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
    const activeMobileTabRef = useRef<MobileLessonTab | null>(null);

    useEffect(() => {
        activeMobileTabRef.current = activeMobileTab;
    }, [activeMobileTab]);

    useEffect(() => {
        const handlePopState = () => {
            if (activeMobileTabRef.current) {
                setActiveMobileTab(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const ensureDrawerHistoryState = () => {
        if (typeof window === 'undefined') return;

        const currentState = window.history.state;
        if (currentState?.[LESSON_DRAWER_HISTORY_STATE]) return;

        window.history.pushState(
            {
                ...(currentState && typeof currentState === 'object' ? currentState : {}),
                [LESSON_DRAWER_HISTORY_STATE]: true
            },
            '',
            window.location.href
        );
    };

    const handleOpenDrawer = (tab: MobileLessonTab) => {
        setActiveMobileTab((currentTab) => {
            if (currentTab === tab) {
                return null;
            }

            if (!currentTab) {
                ensureDrawerHistoryState();
            }

            return tab;
        });
    };

    const handleCloseDrawer = () => {
        setActiveMobileTab(null);
    };

    return {
        // State
        activeMobileTab,
        focusedNoteId,

        // Actions
        handleOpenDrawer,
        handleCloseDrawer,
        setFocusedNoteId
    };
};
