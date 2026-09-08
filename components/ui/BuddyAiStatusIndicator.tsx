import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    hasStudentGoogleAiApiKey,
    STUDENT_GOOGLE_AI_API_KEY_CHANGE_EVENT
} from '@/utils/studentGoogleAiApiKey';

interface BuddyAiStatusIndicatorProps {
    user?: { id?: string } | null;
    isLoading?: boolean;
}

type BuddyAiStatus = 'unknown' | 'platform-active' | 'student-key-active';

const statusStyles: Record<BuddyAiStatus, { label: string; iconClassName: string; dotClassName: string; buttonClassName: string }> = {
    unknown: {
        label: 'Status do Buddy AI desconhecido',
        iconClassName: 'text-slate-500 dark:text-slate-400',
        dotClassName: 'bg-slate-400 dark:bg-slate-500',
        buttonClassName: 'text-slate-500 dark:text-slate-400'
    },
    'platform-active': {
        label: 'Buddy AI ativo via plataforma',
        iconClassName: 'text-emerald-600 dark:text-emerald-400',
        dotClassName: 'bg-emerald-500',
        buttonClassName: 'text-emerald-600 dark:text-emerald-400'
    },
    'student-key-active': {
        label: 'Buddy AI ativo com chave própria',
        iconClassName: 'text-sky-600 dark:text-sky-400',
        dotClassName: 'bg-sky-500',
        buttonClassName: 'text-sky-600 dark:text-sky-400'
    }
};

const BuddyAiStatusIndicator = ({ user, isLoading = false }: BuddyAiStatusIndicatorProps) => {
    const navigate = useNavigate();
    const [hasLocalKey, setHasLocalKey] = useState(() => hasStudentGoogleAiApiKey());

    useEffect(() => {
        const updateStatus = () => {
            setHasLocalKey(hasStudentGoogleAiApiKey());
        };

        updateStatus();

        window.addEventListener('storage', updateStatus);
        window.addEventListener('focus', updateStatus);
        window.addEventListener(STUDENT_GOOGLE_AI_API_KEY_CHANGE_EVENT, updateStatus);

        return () => {
            window.removeEventListener('storage', updateStatus);
            window.removeEventListener('focus', updateStatus);
            window.removeEventListener(STUDENT_GOOGLE_AI_API_KEY_CHANGE_EVENT, updateStatus);
        };
    }, [user?.id]);

    const status = useMemo<BuddyAiStatus>(() => {
        if (isLoading || !user) return 'unknown';
        return hasLocalKey ? 'student-key-active' : 'platform-active';
    }, [hasLocalKey, isLoading, user]);

    const visual = statusStyles[status];

    return (
        <button
            type="button"
            onClick={() => navigate('/buddy')}
            title={visual.label}
            aria-label={visual.label}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 ${visual.buttonClassName}`}
        >
            <i className={`fas fa-robot text-sm ${visual.iconClassName}`}></i>
            <span
                aria-hidden="true"
                className={`absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${visual.dotClassName}`}
            />
        </button>
    );
};

export default BuddyAiStatusIndicator;
