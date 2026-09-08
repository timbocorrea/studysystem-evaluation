import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBuddyStore, type BuddyThreadScope, type BuddyThreadScopeMode, type ChatThread } from '../stores/useBuddyStore';
import { useBuddyClient } from '../hooks/useBuddyClient';
import { useAuth } from '../contexts/AuthContext';
import { useCourse } from '../contexts/CourseContext';
import { getRandomSuggestions, BuddySuggestion } from '../utils/buddySuggestions';
import MarkdownRenderer from './MarkdownRenderer';

interface GeminiBuddyProps {
  currentContext?: string;
  systemContext?: string;
  userName?: string;
  initialMessage?: string;
  onNavigate?: (courseId: string, lessonId: string) => void;
}

const GeminiBuddy: React.FC<GeminiBuddyProps> = ({
  currentContext = '',
  systemContext = 'Navegando no sistema',
  userName,
  initialMessage,
  onNavigate
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCourse, activeLesson } = useCourse();
  const userId = user?.id || 'guest';

  const buddyScopeMode: BuddyThreadScopeMode = activeLesson?.id ? 'lesson_scoped' : activeCourse?.id ? 'course_scoped' : 'global_student_scoped';
  const buddyContextKey = `${buddyScopeMode}:${activeCourse?.id ?? 'no-course'}:${activeLesson?.id ?? 'no-lesson'}`;

  const buddyThreadScope: BuddyThreadScope = {
    contextKey: buddyContextKey,
    buddyScopeMode,
    ...(activeCourse?.id ? { courseId: activeCourse.id } : {}),
    ...(activeLesson?.id ? { lessonId: activeLesson.id } : {})
  };

  const {
    threadsByUser,
    activeThreadIdByUser,
    welcomeShownByUser,
    isLoading,
    isOpen,
    setIsOpen,
    addMessage,
    setWelcomeShown,
    startNewBuddySession,
    closeBuddySession,
    switchThread,
    deleteThread
  } = useBuddyStore();

  const { sendMessage, history: messages } = useBuddyClient({
    userId,
    currentContext,
    systemContext,
    userName: user?.name,
    threadTitle: activeLesson ? `Aula: ${activeLesson.title}` : undefined,
    courseId: activeCourse?.id,
    lessonId: activeLesson?.id,
    buddyScopeMode
  });

  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<BuddySuggestion[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousBuddyContextKeyRef = useRef(buddyContextKey);

  const activeThreadId = activeThreadIdByUser[userId];

  const isThreadInCurrentBuddyContext = (thread: ChatThread) =>
    thread.scope?.contextKey === buddyContextKey;

  const historyThreads = [...(threadsByUser[userId] || [])]
    .filter(thread => thread.messages.length > 0 && isThreadInCurrentBuddyContext(thread))
    .sort((a, b) => b.createdAt - a.createdAt);

  const formatThreadDate = (createdAt: number) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(createdAt));

  const getThreadPreview = (thread: ChatThread) => {
    const lastMessage = [...thread.messages].reverse().find(message => message.text.trim() || message.image);

    if (!lastMessage) return 'Sem mensagens';
    if (lastMessage.text.trim()) return lastMessage.text.trim();
    return 'Imagem enviada';
  };

  const getThreadDisplayDate = (thread: ChatThread) => {
    const lastMessageDate = [...thread.messages].reverse().find(message => message.createdAt)?.createdAt;
    return formatThreadDate(lastMessageDate ?? thread.createdAt);
  };

  const formatMessageDate = (createdAt?: number) => {
    if (!createdAt) return null;
    return formatThreadDate(createdAt);
  };

  const getMessageCountLabel = (count: number) => `${count} ${count === 1 ? 'mensagem' : 'mensagens'}`;

  const openNewBuddySession = () => {
    if (user?.id) {
      const newTitle = activeLesson
        ? `Aula: ${activeLesson.title}`
        : activeCourse
          ? `Curso: ${activeCourse.title}`
          : undefined;

      startNewBuddySession(user.id, newTitle, buddyThreadScope);
    }

    setIsHistoryOpen(false);
    setIsOpen(true);
  };

  const closeBuddy = () => {
    if (user?.id) {
      closeBuddySession(user.id);
    }

    setIsHistoryOpen(false);
    setIsOpen(false);
  };

  useEffect(() => {
    if (previousBuddyContextKeyRef.current === buddyContextKey) return;

    previousBuddyContextKeyRef.current = buddyContextKey;

    if (user?.id) {
      closeBuddySession(user.id);
    }

    setIsHistoryOpen(false);
    setIsOpen(false);
    setPrompt('');
    setSelectedImage(null);
  }, [buddyContextKey, closeBuddySession, setIsOpen, user?.id]);

  const handleToggleBuddy = () => {
    if (isOpen) {
      closeBuddy();
      return;
    }

    openNewBuddySession();
  };

  const handleOpenThread = (threadId: string) => {
    const selectedThread = historyThreads.find(thread => thread.id === threadId);
    if (!selectedThread) return;

    if (user?.id) {
      switchThread(user.id, threadId);
    }

    setIsHistoryOpen(false);
    setIsOpen(true);
  };

  const handleDeleteThread = (event: React.MouseEvent, threadId: string) => {
    event.stopPropagation();

    if (!user?.id) return;
    if (!window.confirm('Deseja excluir esta conversa do histórico?')) return;

    deleteThread(user.id, threadId);
  };

  useEffect(() => {
    if (messages.length === 0) {
      setSuggestions(getRandomSuggestions(activeCourse?.title, activeLesson?.title, 3));
    }
  }, [messages.length, activeCourse?.title, activeLesson?.title, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const hasShownWelcome = welcomeShownByUser[userId];

    if (!hasShownWelcome && initialMessage && messages.length === 0) {
      const actionMatch = initialMessage.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
      let text = initialMessage;
      let action = undefined;

      if (actionMatch) {
        text = text.replace(actionMatch[0], '');
        action = {
          label: 'Continuar de onde parou 🚀',
          courseId: actionMatch[1],
          lessonId: actionMatch[2]
        };
      }

      addMessage(userId, { role: 'ai', text, action }, undefined, buddyThreadScope);
      setIsOpen(true);
      setWelcomeShown(userId, true);

      setTimeout(() => setIsOpen(false), 5000);
    }
  }, [initialMessage, messages.length, addMessage, setIsOpen, userId, welcomeShownByUser, setWelcomeShown, buddyThreadScope]);

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
      const file = items[i].getAsFile();

      if (file && items[i].type.indexOf('image') !== -1) {
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImage(reader.result as string);
        reader.readAsDataURL(file);
        e.preventDefault();
      }
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!prompt.trim() && !selectedImage) || isLoading) return;

    const text = prompt;
    const image = selectedImage;

    setPrompt('');
    setSelectedImage(null);

    await sendMessage(text, image);
  };

  const location = useLocation();
  const isLessonPage = location.pathname.includes('/lesson/');
  const isBuddyPage = location.pathname === '/buddy';

  if (isBuddyPage) return null;

  const mobileBottomClass = 'bottom-40';
  const chatBottomClass = isLessonPage ? 'bottom-40 md:bottom-6' : 'bottom-24 md:bottom-6';
  const chatMaxHeightClass = isLessonPage
    ? 'max-h-[calc(100vh-14rem)] md:max-h-[calc(100vh-6rem)]'
    : 'max-h-[calc(100vh-10rem)] md:max-h-[calc(100vh-6rem)]';

  return (
    <>
      <button
        onClick={handleToggleBuddy}
        aria-label="Abrir assistente IA"
        className={`fixed ${mobileBottomClass} md:bottom-6 right-4 md:right-6 z-[75] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${isOpen
          ? 'bg-red-500 rotate-90'
          : 'bg-indigo-600 md:bg-indigo-600/40 md:hover:bg-indigo-600 md:hover:shadow-indigo-600/40 backdrop-blur-sm'
          }`}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'} text-white text-2xl`}></i>
      </button>

      <div className={`fixed ${chatBottomClass} right-4 md:right-6 z-40 w-full max-w-[calc(100vw-2rem)] md:w-[480px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? `opacity-100 scale-100 translate-y-0 h-[550px] md:h-[680px] ${chatMaxHeightClass}` : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'
        }`}>
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white shadow-inner">
              <i className="fas fa-robot text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Study Buddy AI</h3>
              <p className="text-[10px] text-slate-400">Assistente Virtual Inteligente</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(prev => !prev)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isHistoryOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              title="Histórico"
              aria-label="Histórico"
            >
              <i className="fas fa-history text-xs"></i>
            </button>

            <button
              type="button"
              onClick={openNewBuddySession}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              title="Nova conversa"
              aria-label="Nova conversa"
            >
              <i className="fas fa-plus text-xs"></i>
            </button>

            <button
              type="button"
              onClick={() => { setIsHistoryOpen(false); setIsOpen(false); navigate('/buddy'); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              title="Expandir para tela cheia"
              aria-label="Expandir para tela cheia"
            >
              <i className="fas fa-expand text-xs"></i>
            </button>
          </div>
        </div>

        {isHistoryOpen && (
          <div className="bg-slate-900 border-b border-slate-700 p-3 shadow-inner">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-white">Histórico desta matéria</p>
                <p className="text-[10px] text-slate-500">Conversas salvas neste contexto</p>
              </div>

              <button
                type="button"
                onClick={openNewBuddySession}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-500 transition-all"
              >
                <i className="fas fa-plus text-[10px]"></i>
                Nova conversa
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
              {historyThreads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-3 py-4 text-center">
                  <p className="text-xs text-slate-400">Nenhuma conversa anterior nesta matéria</p>
                </div>
              ) : (
                historyThreads.map(thread => (
                  <div
                    role="button"
                    tabIndex={0}
                    key={thread.id}
                    onClick={() => handleOpenThread(thread.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleOpenThread(thread.id);
                      }
                    }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${thread.id === activeThreadId
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/60 hover:border-indigo-500/40 hover:bg-slate-800'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-100">{thread.title}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">{getThreadDisplayDate(thread)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(event) => handleDeleteThread(event, thread.id)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-300"
                        title="Excluir conversa"
                        aria-label="Excluir conversa"
                      >
                        <i className="fas fa-trash-alt text-[10px]"></i>
                      </button>
                    </div>

                    <p className="mt-1 truncate text-[11px] text-slate-400">{getThreadPreview(thread)}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{getMessageCountLabel(thread.messages.length)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/95 backdrop-blur-sm">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                <i className="fas fa-comment-dots text-2xl"></i>
              </div>

              <p className="text-sm text-slate-300 font-medium px-6 text-center">Como posso ajudar em seus estudos hoje?</p>
              <p className="mt-2 text-[10px] text-slate-500 px-6 text-center">O Buddy usa limite gratuito compartilhado da plataforma. A chave própria no Perfil é opcional para continuar após limite.</p>

              <div className="mt-6 w-full space-y-2 px-2">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(suggestion.text)}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 hover:border-indigo-500/30 transition-all text-left flex items-center gap-3 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                      <i className={`fas ${suggestion.icon} text-[10px]`}></i>
                    </div>
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors truncate">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => {
              const messageDate = formatMessageDate(m.createdAt);

              return (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                    }`}>
                    <MarkdownRenderer content={m.text} className="text-sm leading-relaxed" />

                    {m.action && (
                      <button
                        onClick={() => onNavigate ? onNavigate(m.action!.courseId, m.action!.lessonId) : navigate(`/course/${m.action!.courseId}/lesson/${m.action!.lessonId}`)}
                        className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-play-circle"></i>
                        {m.action.label}
                      </button>
                    )}

                    {messageDate && (
                      <div className={`mt-2 text-[10px] ${m.role === 'user' ? 'text-indigo-100/80' : 'text-slate-500'}`}>
                        {messageDate}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl px-4 py-3 flex gap-1.5 items-center border border-slate-700">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleAsk} className="p-3 bg-slate-800 border-t border-slate-700">
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-slate-600 object-cover" />

              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs border border-white shadow-sm hover:bg-red-600 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-2">
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
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${selectedImage
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              title="Enviar imagem"
              disabled={isLoading}
            >
              <i className="fas fa-paperclip"></i>
            </button>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={handlePaste}
              placeholder="Digite sua dúvida..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
            />

            <button
              type="submit"
              aria-label="Enviar"
              disabled={isLoading || (!prompt.trim() && !selectedImage)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-indigo-400"
            >
              <i className="fas fa-paper-plane text-xs"></i>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default GeminiBuddy;
