import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string;
    height?: string;
    rounded?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    width = 'w-full',
    height = 'h-4',
    rounded = 'rounded'
}) => {
    return (
        <div
            className={`animate-pulse bg-slate-200/50 dark:bg-white/5 ${width} ${height} ${rounded} ${className}`}
        />
    );
};

export default Skeleton;
