import React from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare } from 'lucide-react';
import LessonForum from './LessonForum';
import { User } from '@/domain/entities';

interface LessonForumModalProps {
    lessonId: string;
    lessonTitle: string;
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

const LessonForumModal: React.FC<LessonForumModalProps> = ({ lessonId, lessonTitle, user, isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                            <i className="fas fa-comments text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight truncate max-w-md">Fórum da Aula</h3>
                            <p className="text-slate-400 text-sm font-medium truncate max-w-md">{lessonTitle}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body - Forum Component */}
                <div className="flex-1 overflow-hidden">
                    <LessonForum lessonId={lessonId} user={user} />
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LessonForumModal;
