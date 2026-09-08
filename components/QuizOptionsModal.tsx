import React from 'react';
import { Quiz } from '../domain/quiz-entities';
import { Lesson } from '../domain/entities';

interface QuizOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    quiz: Quiz;
    lesson: Lesson;
    onStartEvaluative: () => void;
    onConfigurePractice: () => void;
}

const QuizOptionsModal: React.FC<QuizOptionsModalProps> = ({
    isOpen,
    onClose,
    quiz,
    lesson,
    onStartEvaluative,
    onConfigurePractice
}) => {
    if (!isOpen) return null;

    const quizAvailable = quiz.isManuallyReleased || lesson.isCompleted || lesson.calculateProgressPercentage() >= 90;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-4 duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className={`p-6 border-b flex items-center justify-between gap-4 ${quizAvailable
                    ? 'bg-emerald-500/5 dark:bg-emerald-800/30 border-emerald-500/10 dark:border-emerald-700/30'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 ${quizAvailable
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                            }`}>
                            <i className={`fas ${quizAvailable ? 'fa-graduation-cap' : 'fa-lock'} text-xl`}></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Quiz da Aula</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`flex h-2 w-2 rounded-full ${quizAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${quizAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {quizAvailable ? 'Disponível' : 'Bloqueado'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Quiz Info */}
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-3">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1">Título do Questionário</p>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block truncate">{quiz.title}</span>
                        </div>
                        <div className="text-right flex-shrink-0 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{quiz.questions.length || quiz.questionsCount || 0}</p>
                            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">Questões</p>
                        </div>
                    </div>

                    {/* Dual-Mode Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Practice Mode Button */}
                        <button
                            onClick={() => {
                                onConfigurePractice();
                                onClose();
                            }}
                            className="group relative rounded-2xl p-4 transition-all duration-300 bg-white dark:bg-blue-600/10 border-2 border-blue-500/20 dark:border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-600/20 shadow-sm hover:shadow-md h-full"
                            title="Modo Prática - Sem XP"
                        >
                            <div className="flex flex-col items-center gap-3 h-full justify-between">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-400/20 dark:border-blue-400/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                    <i className="fas fa-dumbbell text-xl text-blue-600 dark:text-blue-400"></i>
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-sm text-slate-800 dark:text-slate-100 mb-0.5">Prática</p>
                                    <p className="text-[9px] text-blue-600 dark:text-blue-300 font-black uppercase tracking-widest opacity-80">Sem XP</p>
                                </div>
                            </div>
                        </button>

                        {/* Evaluation Mode Button */}
                        <button
                            onClick={() => {
                                if (quizAvailable) {
                                    onStartEvaluative();
                                    onClose();
                                }
                            }}
                            disabled={!quizAvailable}
                            className={`group relative rounded-2xl p-4 transition-all duration-300 h-full ${quizAvailable
                                ? 'bg-white dark:bg-emerald-600/10 border-2 border-emerald-500/20 dark:border-emerald-500/40 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-600/20 shadow-sm hover:shadow-md cursor-pointer'
                                : 'bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700/50 cursor-not-allowed grayscale'
                                }`}
                            title={quizAvailable ? "Modo Avaliativo - Ganhe XP" : "Complete 90% da aula para desbloquear"}
                        >
                            <div className="flex flex-col items-center gap-3 h-full justify-between">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 ${quizAvailable
                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-400/20 dark:border-emerald-400/30 group-hover:scale-110'
                                    : 'bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600'
                                    }`}>
                                    <i className={`fas ${quizAvailable ? 'fa-trophy' : 'fa-lock'} text-xl ${quizAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}></i>
                                </div>
                                <div className="text-center">
                                    <p className={`font-black text-sm mb-0.5 ${quizAvailable ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>Avaliativo</p>
                                    <p className={`text-[9px] font-black uppercase tracking-widest opacity-80 ${quizAvailable ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                        {quizAvailable ? 'Ganhe XP' : 'Bloqueado'}
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {quizAvailable && (
                        <div className="flex items-center justify-center gap-2 px-1">
                            <i className="fas fa-circle-check text-emerald-500 text-[10px]"></i>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Nota mínima para aprovação: <span className="text-indigo-600 dark:text-indigo-400">{quiz.passingScore}%</span></p>
                        </div>
                    )}

                    {!quizAvailable && (
                        <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-slate-800/50 rounded-2xl border border-indigo-100/50 dark:border-slate-700">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                                <span>Progresso Requerido</span>
                                <span className="text-indigo-600 dark:text-indigo-300">
                                    {lesson.calculateProgressPercentage()}% / 90%
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner p-0.5">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700 shadow-sm"
                                    style={{ width: `${Math.min(lesson.calculateProgressPercentage(), 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-3 text-center font-medium italic">
                                {90 - lesson.calculateProgressPercentage() > 0
                                    ? `Assista mais ${(90 - lesson.calculateProgressPercentage()).toFixed(0)}% do conteúdo para liberar o teste.`
                                    : 'Recarregue a página para liberar o quiz!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizOptionsModal;
