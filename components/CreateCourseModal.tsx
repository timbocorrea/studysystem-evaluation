import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabaseClient as supabase } from '../services/Dependencies';

interface CreateCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (title: string, description: string, imageUrl: string, color: string, colorLegend: string) => Promise<void>;
    isLoading?: boolean;
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#6366f1'); // Default indigo
    const [colorLegend, setColorLegend] = useState('');

    const COLORS = [
        { color: '#6366f1', label: 'Indigo' },
        { color: '#ef4444', label: 'Vermelho' },
        { color: '#f59e0b', label: 'Laranja' },
        { color: '#10b981', label: 'Verde' },
        { color: '#3b82f6', label: 'Azul' },
        { color: '#14b8a6', label: 'Roxo' },
        { color: '#ec4899', label: 'Rosa' },
        { color: '#14b8a6', label: 'Ciano' },
    ];

    React.useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setImageUrl('');
            setSelectedFile(null);
            setSelectedColor('#6366f1');
            setColorLegend('');
        }
    }, [isOpen]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.warning('Por favor, selecione uma imagem válida.');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.warning('A imagem deve ter no máximo 5MB.');
            return;
        }

        setSelectedFile(file);
        setIsUploading(true);

        try {
            
            const fileExt = file.name.split('.').pop();
            const fileName = `course-cover-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `course-covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('lesson-resources')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('lesson-resources')
                .getPublicUrl(filePath);

            setImageUrl(urlData.publicUrl);
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            toast.error(`Erro ao fazer upload: ${(error as any).message || 'Erro desconhecido'}`);
            setSelectedFile(null);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) return;
        await onConfirm(title, description, imageUrl, selectedColor, colorLegend);
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
                    className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Criar Novo Curso</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Preencha os detalhes abaixo</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título do Curso</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Ex: Fundamentos de React"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Imagem de Capa (Opcional)</label>

                            {/* Upload de arquivo */}
                            <div className="mb-3">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="course-cover-upload"
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="course-cover-upload"
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${selectedFile
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-400'
                                        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isUploading ? (
                                        <>
                                            <i className="fas fa-circle-notch animate-spin"></i>
                                            <span className="text-sm font-medium">Fazendo upload...</span>
                                        </>
                                    ) : selectedFile ? (
                                        <>
                                            <i className="fas fa-check-circle"></i>
                                            <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-cloud-upload-alt"></i>
                                            <span className="text-sm font-medium">Clique para fazer upload</span>
                                        </>
                                    )}
                                </label>
                            </div>

                            {/* Divisor OU */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                                <span className="text-xs text-slate-400 font-bold">OU</span>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                            </div>

                            {/* URL manual */}
                            <input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors text-sm"
                                placeholder="Ou cole uma URL: https://..."
                                disabled={isUploading}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição (Opcional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                                placeholder="Breve descrição do conteúdo..."
                                rows={3}
                            />
                        </div>

                        {/* Cor e Legenda */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cor de Identificação</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c.color}
                                            onClick={() => setSelectedColor(c.color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c.color ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c.color }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Legenda da Categoria</label>
                                <input
                                    value={colorLegend}
                                    onChange={(e) => setColorLegend(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors text-sm"
                                    placeholder="Ex: Exatas"
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
                            disabled={!title.trim() || isLoading || isUploading}
                            className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                        >
                            {isLoading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-check"></i>}
                            Criar Curso
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCourseModal;
