import React, { useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { notificationRepository } from '@/services/Dependencies';
import { Notification, Achievement } from '@/domain/entities';
import AchievementOverlay from './AchievementOverlay';
import LevelUpOverlay from './LevelUpOverlay';
import { useGamificationStore } from '@/stores/useGamificationStore';

interface GamificationOverlayManagerProps {
    userId: string;
}

const GamificationOverlayManager: React.FC<GamificationOverlayManagerProps> = ({ userId }) => {
    const { isLevelUpVisible, levelUpData, hideLevelUp, showLevelUp } = useGamificationStore();
    
    // Achievement state local (para fila de conquistas se necessário)
    const [activeAchievement, setActiveAchievement] = React.useState<Achievement | null>(null);

    const handleNewNotification = useCallback((notif: Notification) => {
        console.log('🔔 Gamification Notification Received:', notif);

        // Se for uma conquista
        if (notif.type === 'award' && notif.title.toLowerCase().includes('conquista')) {
            const achievement: Achievement = {
                id: notif.id,
                title: notif.title.replace('Conquista Desbloqueada: ', ''),
                description: notif.message,
                dateEarned: new Date(),
                icon: 'fa-trophy' // Fallback
            };
            
            setActiveAchievement(achievement);
        }

        // Se for Level Up (via trigger de banco)
        if (notif.type === 'award' && notif.title.toUpperCase().includes('LEVEL UP')) {
            const levelMatch = notif.message.match(/nível (\d+)/i);
            if (levelMatch) {
                const newLevel = parseInt(levelMatch[1]);
                showLevelUp(newLevel);
            }
        }
    }, [showLevelUp]);

    useEffect(() => {
        if (!userId) return;

        console.log('🚀 Subscribing to gamification events for user:', userId);
        const subscription = notificationRepository.subscribeToNotifications(userId, handleNewNotification);

        return () => {
            subscription.unsubscribe();
        };
    }, [userId, handleNewNotification]);

    return (
        <>
            <AnimatePresence>
                {activeAchievement && (
                    <AchievementOverlay 
                        achievement={activeAchievement} 
                        onClose={() => setActiveAchievement(null)} 
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isLevelUpVisible && levelUpData && (
                    <LevelUpOverlay 
                        newLevel={levelUpData.newLevel} 
                        unlockedAchievements={levelUpData.unlockedAchievements}
                        onClose={hideLevelUp} 
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default GamificationOverlayManager;
