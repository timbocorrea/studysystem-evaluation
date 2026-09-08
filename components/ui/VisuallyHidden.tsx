import React from 'react';

interface VisuallyHiddenProps {
    children: React.ReactNode;
    as?: 'span' | 'div' | 'p' | 'label';
}

/**
 * VisuallyHidden - Content visible only to screen readers
 * 
 * Use for:
 * - Icon-only buttons that need labels
 * - Additional context for screen readers
 * - Skip links
 */
const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
    children,
    as = 'span'
}) => {
    const styles: React.CSSProperties = {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0
    };

    if (as === 'div') {
        return <div className="sr-only" style={styles}>{children}</div>;
    }
    if (as === 'p') {
        return <p className="sr-only" style={styles}>{children}</p>;
    }
    if (as === 'label') {
        return <label className="sr-only" style={styles}>{children}</label>;
    }
    return <span className="sr-only" style={styles}>{children}</span>;
};

/**
 * SkipLink - Skip to main content link for keyboard users
 */
export const SkipLink: React.FC<{
    href?: string;
    children?: React.ReactNode;
}> = ({ href = '#main-content', children = 'Pular para o conteúdo principal' }) => (
    <a
        href={href}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
    >
        {children}
    </a>
);

/**
 * LiveRegion - Announce dynamic content changes to screen readers
 */
export const LiveRegion: React.FC<{
    children: React.ReactNode;
    priority?: 'polite' | 'assertive';
    atomic?: boolean;
}> = ({ children, priority = 'polite', atomic = true }) => (
    <div
        role="status"
        aria-live={priority}
        aria-atomic={atomic}
        className="sr-only"
    >
        {children}
    </div>
);

export default VisuallyHidden;
