import React from 'react';

interface ModernLoaderProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    fullscreen?: boolean;
}

/**
 * Modern skeleton loader with smooth animations
 * Following frontend-design principles: purposeful animation, performance-focused
 */
export const ModernLoader: React.FC<ModernLoaderProps> = ({
    message = 'Carregando...',
    size = 'md',
    fullscreen = false
}) => {
    // Map sizes to pixel widths for the logo
    const logoSizes = {
        sm: 'w-16',
        md: 'w-24',
        lg: 'w-32'
    };

    const containerClasses = fullscreen
        ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md transition-all duration-500'
        : 'w-full h-full min-h-[50vh] flex flex-col items-center justify-center p-8'; // Ensure height for centering

    return (
        <div className={containerClasses}>
            <div
                className={`relative z-10 flex flex-col items-center justify-center`}
            >
                {/* Glow Effect behind logo */}
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />

                <img
                    src="/logo.svg"
                    alt="Loading..."
                    className={`${logoSizes[size] || 'w-24'} drop-shadow-2xl relative z-10`}
                />

                {message && (
                    <p
                        className="mt-8 text-xs font-black tracking-[0.2em] text-slate-400 uppercase text-center"
                    >
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
};

/**
 * Skeleton loader for list items
 * Use while data is loading to show structure
 */
export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
    return (
        <div className="space-y-3 p-4">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="animate-pulse flex gap-3"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />

                    {/* Content lines */}
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
};
