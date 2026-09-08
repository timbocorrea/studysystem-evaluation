import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuddyStore } from '../stores/useBuddyStore';
import { useBuddyClient } from '../hooks/useBuddyClient';
import { useAuth } from '../contexts/AuthContext';
import { useCourse } from '../contexts/CourseContext';
import { getRandomSuggestions, BuddySuggestion } from '../utils/buddySuggestions';
// Import removed for framer-motion optimization
import MarkdownRenderer from './MarkdownRenderer';

const BuddyFullPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeCourse, activeLesson } = useCourse();
    const userId = user?.id || 'guest';

    const {
        isLoading,
        threadsByUser,
        activeThreadIdByUser,
        createNewThread,
        switchThread,
        deleteThread
    } = useBuddyStore();

    const threads = threadsByUser[userId] || [];
    const activeThreadId = activeThreadIdByUser[userId];
    const activeThread = threads.find(t => t.id === activeThreadId);

    const { sendMessage, history: messages } = useBuddyClient({
        userId,
        userName: user?.name,
        systemContext: 'O usuário está na página dedicada de chat em tela cheia, fora de uma aula específica.',
        threadTitle: undefined,
        buddyScopeMode: 'global_student_scoped'
    });

    const [prompt, setPrompt] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<BuddySuggestion[]>([]);
    const [isHistoryVisible, setIsHistoryVisible] = useState(() => {
        const saved = localStorage.getItem('buddy_history_visible');
        return saved === null ? true : saved === 'true';
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatAreaRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // BUDDY_ROUTE_RESET_SCROLL
    useEffect(() => {
        const previousScrollRestoration = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';

        const resetScroll = () => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;

            const main = document.querySelector('main');
            if (main) {
                main.scrollTop = 0;
            }

            if (chatAreaRef.current) {
                chatAreaRef.current.scrollTop = 0;
            }
        };

        resetScroll();
        requestAnimationFrame(resetScroll);

        return () => {
            window.history.scrollRestoration = previousScrollRestoration;
        };
    }, []);

    // Persist visibility
    useEffect(() => {
        localStorage.setItem('buddy_history_visible', String(isHistoryVisible));
    }, [isHistoryVisible]);

    // Generate suggestions once per session/thread change or when empty
    useEffect(() => {
        if (messages.length === 0) {
            setSuggestions(getRandomSuggestions(activeCourse?.title, activeLesson?.title));
        }
    }, [messages.length, activeCourse?.title, activeLesson?.title, activeThreadId]);

    // Filtered threads logic
    const filteredThreads = threads.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.messages.some(m => m.text.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Auto-scroll logic
    const scrollToBottom = () => {
        const chatArea = chatAreaRef.current;
        if (!chatArea) return;

        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [prompt]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setSelectedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(file);
                    e.preventDefault();
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!prompt.trim() && !selectedImage) || isLoading) return;

        const text = prompt;
        const image = selectedImage;

        setPrompt('');
        setSelectedImage(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        await sendMessage(text, image);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="flex h-full min-h-0 bg-slate-50 dark:bg-[#0a0e14] overflow-hidden">
            {/* Main Chat Column */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#0a0e14]/50 border-b border-slate-200 dark:border-slate-800 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <i className="fas fa-robot text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                {activeThread?.title || 'Novo Chat'}
                            </h1>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Study Buddy AI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isHistoryVisible ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title={isHistoryVisible ? "Ocultar Histórico" : "Mostrar Histórico"}
                        >
                            <i className="fas fa-columns text-lg"></i>
                        </button>
                        <button
                            onClick={() => createNewThread(userId)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/10"
                        >
                            <i className="fas fa-plus"></i>
                            Novo Chat
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold"
                            title="Voltar"
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div ref={chatAreaRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
                    <div className="max-w-4xl mx-auto px-4 pt-8 pb-36 md:py-8 space-y-8">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 opacity-60 animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-4 shadow-inner">
                                    <i className="fas fa-comment-dots text-3xl animate-pulse"></i>
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Como posso ajudar?</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                                        Pergunte sobre aulas, peça resumos ou tire dúvidas sobre as matérias. O Buddy usa limite gratuito compartilhado da plataforma; a chave própria no Perfil é opcional para continuar após limite.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl mt-8">
                                    {suggestions.map((suggestion, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setPrompt(suggestion.text); if (textareaRef.current) textareaRef.current.focus(); }}
                                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-left flex items-center gap-3 group"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-indigo-500 transition-colors flex-shrink-0">
                                                <i className={`fas ${suggestion.icon} text-xs`}></i>
                                            </div>
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{suggestion.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`flex max-w-[85%] md:max-w-[80%] gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm text-xs ${m.role === 'user'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gradient-to-br from-indigo-500 to-cyan-600 text-white'
                                            }`}>
                                            <i className={`fas ${m.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
                                        </div>
                                        <div className={`rounded-2xl p-4 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                                            ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tr-none border border-slate-200 dark:border-slate-700'
                                            : 'bg-indigo-50 dark:bg-indigo-900/20 text-slate-800 dark:text-slate-100 rounded-tl-none border border-indigo-100 dark:border-indigo-900/30'
                                            }`}>
                                            <MarkdownRenderer content={m.text} />
                                            {m.action && (
                                                <button
                                                    onClick={() => navigate(`/course/${m.action?.courseId}/lesson/${m.action?.lessonId}`)}
                                                    className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                                >
                                                    <i className="fas fa-rocket"></i>
                                                    {m.action.label}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white shadow-sm">
                                        <i className="fas fa-robot text-xs"></i>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="fixed left-0 right-0 bottom-20 z-40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#0a0e14]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:static md:p-4 md:bg-white md:dark:bg-[#0a0e14]/80">
                    <div className="max-w-4xl mx-auto">
                        {selectedImage && (
                            <div className="mb-4 relative inline-block animate-in fade-in slide-in-from-bottom-2">
                                <img src={selectedImage} alt="Preview" className="h-24 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                >
                                    <i className="fas fa-times text-[10px]"></i>
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all flex-shrink-0"
                                title="Enviar imagem"
                            >
                                <i className="fas fa-paperclip text-base"></i>
                            </button>

                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder="Envie uma dúvida..."
                                rows={1}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none py-2.5 max-h-28 md:max-h-48 text-sm"
                                disabled={isLoading}
                            />

                            <button
                                type="submit"
                                disabled={isLoading || (!prompt.trim() && !selectedImage)}
                                className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-50 shadow-md shadow-indigo-500/10 flex-shrink-0"
                            >
                                <i className="fas fa-arrow-up text-xs"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Right History Sidebar */}
            <>
                {isHistoryVisible && (
                    <aside
                        className="bg-white w-[320px] dark:bg-[#0a0e14] hidden xl:flex flex-col min-h-0 border-l border-slate-200 dark:border-slate-800 shrink-0 transition-all duration-300"
                    >
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 min-w-[320px]">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-history text-indigo-500"></i>
                                    Histórico de Chats
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsSearchOpen(!isSearchOpen);
                                        if (isSearchOpen) setSearchTerm('');
                                    }}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSearchOpen ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    title="Buscar Conversas"
                                >
                                    <i className="fas fa-search text-xs"></i>
                                </button>
                            </div>

                            <>
                                {isSearchOpen && (
                                    <div
                                        className="relative mt-3 transition-all duration-200"
                                    >
                                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Buscar nas conversas..."
                                            autoFocus
                                            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-8 pr-4 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                )}
                            </>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-w-[320px]">
                            {filteredThreads.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                        <i className="fas fa-search"></i>
                                    </div>
                                    <p className="text-xs text-slate-400">Nenhum chat encontrado</p>
                                </div>
                            ) : (
                                filteredThreads.map((thread) => (
                                    <div
                                        key={thread.id}
                                        onClick={() => switchThread(userId, thread.id)}
                                        className={`group p-3 rounded-2xl cursor-pointer transition-all border relative overflow-hidden ${activeThreadId === thread.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50'
                                            : 'bg-white dark:bg-slate-900/30 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeThreadId === thread.id
                                                ? 'bg-indigo-200/50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700'
                                                }`}>
                                                <i className="fas fa-comment-alt text-[10px]"></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-xs font-bold truncate ${activeThreadId === thread.id
                                                    ? 'text-indigo-900 dark:text-indigo-100'
                                                    : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                    {thread.title || 'Nova Conversa'}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(thread.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Excluir este chat permanentemente?')) {
                                                        deleteThread(userId, thread.id);
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"
                                            >
                                                <i className="fas fa-trash-alt text-[10px]"></i>
                                            </button>
                                        </div>
                                        {activeThreadId === thread.id && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 min-w-[320px]">
                            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                                Suas conversas são salvas localmente neste navegador. Evite compartilhar informações sensíveis.
                            </p>
                        </div>
                    </aside>
                )}
            </>
        </div>
    );
};

export default BuddyFullPage;
