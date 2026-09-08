import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type BuddyThreadScopeMode = 'lesson_scoped' | 'course_scoped' | 'global_student_scoped';

export interface BuddyThreadScope {
    contextKey: string;
    buddyScopeMode: BuddyThreadScopeMode;
    courseId?: string;
    lessonId?: string;
}

export interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    createdAt?: number;
    action?: {
        label: string;
        courseId: string;
        lessonId: string;
    };
    image?: string | null;
}

export interface ChatThread {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    scope?: BuddyThreadScope;
}

function sanitizeMessageForPersistence(message: ChatMessage): ChatMessage {
    const { image: _image, ...messageWithoutImage } = message;
    return messageWithoutImage;
}

function sanitizeThreadForPersistence(thread: ChatThread): ChatThread {
    return {
        ...thread,
        messages: thread.messages.map(sanitizeMessageForPersistence)
    };
}

interface BuddyState {
    threadsByUser: Record<string, ChatThread[]>;
    activeThreadIdByUser: Record<string, string | null>;
    welcomeShownByUser: Record<string, boolean>;
    isLoading: boolean;
    isOpen: boolean;

    addMessage: (userId: string, message: ChatMessage, forcedTitle?: string, scope?: BuddyThreadScope) => void;
    setLoading: (loading: boolean) => void;
    setIsOpen: (isOpen: boolean) => void;
    startNewBuddySession: (userId: string, title?: string, scope?: BuddyThreadScope) => string;
    closeBuddySession: (userId: string) => void;
    clearHistory: (userId: string) => void;
    clearUserSession: (userId: string) => void;
    setWelcomeShown: (userId: string, shown: boolean) => void;

    createNewThread: (userId: string, title?: string, scope?: BuddyThreadScope) => string;
    switchThread: (userId: string, threadId: string) => void;
    deleteThread: (userId: string, threadId: string) => void;
    updateThreadTitle: (userId: string, threadId: string, title: string) => void;
}

export const useBuddyStore = create<BuddyState>()(
    persist(
        (set, get) => ({
            threadsByUser: {},
            activeThreadIdByUser: {},
            welcomeShownByUser: {},
            isLoading: false,
            isOpen: false,

            addMessage: (userId, message, forcedTitle, scope) => set((state) => {
                const threads = state.threadsByUser[userId] || [];
                let activeId = state.activeThreadIdByUser[userId];
                const messageWithTimestamp: ChatMessage = {
                    ...sanitizeMessageForPersistence(message),
                    createdAt: message.createdAt ?? Date.now()
                };

                const activeThread = activeId ? threads.find(t => t.id === activeId) : undefined;
                const shouldStartScopedThread = Boolean(
                    scope &&
                    activeThread &&
                    activeThread.messages.length > 0 &&
                    activeThread.scope?.contextKey !== scope.contextKey
                );

                if (!activeId || !activeThread || shouldStartScopedThread) {
                    activeId = crypto.randomUUID();
                    const titleFromMessage = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
                    const newThread: ChatThread = {
                        id: activeId,
                        title: forcedTitle || titleFromMessage,
                        messages: [messageWithTimestamp],
                        createdAt: Date.now(),
                        ...(scope ? { scope } : {})
                    };

                    return {
                        activeThreadIdByUser: { ...state.activeThreadIdByUser, [userId]: activeId },
                        threadsByUser: { ...state.threadsByUser, [userId]: [newThread, ...threads] }
                    };
                }

                const updatedThreads = threads.map(t => {
                    if (t.id === activeId) {
                        let newTitle = t.title;

                        if (forcedTitle) {
                            newTitle = forcedTitle;
                        } else if (t.messages.length === 0 && message.role === 'user') {
                            newTitle = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
                        }

                        return {
                            ...t,
                            ...(scope ? { scope } : {}),
                            messages: [...t.messages, messageWithTimestamp],
                            title: newTitle
                        };
                    }

                    return t;
                });

                return {
                    threadsByUser: {
                        ...state.threadsByUser,
                        [userId]: updatedThreads
                    }
                };
            }),

            setLoading: (loading) => set({ isLoading: loading }),
            setIsOpen: (isOpen) => set({ isOpen }),
            startNewBuddySession: (userId, title, scope) => get().createNewThread(userId, title, scope),

            closeBuddySession: (userId) => set((state) => ({
                activeThreadIdByUser: {
                    ...state.activeThreadIdByUser,
                    [userId]: null
                }
            })),

            clearHistory: (userId) => set((state) => {
                const activeId = state.activeThreadIdByUser[userId];
                if (!activeId) return state;

                const updatedThreads = (state.threadsByUser[userId] || []).map(t =>
                    t.id === activeId ? { ...t, messages: [] } : t
                );

                return {
                    threadsByUser: { ...state.threadsByUser, [userId]: updatedThreads }
                };
            }),

            setWelcomeShown: (userId, shown) => set((state) => ({
                welcomeShownByUser: {
                    ...state.welcomeShownByUser,
                    [userId]: shown
                }
            })),

            createNewThread: (userId, title = 'Nova Conversa', scope) => {
                const newId = crypto.randomUUID();

                const newThread: ChatThread = {
                    id: newId,
                    title,
                    messages: [],
                    createdAt: Date.now(),
                    ...(scope ? { scope } : {})
                };

                set((state) => ({
                    threadsByUser: {
                        ...state.threadsByUser,
                        [userId]: [newThread, ...(state.threadsByUser[userId] || [])]
                    },
                    activeThreadIdByUser: {
                        ...state.activeThreadIdByUser,
                        [userId]: newId
                    }
                }));

                return newId;
            },

            switchThread: (userId, threadId) => set((state) => ({
                activeThreadIdByUser: {
                    ...state.activeThreadIdByUser,
                    [userId]: threadId
                }
            })),

            deleteThread: (userId, threadId) => set((state) => {
                const threads = (state.threadsByUser[userId] || []).filter(t => t.id !== threadId);
                let activeId = state.activeThreadIdByUser[userId];

                if (activeId === threadId) {
                    activeId = null;
                }

                return {
                    threadsByUser: { ...state.threadsByUser, [userId]: threads },
                    activeThreadIdByUser: { ...state.activeThreadIdByUser, [userId]: activeId }
                };
            }),

            updateThreadTitle: (userId, threadId, title) => set((state) => {
                const updatedThreads = (state.threadsByUser[userId] || []).map(t =>
                    t.id === threadId ? { ...t, title } : t
                );

                return {
                    threadsByUser: { ...state.threadsByUser, [userId]: updatedThreads }
                };
            }),

            clearUserSession: (userId) => set((state) => ({
                threadsByUser: {
                    ...state.threadsByUser,
                    [userId]: []
                },
                activeThreadIdByUser: {
                    ...state.activeThreadIdByUser,
                    [userId]: null
                }
            }))
        }),
        {
            name: 'buddy-store-v3',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                threadsByUser: Object.fromEntries(
                    Object.entries(state.threadsByUser).map(([userId, threads]) => [
                        userId,
                        threads.map(sanitizeThreadForPersistence)
                    ])
                ),
                welcomeShownByUser: state.welcomeShownByUser
            }),
        }
    )
);
