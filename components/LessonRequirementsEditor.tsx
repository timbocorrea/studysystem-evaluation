import React, { useState, useEffect } from 'react';
import { Lesson, LessonResource } from '../domain/entities';
import { LessonProgressRequirements } from '../domain/lesson-requirements';
import { toast } from 'sonner';

interface Props {
    lesson: Lesson;
    requirements: LessonProgressRequirements;
    onSave: (requirements: LessonProgressRequirements) => Promise<void>;
    onClose: () => void;
}

export const LessonRequirementsEditor: React.FC<Props> = ({
    lesson,
    requirements,
    onSave,
    onClose
}) => {
    const [videoPercent, setVideoPercent] = useState(requirements.videoRequiredPercent);
    const [textPercent, setTextPercent] = useState(requirements.textBlocksRequiredPercent);
    const [requiredPdfs, setRequiredPdfs] = useState<Set<string>>(
        new Set(requirements.requiredPdfs)
    );
    const [minEvalQuestions, setMinEvalQuestions] = useState(requirements.minEvaluationQuestions || 10);
    const [evalPassingScore, setEvalPassingScore] = useState(requirements.evaluationPassingScore || 70);
    const [isSaving, setIsSaving] = useState(false);

    // Safe access to resources
    const resources = lesson.resources || [];
    const pdfsAndFiles = resources.filter((r: LessonResource) => r.type === 'PDF' || r.type === 'FILE');
    const hasRequirements = videoPercent > 0 || textPercent > 0 || requiredPdfs.size > 0;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newRequirements = new LessonProgressRequirements(
                lesson.id,
                videoPercent,
                textPercent,
                Array.from(requiredPdfs),
                [], // audios - futuro
                [], // materials - futuro
                minEvalQuestions,
                evalPassingScore
            );
            await onSave(newRequirements);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar requisitos:', error);
            toast.error('Erro ao salvar requisitos. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i className="fas fa-sliders-h text-indigo-600"></i>
                                Requisitos para Quiz
                            </h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                Configure o que o aluno deve completar
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                        >
                            <i className="fas fa-times text-slate-400 text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Vídeo Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-900 dark:text-white">
                                📹 Vídeo
                            </label>
                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                {videoPercent}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={videoPercent}
                            onChange={(e) => setVideoPercent(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            style={{
                                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${videoPercent}%, #e2e8f0 ${videoPercent}%, #e2e8f0 100%)`
                            }}
                        />
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                            {videoPercent === 0
                                ? '⚠️ Vídeo não obrigatório'
                                : `Aluno deve assistir ${videoPercent}% do vídeo`}
                        </p>
                    </div>

                    {/* Blocos de Texto Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-900 dark:text-white">
                                📝 Blocos de Texto
                            </label>
                            <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                                {textPercent}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={textPercent}
                            onChange={(e) => setTextPercent(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                            style={{
                                background: `linear-gradient(to right, #0284c7 0%, #0284c7 ${textPercent}%, #e2e8f0 ${textPercent}%, #e2e8f0 100%)`
                            }}
                        />
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                            {textPercent === 0
                                ? '⚠️ Leitura não obrigatória'
                                : `Aluno deve ler ${textPercent}% dos blocos`}
                        </p>
                    </div>

                    {/* Materiais Obrigatórios */}
                    {pdfsAndFiles.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-900 dark:text-white block">
                                📄 Materiais Obrigatórios
                            </label>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {pdfsAndFiles.map((resource: LessonResource) => (
                                    <label
                                        key={resource.id}
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={requiredPdfs.has(resource.id)}
                                            onChange={(e) => {
                                                const newSet = new Set(requiredPdfs);
                                                if (e.target.checked) {
                                                    newSet.add(resource.id);
                                                } else {
                                                    newSet.delete(resource.id);
                                                }
                                                setRequiredPdfs(newSet);
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                                {resource.title}
                                            </p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                {resource.type}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400">
                                {requiredPdfs.size === 0
                                    ? '⚠️ Nenhum material obrigatório'
                                    : `${requiredPdfs.size} material(is) obrigatório(s)`}
                            </p>
                        </div>
                    )}

                    {/* Configurações de Avaliação (Quiz para XP) */}
                    <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-trophy text-emerald-600 dark:text-emerald-400"></i>
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                                Configuração do Quiz Avaliativo (XP)
                            </h3>
                        </div>

                        {/* Minimum Questions */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>📊 Questões Mínimas para Ganhar XP</span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{minEvalQuestions}</span>
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={minEvalQuestions}
                                onChange={(e) => setMinEvalQuestions(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                            <p className="text-[10px] text-slate-600 dark:text-slate-400">
                                O aluno deve responder pelo menos {minEvalQuestions} questões no modo avaliativo para ganhar XP
                            </p>
                        </div>

                        {/* Passing Score */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>✅ Nota Mínima para Aprovação</span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{evalPassingScore}%</span>
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="100"
                                step="5"
                                value={evalPassingScore}
                                onChange={(e) => setEvalPassingScore(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                            <p className="text-[10px] text-slate-600 dark:text-slate-400">
                                O aluno precisa acertar pelo menos {evalPassingScore}% para ser aprovado e ganhar XP
                            </p>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-900/20 dark:to-cyan-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                            <i className="fas fa-eye text-[10px]"></i>
                            Preview para o Aluno
                        </h4>
                        {hasRequirements ? (
                            <ul className="space-y-1">
                                {videoPercent > 0 && (
                                    <li className="text-[10px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                        <span>Assistir <strong>{videoPercent}%</strong> do vídeo</span>
                                    </li>
                                )}
                                {textPercent > 0 && (
                                    <li className="text-[10px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                        <span>Ler <strong>{textPercent}%</strong> dos blocos</span>
                                    </li>
                                )}
                                {requiredPdfs.size > 0 && (
                                    <li className="text-[10px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                        <span>Visualizar <strong>{requiredPdfs.size}</strong> material(is)</span>
                                    </li>
                                )}
                                {/* Quiz Evaluation Settings Always Shown */}
                                <li className="text-[10px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5 mt-2 pt-2 border-t border-emerald-300 dark:border-emerald-700">
                                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">🏆</span>
                                    <span>Quiz avaliativo: <strong>{minEvalQuestions}</strong> questões mínimas, nota mínima <strong>{evalPassingScore}%</strong></span>
                                </li>
                            </ul>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                    ⚠️ Sem requisitos. Quiz sempre disponível.
                                </p>
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 pt-2 border-t border-amber-300 dark:border-amber-700">
                                    🏆 Quiz avaliativo: <strong>{minEvalQuestions}</strong> questões mínimas, nota mínima <strong>{evalPassingScore}%</strong>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg font-semibold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <i className="fas fa-circle-notch fa-spin text-xs"></i>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save text-xs"></i>
                                Salvar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
