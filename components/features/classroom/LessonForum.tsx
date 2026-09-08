import React, { useState, useRef, useEffect } from 'react';
import { useForumMessages } from '@/hooks/useForumMessages';
import { User, ForumMessage } from '@/domain/entities';
import { Button } from '@/components/ui/Button';
import { Send, User as UserIcon, MessageSquare, ShieldCheck, Stars, Trash2, Edit2, Pin, PinOff, X, Check, Reply, Image as ImageIcon, Camera } from 'lucide-react';

interface LessonForumProps {
    lessonId: string;
    user: User;
}

const LessonForum: React.FC<LessonForumProps> = ({ lessonId, user }) => {
    const { messages, isLoading, sendMessage, deleteMessage, editMessage, togglePin, uploadImage } = useForumMessages(lessonId);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [replyingTo, setReplyingTo] = useState<ForumMessage | null>(null);
    
    // Image handling state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    const isModerator = user?.role === 'INSTRUCTOR' || user?.role === 'MASTER';

    const formatRelativeTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            
            if (isNaN(date.getTime())) return 'Há algum tempo';
            if (diffInSeconds < 10) return 'Agora';
            if (diffInSeconds < 60) return `${diffInSeconds}s atrás`;
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
            return `${Math.floor(diffInSeconds / 86400)}d atrás`;
        } catch (e) {
            return 'Há algum tempo';
        }
    };

    const formatDateTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (e) {
            return '';
        }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || isSending) return;

        setIsSending(true);
        const msgContent = newMessage.trim();
        const parentId = replyingTo?.id;
        
        let imageUrl = undefined;

        try {
            // Upload image if exists
            if (selectedFile) {
                imageUrl = await uploadImage(selectedFile);
            }

            setNewMessage('');
            setReplyingTo(null);
            handleRemoveFile();

            await sendMessage(msgContent, user.id, parentId, imageUrl);
        } catch (err) {
            console.error('Failed to send:', err);
            alert('Falha ao enviar mensagem ou imagem. Verifique se o arquivo é válido (máx 5MB).');
        } finally {
            setIsSending(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // VALIDAÇÃO 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB');
            return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getRoleBadge = (role: string | null | undefined) => {
        if (role === 'INSTRUCTOR') return <ShieldCheck size={12} className="text-amber-500" />;
        if (role === 'MASTER') return <Stars size={12} className="text-indigo-500" />;
        return null;
    };

    const sortedMessages = [...messages].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const handleStartEdit = (msg: ForumMessage) => {
        setEditingMsgId(msg.id);
        setEditingContent(msg.content);
    };

    const handleSaveEdit = async () => {
        if (!editingMsgId || !editingContent.trim()) return;
        await editMessage(editingMsgId, editingContent.trim());
        setEditingMsgId(null);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja deletar esta mensagem?')) {
            await deleteMessage(id);
        }
    };

    // Hierarchical grouping
    const topLevelMessages = sortedMessages.filter(m => !m.parent_id);
    const getReplies = (parentId: string) => sortedMessages.filter(m => m.parent_id === parentId);

    const renderMessage = (msg: ForumMessage, isReply = false) => (
        <div 
            key={msg.id} 
            className={`flex flex-col ${msg.user_id === user.id ? 'items-end' : 'items-start'} ${isReply ? 'ml-6 md:ml-8 border-l-2 border-slate-200 dark:border-slate-800 pl-4 my-2 scale-[0.98] opacity-90' : 'w-full mb-4'} animate-in fade-in slide-in-from-bottom-2 duration-300 relative group/msg`}
        >
            <div className={`flex items-center gap-1.5 mb-1.5 px-1 ${msg.user_id === user.id ? 'justify-end' : 'justify-between'} w-full`}>
                <div className="flex items-center gap-1.5">
                    {msg.user_id !== user.id && getRoleBadge(msg.profiles?.role)}
                    <span className={`text-[9px] font-black uppercase tracking-widest ${msg.user_id === user.id ? 'text-indigo-500' : 'text-slate-400'}`}>
                        {msg.user_id === user.id ? 'Você' : (msg.profiles?.name || 'Aluno')}
                    </span>
                    {msg.is_pinned && (
                        <div className="flex items-center gap-1 text-amber-500">
                            <Pin size={8} className="fill-current" />
                            <span className="text-[7px] font-black uppercase">Fixado</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-0.5 px-1.5 rounded-lg backdrop-blur-sm border border-slate-200 dark:border-white/5">
                    {!isReply && (
                        <button 
                            onClick={() => setReplyingTo(msg)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500 transition-colors"
                            title="Responder"
                        >
                            <Reply size={10} />
                        </button>
                    )}
                    
                    {isModerator && (
                        <>
                            <button 
                                onClick={() => togglePin(msg.id, !msg.is_pinned)}
                                className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${msg.is_pinned ? 'text-amber-500' : 'text-slate-400'}`}
                                title={msg.is_pinned ? "Desfixar" : "Fixar"}
                            >
                                {msg.is_pinned ? <PinOff size={10} /> : <Pin size={10} />}
                            </button>
                            <button 
                                onClick={() => handleStartEdit(msg)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500 transition-colors"
                                title="Editar"
                            >
                                <Edit2 size={10} />
                            </button>
                            <button 
                                onClick={() => handleDelete(msg.id)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                                title="Deletar"
                            >
                                <Trash2 size={10} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {editingMsgId === msg.id ? (
                <div className="w-full max-w-[85%] bg-white dark:bg-slate-800 rounded-2xl p-2 border border-indigo-500/30 flex items-center gap-2">
                    <input 
                        type="text"
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200"
                        autoFocus
                    />
                    <div className="flex items-center gap-1">
                        <button onClick={() => setEditingMsgId(null)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
                            <X size={14} />
                        </button>
                        <button onClick={handleSaveEdit} className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500 transition-colors">
                            <Check size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm relative ${
                    msg.user_id === user.id 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none'
                } ${msg.is_pinned ? 'ring-2 ring-amber-500/30' : ''}`}>
                    
                    {/* Image Attachment */}
                    {msg.image_url && (
                        <div className="mb-3 rounded-xl overflow-hidden shadow-md max-w-full">
                            <img 
                                src={msg.image_url} 
                                alt="Anexo do fórum" 
                                className="w-full h-auto max-h-64 object-cover hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => window.open(msg.image_url, '_blank')}
                            />
                        </div>
                    )}

                    <p className="leading-relaxed font-medium">{msg.content}</p>
                    <div className={`text-[8px] mt-2 font-black uppercase opacity-60 flex flex-wrap items-center gap-1.5 ${msg.user_id === user.id ? 'text-indigo-100 justify-end' : 'text-slate-400 justify-start'}`}>
                        <span title={formatDateTime(msg.created_at)}>{formatRelativeTime(msg.created_at)}</span>
                        <span className="opacity-40">•</span>
                        <span className="font-bold">{formatDateTime(msg.created_at)}</span>
                        {msg.is_edited && (
                            <>
                                <span className="opacity-40">•</span>
                                <span>Editado</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Render Replies */}
            {getReplies(msg.id).map(reply => (
                renderMessage(reply, true)
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner font-sans">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <MessageSquare size={16} className="text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Fórum da Aula</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Tempo Real</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Online</span>
                </div>
            </div>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
            >
                {isLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conectando ao Fórum...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 opacity-50 grayscale">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <MessageSquare size={32} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">
                            Ninguém comentou ainda.<br/>Sua dúvida pode ser a de outros!
                        </p>
                    </div>
                ) : (
                    topLevelMessages.map((msg) => renderMessage(msg))
                )}
            </div>

            {replyingTo && (
                <div className="mx-3 mb-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 border-l-4 border-indigo-500 rounded-lg flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="min-w-0">
                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Respondendo a {replyingTo.profiles?.name || 'Aluno'}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">{replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X size={14} />
                    </button>
                </div>
            )}

            <form 
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2"
            >
                {/* Image Preview Area */}
                {imagePreview && (
                    <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-indigo-500/50">
                            <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                            <button 
                                type="button" 
                                onClick={handleRemoveFile}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                                <X size={10} />
                            </button>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anexo de Imagem</p>
                            <p className="text-[8px] text-slate-500 truncate lowercase">{selectedFile?.name}</p>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input 
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all active:scale-95"
                        title="Anexar Imagem"
                    >
                        <ImageIcon size={20} />
                    </button>

                    <div className="flex-1 relative">
                        <input 
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="w-full h-11 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-4 pr-10 text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 placeholder:font-bold placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20">
                            <Stars size={14} className="text-indigo-500" />
                        </div>
                    </div>
                    <Button 
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedFile) || isSending}
                        size="icon"
                        className="h-11 w-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 shrink-0 transition-transform active:scale-95 disabled:grayscale"
                    >
                        {isSending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default LessonForum;
