import { courseRepository, quizRepository, supabaseClient as supabase } from '../services/Dependencies';
import React, { useState } from 'react';
import { Quiz, QuizQuestion } from '../domain/quiz-entities';
import { toast } from 'sonner';
import { hapticActions } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { useQuizAutoSave } from '../hooks/useQuizAutoSave';

interface QuizModalProps {
    quiz: Quiz;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (answers: Record<string, string>) => void;
    isSubmitting?: boolean;
}

const QuizModal: React.FC<QuizModalProps> = ({ quiz, isOpen, onClose, onSubmit, isSubmitting = false }) => {
    const { user } = useAuth();
    const { answers, setAnswers, clearAutoSave, isRestored } = useQuizAutoSave<Record<string, string>>(
        quiz?.id,
        user?.id,
        {}
    );
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
    const [displayMode, setDisplayMode] = useState<'paged' | 'vertical'>('paged');

    // Função de embaralhamento (Fisher-Yates)
    const shuffleArray = <T,>(array: T[]): T[] => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);
    const [reportIssueType, setReportIssueType] = useState<string>('no_correct');
    const [reportComment, setReportComment] = useState('');
    const [isReporting, setIsReporting] = useState(false);

    // Show restoration toast
    React.useEffect(() => {
        if (isRestored && isOpen) {
            toast.info('Seu progresso anterior foi restaurado automaticamente.', {
                icon: <i className="fas fa-magic text-indigo-500"></i>,
                duration: 4000
            });
        }
    }, [isRestored, isOpen]);

    // Inicializar e embaralhar quando o modal abrir ou o quiz mudar
    React.useEffect(() => {
        if (isOpen && quiz) {
            // Embaralhar as opções de cada pergunta
            let questionsWithShuffledOptions = quiz.questions.map(q => {
                return new QuizQuestion(
                    q.id,
                    q.quizId,
                    q.questionText,
                    q.questionType,
                    q.position,
                    q.points,
                    shuffleArray(q.options),
                    q.difficulty,
                    q.imageUrl,
                    q.imageAlt,
                    q.courseId,
                    q.moduleId,
                    q.lessonId,
                    q.courseName,
                    q.moduleName,
                    q.lessonName,
                    q.answerKeyHidden
                );
            });

            questionsWithShuffledOptions = shuffleArray(questionsWithShuffledOptions);

            if (quiz.questionsCount && quiz.questionsCount > 0 && quiz.questionsCount < questionsWithShuffledOptions.length) {
                questionsWithShuffledOptions = questionsWithShuffledOptions.slice(0, quiz.questionsCount);
            }

            setShuffledQuestions(questionsWithShuffledOptions);
            setCurrentQuestionIndex(0); // Voltar para primeira
        }
    }, [quiz, isOpen]);

    const handleReportIssue = async () => {
        const qId = reportingQuestionId;
        if (!qId) return;

        setIsReporting(true);
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error('Usuário não autenticado');

            await quizRepository.createQuizReport({
                quizId: quiz.id,
                questionId: qId,
                userId: currentUser.id,
                issueType: reportIssueType as any,
                comment: reportComment,
                status: 'pending'
            });

            toast.success('Obrigado! Seu reporte foi enviado para análise.');
            setShowReportModal(false);
            setReportingQuestionId(null);
            setReportComment('');
            setReportIssueType('no_correct');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar reporte. Tente novamente.');
        } finally {
            setIsReporting(false);
        }
    };

    if (!isOpen) return null;

    const questionsToUse = shuffledQuestions.length > 0 ? shuffledQuestions : (quiz.questionsCount ? quiz.questions.slice(0, quiz.questionsCount) : quiz.questions);

    // Progress for the header
    const answeredCount = Object.keys(answers).length;
    const globalProgress = (answeredCount / questionsToUse.length) * 100;

    const handleSelectOption = (questionId: string, optionId: string) => {
        hapticActions.select();
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmit = () => {
        const allAnswered = questionsToUse.every(q => answers[q.id]);
        if (!allAnswered) {
            toast.warning('Por favor, responda todas as perguntas antes de enviar.');
            return;
        }
        clearAutoSave();
        onSubmit(answers);
    };

    const renderQuestion = (q: QuizQuestion, index: number, isVertical: boolean = false) => {
        return (
            <div key={q.id} className={`${isVertical ? 'py-8 border-b border-slate-100 dark:border-slate-800 last:border-0' : ''}`}>
                <div className={`${isVertical ? 'grid grid-cols-1 md:grid-cols-2 gap-8' : 'group'}`}>
                    {/* Left Side: Question Text & Meta */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                {isVertical && (
                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                                        {index + 1}
                                    </span>
                                )}
                                <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                    {q.points} {q.points === 1 ? 'ponto' : 'pontos'}
                                </span>
                            </div>

                            <button
                                onClick={() => { setReportingQuestionId(q.id); setShowReportModal(true); }}
                                className="text-slate-400 hover:text-amber-500 transition-colors p-2 flex items-center gap-2"
                                title="Reportar erro nesta questão"
                            >
                                <i className="fas fa-flag text-[10px]"></i>
                                <span className="text-[10px] font-bold">Reportar</span>
                            </button>
                        </div>

                        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                            {q.questionText}
                        </h3>

                        {q.imageUrl && (
                            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 aspect-video max-w-sm">
                                <img src={q.imageUrl} alt="Questão" className="w-full h-full object-contain" />
                            </div>
                        )}
                    </div>

                    {/* Right Side: Options */}
                    <div className="space-y-3">
                        {q.options.map(option => {
                            const isOptionSelected = answers[q.id] === option.id;

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleSelectOption(q.id, option.id)}
                                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all group/opt ${isOptionSelected
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-900'
                                        }`}
                                    disabled={isSubmitting}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isOptionSelected
                                            ? 'border-indigo-600 bg-indigo-600'
                                            : 'border-slate-200 dark:border-slate-700 group-hover/opt:border-indigo-400'
                                            }`}>
                                            {isOptionSelected && (
                                                <i className="fas fa-check text-white text-[10px]"></i>
                                            )}
                                        </div>
                                        <span className={`flex-1 text-[14px] font-medium whitespace-pre-wrap ${isOptionSelected
                                            ? 'text-indigo-900 dark:text-indigo-100'
                                            : 'text-slate-700 dark:text-slate-300'
                                            }`}>
                                            {option.optionText}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`bg-white dark:bg-slate-900 shadow-2xl w-full flex flex-col relative transition-all duration-500 rounded-t-3xl md:rounded-3xl ${displayMode === 'vertical' ? 'max-w-5xl h-[90vh]' : 'max-w-3xl max-h-[90vh]'
                }`}>

                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                </div>

                {/* Report Modal Overlay */}
                {showReportModal && (
                    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6">
                            <div className="flex items-center gap-4 text-amber-500">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                    <i className="fas fa-exclamation-triangle text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Reportar Erro</h3>
                                    <p className="text-sm text-slate-500">Ajude-nos a melhorar esta questão.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Problema</label>
                                    <select
                                        value={reportIssueType}
                                        onChange={e => setReportIssueType(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                                    >
                                        <option value="no_correct">Nenhuma resposta correta</option>
                                        <option value="multiple_correct">Mais de uma resposta correta</option>
                                        <option value="confusing">Enunciado confuso/incorreto</option>
                                        <option value="other">Outro erro</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalhes Adicionais</label>
                                    <textarea
                                        value={reportComment}
                                        onChange={e => setReportComment(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                        placeholder="O que exatamente está errado nesta pergunta?"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowReportModal(false); setReportingQuestionId(null); }}
                                    className="flex-1 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReportIssue}
                                    disabled={isReporting}
                                    className="flex-1 py-3 rounded-2xl font-bold bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all disabled:opacity-50"
                                >
                                    {isReporting ? (
                                        <i className="fas fa-circle-notch animate-spin"></i>
                                    ) : (
                                        'Enviar Reporte'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shrink-0">
                    <div className="flex items-center justify-between gap-6 mb-6">
                        <div className="min-w-0">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white truncate">{quiz.title}</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium truncate">{quiz.description}</p>
                        </div>

                        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0">
                            <button
                                onClick={() => setDisplayMode('paged')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all transition-all ${displayMode === 'paged'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                            >
                                <i className="fas fa-columns mr-2"></i>
                                Paginado
                            </button>
                            <button
                                onClick={() => setDisplayMode('vertical')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${displayMode === 'vertical'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                            >
                                <i className="fas fa-list mr-2"></i>
                                Vertical
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all hover:scale-110"
                            disabled={isSubmitting}
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            <span>Progresso do Simulado</span>
                            <span className="text-indigo-600 dark:text-indigo-300">{Math.round(globalProgress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-700 ease-out"
                                style={{ width: `${globalProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {displayMode === 'paged' ? (
                        <div className="max-w-2xl mx-auto px-8 py-12">
                            {renderQuestion(questionsToUse[currentQuestionIndex], currentQuestionIndex, false)}
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto px-8 divide-y divide-slate-100 dark:divide-slate-800/50">
                            {questionsToUse.map((q, idx) => renderQuestion(q, idx, true))}

                            {/* Submit Button Section for Vertical Mode */}
                            <div className="py-12 flex justify-center">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || answeredCount < questionsToUse.length}
                                    className="px-12 py-4 rounded-3xl font-black bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                >
                                    {isSubmitting ? (
                                        <i className="fas fa-circle-notch animate-spin mr-3"></i>
                                    ) : (
                                        <i className="fas fa-rocket mr-3"></i>
                                    )}
                                    Finalizar Simulado ({answeredCount}/{questionsToUse.length})
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer for Paged Mode Only */}
                {displayMode === 'paged' && (
                    <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0 || isSubmitting}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-20"
                        >
                            <i className="fas fa-chevron-left"></i>
                        </button>

                        <div className="flex gap-2 overflow-x-auto max-w-[300px] no-scrollbar py-2">
                            {questionsToUse.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`min-w-[24px] h-6 px-2 rounded-full transition-all flex items-center justify-center text-[10px] font-bold ${idx === currentQuestionIndex ? 'bg-indigo-600 text-white min-w-[32px]' :
                                        answers[q.id] ? 'bg-indigo-200 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>

                        {currentQuestionIndex === questionsToUse.length - 1 ? (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || answeredCount < questionsToUse.length}
                                className="px-8 py-3 rounded-2xl font-black bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Enviando...' : 'Finalizar'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(questionsToUse.length - 1, prev + 1))}
                                disabled={isSubmitting}
                                className="px-8 py-3 rounded-2xl font-black bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Próxima
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizModal;
