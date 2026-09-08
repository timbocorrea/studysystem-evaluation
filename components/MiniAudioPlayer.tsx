import React, { useState, useRef, useEffect } from 'react';
import { DropboxService } from '../services/dropbox/DropboxService';

interface MiniAudioPlayerProps {
    path?: string;
    url?: string;
    filename: string;
}

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({ path, url: directUrl, filename }) => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Reset state when path or url changes
    useEffect(() => {
        if (directUrl) {
            setAudioUrl(directUrl);
        } else {
            setAudioUrl(null);
        }
        setIsPlaying(false);
        setError(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [path, directUrl]);

    const handlePlay = async () => {
        setError(null);

        if (audioUrl) {
            audioRef.current?.play();
            setIsPlaying(true);
            return;
        }

        if (!path) {
            setError('Caminho do áudio não encontrado');
            return;
        }

        setIsLoading(true);
        try {
            const url = await DropboxService.getTemporaryLink(path);
            setAudioUrl(url);
            // Wait for state update to propagate to audio element text
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            }, 0);
        } catch (err) {
            console.error('Error fetching audio preview:', err);
            setError('Erro ao carregar áudio');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePause = () => {
        audioRef.current?.pause();
        setIsPlaying(false);
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
    };

    const handleEnded = () => {
        setIsPlaying(false);
    };

    const handleError = () => {
        setIsPlaying(false);
        setError('Erro na reprodução');
    };

    // Smart Audit Heartbeat
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                if ((window as any).__reportMediaHeartbeat) {
                    (window as any).__reportMediaHeartbeat({ type: 'audio', duration: 30 });
                }
            }, 30000);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <div className="flex items-center gap-1">
            <audio
                ref={audioRef}
                onEnded={handleEnded}
                onError={handleError}
                className="hidden"
            />

            {/* Play/Pause Button */}
            <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={isLoading}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 shadow-sm"
                title={isPlaying ? "Pausar" : "Ouvir Prévia"}
            >
                {isLoading ? (
                    <i className="fas fa-spinner fa-spin text-[10px]"></i>
                ) : (
                    <i className={`fas fa-${isPlaying ? 'pause' : 'play'} text-[10px] ${isPlaying ? '' : 'ml-0.5'}`}></i>
                )}
            </button>

            {/* Stop Button (only visible if playing or paused with url) */}
            {(isPlaying || (audioUrl && !isPlaying)) && (
                <button
                    onClick={handleStop}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    title="Parar"
                >
                    <i className="fas fa-stop text-[10px]"></i>
                </button>
            )}

            {/* Error Indicator */}
            {error && (
                <div className="text-red-500 text-xs ml-1" title={error}>
                    <i className="fas fa-exclamation-circle"></i>
                </div>
            )}
        </div>
    );
};
