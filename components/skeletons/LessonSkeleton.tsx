import React from 'react';
import Skeleton from '../ui/Skeleton';

const LessonSkeleton: React.FC = () => {
    return (
        <div className="w-full max-w-[1920px] mx-auto px-2 md:px-6 py-4 md:py-6 space-y-4 animate-pulse">
            {/* Header Skeleton */}
            <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                    <Skeleton height="h-10" width="w-10" rounded="rounded-xl" />
                    <Skeleton height="h-7" width="w-2/3" rounded="rounded-lg" />
                </div>
                <div className="flex justify-between">
                    <Skeleton height="h-4" width="w-1/4" />
                    <Skeleton height="h-8" width="w-24" rounded="rounded-xl" />
                </div>
            </div>

            {/* Content Skeleton: Flex 2 Colunas (40% Vídeo | 60% Texto) */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Coluna Esquerda: Vídeo (40%) */}
                <div className="lg:w-[40%] shrink-0 space-y-3">
                    <Skeleton height="h-0 pb-[75%]" rounded="rounded-xl" /> {/* 4:3 aspect */}
                    <Skeleton height="h-10" rounded="rounded-xl" />
                </div>
                {/* Coluna Direita: Texto (60%) */}
                <div className="flex-1 min-w-0 space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                    <Skeleton height="h-8" width="w-2/3" rounded="rounded-lg" />
                    <div className="space-y-3 mt-4">
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-11/12" />
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-3/4" />
                    </div>
                    <div className="space-y-3 mt-6">
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-9/12" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonSkeleton;
