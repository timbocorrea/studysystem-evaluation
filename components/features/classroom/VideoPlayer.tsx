import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Lesson } from '@/domain/entities';
import { activityMonitor } from '@/services/ActivityMonitor';

interface VideoPlayerProps {
  lesson: Lesson;
  videoUrl?: string;
  onProgress: (watchedSeconds: number) => void;
  onPlay?: () => void;
  onVideoWatched?: (videoUrl: string) => void;
}

export interface VideoPlayerRef {
  pause: () => void;
}

const VideoPlayer = React.forwardRef<VideoPlayerRef, VideoPlayerProps>(({ lesson, videoUrl, onProgress, onPlay, onVideoWatched }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoWatchedReported, setVideoWatchedReported] = useState(false);
  const lastProgressBucketRef = useRef<number | null>(null);
  const lastHeartbeatBucketRef = useRef<number | null>(null);
  const duration = lesson.durationSeconds || 1;
  const showManualComplete = Boolean((import.meta as any)?.env?.DEV);

  const currentVideoUrl = videoUrl || lesson.videoUrl;

  React.useImperativeHandle(ref, () => ({
    pause: () => {
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      } else if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      activityMonitor.setMediaPlaying(false);
    }
  }));

  useEffect(() => {
    const watchedSeconds = Math.floor(lesson.watchedSeconds || 0);
    lastProgressBucketRef.current = watchedSeconds >= 10 ? Math.floor(watchedSeconds / 10) : null;
    lastHeartbeatBucketRef.current = watchedSeconds >= 30 ? Math.floor(watchedSeconds / 30) : null;

    if (videoRef.current) {
      videoRef.current.currentTime = lesson.watchedSeconds;
    }
  }, [lesson.id, currentVideoUrl]);

  const reportProgressOnce = useCallback((seconds: number) => {
    const current = Math.floor(seconds);
    if (current <= 0 || current % 10 !== 0) return;

    const bucket = Math.floor(current / 10);
    if (lastProgressBucketRef.current === bucket) return;

    lastProgressBucketRef.current = bucket;
    onProgress(current);
  }, [onProgress]);

  const reportHeartbeatOnce = useCallback((seconds: number) => {
    const current = Math.floor(seconds);
    if (current <= 0 || current % 30 !== 0) return;

    const bucket = Math.floor(current / 30);
    if (lastHeartbeatBucketRef.current === bucket) return;

    lastHeartbeatBucketRef.current = bucket;
    if ((window as any).__reportMediaHeartbeat) {
      (window as any).__reportMediaHeartbeat({ type: 'video', duration: 30 });
    }
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = Math.floor(videoRef.current.currentTime);
      setCurrentTime(current);
      reportProgressOnce(current);
      reportHeartbeatOnce(current);
    }
  };

  const handleEnded = () => {
    onProgress(duration);
    setCurrentTime(duration);
    setIsPlaying(false);
    activityMonitor.setMediaPlaying(false);
    if (onVideoWatched && currentVideoUrl && !videoWatchedReported) {
      setVideoWatchedReported(true);
      onVideoWatched(currentVideoUrl);
    }
  };

  useEffect(() => {
    return () => {
      activityMonitor.setMediaPlaying(false);
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, []);

  const markAsCompleted = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onProgress(duration);
    setCurrentTime(duration);
    setIsPlaying(false);
    if (onVideoWatched && currentVideoUrl && !videoWatchedReported) {
      setVideoWatchedReported(true);
      onVideoWatched(currentVideoUrl);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        activityMonitor.setMediaPlaying(false);
      } else {
        videoRef.current.play();
        activityMonitor.setMediaPlaying(true);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const isYoutube = currentVideoUrl?.includes('youtube.com') || currentVideoUrl?.includes('youtu.be');

  const getYoutubeVideoId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  // YouTube IFrame API Integration
  const initYouTubePlayer = useCallback(() => {
    if (!currentVideoUrl || !isYoutube || !iframeRef.current) return;

    const videoId = getYoutubeVideoId(currentVideoUrl);
    if (!videoId) return;

    // Load the API script if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);

      (window as any).onYouTubeIframeAPIReady = () => {
        createPlayer(videoId);
      };
    } else {
      createPlayer(videoId);
    }
  }, [currentVideoUrl, isYoutube]);

  const createPlayer = (videoId: string) => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy();
    }

    ytPlayerRef.current = new (window as any).YT.Player(iframeRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin
      },
      events: {
        onStateChange: (event: any) => {
          const YT = (window as any).YT;
          if (event.data === YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            activityMonitor.setMediaPlaying(true);
            onPlay?.();

            // Track progress via polling
            if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
            ytIntervalRef.current = setInterval(() => {
              if (ytPlayerRef.current?.getCurrentTime && ytPlayerRef.current?.getDuration) {
                const ct = Math.floor(ytPlayerRef.current.getCurrentTime());
                const dur = Math.floor(ytPlayerRef.current.getDuration());
                setCurrentTime(ct);
                reportProgressOnce(ct);
                reportHeartbeatOnce(ct);

                // Mark as watched at 80%
                if (!videoWatchedReported && dur > 0 && ct / dur >= 0.8) {
                  setVideoWatchedReported(true);
                  if (onVideoWatched && currentVideoUrl) {
                    onVideoWatched(currentVideoUrl);
                  }
                }
              }
            }, 1000);
          } else if (event.data === YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
            if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
          } else if (event.data === YT.PlayerState.ENDED) {
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
            if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
            if (ytPlayerRef.current?.getDuration) {
              const dur = Math.floor(ytPlayerRef.current.getDuration());
              onProgress(dur);
              setCurrentTime(dur);
            }
            if (onVideoWatched && currentVideoUrl && !videoWatchedReported) {
              setVideoWatchedReported(true);
              onVideoWatched(currentVideoUrl);
            }
          }
        }
      }
    });
  };

  useEffect(() => {
    if (isYoutube) {
      initYouTubePlayer();
    }
    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch { }
      }
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, [currentVideoUrl, isYoutube, initYouTubePlayer]);

  // Reset watched state when video URL changes
  useEffect(() => {
    setVideoWatchedReported(false);
  }, [currentVideoUrl]);

  const progressPercent = Math.min(100, (currentTime / duration) * 100);

  if (!currentVideoUrl) {
    return (
      <div className="relative w-full aspect-[4/3] bg-slate-900/40 rounded-xl overflow-hidden shadow-inner border border-slate-800 flex flex-col items-center justify-center p-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 shadow-sm">
            <i className="fas fa-video-slash text-slate-500 text-2xl"></i>
          </div>
          <div>
            <p className="text-slate-300 font-bold text-lg">Vídeo não configurado</p>
            <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">Nenhum conteúdo de vídeo foi adicionado para esta aula.</p>
          </div>
          {showManualComplete && (
            <button
              onClick={markAsCompleted}
              className="mt-4 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              Marcar como concluída
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-2xl group border border-slate-700">
      {isYoutube ? (
        <div
          ref={iframeRef}
          className="w-full h-full"
        />
      ) : (
        <video
          ref={videoRef}
          src={currentVideoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          onPlay={() => {
            setIsPlaying(true);
            activityMonitor.setMediaPlaying(true);
            onPlay?.();
          }}
          onPause={() => {
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
          }}
          onEnded={handleEnded}
        />
      )}

      {/* Custom Controls Overlay - Hidden for YouTube */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity ${isYoutube ? 'hidden' : ''}`}>
        <div className="w-full bg-slate-700 h-1.5 rounded-full mb-4 overflow-hidden">
          <div
            className="bg-indigo-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white text-xl hover:text-indigo-400">
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </button>
            <span className="text-xs text-slate-300 font-medium">
              {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(lesson.durationSeconds / 60)}:{(lesson.durationSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <i className="fas fa-volume-up hover:text-white cursor-pointer"></i>
            <i className="fas fa-cog hover:text-white cursor-pointer"></i>
            <i className="fas fa-expand hover:text-white cursor-pointer"></i>
          </div>
        </div>
      </div>

      {!isPlaying && !isYoutube && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 bg-indigo-600/90 rounded-full flex items-center justify-center text-white text-3xl shadow-lg transform transition hover:scale-110">
            <i className="fas fa-play ml-1"></i>
          </div>
        </div>
      )}

      {showManualComplete && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={markAsCompleted}
            className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            Marcar como concluída
          </button>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
