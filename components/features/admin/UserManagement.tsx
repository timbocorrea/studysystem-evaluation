import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminService } from '@/services/AdminService';

import { ProfileRecord } from '@/domain/admin';
import ApproveUserModal from '@/components/ApproveUserModal';
import RejectUserModal from '@/components/RejectUserModal';
import UserDetailsModal from '@/components/features/admin/UserDetailsModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { toast } from 'sonner';
import UserCourseAccessModal from '@/components/UserCourseAccessModal';
import AdminResetPasswordModal from '@/components/AdminResetPasswordModal';
import { supabaseClient as supabase } from '@/services/Dependencies';

type Props = {
  adminService: AdminService;
  currentAdminId?: string;
};

const UserManagement: React.FC<Props> = ({ adminService, currentAdminId = '' }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string>('');
  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER';
  } | null>(null);
  const [managingAccessUser, setManagingAccessUser] = useState<ProfileRecord | null>(null);
  const [resettingUser, setResettingUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Approval system state
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvingUser, setApprovingUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [rejectingUser, setRejectingUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [viewingUser, setViewingUser] = useState<ProfileRecord | null>(null);
  const [adminId, setAdminId] = useState<string>(currentAdminId);

  // Bulk selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const loadUsers = async (): Promise<ProfileRecord[]> => {
    setError('');
    let list: ProfileRecord[];

    if (activeTab === 'pending') {
      list = await adminService.fetchPendingUsers();
    } else if (activeTab === 'approved') {
      list = await adminService.fetchApprovedUsers();
    } else if (activeTab === 'rejected') {
      list = await adminService.fetchRejectedUsers();
    } else {
      list = await adminService.listProfiles();
    }

    setUsers(list);
    return list;
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const list = await loadUsers();

        if (!adminId) {
          const instructor = list.find(p => p.role === 'INSTRUCTOR' || p.role === 'MASTER');
          if (instructor) setAdminId(instructor.id);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [adminService, activeTab]);

  const stats = useMemo(() => {
    const masters = users.filter(u => u.role === 'MASTER').length;
    const instructors = users.filter(u => u.role === 'INSTRUCTOR').length;
    const students = users.filter(u => u.role === 'STUDENT').length;
    return { masters, instructors, students, total: users.length };
  }, [users]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q));
  }, [users, filter]);

  const updateRole = async (profileId: string, role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER') => {
    try {
      setBusyId(profileId);
      await adminService.updateProfileRole(profileId, role);
      await loadUsers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId('');
    }
  };

  const handleEditClick = async (user: ProfileRecord) => {
    setEditingUser({
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
    });

  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsSaving(true);
      const patch: { role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER' } = {
        role: editingUser.role
      };


      await adminService.updateProfile(editingUser.id, patch);
      setEditingUser(null);
      await loadUsers();
      toast.success('Usuário salvo com sucesso!');
    } catch (e) {
      toast.error(`Erro ao salvar: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveClick = (user: ProfileRecord) => {
    setApprovingUser({
      id: user.id,
      name: user.name || '',
      email: user.email
    });
  };

  const handleRejectClick = (user: ProfileRecord) => {
    setRejectingUser({
      id: user.id,
      name: user.name || '',
      email: user.email
    });
  };

  const handleAccessClick = (user: ProfileRecord) => {
    setManagingAccessUser(user);
  };

  const handleResetPasswordClick = (user: ProfileRecord) => {
    setResettingUser({
      id: user.id,
      name: user.name || '',
      email: user.email
    });
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedUserIds([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filtered.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filtered.map(u => u.id));
    }
  };

  const handleBulkBlock = async () => {
    setBulkActionLoading(true);
    try {
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) throw new Error('Usuário não autenticado');

      for (const userId of selectedUserIds) {
        await adminService.rejectUser(userId, currentUserId, 'Bloqueado em lote pelo administrador');
      }

      await loadUsers();
      setSelectedUserIds([]);
      setIsSelectMode(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao bloquear usuários');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    setBulkActionLoading(true);
    try {
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) throw new Error('Usuário não autenticado');

      for (const userId of selectedUserIds) {
        await adminService.approveUser(userId, currentUserId);
      }

      await loadUsers();
      setSelectedUserIds([]);
      setIsSelectMode(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao aprovar usuários');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setBulkActionLoading(true);
      setError('');

      const errors: string[] = [];

      for (const userId of selectedUserIds) {
        try {
          await adminService.deleteProfile(userId);
        } catch (e) {
          const errorMsg = (e as Error).message;
          errors.push(`Erro ao deletar usuário ${userId}: ${errorMsg}`);
          console.error('Erro detalhado:', e);
        }
      }

      if (errors.length > 0) {
        setError(`Alguns usuários não puderam ser deletados:\n${errors.join('\n')}`);
      }

      setSelectedUserIds([]);
      setIsSelectMode(false);
      setShowDeleteConfirmation(false);
      await loadUsers();
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(`Erro ao processar exclusão em lote: ${errorMsg}`);
      console.error('Erro completo:', e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8 space-y-8 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-2">
            Administração / <span className="text-slate-800 dark:text-white">Controle de Usuários</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
            Gestão de Usuários
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Monitore perfis e permissões conforme o papel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-96 group">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Buscar por nome ou email…"
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => navigate('/admin/access')}
            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-all active:scale-95 shadow-sm hover:shadow-indigo-500/10 hover:border-indigo-500/30"
          >
            <i className="fas fa-lock mr-2"></i> Acesso aos Cursos
          </button>
          <button
            onClick={() => loadUsers().catch(e => setError((e as Error).message))}
            className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95 border border-indigo-400/20"
          >
            <i className="fas fa-sync-alt mr-2"></i> Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs p-4 rounded-2xl flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          <span className="font-bold">Erro:</span> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-400 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-slate-500/20 transition-colors"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total</p>
          <p className="text-4xl font-black text-slate-800 dark:text-white relative z-10">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-purple-500/20 transition-colors"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Master</p>
          <p className="text-4xl font-black text-purple-600 dark:text-purple-400 relative z-10">{stats.masters}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-cyan-500/20 transition-colors"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Professores</p>
          <p className="text-4xl font-black text-cyan-600 dark:text-cyan-400 relative z-10">{stats.instructors}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Estudantes</p>
          <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 relative z-10">{stats.students}</p>
        </div>
      </div>

      {/* Tabs e Botão de Seleção na mesma linha */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        {/* Tabs para filtrar usuários */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap border ${activeTab === 'all'
              ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/50'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'
              }`}
          >
            <i className="fas fa-users mr-2"></i>
            Todos
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap border ${activeTab === 'pending'
              ? 'bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/50'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'
              }`}
          >
            <i className="fas fa-clock mr-2"></i>
            Pendentes
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap border ${activeTab === 'approved'
              ? 'bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/50'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'
              }`}
          >
            <i className="fas fa-check-circle mr-2"></i>
            Aprovados
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap border ${activeTab === 'rejected'
              ? 'bg-red-50 dark:bg-red-600/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/50'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'
              }`}
          >
            <i className="fas fa-ban mr-2"></i>
            Rejeitados
          </button>
        </div>

        {/* Botão de Seleção e Ações em Lote */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectMode}
            className={`px-4 py-3 rounded-2xl font-black text-sm shadow-sm transition-all active:scale-95 whitespace-nowrap border ${isSelectMode
              ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/50 text-amber-600 dark:text-amber-500'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
          >
            <i className="fas fa-check-square mr-2"></i>
            {isSelectMode ? 'Cancelar Seleção' : 'Selecionar'}
          </button>

          {/* Barra de ferramentas de seleção */}
          {isSelectMode && selectedUserIds.length > 0 && (() => {
            // Verificar se todos os selecionados estão bloqueados
            const selectedUsers = filtered.filter(u => selectedUserIds.includes(u.id));
            const allBlocked = selectedUsers.every(u => (u as any).approval_status === 'rejected');

            return (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/30 backdrop-blur-md">
                <span className="text-sm font-bold text-indigo-300">
                  {selectedUserIds.length} selecionado(s)
                </span>
                <div className="h-4 w-px bg-indigo-500/30"></div>

                {/* Mostrar Aprovar se todos estão bloqueados, Bloquear caso contrário */}
                {allBlocked ? (
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkActionLoading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <i className="fas fa-check"></i>
                    Aprovar
                  </button>
                ) : (
                  <button
                    onClick={handleBulkBlock}
                    disabled={bulkActionLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <i className="fas fa-ban"></i>
                    Bloquear
                  </button>
                )}

                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <i className="fas fa-trash"></i>
                  Excluir
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Mobile View: Cards */}
      <div className="grid grid-cols-1 gap-6 md:hidden">
        {loading && (
          <div className="col-span-full py-12 text-center text-slate-500">
            <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
            <p>Carregando usuários...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white/5 rounded-3xl border border-white/10 border-dashed">
            <i className="fas fa-users text-4xl mb-3 opacity-50"></i>
            <p>Nenhum usuário encontrado.</p>
          </div>
        )}

        {!loading && filtered.map(u => {
          const isBlocked = (u as any).approval_status === 'rejected';
          const isPending = (u as any).approval_status === 'pending';
          const isSelected = selectedUserIds.includes(u.id);

          return (
            <div
              key={u.id}
              onClick={() => {
                if (isSelectMode) toggleUserSelection(u.id);
                else setViewingUser(u);
              }}
              className={`relative group p-6 rounded-3xl border transition-all cursor-pointer backdrop-blur-md ${isSelected
                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.02]'
                : isBlocked
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-black/40 border-white/5 hover:border-indigo-500/30 hover:bg-black/60'
                }`}
            >
              {/* Checkbox de Seleção (Absoluto) */}
              {isSelectMode && (
                <div className="absolute top-4 right-4 z-10">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    : 'border-white/20 bg-black/40'
                    }`}>
                    {isSelected && <i className="fas fa-check text-xs"></i>}
                  </div>
                </div>
              )}

              {/* Cabeçalho do Card */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg ${u.role === 'MASTER'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-purple-500/10'
                  : u.role === 'INSTRUCTOR'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-cyan-500/10'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-indigo-500/10'
                  }`}>
                  <i className={`fas ${u.role === 'MASTER' ? 'fa-crown' : u.role === 'INSTRUCTOR' ? 'fa-chalkboard-teacher' : 'fa-user-graduate'}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-lg truncate pr-6 ${isSelected ? 'text-indigo-200' : 'text-white'}`}>{u.name || 'Sem nome'}</h3>
                  <p className="text-sm text-slate-400 truncate">{u.email}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${u.role === 'MASTER'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : u.role === 'INSTRUCTOR'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : 'bg-white/5 text-slate-300 border-white/10'
                      }`}>
                      {u.role === 'MASTER' ? 'Master' : u.role === 'INSTRUCTOR' ? 'Professor' : 'Aluno'}
                    </span>

                    {isPending && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                        Pendente
                      </span>
                    )}
                    {isBlocked && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Nível</p>
                  <p className="text-lg font-black text-slate-200">LVL {u.current_level ?? 1}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">XP Total</p>
                  <p className="text-lg font-black text-indigo-400">{(u.xp_total ?? 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5" onClick={e => e.stopPropagation()}>
                {activeTab === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApproveClick(u)}
                      className="flex-1 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                      title="Aprovar"
                    >
                      <i className="fas fa-check"></i> Aprovar
                    </button>
                    <button
                      onClick={() => handleRejectClick(u)}
                      className="flex-1 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                      title="Rejeitar"
                    >
                      <i className="fas fa-times"></i> Rejeitar
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleEditClick(u)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors border border-white/5"
                  title="Editar"
                >
                  <i className="fas fa-cog"></i> Editar
                </button>
                <button
                  onClick={() => handleAccessClick(u)}
                  className="px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-xs transition-colors border border-indigo-500/20"
                  title="Gerenciar Acesso aos Cursos"
                >
                  <i className="fas fa-lock"></i> Acesso
                </button>
                <button
                  onClick={() => handleResetPasswordClick(u)}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs transition-colors border border-amber-500/20"
                  title="Resetar Senha"
                >
                  <i className="fas fa-key"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block w-full overflow-x-auto pb-4">
        <div className="overflow-hidden min-w-[800px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                {isSelectMode && <th className="p-4 w-12"></th>}
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Função</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nível</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">XP</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
              {loading && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Carregando...</p>
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <p>Nenhum usuário encontrado.</p>
                  </td>
                </tr>
              )}

              {!loading && filtered.map(u => {
                const isBlocked = (u as any).approval_status === 'rejected';
                const isPending = (u as any).approval_status === 'pending';
                const isSelected = selectedUserIds.includes(u.id);

                return (
                  <tr
                    key={u.id}
                    className={`group transition-all cursor-pointer ${isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-500/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    onClick={() => {
                      if (isSelectMode) toggleUserSelection(u.id);
                      else setViewingUser(u);
                    }}
                  >
                    {isSelectMode && (
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <div
                          onClick={() => toggleUserSelection(u.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${isSelected
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                            : 'border-white/20 bg-black/40'
                            }`}>
                          {isSelected && <i className="fas fa-check text-[10px]"></i>}
                        </div>
                      </td>
                    )}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg ${u.role === 'MASTER'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : u.role === 'INSTRUCTOR'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                          <i className={`fas ${u.role === 'MASTER' ? 'fa-crown' : u.role === 'INSTRUCTOR' ? 'fa-chalkboard-teacher' : 'fa-user-graduate'}`}></i>
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate max-w-[200px] ${isSelected ? 'text-indigo-600 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>{u.name || 'Sem nome'}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider border ${u.role === 'MASTER'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : u.role === 'INSTRUCTOR'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : 'bg-white/5 text-slate-400 border-white/10'
                        }`}>
                        {u.role === 'MASTER' ? 'Master' : u.role === 'INSTRUCTOR' ? 'Professor' : 'Aluno'}
                      </span>
                    </td>
                    <td className="p-4">
                      {isPending && (
                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                          Pendente
                        </span>
                      )}
                      {isBlocked && (
                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                          Bloqueado
                        </span>
                      )}
                      {!isPending && !isBlocked && (
                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                          Ativo
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="text-sm font-bold text-slate-400">
                        Level {u.current_level ?? 1}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-black text-indigo-400">
                        {(u.xp_total ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveClick(u)}
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors border border-emerald-500/20"
                              title="Aprovar"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              onClick={() => handleRejectClick(u)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
                              title="Rejeitar"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                          title="Editar Usuário"
                        >
                          <i className="fas fa-cog"></i>
                        </button>
                        <button
                          onClick={() => handleAccessClick(u)}
                          className="p-2 rounded-lg hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 transition-colors"
                          title="Gerenciar Acesso"
                        >
                          <i className="fas fa-lock"></i>
                        </button>
                        <button
                          onClick={() => handleResetPasswordClick(u)}
                          className="p-2 rounded-lg hover:bg-amber-500/20 text-slate-500 hover:text-amber-400 transition-colors"
                          title="Resetar Senha"
                        >
                          <i className="fas fa-key"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 dark:text-slate-500">
        Se der erro de permissão, crie policies RLS para INSTRUCTOR ler/atualizar `profiles`.
      </div>

      {/* Modal de Reset de Senha */}
      {
        resettingUser && (
          <AdminResetPasswordModal
            user={resettingUser}
            adminService={adminService}
            onClose={() => setResettingUser(null)}
            onSuccess={() => {
              setResettingUser(null);
            }}
          />
        )
      }

      {/* Modal de Visualização Detalhada */}
      {
        viewingUser && (
          <UserDetailsModal
            user={viewingUser}
            adminService={adminService}
            adminId={adminId}
            onClose={() => setViewingUser(null)}
            onManageAccess={handleAccessClick}
            onRefresh={() => {
              setViewingUser(null);
              loadUsers();
            }}
            onApprove={handleApproveClick}
            onReject={handleRejectClick}
          />
        )
      }

      {/* Modal de Aprovação */}
      {
        approvingUser && (
          <ApproveUserModal
            user={approvingUser}
            adminId={adminId}
            adminService={adminService}
            onClose={() => setApprovingUser(null)}
            onSuccess={() => {
              setApprovingUser(null);
              loadUsers();
            }}
          />
        )
      }

      {/* Modal de Rejeição */}
      {
        rejectingUser && (
          <RejectUserModal
            user={rejectingUser}
            adminId={adminId}
            adminService={adminService}
            onClose={() => setRejectingUser(null)}
            onSuccess={() => {
              setRejectingUser(null);
              loadUsers();
            }}
          />
        )
      }

      {/* Modal de Acesso aos Cursos */}
      {
        managingAccessUser && (
          <UserCourseAccessModal
            user={managingAccessUser}
            adminService={adminService}
            onClose={() => setManagingAccessUser(null)}
            onSuccess={() => {
              toast.success(`Acessos de ${managingAccessUser.name} atualizados!`);
              setManagingAccessUser(null);
            }}
          />
        )
      }

      {/* Modal de Confirmação de Exclusão */}
      {
        showDeleteConfirmation && (
          <DeleteConfirmationModal
            userCount={selectedUserIds.length}
            onConfirm={handleBulkDelete}
            onCancel={() => setShowDeleteConfirmation(false)}
          />
        )
      }

      {/* Modal de Edição */}
      {
        editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a0e14]/90 backdrop-blur-xl w-[95%] md:max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-white/10">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-xl font-black text-white">Gerenciar Usuário</h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-full border flex items-center justify-center text-xl shadow-[0_0_15px_rgba(99,102,241,0.2)] ${editingUser.role === 'MASTER' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-purple-500/20' : editingUser.role === 'INSTRUCTOR' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
                    <i className={`fas ${editingUser.role === 'MASTER' ? 'fa-crown' : editingUser.role === 'INSTRUCTOR' ? 'fa-chalkboard-teacher' : 'fa-user-graduate'}`}></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">{editingUser.name || 'Sem nome'}</h4>
                    <p className="text-xs text-slate-400">{editingUser.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Cargo / Nível de Acesso
                    </label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, role: 'STUDENT' })}
                        className={`flex-1 py-4 px-4 rounded-2xl text-sm font-black border transition-all flex flex-col items-center gap-2 ${editingUser.role === 'STUDENT'
                          ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                          : 'bg-black/40 border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300'
                          }`}
                      >
                        <i className={`fas fa-user-graduate text-lg ${editingUser.role === 'STUDENT' ? 'text-white' : 'text-slate-600'}`}></i>
                        <span>Aluno</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, role: 'INSTRUCTOR' })}
                        className={`flex-1 py-4 px-4 rounded-2xl text-sm font-black border transition-all flex flex-col items-center gap-2 ${editingUser.role === 'INSTRUCTOR'
                          ? 'bg-cyan-600 text-white border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                          : 'bg-black/40 border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300'
                          }`}
                      >
                        <i className={`fas fa-chalkboard-teacher text-lg ${editingUser.role === 'INSTRUCTOR' ? 'text-white' : 'text-slate-600'}`}></i>
                        <span>Professor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, role: 'MASTER' })}
                        className={`flex-1 py-4 px-4 rounded-2xl text-sm font-black border transition-all flex flex-col items-center gap-2 ${editingUser.role === 'MASTER'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                          : 'bg-black/40 border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300'
                          }`}
                      >
                        <i className={`fas fa-crown text-lg ${editingUser.role === 'MASTER' ? 'text-white' : 'text-slate-600'}`}></i>
                        <span>Master</span>
                      </button>
                    </div>
                  </div>

                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-4 rounded-2xl border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-indigo-400/20"
                  >
                    {isSaving && <i className="fas fa-circle-notch animate-spin"></i>}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default React.memo(UserManagement);
