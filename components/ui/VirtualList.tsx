import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
    emptyMessage?: string;
    loadingCount?: number;
    isLoading?: boolean;
}

/**
 * VirtualList - Virtualized list for large datasets
 * 
 * Features:
 * - Only renders visible items + overscan
 * - Smooth scrolling
 * - Memory efficient for 1000+ items
 * - Loading skeleton support
 */
function VirtualList<T>({
    items,
    itemHeight,
    renderItem,
    overscan = 5,
    className = '',
    emptyMessage = 'Nenhum item encontrado',
    loadingCount = 5,
    isLoading = false
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // Calculate visible range
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

    // Handle scroll
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Get container height on mount and resize
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };

        updateHeight();

        const resizeObserver = new ResizeObserver(updateHeight);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Render loading skeletons
    if (isLoading) {
        return (
            <div className={`overflow-y-auto ${className}`}>
                {Array.from({ length: loadingCount }).map((_, idx) => (
                    <div
                        key={`skeleton-${idx}`}
                        className="animate-pulse"
                        style={{ height: itemHeight }}
                    >
                        <div className="h-full p-4">
                            <div className="h-full bg-slate-800 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (items.length === 0) {
        return (
            <div className={`flex items-center justify-center text-slate-500 ${className}`}>
                <div className="text-center py-12">
                    <i className="fas fa-inbox text-4xl mb-4 opacity-50"></i>
                    <p className="text-sm">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    // Get visible items
    const visibleItems = items.slice(startIndex, endIndex);

    return (
        <div
            ref={containerRef}
            className={`overflow-y-auto overscroll-contain ${className}`}
            onScroll={handleScroll}
        >
            {/* Spacer for total scroll height */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {/* Positioned items */}
                <div
                    style={{
                        position: 'absolute',
                        top: startIndex * itemHeight,
                        left: 0,
                        right: 0
                    }}
                >
                    {visibleItems.map((item, idx) => (
                        <div
                            key={startIndex + idx}
                            style={{ height: itemHeight }}
                        >
                            {renderItem(item, startIndex + idx)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default VirtualList;
