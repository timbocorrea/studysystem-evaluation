import React from 'react';
import Skeleton from './Skeleton';

/**
 * SkeletonText - Multiple lines of skeleton text
 */
export const SkeletonText: React.FC<{
    lines?: number;
    className?: string;
    lastLineWidth?: string;
}> = ({ lines = 3, className = '', lastLineWidth = 'w-3/5' }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, idx) => (
            <Skeleton
                key={idx}
                width={idx === lines - 1 ? lastLineWidth : 'w-full'}
                height="h-3"
            />
        ))}
    </div>
);

/**
 * SkeletonCard - Card-shaped skeleton
 */
export const SkeletonCard: React.FC<{
    hasImage?: boolean;
    className?: string;
}> = ({ hasImage = true, className = '' }) => (
    <div className={`bg-slate-800/50 rounded-2xl overflow-hidden border border-white/5 ${className}`}>
        {hasImage && (
            <Skeleton width="w-full" height="h-40" rounded="rounded-none" />
        )}
        <div className="p-4 space-y-3">
            <Skeleton width="w-3/4" height="h-5" rounded="rounded" />
            <SkeletonText lines={2} />
            <div className="flex gap-2 pt-2">
                <Skeleton width="w-16" height="h-6" rounded="rounded-lg" />
                <Skeleton width="w-20" height="h-6" rounded="rounded-lg" />
            </div>
        </div>
    </div>
);

/**
 * SkeletonAvatar - Avatar with text skeleton
 */
export const SkeletonAvatar: React.FC<{
    size?: string;
    withText?: boolean;
    className?: string;
}> = ({ size = 'w-10 h-10', withText = true, className = '' }) => (
    <div className={`flex items-center gap-3 ${className}`}>
        <Skeleton width={size.split(' ')[0]} height={size.split(' ')[1] || size.split(' ')[0]} rounded="rounded-full" />
        {withText && (
            <div className="flex-1 space-y-2">
                <Skeleton width="w-3/5" height="h-3" rounded="rounded" />
                <Skeleton width="w-2/5" height="h-2" rounded="rounded" />
            </div>
        )}
    </div>
);

/**
 * SkeletonTableRow - Table row skeleton
 */
export const SkeletonTableRow: React.FC<{
    columns?: number;
    className?: string;
}> = ({ columns = 5, className = '' }) => (
    <div className={`flex items-center gap-4 p-4 border-b border-white/5 ${className}`}>
        <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
        {Array.from({ length: columns - 1 }).map((_, idx) => (
            <div key={idx} className="flex-1">
                <Skeleton width="w-full" height="h-4" rounded="rounded" />
            </div>
        ))}
    </div>
);

/**
 * SkeletonList - List of skeleton items
 */
export const SkeletonList: React.FC<{
    count?: number;
    itemHeight?: string;
    className?: string;
}> = ({ count = 5, itemHeight = 'h-16', className = '' }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className={`flex items-center gap-3 p-3 bg-white/5 rounded-xl ${itemHeight}`}>
                <Skeleton width="w-10" height="h-10" rounded="rounded-xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton width="w-1/2" height="h-4" rounded="rounded" />
                    <Skeleton width="w-1/3" height="h-3" rounded="rounded" />
                </div>
            </div>
        ))}
    </div>
);

export default {
    SkeletonText,
    SkeletonCard,
    SkeletonAvatar,
    SkeletonTableRow,
    SkeletonList
};
