import React, { useMemo, useEffect, useState } from 'react';
import { Course, User } from '../domain/entities';
import { AchievementsList } from './AchievementsList';
import { AdminService } from '../services/AdminService';
import { XpLogRecord } from '../domain/admin';
import { NumberTicker } from './ui/number-ticker';

const ACHIEVEMENT_CATALOG_LENGTH = 6;
const ITEMS_PER_PAGE = 50;

interface AchievementsPageProps {
  user: User;
  course?: Course | null;
  adminService: AdminService;
}

const AchievementsPage: React.FC<AchievementsPageProps> = ({ user, course, adminService }) => {
  const [xpHistory, setXpHistory] = useState<XpLogRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user?.id) {
      adminService.getXpHistory(user.id)
        .then(logs => {
          setXpHistory(logs);
        })
        .catch(err => console.error("Failed to load XP history", err))
        .finally(() => setLoadingHistory(false));
    }
  }, [user?.id, adminService]);

  const unlockedById = useMemo(() => new Map(user.achievements.map(a => [a.id, a])), [user]);

  // Simple stats for the header
  const total = ACHIEVEMENT_CATALOG_LENGTH;
  const unlockedCount = user.achievements.filter(a => ['first-lesson', 'module-master', 'course-complete', 'xp-1000', 'xp-5000', 'level-5'].includes(a.id)).length;
  const unlockedPercent = Math.round((unlockedCount / total) * 100);

  // Pagination Logic
  const totalPages = Math.ceil(xpHistory.length / ITEMS_PER_PAGE);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return xpHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [xpHistory, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
            Home / <span className="text-slate-800 dark:text-white">Conquistas</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">Gamificação</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Seu progresso, medalhas e evolução pessoal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desbloqueadas</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white"><NumberTicker key={unlockedCount} value={unlockedCount} />/{total}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível Atual</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{user.level}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">XP Total</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white"><NumberTicker key={user.xp} value={Number(user.xp)} /></p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-8">
            <AchievementsList user={user} course={course} />
            
            {/* XP TABLE */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight italic">Extrato de XP</h3>
                        <p className="text-sm text-slate-500 font-medium">Detalhamento de todas as suas atividades.</p>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <i className="fas fa-chevron-left"></i>
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <i className="fas fa-chevron-right"></i>
                        </button>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase text-[10px] tracking-widest px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="w-1/3">Data</div>
                        <div className="w-1/3">Atividade</div>
                        <div className="w-1/3 text-right">XP</div>
                    </div>

                    {loadingHistory ? (
                        <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-widest">Carregando histórico...</span>
                        </div>
                    ) : xpHistory.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <i className="fas fa-history text-3xl mb-4 opacity-20" />
                            <p className="font-medium">Nenhum registro de XP encontrado.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {currentData.map((log) => {
                            let description = log.description || 'Atividade';
                            if (description.startsWith('{') || description.startsWith('[')) {
                            try {
                                const parsed = JSON.parse(description);
                                description = parsed.text || description;
                            } catch (e) { }
                            }

                            return (
                            <div key={log.id} className="flex items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors px-6 py-4">
                                <div className="w-1/3 text-slate-400 text-xs font-medium">
                                    {new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="w-1/3 font-bold text-slate-700 dark:text-slate-300 text-sm truncate pr-4" title={description}>
                                {description}
                                </div>
                                <div className="w-1/3 text-right">
                                <span className={`font-black text-sm ${log.amount > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {log.amount > 0 ? '+' : ''}{log.amount} XP
                                </span>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage;

//
