import React, { useState, useEffect } from 'react';

interface CreateLessonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        title: string;
        videoUrl?: string;
        content?: string;
        durationSeconds: number;
        position: number;
    }) => Promise<void>;
    isLoading?: boolean;
    nextPosition?: number;
}

const CreateLessonModal: React.FC<CreateLessonModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    nextPosition = 1
}) => {
    const [title, setTitle] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [content, setContent] = useState('');
    const [duration, setDuration] = useState(600); // Default 10 mins
    const [position, setPosition] = useState(nextPosition);

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setVideoUrl('');
            setContent('');
            setDuration(600);
            setPosition(nextPosition);
        }
    }, [isOpen, nextPosition]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) return;

        await onConfirm({
            title,
            videoUrl: videoUrl.trim() || undefined,
            content: content.trim() || undefined,
            durationSeconds: duration,
            position
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-[95%] md:max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto transform transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Criar Nova Aula</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Adicione conteúdo ao seu módulo</p>
                    </div>

                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título da Aula</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="Ex: Introdução ao React"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL do Vídeo (Opcional)</label>
                                <input
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="https://..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duração (Segundos)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Conteúdo / Texto (Opcional)</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-cyan-500 transition-colors resize-none"
                                    placeholder="Texto de apoio ou conteúdo da aula..."
                                    rows={4}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Posição</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={position}
                                    onChange={(e) => setPosition(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!title.trim() || isLoading}
                            className="flex-1 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20"
                        >
                            {isLoading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-check"></i>}
                            Criar Aula
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateLessonModal;
