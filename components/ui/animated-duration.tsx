import React from 'react';
import { NumberTicker } from './number-ticker';
import { cn } from '@/lib/utils';

interface AnimatedDurationProps {
    seconds: number;
    className?: string;
}

export const AnimatedDuration = ({ seconds, className }: AnimatedDurationProps) => {
    // Logic matches the original formatDuration: total minutes + seconds
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    // If less than 60 seconds, just show seconds
    if (seconds < 60) {
        return (
            <span className={cn("inline-flex items-baseline gap-0.5", className)}>
                <NumberTicker value={Math.floor(seconds)} />
                <span className="text-sm font-medium opacity-50 ml-0.5">s</span>
            </span>
        );
    }

    return (
        <span className={cn("inline-flex items-baseline gap-2", className)}>
            <span className="inline-flex items-baseline gap-0.5">
                <NumberTicker value={m} />
                <span className="text-sm font-medium opacity-50 ml-0.5">m</span>
            </span>
            <span className="inline-flex items-baseline gap-0.5">
                <NumberTicker value={s} />
                <span className="text-sm font-medium opacity-50 ml-0.5">s</span>
            </span>
        </span>
    );
};
