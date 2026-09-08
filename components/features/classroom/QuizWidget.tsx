import React from 'react';
import { Lesson } from '@/domain/entities';
import { Quiz } from '@/domain/quiz-entities';
import QuizModal from '@/components/QuizModal';

interface QuizWidgetProps {
    lesson: Lesson;
    quiz: Quiz | null;
    showModal: boolean;
    onOpenModal: () => void;
    onCloseModal: () => void;
    onSubmit: (answers: Record<string, string>) => void;
    isSubmitting: boolean;
}

const QuizWidget: React.FC<QuizWidgetProps> = ({
    lesson,
    quiz,
    showModal,
    onOpenModal,
    onCloseModal,
    onSubmit,
    isSubmitting
}) => {
    if (!quiz) return null;

    const quizAvailable = quiz.isManuallyReleased || lesson.calculateProgressPercentage() >= 90;

    return (
        <>
            <div className={`rounded-2xl border overflow-hidden transition-all ${quizAvailable
                ? 'bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-green-900/40 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900 border-slate-700'
                }`}>
                <div className={`p-4 border-b flex items-center gap-3 ${quizAvailable
                    ? 'bg-emerald-800/30 border-emerald-700/30'
                    : 'bg-slate-800 border-slate-700'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${quizAvailable
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-500'
                        }`}>
                        <i className={`fas ${quizAvailable ? 'fa-graduation-cap' : 'fa-lock'} text-xl`}></i>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-100">Quiz da Aula</h3>
                        <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">
                            {quizAvailable ? 'Disponível' : 'Bloqueado'}
                        </p>
                    </div>
                </div>

                <div className="p-4">
                    <button
                        onClick={quizAvailable ? onOpenModal : undefined}
                        disabled={!quizAvailable}
                        className={`w-full rounded-xl p-4 transition-all ${quizAvailable
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 cursor-pointer shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-800 cursor-not-allowed opacity-60'
                            }`}
                        title={quizAvailable ? `Iniciar: ${quiz.title}` : `Complete 90% da aula para desbloquear`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${quizAvailable
                                ? 'border-white/20 bg-white/10'
                                : 'border-slate-700 bg-slate-700/50'
                                }`}>
                                <i className={`fas ${quizAvailable ? 'fa-play' : 'fa-lock'} text-xl ${quizAvailable ? 'text-white' : 'text-slate-500'}`}></i>
                            </div>
                            <div className="flex-1 text-left">
                                <h4 className={`font-bold text-sm mb-1 ${quizAvailable ? 'text-white' : 'text-slate-400'}`}>
                                    {quiz.title}
                                </h4>
                                <p className={`text-xs ${quizAvailable ? 'text-emerald-200' : 'text-slate-500'}`}>
                                    {quiz.questions.length} {quiz.questions.length === 1 ? 'Pergunta' : 'Perguntas'}
                                </p>
                            </div>
                            {quizAvailable && (
                                <i className="fas fa-arrow-right text-white text-xl"></i>
                            )}
                        </div>
                    </button>

                    {!quizAvailable && (
                        <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                <span className="font-bold uppercase tracking-wider">Progresso</span>
                                <span className="font-bold text-slate-300">
                                    {lesson.calculateProgressPercentage()}% / 90%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                                    style={{ width: `${Math.min(lesson.calculateProgressPercentage(), 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 text-center">
                                {90 - lesson.calculateProgressPercentage() > 0
                                    ? `Faltam ${(90 - lesson.calculateProgressPercentage()).toFixed(0)}% para desbloquear`
                                    : 'Quiz liberado!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <QuizModal
                    isOpen={showModal}
                    quiz={quiz}
                    onClose={onCloseModal}
                    onSubmit={onSubmit}
                    isSubmitting={isSubmitting}
                />
            )}
        </>
    );
};

export default QuizWidget;
