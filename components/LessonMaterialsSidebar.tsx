import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lesson, LessonResourceType } from '../domain/entities';
import { convertDropboxUrl, convertGoogleDriveUrl, isDocumentFile } from '@/utils/mediaUtils';

const iconByType: Record<LessonResourceType, string> = {
  PDF: 'fa-file-pdf',
  LINK: 'fa-link',
  AUDIO: 'fa-headphones',
  IMAGE: 'fa-image',
  FILE: 'fa-paperclip'
};

const labelByType: Record<LessonResourceType, string> = {
  PDF: 'PDF',
  LINK: 'Link',
  AUDIO: 'Áudio',
  IMAGE: 'Imagem',
  FILE: 'Arquivo'
};

// Define a unified interface for display items
interface MaterialItem {
  id: string;
  type: LessonResourceType;
  title: string;
  url: string;
  isMain?: boolean; // To distinguish main lesson content
}

type Props = {
  lesson: Lesson;
  onTrackAction?: (action: string) => void;
  onAudioStateChange?: (isPlaying: boolean, title?: string) => void;
};

const LessonMaterialsSidebar: React.FC<Props> = ({ lesson, onTrackAction, onAudioStateChange }) => {
  const resources = lesson.resources;
  const hasMaterials = Boolean(lesson.imageUrl || lesson.audioUrl || resources.length > 0);

  // Define groups order
  const groups: LessonResourceType[] = ['AUDIO', 'IMAGE', 'PDF', 'LINK', 'FILE'];

  // Group materials
  const groupedMaterials: Record<string, MaterialItem[]> = {
    AUDIO: [],
    IMAGE: [],
    PDF: [],
    LINK: [],
    FILE: []
  };

  // Add Main Audio
  if (lesson.audioUrl) {
    groupedMaterials.AUDIO.push({
      id: 'main-audio',
      type: 'AUDIO',
      title: 'Áudio da Aula',
      url: lesson.audioUrl,
      isMain: true
    });
  }

  // Add Main Image
  if (lesson.imageUrl) {
    groupedMaterials.IMAGE.push({
      id: 'main-image',
      type: 'IMAGE',
      title: 'Capa da Aula',
      url: lesson.imageUrl,
      isMain: true
    });
  }

  // Add Attachments
  resources.forEach(r => {
    if (groupedMaterials[r.type]) {
      groupedMaterials[r.type].push({
        id: r.id,
        type: r.type,
        title: r.title,
        url: r.url,
        isMain: false
      });
    } else {
      // Fallback for unknown types if any, though types are strict
      groupedMaterials.FILE.push({
        id: r.id,
        type: 'FILE',
        title: r.title,
        url: r.url,
        isMain: false
      });
    }
  });

  // State to control collapsed groups
  // State to control collapsed groups
  // Default all closed per user request
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    AUDIO: false,
    IMAGE: false,
    PDF: false,
    LINK: false,
    FILE: false
  });

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // State for modals
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalPDF, setModalPDF] = useState<string | null>(null);
  const [modalDocUrl, setModalDocUrl] = useState<string | null>(null);
  const [modalDocTitle, setModalDocTitle] = useState<string | null>(null);

  // Close modals with ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalImage) setModalImage(null);
        if (modalPDF) setModalPDF(null);
        if (modalDocUrl) setModalDocUrl(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalImage, modalPDF, modalDocUrl]);

  // State to track active audio player (Drawer style)
  const [currentAudio, setCurrentAudio] = useState<MaterialItem | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Notify parent when audio state changes
  useEffect(() => {
    onAudioStateChange?.(!!currentAudio, currentAudio?.title);
  }, [currentAudio, onAudioStateChange]);

  // Helper function to convert Media URLs
  const convertUrl = (url: string): string => {
    return convertDropboxUrl(convertGoogleDriveUrl(url));
  };

  const handleItemClick = (item: MaterialItem) => {
    // Helper to check extensions
    let effectiveType = item.type;
    const lowerUrl = item.url.toLowerCase();

    if (item.type === 'FILE') {
      if (lowerUrl.includes('.pdf')) effectiveType = 'PDF';
      else if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(lowerUrl)) effectiveType = 'IMAGE';
      else if (/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(lowerUrl)) effectiveType = 'AUDIO';
    }

    switch (effectiveType) {
      case 'AUDIO':
        setCurrentAudio({ ...item, url: convertDropboxUrl(convertGoogleDriveUrl(item.url)) });
        setIsMinimized(false);
        onTrackAction?.(`Abriu Player Áudio: ${item.title}`);
        break;
      case 'IMAGE':
        setModalImage(convertDropboxUrl(convertGoogleDriveUrl(item.url)));
        onTrackAction?.(`Visualizou Imagem: ${item.title}`);
        break;
      case 'PDF':
        // Use unified Doc Viewer for PDF if external
        const isExternal = item.url.includes('dropbox.com') || item.url.includes('drive.google.com');
        if (isExternal) {
          const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(convertDropboxUrl(convertGoogleDriveUrl(item.url)))}&embedded=true`;
          setModalDocUrl(viewerUrl);
          setModalDocTitle(item.title);
        } else {
          setModalPDF(item.url);
        }
        onTrackAction?.(`Visualizou PDF: ${item.title}`);
        break;
      case 'LINK':
      case 'FILE':
        const lowerUrlFile = item.url.toLowerCase();
        if (lowerUrlFile.includes('.pptx') || lowerUrlFile.includes('.ppt')) {
          const directDocUrl = convertDropboxUrl(convertGoogleDriveUrl(item.url));
          const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directDocUrl)}`;
          setModalDocUrl(viewerUrl);
          setModalDocTitle(item.title);
          onTrackAction?.(`Visualizou Slides: ${item.title}`);
        } else if (isDocumentFile(item.url)) {
          const directDocUrl = convertDropboxUrl(convertGoogleDriveUrl(item.url));
          const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(directDocUrl)}&embedded=true`;
          setModalDocUrl(viewerUrl);
          setModalDocTitle(item.title);
          onTrackAction?.(`Visualizou Documento: ${item.title}`);
        } else {
          window.open(item.url, '_blank');
          onTrackAction?.(`Abriu Link/Arquivo: ${item.title}`);
        }
        break;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[500px] overflow-hidden relative">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
          <i className="fas fa-folder-open"></i>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">Materiais da Aula</h3>
          <p className="text-[10px] text-slate-400">Texto, áudio, imagem e anexos</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasMaterials && (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600 mb-3">
              <i className="fas fa-box-open text-xl"></i>
            </div>
            <p className="text-xs text-slate-500">Nenhum material adicional foi publicado para esta aula.</p>
          </div>
        )}

        <div className="space-y-2">
          {groups.flatMap(type => groupedMaterials[type]).map(item => {
            // Determine effective type for rendering logic
            let effectiveType = item.type;
            const lowerUrl = item.url.toLowerCase();
            if (item.type === 'FILE') {
              if (lowerUrl.includes('.pdf')) effectiveType = 'PDF';
              else if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(lowerUrl)) effectiveType = 'IMAGE';
              else if (/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(lowerUrl)) effectiveType = 'AUDIO';
            }

            return (
              <div key={item.id} className="group">
                {/* Item Card */}
                <div
                  className={`bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 rounded-lg transition-all cursor-pointer ${currentAudio?.id === item.id ? 'bg-slate-800 border-indigo-500/50' : ''}`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-start justify-between p-2 gap-2">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${item.isMain || currentAudio?.id === item.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'}`}>
                        <i className={`fas ${currentAudio?.id === item.id ? 'fa-volume-high animate-pulse' : iconByType[effectiveType] || iconByType.FILE}`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate transition-colors ${currentAudio?.id === item.id ? 'text-indigo-400' : 'text-slate-200 group-hover:text-white'}`} title={item.title}>
                          {item.title}
                        </p>
                        {item.isMain && (
                          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider border border-indigo-500/20 px-1 rounded">
                            Principal
                          </span>
                        )}
                        {effectiveType === 'AUDIO' && (
                          <span className="text-[10px] text-slate-500 ml-2">
                            {currentAudio?.id === item.id ? 'Ouvindo agora...' : 'Clique para ouvir'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Open/View Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Redundant if parent handles it, but keeps specific button interaction clean
                        handleItemClick(item);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title={effectiveType === 'LINK' || effectiveType === 'FILE' ? "Abrir Link/Arquivo" : "Visualizar/Ouvir"}
                    >
                      <i className={`fas ${effectiveType === 'LINK' || effectiveType === 'FILE' ? 'fa-external-link-alt' : effectiveType === 'AUDIO' ? (currentAudio?.id === item.id ? 'fa-chart-simple' : 'fa-play') : 'fa-eye'} text-xs`}></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Portal for Audio Player to break out of sidebar overflow/z-index */}
      {currentAudio && createPortal(
        <>
          {/* Backdrop for minimizing by clicking outside */}
          {!isMinimized && (
            <div
              className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-[1px] transition-opacity"
              onClick={() => setIsMinimized(true)}
              title="Clique para minimizar o player"
            ></div>
          )}

          {/* Audio Player Drawer */}
          <div className={`fixed inset-y-0 right-0 z-[9999] w-full sm:w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-spring ${!isMinimized ? 'translate-x-0' : 'translate-x-full'}`}>
            <AudioPlayerContent
              item={currentAudio}
              onClose={() => setCurrentAudio(null)}
              onMinimize={() => setIsMinimized(true)}
              onTrackAction={onTrackAction}
            />
          </div>

          {/* Floating Restore Button (Mini Player) */}
          {isMinimized && (
            <button
              onClick={() => setIsMinimized(false)}
              className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] bg-indigo-600 text-white p-3 rounded-l-xl shadow-lg border-l border-t border-b border-indigo-400 hover:bg-indigo-500 transition-all group"
              title="Expandir Player"
            >
              <div className="relative">
                <i className="fas fa-compact-disc animate-spin-slow text-xl group-hover:scale-110 transition-transform"></i>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            </button>
          )}
        </>,
        document.body
      )}

      {/* Modal de Visualização de Imagem */}
      {modalImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full">
            <button
              onClick={() => setModalImage(null)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
              title="Fechar (ESC)"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            <img
              src={modalImage || ''}
              alt="Visualização em tamanho real"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center whitespace-nowrap">
              Clique fora da imagem ou pressione ESC para fechar
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de PDF */}
      {modalPDF && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalPDF(null)}
        >
          <div className="relative max-w-7xl w-full h-[90vh]">
            <button
              onClick={() => setModalPDF(null)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
              title="Fechar (ESC)"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            <iframe
              src={modalPDF || ''}
              className="w-full h-full rounded-lg shadow-2xl bg-white"
              title="Visualização de PDF em tela cheia"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center whitespace-nowrap">
              Clique fora do PDF ou pressione ESC para fechar
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Visualização de Documento (PPTX, PDF Externo, etc) */}
      {modalDocUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalDocUrl(null)}
        >
          <div className="relative max-w-7xl w-full h-[90vh] flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-800">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <i className="fas fa-file-lines"></i>
                  </div>
                  <h3 className="text-white font-bold truncate max-w-md">{modalDocTitle}</h3>
               </div>
               <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalDocUrl(null)}
                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white transition-all"
                  >
                    <i className="fas fa-times"></i>
                  </button>
               </div>
            </div>
            <div className="flex-1 bg-white relative">
              <iframe
                src={modalDocUrl}
                className="w-full h-full border-0"
                title="Visualização de Documento"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for the robust Audio Player
const AudioPlayerContent: React.FC<{ item: MaterialItem, onClose: () => void, onMinimize: () => void, onTrackAction?: (a: string) => void }> = ({ item, onClose, onMinimize, onTrackAction }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (onTrackAction) onTrackAction(`Abriu Player: ${item.title}`);
    setIsPlaying(true); // Auto-play on open
  }, [item, onTrackAction]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.error("Play error (autoplay blocked?):", e);
          // We can treat this as paused if needed, but let's leave state as is 
          // so user clicks play and it works.
        });
      }
    } else {
      audio.pause();
    }

  }, [isPlaying, item]); // Re-run when item changes to play new track

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const skip = (amount: number) => {
    if (audioRef.current) audioRef.current.currentTime += amount;
  };

  const handleStop = () => {
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }
    if (onTrackAction) onTrackAction(`Parou áudio: ${item.title}`);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h4 className="text-xs font-bold text-slate-400 tracking-wider">REPRODUZINDO AGORA</h4>
        <div className="flex items-center gap-2">
          {/* Minimize Button */}
          <button onClick={onMinimize} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Minimizar">
            <i className="fas fa-chevron-right"></i>
          </button>
          {/* Stop & Close Button */}
          <button
            onClick={() => {
              setIsPlaying(false);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
            title="Parar e Fechar"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">

        {/* "Album Art" Placeholder */}
        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-600 shadow-2xl flex items-center justify-center relative group">
          <div className="absolute inset-0 bg-black/20 rounded-2xl"></div>
          <i className="fas fa-music text-6xl text-white/90 drop-shadow-lg"></i>
          {/* Pulse Effect */}
          {isPlaying && (
            <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse -z-10"></div>
          )}
        </div>

        {/* Info */}
        <div className="text-center w-full">
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 leading-tight">{item.title}</h3>
          <p className="text-sm text-indigo-300">Material de Aula</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={(e) => {
              const val = Number(e.target.value);
              setProgress(val);
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="w-full h-1 bg-slate-700/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 hover:[&::-webkit-slider-thumb]:scale-125 hover:[&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button onClick={() => skip(-10)} className="text-slate-400 hover:text-white transition-colors transform hover:scale-110 active:scale-95" title="Retroceder 10s">
            <i className="fas fa-rotate-left text-xl"></i>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-900 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-indigo-500/20"
            title={isPlaying ? "Pausar" : "Reproduzir"}
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-2xl ml-1`}></i>
          </button>

          <button
            onClick={handleStop}
            className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-700 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-md group"
            title="Parar (Reset)"
          >
            <i className="fas fa-stop text-lg group-hover:scale-110 transition-transform"></i>
          </button>

          <button onClick={() => skip(10)} className="text-slate-400 hover:text-white transition-colors transform hover:scale-110 active:scale-95" title="Avançar 10s">
            <i className="fas fa-rotate-right text-xl"></i>
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex justify-center w-full">
          <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  setPlaybackRate(rate);
                  if (audioRef.current) audioRef.current.playbackRate = rate;
                }}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${playbackRate === rate
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Volume */}
      <div className="p-6 bg-black/20 border-t border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          <i className={`fas ${volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-low' : 'fa-volume-high'} text-xs text-slate-400 w-4`}></i>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-400"
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={item.url}
        autoPlay
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

export default LessonMaterialsSidebar;

