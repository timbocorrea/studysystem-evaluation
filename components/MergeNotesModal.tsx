import React, { useState } from 'react';
interface MergeNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentNoteNumber: number;
    availableNotes: { id: string; number: number; text?: string }[];
    onMerge: (targetNoteId: string) => void;
}

const MergeNotesModal: React.FC<MergeNotesModalProps> = ({
    isOpen,
    onClose,
    currentNoteNumber,
    availableNotes,
    onMerge
}) => {
    const [selectedNoteId, setSelectedNoteId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = () => {
        if (!selectedNoteId) {
            setError('Por favor, selecione uma nota para vincular.');
            return;
        }
        onMerge(selectedNoteId);
        onClose();
        setSelectedNoteId('');
        setError(null);
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
                    />

                    {/* Modal Content */}
                    <div
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-transform duration-300"
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <i className="fas fa-link text-2xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Unificar Notas</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Vincule o raciocínio da Nota {currentNoteNumber}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    Selecione com qual nota você deseja unificar esta marcação:
                                </p>

                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                    {availableNotes.filter(n => n.number !== currentNoteNumber).length > 0 ? (
                                        availableNotes.filter(n => n.number !== currentNoteNumber).map((note) => (
                                            <button
                                                key={note.id}
                                                onClick={() => {
                                                    setSelectedNoteId(note.id);
                                                    setError(null);
                                                }}
                                                className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${selectedNoteId === note.id
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                    : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800'
                                                    }`}
                                            >
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${selectedNoteId === note.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                    {note.number}
                                                </span>
                                                <div className="flex-1 truncate">
                                                    <p className={`text-xs font-bold truncate ${selectedNoteId === note.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {note.text ? `"${note.text}"` : 'Sem texto destacado'}
                                                    </p>
                                                </div>
                                                {selectedNoteId === note.id && (
                                                    <i className="fas fa-check-circle text-indigo-600"></i>
                                                )}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center text-slate-400">
                                            <i className="fas fa-info-circle mb-2 opacity-50"></i>
                                            <p className="text-xs">Não há outras notas para unificar.</p>
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/40">
                                        <i className="fas fa-exclamation-circle font-black"></i>
                                        {error}
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedNoteId}
                                    className="flex-1 py-3 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    Unificar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MergeNotesModal;
