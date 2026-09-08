import React, { useState, useRef, useEffect } from 'react';
import { useLessonStore } from '../../stores/useLessonStore';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

interface MobileToolsFabProps {
    isPlaying: boolean;
    toggleAudio: () => void;
}

export const MobileToolsFab: React.FC<MobileToolsFabProps> = ({ isPlaying, toggleAudio }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const {
        playbackSpeed,
        setPlaybackSpeed,
        contentTheme,
        setContentTheme,
        fontSize,
        setFontSize,
        audioEnabled,
        setAudioEnabled
    } = useLessonStore();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.addEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const speeds = [1.0, 1.25, 1.5, 2.0];
    const cycleSpeed = () => {
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        setPlaybackSpeed(speeds[nextIndex]);
    };

    return (
        <div className="fixed bottom-24 right-4 z-[100] md:hidden" ref={menuRef}>
            {/* Popover Menu */}
            <div
                className={`absolute bottom-16 right-0 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-4 transition-all duration-300 origin-bottom-right flex flex-col gap-4 ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'
                    }`}
            >
                {/* Cabeçalho do Menu */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Ferramentas</span>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Controlos de Áudio */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Áudio & Narração</label>
                    <div className="flex items-center gap-2">
                        {/* Play / Pause Toggle */}
                        <button
                            onClick={() => {
                                if (!audioEnabled) {
                                    setAudioEnabled(true);
                                    // Let the store effect handle cleanup, the user will still need to select a block to play on first enable
                                } else {
                                    toggleAudio();
                                }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${audioEnabled && isPlaying
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-700'
                                }`}
                        >
                            <i className={`fas ${!audioEnabled ? 'fa-volume-mute' : isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                            {!audioEnabled ? 'Ativar' : isPlaying ? 'Pausar' : 'Ouvir'}
                        </button>

                        {/* Speed Cycle */}
                        <button
                            onClick={cycleSpeed}
                            disabled={!audioEnabled}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${audioEnabled
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-transparent'
                                }`}
                        >
                            <i className="fas fa-gauge-high mr-1"></i>
                            {playbackSpeed}x
                        </button>
                    </div>
                </div>

                {/* Controlo de Tema e Fonte */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Aparência</label>
                    <div className="flex items-center gap-2">
                        {/* Tema */}
                        <button
                            onClick={() => setContentTheme(contentTheme === 'light' ? 'dark' : 'light')}
                            className="flex-1 py-2.5 bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center"
                        >
                            <i className={`fas ${contentTheme === 'dark' ? 'fa-sun text-yellow-400' : 'fa-moon text-indigo-400'}`}></i>
                        </button>

                        {/* Fonte - */}
                        <button
                            onClick={() => setFontSize(Math.max(80, fontSize - 10))}
                            disabled={fontSize <= 80}
                            className="flex-1 py-2.5 bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center disabled:opacity-50"
                        >
                            <i className="fas fa-font text-xs"></i><span className="text-[10px] ml-0.5">-</span>
                        </button>

                        {/* Fonte display */}
                        <span className="text-xs font-bold text-slate-300 w-8 text-center">{fontSize}%</span>

                        {/* Fonte + */}
                        <button
                            onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                            disabled={fontSize >= 200}
                            className="flex-1 py-2.5 bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center disabled:opacity-50"
                        >
                            <i className="fas fa-font text-base"></i><span className="text-[10px] ml-0.5">+</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Menu Toggle FAB */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isOpen
                    ? 'bg-slate-800 border-2 border-slate-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105 text-white'
                    }`}
            >
                <i className={`fas ${isOpen ? 'fa-times' : 'fa-layer-group'} text-xl`}></i>
            </button>
        </div>
    );
};
