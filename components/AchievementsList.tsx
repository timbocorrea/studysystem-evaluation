import React, { useMemo } from 'react';
import { Course, User } from '../domain/entities';

type AchievementDefinition = {
    id: string;
    title: string;
    description: string;
    icon: string;
};

const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
    {
        id: 'first-lesson',
        title: 'Primeiro Passo',
        description: 'Conclua sua primeira aula no sistema.',
        icon: 'fa-rocket'
    },
    {
        id: 'module-master',
        title: 'Mestre do Módulo',
        description: 'Complete todas as aulas de um módulo.',
        icon: 'fa-crown'
    },
    {
        id: 'course-complete',
        title: 'Conquistador do Curso',
        description: 'Complete todas as aulas de um curso.',
        icon: 'fa-trophy'
    },
    {
        id: 'xp-1000',
        title: 'Aprendiz Dedicado',
        description: 'Alcance 1.000 XP acumulados.',
        icon: 'fa-bolt'
    },
    {
        id: 'xp-5000',
        title: 'Veterano do Estudo',
        description: 'Alcance 5.000 XP acumulados.',
        icon: 'fa-award'
    },
    {
        id: 'level-5',
        title: 'Mestre do Conhecimento',
        description: 'Atinga o nível 5.',
        icon: 'fa-brain'
    }
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

interface AchievementsListProps {
    user: User;
    course?: Course | null;
    columns?: '1' | '2' | '3'; // Prop to control grid columns
    compact?: boolean; // Optional prop for denser layout if needed
}

export const AchievementsList: React.FC<AchievementsListProps> = ({ user, course, columns = '3' }) => {
    const unlockedById = useMemo(() => new Map(user.achievements.map(a => [a.id, a])), [user]);

    const courseStats = useMemo(() => {
        if (!course) return null;

        const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
        const completedLessons = course.modules.reduce((sum, m) => sum + m.lessons.filter(l => l.isCompleted).length, 0);
        const totalModules = course.modules.length;
        const completedModules = course.modules.filter(m => m.isFullyCompleted()).length;
        const bestModuleProgress = course.modules.reduce((best, module) => {
            if (module.lessons.length === 0) return best;
            const completed = module.lessons.filter(l => l.isCompleted).length;
            const ratio = completed / module.lessons.length;
            return Math.max(best, ratio);
        }, 0);

        return { totalLessons, completedLessons, totalModules, completedModules, bestModuleProgress };
    }, [course]);

    const progressById = (achievementId: string) => {
        switch (achievementId) {
            case 'xp-1000': {
                const ratio = clamp01(user.xp / 1000);
                return { ratio, label: `${Math.min(user.xp, 1000)} / 1000 XP` };
            }
            case 'xp-5000': {
                const ratio = clamp01(user.xp / 5000);
                return { ratio, label: `${Math.min(user.xp, 5000)} / 5000 XP` };
            }
            case 'level-5': {
                const ratio = clamp01(user.level / 5);
                return { ratio, label: `Nível ${Math.min(user.level, 5)} / 5` };
            }
            case 'course-complete': {
                if (!courseStats || courseStats.totalLessons === 0) return { ratio: 0, label: 'Sem curso carregado' };
                const ratio = clamp01(courseStats.completedLessons / courseStats.totalLessons);
                return { ratio, label: `${courseStats.completedLessons} / ${courseStats.totalLessons} aulas` };
            }
            case 'module-master': {
                if (!courseStats || courseStats.totalModules === 0) return { ratio: 0, label: 'Sem curso carregado' };
                if (courseStats.completedModules > 0) return { ratio: 1, label: `${courseStats.completedModules} módulo(s) completo(s)` };
                return { ratio: courseStats.bestModuleProgress, label: 'Progresso do módulo atual' };
            }
            case 'first-lesson': {
                if (!courseStats) return { ratio: 0, label: 'Conclua 1 aula' };
                const ratio = clamp01(courseStats.completedLessons / 1);
                return { ratio, label: `${Math.min(courseStats.completedLessons, 1)} / 1 aula` };
            }
            default:
                return { ratio: 0, label: '' };
        }
    };

    let gridClass = "grid gap-4 ";
    if (columns === '1') {
        gridClass += "grid-cols-1";
    } else if (columns === '2') {
        gridClass += "grid-cols-1 md:grid-cols-2";
    } else {
        gridClass += "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    }

    return (
        <div className={gridClass}>
            {ACHIEVEMENT_CATALOG.map(def => {
                const unlockedAch = unlockedById.get(def.id);
                const isUnlocked = Boolean(unlockedAch);
                const progress = progressById(def.id);

                return (
                    <div
                        key={def.id}
                        className={`relative overflow-hidden rounded-2xl border shadow-sm transition-all ${isUnlocked
                                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md'
                                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/70'
                            }`}
                    >
                        <div className="p-4 flex items-center gap-3">
                            <div
                                className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg border ${isUnlocked
                                        ? 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20 dark:text-indigo-400'
                                        : 'bg-slate-200/50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                    }`}
                            >
                                <i className={`fas ${def.icon}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">{def.title}</h3>
                                    {isUnlocked ? (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 flex-shrink-0">
                                            Desbloqueada
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex-shrink-0">
                                            Bloqueada
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">{def.description}</p>

                                {isUnlocked && unlockedAch?.dateEarned ? (
                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                        {unlockedAch.dateEarned.toLocaleDateString('pt-BR')}
                                    </p>
                                ) : (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            <span>Progresso</span>
                                            <span>{progress.label}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isUnlocked && (
                            <div className="absolute -top-20 -right-20 w-56 h-56 bg-indigo-500/5 rounded-full blur-2xl"></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
