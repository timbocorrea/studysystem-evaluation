import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
}

interface LevelUpOverlayProps {
    newLevel: number;
    unlockedAchievements?: Achievement[];
    onClose: () => void;
}

const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({ newLevel, unlockedAchievements = [], onClose }) => {
    useEffect(() => {
        // Trigger confetti
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 overflow-hidden"
        >
            {/* Ray Light Effect */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute w-[150vmax] h-[150vmax] opacity-20 pointer-events-none"
                style={{
                    background: 'conic-gradient(from 0deg, transparent 0deg, #4f46e5 20deg, transparent 40deg, #10b981 60deg, transparent 80deg, #4f46e5 100deg, transparent 120deg)'
                }}
            />

            <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
                {/* Badge Container */}
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                    className="relative w-48 h-48 mb-8"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-full blur-3xl opacity-50 animate-pulse" />
                    <div className="relative w-full h-full bg-slate-800 rounded-full border-8 border-indigo-500 flex items-center justify-center shadow-2xl">
                        <span className="text-7xl font-black text-white drop-shadow-lg italic">
                            {newLevel}
                        </span>
                    </div>
                    
                    {/* Floating Stars */}
                    {[...Array(5)].map((_, i) => (
                        <motion.i
                            key={i}
                            className="fas fa-star absolute text-yellow-400 text-2xl"
                            animate={{
                                y: [0, -20, 0],
                                opacity: [0, 1, 0],
                                scale: [0.5, 1, 0.5],
                                rotate: [0, 45, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.4
                            }}
                            style={{
                                top: `${50 + 60 * Math.sin((i * 2 * Math.PI) / 5)}%`,
                                left: `${50 + 60 * Math.cos((i * 2 * Math.PI) / 5)}%`,
                            }}
                        />
                    ))}
                </motion.div>

                <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-6xl font-black text-white uppercase tracking-tighter mb-4 italic"
                >
                    LEVEL UP!
                </motion.h2>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-indigo-300 font-bold text-lg mb-8 uppercase tracking-widest"
                >
                    Você alcançou o Nível {newLevel}
                </motion.p>

                {/* Unlocked Achievements */}
                {unlockedAchievements.length > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 w-full backdrop-blur-sm"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Conquistas Desbloqueadas</p>
                        <div className="flex flex-col gap-4">
                            {unlockedAchievements.map((ach) => (
                                <div key={ach.id} className="flex items-center gap-4 text-left bg-white/5 rounded-2xl p-4">
                                    <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
                                        <i className={`fas ${ach.icon} text-xl`}></i>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-sm uppercase">{ach.title}</h4>
                                        <p className="text-xs text-slate-400 line-clamp-1">{ach.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="px-12 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:shadow-white/20 transition-all"
                >
                    Continuar Jornada
                </motion.button>
            </div>
        </motion.div>
    );
};

export default LevelUpOverlay;
