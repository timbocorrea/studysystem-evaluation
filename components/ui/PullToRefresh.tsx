import React, { useState, useRef, useCallback } from 'react';
import { hapticActions } from '../../utils/haptics';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    disabled?: boolean;
    threshold?: number;
    refreshingText?: string;
    pullText?: string;
    releaseText?: string;
}

/**
 * PullToRefresh - Mobile pull-to-refresh component
 * 
 * Features:
 * - Smooth pull animation
 * - Haptic feedback on trigger
 * - Custom threshold
 * - Accessible
 */
const PullToRefresh: React.FC<PullToRefreshProps> = ({
    onRefresh,
    children,
    disabled = false,
    threshold = 80,
    refreshingText = 'Atualizando...',
    pullText = 'Puxe para atualizar',
    releaseText = 'Solte para atualizar'
}) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;

        const container = containerRef.current;
        if (!container || container.scrollTop > 0) return;

        startY.current = e.touches[0].clientY;
        setIsPulling(true);
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling || disabled || isRefreshing) return;

        const container = containerRef.current;
        if (!container || container.scrollTop > 0) {
            setPullDistance(0);
            return;
        }

        currentY.current = e.touches[0].clientY;
        const distance = Math.max(0, currentY.current - startY.current);

        // Apply resistance to make it feel more natural
        const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(resistedDistance);

        // Haptic feedback when reaching threshold
        if (resistedDistance >= threshold && pullDistance < threshold) {
            hapticActions.select();
        }
    }, [isPulling, disabled, isRefreshing, threshold, pullDistance]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return;

        setIsPulling(false);

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            hapticActions.success();

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

    const indicatorOpacity = Math.min(pullDistance / threshold, 1);
    const indicatorRotation = (pullDistance / threshold) * 180;
    const shouldRelease = pullDistance >= threshold;

    return (
        <div
            ref={containerRef}
            className="relative overflow-y-auto h-full overscroll-contain"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull Indicator */}
            <div
                className="absolute left-0 right-0 flex flex-col items-center justify-end overflow-hidden transition-all pointer-events-none z-10"
                style={{
                    height: pullDistance,
                    opacity: indicatorOpacity
                }}
            >
                <div className="flex flex-col items-center gap-2 pb-4">
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isRefreshing
                                ? 'bg-indigo-500 text-white'
                                : shouldRelease
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-700 text-slate-400'
                            }`}
                        style={{
                            transform: isRefreshing ? undefined : `rotate(${indicatorRotation}deg)`
                        }}
                    >
                        {isRefreshing ? (
                            <i className="fas fa-circle-notch animate-spin text-sm"></i>
                        ) : (
                            <i className="fas fa-arrow-down text-sm"></i>
                        )}
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                        {isRefreshing ? refreshingText : shouldRelease ? releaseText : pullText}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div
                className="transition-transform"
                style={{
                    transform: `translateY(${pullDistance}px)`
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
