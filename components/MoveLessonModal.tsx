import React, { useState } from 'react';
import { LessonRecord, ModuleRecord } from '../domain/admin';

interface Props {
    lesson: LessonRecord;
    currentModuleTitle: string;
    availableModules: ModuleRecord[];
    busy: boolean;
    onConfirm: (targetModuleId: string) => void;
    onClose: () => void;
}

const MoveLessonModal: React.FC<Props> = ({ lesson, currentModuleTitle, availableModules, busy, onConfirm, onClose }) => {
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');

    const targetModules = availableModules.filter(m => m.id !== lesson.module_id);
    const selectedModule = targetModules.find(m => m.id === selectedModuleId);

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-[95%] md:max-w-lg max-h-[85vh] md:max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <i className="fas fa-arrow-right-arrow-left text-amber-500"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-slate-800 dark:text-white">Mover Aula</h4>
                            <p className="text-xs text-slate-400 font-medium">Transferir para outro módulo</p>
                        </div>
                    </div>
                    <button
                        className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        onClick={onClose}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Lesson being moved */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aula selecionada</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{lesson.title}</p>
                    </div>

                    {/* Origin */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-sign-out-alt text-red-500 text-xs"></i>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Módulo de origem</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{currentModuleTitle}</p>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                        <i className="fas fa-arrow-down text-slate-300 dark:text-slate-600"></i>
                    </div>

                    {/* Destination selector */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <i className="fas fa-sign-in-alt text-emerald-500 text-xs"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Módulo de destino</p>
                            {targetModules.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">Nenhum outro módulo disponível neste curso.</p>
                            ) : (
                                <select
                                    value={selectedModuleId}
                                    onChange={e => setSelectedModuleId(e.target.value)}
                                    className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm font-bold outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione o módulo destino...</option>
                                    {targetModules.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.title} {m.position != null ? `(Posição: ${m.position})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Preview of move */}
                    {selectedModule && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <i className="fas fa-info-circle text-sm"></i>
                                <p className="text-xs font-bold">Confirmar transferência</p>
                            </div>
                            <p className="text-sm text-amber-800 dark:text-amber-300 mt-2">
                                <strong>"{lesson.title}"</strong> será movida de <strong>"{currentModuleTitle}"</strong> para <strong>"{selectedModule.title}"</strong>.
                            </p>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-1">
                                Todos os dados, vídeos, blocos de conteúdo e materiais vinculados serão preservados.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={!selectedModuleId || busy}
                        onClick={() => onConfirm(selectedModuleId)}
                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all active:scale-[0.98] flex items-center gap-2"
                    >
                        {busy ? (
                            <>
                                <i className="fas fa-circle-notch animate-spin"></i>
                                Movendo...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-arrow-right-arrow-left"></i>
                                Mover Aula
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveLessonModal;
