import { create } from 'zustand';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
}

interface GamificationState {
    isLevelUpVisible: boolean;
    levelUpData: {
        newLevel: number;
        unlockedAchievements: Achievement[];
    } | null;
    showLevelUp: (newLevel: number, unlockedAchievements?: Achievement[]) => void;
    hideLevelUp: () => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
    isLevelUpVisible: false,
    levelUpData: null,
    showLevelUp: (newLevel, unlockedAchievements = []) => set({
        isLevelUpVisible: true,
        levelUpData: { newLevel, unlockedAchievements }
    }),
    hideLevelUp: () => set({ isLevelUpVisible: false, levelUpData: null })
}));
