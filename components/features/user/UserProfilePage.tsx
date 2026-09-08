import React, { useState, useRef } from 'react';
import { User } from '@/domain/entities';
import { AuthService } from '@/services/AuthService';
import { CourseService } from '@/services/CourseService';
import { courseService as sharedCourseService } from '@/services/Dependencies';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import StudentGoogleAiKeySettings from './StudentGoogleAiKeySettings';

interface UserProfilePageProps {
  user: User | null;
  authService: AuthService;
  onUpdate: () => Promise<void>;
  courseService?: CourseService;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ 
  user, 
  authService, 
  onUpdate,
  courseService = sharedCourseService
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-pulse text-slate-400">Carregando perfil...</div>
      </div>
    );
  }

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === user.name) {
      setIsEditingName(false);
      return;
    }

    setIsUpdatingName(true);
    try {
      await courseService.updateProfileInfo(user.id, newName);
      await onUpdate();
      toast.success('Nome atualizado com sucesso!');
      setIsEditingName(false);
    } catch (err) {
      toast.error('Erro ao atualizar nome.');
      console.error(err);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2MB Limit
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setIsUploadingAvatar(true);
    const loadingToast = toast.loading('Enviando foto...');
    try {
      await courseService.uploadAvatar(user.id, file);
      await onUpdate();
      toast.success('Foto de perfil atualizada!', { id: loadingToast });
    } catch (err) {
      toast.error('Erro ao enviar foto.', { id: loadingToast });
      console.error(err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authService.updatePassword(passwords.new);
      toast.success('Senha atualizada com sucesso!');
      setIsChangingPassword(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error('Erro ao atualizar senha. Verifique se sua sessão ainda é válida.');
      console.error(err);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 dark:bg-[#0a0e14] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-500 transition-colors mb-2 group"
            >
              <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
              Voltar
            </button>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Meu Perfil
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gerencie seus dados e preferências de conta
            </p>
          </div>
          
          <div className="flex flex-col items-end">
             <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-widest">
               {user.role}
             </div>
             <p className="text-[10px] text-slate-400 mt-1">ID: {user.id.substring(0, 8)}...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar & Quick Stats */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none text-center relative overflow-hidden group"
            >
              {/* Background Accent */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-500"></div>
              
              <div className="relative z-10">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 mx-auto group-hover:ring-indigo-500/30 transition-all duration-300">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className={`w-full h-full object-cover transition-all duration-500 ${isUploadingAvatar ? 'opacity-50 blur-sm' : 'group-hover:scale-110'}`}
                      />
                    ) : (
                      <i className="fas fa-user text-4xl text-slate-300 dark:text-slate-600"></i>
                    )}
                    
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                        <i className="fas fa-circle-notch fa-spin text-white"></i>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-4 right-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 border-4 border-white dark:border-slate-900 cursor-pointer"
                    title="Alterar Foto"
                  >
                    <i className="fas fa-camera text-xs"></i>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-4 truncate">
                  {user.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 truncate">
                  {user.email}
                </p>

                {user.role === 'STUDENT' && (
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">XP Total</p>
                      <p className="text-xl font-black text-indigo-500">{user.xp}</p>
                    </div>
                    <div className="text-center border-l border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível</p>
                      <p className="text-xl font-black text-emerald-500">{user.level}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Achievements Snippet (Students Only) */}
            {user.role === 'STUDENT' && (
              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 }}
                 className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group cursor-pointer"
                 onClick={() => navigate('/achievements')}
              >
                 <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                 <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-lg">Conquistas</h4>
                      <p className="text-indigo-100 text-xs opacity-80">{user.achievements.length} medalhas desbloqueadas</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                       <i className="fas fa-medal text-xl"></i>
                    </div>
                 </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Detailed Forms */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Personal Data Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <i className="fas fa-id-card"></i>
                  </div>
                  <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Dados Pessoais</h2>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <div className="flex items-center gap-3">
                    {isEditingName ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                          placeholder="Seu nome"
                        />
                        <button
                          onClick={handleUpdateName}
                          disabled={isUpdatingName}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                          {isUpdatingName ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                          Salvar
                        </button>
                        <button
                          onClick={() => { setIsEditingName(false); setNewName(user.name); }}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-white/10 group transition-all">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{user.name}</span>
                        <button 
                          onClick={() => setIsEditingName(true)}
                          className="text-indigo-500 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <i className="fas fa-pencil-alt"></i>
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                  <div className="flex items-center gap-3 py-3 px-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-slate-400 cursor-not-allowed">
                    <i className="fas fa-envelope text-xs opacity-50"></i>
                    <span className="text-sm font-medium">{user.email}</span>
                    <i className="fas fa-lock text-[10px] ml-auto opacity-30" title="Email não pode ser alterado"></i>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Security Section (Change Password) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Segurança</h2>
                </div>
              </div>

              <div className="p-8">
                {!isChangingPassword ? (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Senha de Acesso</h3>
                      <p className="text-sm text-slate-500 mt-1">Recomendamos trocar sua senha periodicamente para manter sua conta segura.</p>
                    </div>
                    <button 
                      onClick={() => setIsChangingPassword(true)}
                      className="whitespace-nowrap px-6 py-3 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      Alterar Senha
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md mx-auto">
                     <div className="flex items-center justify-between mb-2">
                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs">Nova Senha</h3>
                        <button 
                          type="button"
                          onClick={() => setIsChangingPassword(false)}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          Cancelar
                        </button>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="relative">
                          <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                          <input 
                            required
                            type="password"
                            placeholder="Nova senha (mín. 6 caracteres)"
                            value={passwords.new}
                            onChange={e => setPasswords({...passwords, new: e.target.value})}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                          />
                        </div>
                        <div className="relative">
                          <i className="fas fa-check-double absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                          <input 
                            required
                            type="password"
                            placeholder="Confirme a nova senha"
                            value={passwords.confirm}
                            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                          />
                        </div>
                        <button 
                          disabled={isUpdatingPassword}
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {isUpdatingPassword ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save text-sm"></i>}
                          Atualizar Senha Agora
                        </button>
                     </div>
                  </form>
                )}
              </div>
            </motion.div>

            <StudentGoogleAiKeySettings />

            {/* Roles & Permissions Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <i className="fas fa-key"></i>
                  </div>
                  <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Permissões de Acesso</h2>
                </div>
              </div>

              <div className="p-8">
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                       <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                          <i className="fas fa-user-tag text-lg"></i>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tipo de Conta</p>
                          <h4 className="font-black text-slate-800 dark:text-white uppercase">{user.role}</h4>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <PermissionBadge label="Acessar Aulas" active={true} />
                       <PermissionBadge label="Participar de Fóruns" active={true} />
                       <PermissionBadge label="Acesso Administrativo" active={user.role === 'MASTER' || user.role === 'INSTRUCTOR'} />
                       <PermissionBadge label="Gestão de Usuários" active={user.role === 'MASTER'} />
                       <PermissionBadge label="Editar Conteúdo" active={user.role === 'MASTER' || user.role === 'INSTRUCTOR'} />
                       <PermissionBadge label="Ver Auditoria" active={user.role === 'MASTER'} />
                    </div>
                 </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
};

const PermissionBadge: React.FC<{ label: string, active: boolean }> = ({ label, active }) => (
  <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${active ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400'}`}>
    <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
    <i className={`fas ${active ? 'fa-check-circle' : 'fa-times-circle'} text-sm`}></i>
  </div>
);

export default UserProfilePage;
