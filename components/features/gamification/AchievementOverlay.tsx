import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '@/domain/entities';
import confetti from 'canvas-confetti';

interface AchievementOverlayProps {
    achievement: Achievement;
    onClose: () => void;
}

const AchievementOverlay: React.FC<AchievementOverlayProps> = ({ achievement, onClose }) => {
    useEffect(() => {
        // Trigger a shorter confetti burst for achievements
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#fbbf24', '#f59e0b', '#ffffff'],
            zIndex: 9999
        });

        const timer = setTimeout(onClose, 6000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.5, y: 100, rotate: -10 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: -100 }}
                transition={{ type: "spring", damping: 15 }}
                className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-[2.5rem] p-1 shadow-[0_0_50px_rgba(99,102,241,0.5)] max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-slate-900 rounded-[2.4rem] p-8 text-center relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full" />
                    
                    <div className="relative z-10">
                        <motion.div
                            animate={{ 
                                rotate: [0, 10, -10, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{ repeat: Infinity, duration: 4 }}
                            className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] mb-6"
                        >
                            <i className={`fas ${achievement.icon || 'fa-trophy'} text-white text-4xl`}></i>
                        </motion.div>

                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-black text-white mb-2 uppercase tracking-tight italic"
                        >
                            Conquista Desbloqueada!
                        </motion.h2>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-amber-400 font-black text-xl mb-4 uppercase"
                        >
                            {achievement.title}
                        </motion.div>

                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-slate-400 text-sm mb-8 leading-relaxed font-medium"
                        >
                            {achievement.description}
                        </motion.p>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="bg-white text-indigo-900 font-black px-12 py-4 rounded-2xl shadow-lg uppercase tracking-widest text-xs hover:bg-indigo-50 transition-colors"
                        >
                            Incrível!
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AchievementOverlay;
