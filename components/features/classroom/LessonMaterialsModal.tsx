import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Play, Music, Image as ImageIcon, ExternalLink, Loader2 } from 'lucide-react';
import { Lesson, LessonResourceType } from '@/domain/entities';
import { courseRepository } from '@/services/Dependencies';
import { isDocumentFile } from '@/utils/mediaUtils';
import {
    canOpenResolvedUrlInNewTab,
    getSanitizedUrlErrorMessage,
    resolveLessonResourceUrl,
    shouldAvoidExternalDocumentViewer
} from '@/services/ResourceUrlResolver';

interface LessonMaterialsModalProps {
    lessonId: string;
    lessonTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

const LessonMaterialsModal: React.FC<LessonMaterialsModalProps> = ({ lessonId, lessonTitle, isOpen, onClose }) => {
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [materialWarning, setMaterialWarning] = useState<string | null>(null);

    // Modal state for internal viewers from MaterialsSidebar
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [modalDocUrl, setModalDocUrl] = useState<string | null>(null);
    const [modalDocTitle, setModalDocTitle] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchFullLesson = async () => {
            setIsLoading(true);
            setMaterialWarning(null);
            try {
                const fullLesson = await courseRepository.getLessonById(lessonId);
                if (fullLesson) {
                    setLesson(fullLesson);
                } else {
                    setError('Não foi possível carregar os materiais desta aula.');
                }
            } catch (err: any) {
                console.error("Error fetching lesson for materials:", err);
                setError('Erro ao carregar materiais.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullLesson();
    }, [lessonId, isOpen]);

    if (!isOpen) return null;

    const resources = lesson?.resources || [];
    const hasMaterials = Boolean(lesson?.imageUrl || lesson?.audioUrl || resources.length > 0);

    const iconByType: Record<LessonResourceType, any> = {
        PDF: FileText,
        LINK: ExternalLink,
        AUDIO: Music,
        IMAGE: ImageIcon,
        FILE: FileText
    };

    const openResolvedInNewTab = (url: string | null, title: string) => {
        if (!url) {
            setMaterialWarning('URL do material indisponível para abertura.');
            return;
        }

        window.open(url, '_blank', 'noopener,noreferrer');
        setModalDocTitle(title);
    };

    const handleItemClick = (item: { type: LessonResourceType; url: string; title: string }) => {
        setMaterialWarning(null);

        const resolved = resolveLessonResourceUrl(item.url);
        if (!resolved.isSafe || !resolved.displayUrl) {
            setMaterialWarning(getSanitizedUrlErrorMessage(resolved));
            return;
        }

        const directUrl = resolved.displayUrl;
        const lowerUrl = directUrl.toLowerCase();
        let effectiveType = item.type;

        if (item.type === 'FILE') {
            if (lowerUrl.includes('.pdf')) effectiveType = 'PDF';
            else if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(lowerUrl)) effectiveType = 'IMAGE';
            else if (/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(lowerUrl)) effectiveType = 'AUDIO';
        }

        switch (effectiveType) {
            case 'AUDIO':
                if (!canOpenResolvedUrlInNewTab(resolved)) {
                    setMaterialWarning(getSanitizedUrlErrorMessage(resolved));
                    return;
                }
                openResolvedInNewTab(resolved.downloadUrl, item.title);
                break;
            case 'IMAGE':
                setModalImage(directUrl);
                break;
            case 'PDF': {
                const canUseExternalViewer = !shouldAvoidExternalDocumentViewer(resolved);
                const isExternalViewerFriendly = directUrl.includes('dropbox.com') || directUrl.includes('dropboxusercontent.com') || directUrl.includes('drive.google.com');
                if (isExternalViewerFriendly && canUseExternalViewer) {
                    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(directUrl)}&embedded=true`;
                    setModalDocUrl(viewerUrl);
                    setModalDocTitle(item.title);
                } else if (canOpenResolvedUrlInNewTab(resolved)) {
                    openResolvedInNewTab(resolved.downloadUrl, item.title);
                } else {
                    setMaterialWarning(getSanitizedUrlErrorMessage(resolved));
                }
                break;
            }
            case 'LINK':
            case 'FILE':
                if (lowerUrl.includes('.pptx') || lowerUrl.includes('.ppt')) {
                    if (shouldAvoidExternalDocumentViewer(resolved)) {
                        openResolvedInNewTab(resolved.downloadUrl, item.title);
                    } else {
                        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`;
                        setModalDocUrl(viewerUrl);
                        setModalDocTitle(item.title);
                    }
                } else if (isDocumentFile(directUrl)) {
                    if (shouldAvoidExternalDocumentViewer(resolved)) {
                        openResolvedInNewTab(resolved.downloadUrl, item.title);
                    } else {
                        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(directUrl)}&embedded=true`;
                        setModalDocUrl(viewerUrl);
                        setModalDocTitle(item.title);
                    }
                } else if (canOpenResolvedUrlInNewTab(resolved)) {
                    openResolvedInNewTab(resolved.downloadUrl, item.title);
                } else {
                    setMaterialWarning(getSanitizedUrlErrorMessage(resolved));
                }
                break;
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                            <i className="fas fa-file-invoice text-xl"></i>
                        </div>
                        <div>
                            <h3 className="text-white font-black text-xl leading-tight uppercase tracking-tight">Materiais Complementares</h3>
                            <p className="text-slate-400 text-sm font-medium tracking-wide mt-0.5">{lessonTitle}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-slate-700 hover:border-slate-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-900/30">
                    {materialWarning && (
                        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">
                            <i className="fas fa-shield-alt mr-2"></i>
                            {materialWarning}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                            <p className="font-bold text-sm uppercase tracking-widest animate-pulse">Carregando Materiais...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-rose-500">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center">
                                <i className="fas fa-exclamation-triangle text-2xl"></i>
                            </div>
                            <p className="font-bold">{error}</p>
                        </div>
                    ) : !hasMaterials ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                           <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600 mb-2 border border-slate-800">
                               <i className="fas fa-folder-open text-3xl"></i>
                           </div>
                           <h4 className="text-lg font-bold text-slate-300">Nenhum material anexado</h4>
                           <p className="text-sm text-center max-w-xs text-slate-500">Esta aula ainda não possui materiais de áudio, imagem ou PDFs cadastrados.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Main Items */}
                            {lesson?.audioUrl && (
                                <MaterialCard 
                                    title="Áudio da Aula" 
                                    type="AUDIO" 
                                    onClick={() => handleItemClick({ type: 'AUDIO', url: lesson.audioUrl, title: 'Áudio da Aula' })}
                                    isMain
                                />
                            )}
                            {lesson?.imageUrl && (
                                <MaterialCard 
                                    title="Slider / Imagem Capa" 
                                    type="IMAGE" 
                                    onClick={() => handleItemClick({ type: 'IMAGE', url: lesson.imageUrl, title: 'Capa da Aula' })}
                                    isMain
                                />
                            )}
                            {/* Resources */}
                            {resources.map(res => (
                                <MaterialCard 
                                    key={res.id}
                                    title={res.title}
                                    type={res.type}
                                    onClick={() => handleItemClick({ type: res.type, url: res.url, title: res.title })}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Nested Modal for Image View */}
            {modalImage && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" onClick={() => setModalImage(null)}>
                    <div className="relative max-w-7xl max-h-[90vh]">
                        <button className="absolute -top-12 right-0 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setModalImage(null)}>
                            <X className="w-6 h-6" />
                        </button>
                        <img src={modalImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="Preview" onClick={e => e.stopPropagation()} />
                    </div>
                </div>
            )}

            {/* Nested Modal for Doc View */}
            {modalDocUrl && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" onClick={() => setModalDocUrl(null)}>
                    <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-white/5">
                            <h4 className="text-white font-bold px-2">{modalDocTitle}</h4>
                            <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white" onClick={() => setModalDocUrl(null)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <iframe src={modalDocUrl} className="flex-1 w-full bg-white border-0" title="Viewer" />
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

const MaterialCard: React.FC<{ title: string; type: LessonResourceType; onClick: () => void; isMain?: boolean }> = ({ title, type, onClick, isMain }) => {
    const Icon = {
        PDF: FileText,
        LINK: ExternalLink,
        AUDIO: Music,
        IMAGE: ImageIcon,
        FILE: FileText
    }[type] || FileText;

    const colors = {
        PDF: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        AUDIO: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        IMAGE: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
        LINK: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        FILE: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    }[type] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

    return (
        <div 
            onClick={onClick}
            className={`flex flex-col p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group shadow-lg ${isMain ? 'ring-1 ring-indigo-500/30' : ''}`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${colors.split(' ').slice(0, 2).join(' ')} border ${colors.split(' ')[2]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                    {title}
                </h4>
                <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${colors.split(' ').slice(0, 2).join(' ')} border ${colors.split(' ')[2]}`}>
                        {type === 'FILE' ? 'Documento' : type}
                    </span>
                    {isMain && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                            <Play className="w-2 h-2 fill-current" />
                            Principal
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LessonMaterialsModal;
