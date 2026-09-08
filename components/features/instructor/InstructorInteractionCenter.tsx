
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  MessageSquare, 
  CheckCircle, 
  Terminal,
  Search,
  Users,
  Send,
  Check,
  Image as ImageIcon,
  X,
  MessageCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Stars
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { adminService, notificationRepository, lessonForumRepository, supabaseClient } from '../../../services/Dependencies';
import { ProfileRecord } from '../../../domain/admin';
import { toast } from 'sonner';
import { useTeacherGrading } from '../../../hooks/useTeacherGrading';

const InstructorInteractionCenter: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'forum' | 'corrections'>('notifications');

  // ==========================================
  // NOTIFICATION TAB STATE
  // ==========================================
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [students, setStudents] = useState<ProfileRecord[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // ==========================================
  // FORUM TAB STATE
  // ==========================================
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);
  const [isLoadingForum, setIsLoadingForum] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState<string | null>(null);
  
  // Image handling for forum
  const [selectedForumFile, setSelectedForumFile] = useState<File | null>(null);
  const [forumImagePreview, setForumImagePreview] = useState<string | null>(null);
  const forumFileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // CORRECTIONS TAB STATE
  // ==========================================
  const { pendingAnswers, isLoading: isLoadingCorrections, saveFeedback, refresh: refreshCorrections } = useTeacherGrading(user?.id);
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [feedbackValues, setFeedbackValues] = useState<Record<string, string>>({});
  const [isSavingCorrection, setIsSavingCorrection] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      if (activeTab === 'notifications') loadStudents();
      if (activeTab === 'forum') loadPendingMessages();
      if (activeTab === 'corrections') refreshCorrections();
    }
  }, [user, activeTab, refreshCorrections]);

  // ==========================================
  // NOTIFICATION METHODS
  // ==========================================
  const loadStudents = async () => {
    try {
      setIsLoadingStudents(true);
      const studentList = await adminService.listEnrolledStudentsByInstructor(user!.id);
      setStudents(studentList);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      toast.error("Erro ao carregar lista de alunos");
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.warning("Preencha o título e a mensagem");
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.warning("Selecione ao menos um aluno");
      return;
    }

    try {
      setIsSending(true);
      const success = await notificationRepository.sendNotificationToUsers(
        selectedUserIds,
        title,
        message,
        user!.id,
        'system'
      );

      if (success) {
        toast.success(`Notificação enviada para ${selectedUserIds.length} alunos!`);
        setTitle('');
        setMessage('');
        setSelectedUserIds([]);
      } else {
        toast.error("Erro ao enviar notificações");
      }
    } catch (error) {
      console.error("Erro no envio:", error);
      toast.error("Ocorreu um erro no servidor");
    } finally {
      setIsSending(false);
    }
  };

  // ==========================================
  // FORUM METHODS
  // ==========================================
  const loadPendingMessages = async () => {
    try {
      setIsLoadingForum(true);
      const data = await lessonForumRepository.getPendingMessages(user!.id);
      setPendingMessages(data);
    } catch (error) {
      console.error("Erro ao carregar fórum:", error);
      toast.error("Erro ao carregar dúvidas do fórum");
    } finally {
      setIsLoadingForum(false);
    }
  };

  const uploadForumImage = async (file: File, lessonId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `forum/${lessonId}/${user!.id}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('lesson-forum-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage
      .from('lesson-forum-attachments')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSendReply = async (messageId: string, lessonId: string) => {
    const content = replyText[messageId]?.trim();
    if (!content && !selectedForumFile) return;

    try {
      setIsSendingReply(messageId);
      
      let imageUrl = undefined;
      if (selectedForumFile) {
        imageUrl = await uploadForumImage(selectedForumFile, lessonId);
      }

      const result = await lessonForumRepository.createMessage(
        lessonId,
        user!.id,
        content || "Resposta do Professor",
        messageId,
        imageUrl
      );

      if (result) {
        toast.success("Resposta enviada com sucesso!");
        // Remover a mensagem da lista de pendentes
        setPendingMessages(prev => prev.filter(m => m.id !== messageId));
        setReplyText(prev => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
        setReplyingToId(null);
        handleRemoveForumFile();
      }
    } catch (err) {
      console.error("Erro ao responder:", err);
      toast.error("Erro ao enviar resposta");
    } finally {
      setIsSendingReply(null);
    }
  };

  // ==========================================
  // CORRECTIONS METHODS
  // ==========================================
  const handleSaveCorrection = async (userId: string, lessonId: string, blockId: string) => {
    const id = `${userId}_${lessonId}_${blockId}`;
    const grade = gradeValues[id];
    const feedback = feedbackValues[id];

    if (!grade || !feedback) {
        toast.warning("Por favor, preencha a nota e o feedback.");
        return;
    }

    try {
        setIsSavingCorrection(id);
        const success = await saveFeedback(userId, lessonId, blockId, grade, feedback);
        if (success) {
            toast.success("Avaliação salva com sucesso!");
            // Limpar estados locais
            setGradeValues(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            setFeedbackValues(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } else {
            toast.error("Erro ao salvar avaliação.");
        }
    } catch (err) {
        toast.error("Erro no servidor ao salvar avaliação");
    } finally {
        setIsSavingCorrection(null);
    }
  };

  const handleForumFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    setSelectedForumFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setForumImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveForumFile = () => {
    setSelectedForumFile(null);
    setForumImagePreview(null);
    if (forumFileInputRef.current) forumFileInputRef.current.value = '';
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (isNaN(date.getTime())) return 'Há algum tempo';
        if (diffInSeconds < 60) return 'Agora';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
        return `${Math.floor(diffInSeconds / 86400)}d atrás`;
    } catch (e) { return 'Há algum tempo'; }
  };

  const getRoleBadge = (role: string | null | undefined) => {
    if (role === 'INSTRUCTOR') return <ShieldCheck size={12} className="text-amber-500" />;
    if (role === 'MASTER') return <Stars size={12} className="text-indigo-500" />;
    return null;
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2 text-glow-indigo">
            Instrutor / <span className="text-slate-800 dark:text-white">Central de Interação</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Central do Professor</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Gerencie avisos, fóruns e acompanhe correções em um só lugar.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1C1E23] border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
        {/* Modern Tab Header */}
        <div className="flex items-center p-2 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20">
          <button
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'notifications' 
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-white/5"
            )}
          >
            <Bell size={14} />
            <span className="hidden sm:inline">Avisos e Notificações</span>
            <span className="sm:hidden">Avisos</span>
          </button>
          <button
            onClick={() => setActiveTab('forum')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'forum' 
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-white/5"
            )}
          >
            <MessageSquare size={14} />
            <span className="hidden sm:inline">Fórum Geral</span>
            <span className="sm:hidden">Fórum</span>
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'corrections' 
                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-white/5"
            )}
          >
            <CheckCircle size={14} />
            <span className="hidden sm:inline">Correções Pendentes</span>
            <span className="sm:hidden">Correções</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-8">
          {/* ==========================================
              TAB: NOTIFICATIONS
              ========================================== */}
          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Form Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                    <Send size={20} className="text-indigo-500" />
                    Nova Notificação
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assunto / Título</label>
                      <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Aula Extra Confirmada"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Conteúdo da Mensagem</label>
                      <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escreva sua mensagem aqui..."
                        className="w-full min-h-[200px] px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 dark:text-white resize-none"
                      />
                    </div>

                    <button 
                      onClick={handleSendNotification}
                      disabled={isSending || selectedUserIds.length === 0}
                      className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Enviar para {selectedUserIds.length} Alunos
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Selection Section */}
              <div className="space-y-4 flex flex-col h-[600px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-indigo-500" />
                    Destinatários
                  </h3>
                  <button 
                    onClick={() => {
                        if (selectedUserIds.length === students.length) setSelectedUserIds([]);
                        else setSelectedUserIds(students.map(s => s.id));
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {selectedUserIds.length === students.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por nome ou e-mail..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/5">
                  {isLoadingStudents ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                      <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs font-bold uppercase tracking-widest">Carregando seus alunos...</p>
                    </div>
                  ) : students.length > 0 ? (
                    students.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())).map(student => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedUserIds(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                          selectedUserIds.includes(student.id)
                            ? "bg-indigo-500/5 border-indigo-500 dark:border-indigo-500/50"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 hover:border-indigo-400/50"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm",
                          selectedUserIds.includes(student.id)
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "border-slate-200 dark:border-white/10"
                        )}>
                          {selectedUserIds.includes(student.id) && <Check size={14} strokeWidth={4} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "text-sm font-black truncate",
                            selectedUserIds.includes(student.id) ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"
                          )}>
                            {student.name || 'Sem Nome'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate font-medium uppercase tracking-tighter">
                            {student.email}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                      <Users size={48} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhum aluno encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB: FORUM (PENDING DOUBTS)
              ========================================== */}
          {activeTab === 'forum' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <MessageCircle size={20} className="text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Dúvidas Pendentes</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Responda seus alunos e ajude-os a evoluir</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full uppercase tracking-widest">
                        {pendingMessages.length} Pendentes
                    </span>
                </div>
              </div>

              {isLoadingForum ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest">Buscando fóruns...</p>
                </div>
              ) : pendingMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center opacity-50 grayscale">
                        <CheckCircle size={40} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase">Tudo em dia!</p>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60">Nenhuma dúvida pendente no momento.</p>
                    </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {pendingMessages.map((msg) => (
                        <div key={msg.id} className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                            {/* Card Header: Context */}
                            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                                        <BookOpen size={14} className="text-indigo-500" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">{msg.course_title}</p>
                                        <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">{msg.lesson_title}</p>
                                    </div>
                                </div>
                                <div className="text-[8px] font-black text-slate-400 uppercase shrink-0">
                                    {formatRelativeTime(msg.created_at)}
                                </div>
                            </div>

                            {/* Message Body */}
                            <div className="p-6 space-y-4 flex-1">
                                <div className="flex items-center gap-2">
                                    {getRoleBadge(msg.user_role)}
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{msg.user_name} perguntou:</span>
                                </div>
                                
                                {msg.image_url && (
                                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 max-h-48">
                                        <img src={msg.image_url} alt="Dúvida" className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-l-4 border-indigo-500">
                                    <p className="text-sm text-slate-700 dark:text-slate-200 italic font-medium leading-relaxed">
                                        "{msg.content}"
                                    </p>
                                </div>
                            </div>

                            {/* Card Footer: Quick Reply */}
                            <div className="px-4 pb-4">
                                {replyingToId === msg.id ? (
                                    <div className="space-y-3 animate-in slide-in-from-bottom-2">
                                        {/* Image Preview for reply */}
                                        {forumImagePreview && replyingToId === msg.id && (
                                            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-500">
                                                <img src={forumImagePreview} className="w-full h-full object-cover" />
                                                <button onClick={handleRemoveForumFile} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <input 
                                                type="file" 
                                                ref={forumFileInputRef} 
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={handleForumFileSelect} 
                                            />
                                            <button 
                                                onClick={() => forumFileInputRef.current?.click()}
                                                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-2xl transition-all"
                                            >
                                                <ImageIcon size={18} />
                                            </button>
                                            <div className="flex-1 flex gap-2">
                                                <textarea 
                                                    value={replyText[msg.id] || ''}
                                                    onChange={(e) => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                                    placeholder="Sua resposta..."
                                                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-2 text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none h-[42px]"
                                                />
                                                <button 
                                                    onClick={() => handleSendReply(msg.id, msg.lesson_id)}
                                                    disabled={isSendingReply === msg.id}
                                                    className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-600/20 transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
                                                >
                                                    {isSendingReply === msg.id ? (
                                                        <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <><Send size={12} /> Enviar</>
                                                    )}
                                                </button>
                                                <button onClick={() => setReplyingToId(null)} className="p-3 text-slate-400 hover:text-red-500">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setReplyingToId(msg.id)}
                                        className="w-full py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-500/10 hover:text-indigo-500 border border-slate-200 dark:border-white/5 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest text-slate-500 flex items-center justify-center gap-2"
                                    >
                                        Responder Agora <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              TAB: CORRECTIONS (PLACEHOLDER)
              ========================================== */}
          {activeTab === 'corrections' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-cyan-50/50 dark:bg-cyan-500/5 p-4 rounded-2xl border border-cyan-100 dark:border-cyan-500/10">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-cyan-500/10 rounded-xl">
                     <CheckCircle size={20} className="text-cyan-500" />
                   </div>
                   <div>
                     <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Fila de Correção</h4>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Avalie o desempenho dos seus alunos enviando notas e feedbacks</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-cyan-500 text-white px-3 py-1 rounded-full uppercase tracking-widest">
                        {pendingAnswers.length} Submissões
                    </span>
                 </div>
               </div>

               {isLoadingCorrections ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                    <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest">Buscando atividades...</p>
                 </div>
               ) : pendingAnswers.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center opacity-50 grayscale">
                        <Check size={40} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase">Parabéns!</p>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60">Você está em dia com todas as suas correções.</p>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-6">
                    {pendingAnswers.map((ans) => {
                        const uniqueId = `${ans.user_id}_${ans.lesson_id}_${ans.block_id}`;
                        return (
                            <div key={uniqueId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
                                {/* Context Header */}
                                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                                            <BookOpen size={14} className="text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{ans.course_title}</p>
                                            <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{ans.lesson_title}</p>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/5">
                                        <Users size={12} className="text-indigo-500" />
                                        {ans.student_name}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x-0 lg:divide-x divide-slate-100 dark:divide-white/5">
                                    {/* Student Answer */}
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                                <Terminal size={12} /> Resposta do Aluno
                                            </span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase">
                                                Enviada {formatRelativeTime(ans.updated_at)}
                                            </span>
                                        </div>
                                        <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border-l-4 border-indigo-500 h-full min-h-[120px]">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed whitespace-pre-wrap">
                                                "{ans.answer_text}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Grading Form */}
                                    <div className="p-6 bg-slate-50/20 dark:bg-slate-800/10 space-y-5">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                                            <CheckCircle size={12} /> Avaliação
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nota (Escore ou Conceito)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ex: 9.5, A+, Ótimo"
                                                    value={gradeValues[uniqueId] || ''}
                                                    onChange={(e) => setGradeValues(prev => ({ ...prev, [uniqueId]: e.target.value }))}
                                                    className="w-full px-4 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-cyan-500 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Feedback Detalhado</label>
                                                <textarea 
                                                    placeholder="Dê dicas de melhoria ou elogie pontos específicos..."
                                                    value={feedbackValues[uniqueId] || ''}
                                                    onChange={(e) => setFeedbackValues(prev => ({ ...prev, [uniqueId]: e.target.value }))}
                                                    className="w-full px-4 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-cyan-500 outline-none min-h-[100px] resize-none"
                                                />
                                            </div>

                                            <button 
                                                onClick={() => handleSaveCorrection(ans.user_id, ans.lesson_id, ans.block_id)}
                                                disabled={isSavingCorrection === uniqueId}
                                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isSavingCorrection === uniqueId ? (
                                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <><Check size={14} /> Salvar Avaliação</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorInteractionCenter;
