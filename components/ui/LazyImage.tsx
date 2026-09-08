import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    placeholderSrc?: string;
    blurHash?: string;
    aspectRatio?: string;
    onLoad?: () => void;
    onError?: () => void;
}

/**
 * LazyImage - Image component with lazy loading and blur placeholder
 * 
 * Features:
 * - Intersection Observer for viewport detection
 * - Smooth fade-in transition
 * - Placeholder support (blur or color)
 * - Error handling with fallback
 * - Native lazy loading fallback
 */
const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    placeholderSrc,
    blurHash,
    aspectRatio = '16/9',
    className = '',
    onLoad,
    onError,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '100px', // Start loading 100px before entering viewport
                threshold: 0.01
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = useCallback(() => {
        setIsLoaded(true);
        onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(() => {
        setHasError(true);
        onError?.();
    }, [onError]);

    // Supabase Image Optimization
    const getOptimizedSrc = (originalSrc: string) => {
        if (!originalSrc.includes('supabase.co/storage/v1/object/public')) return originalSrc;
        
        const params = new URLSearchParams();
        // Default optimization for thumbnails if no dimensions provided
        params.append('width', '600');
        params.append('quality', '80');
        params.append('format', 'webp');
        
        const separator = originalSrc.includes('?') ? '&' : '?';
        return `${originalSrc}${separator}${params.toString()}`;
    };

    const optimizedSrc = getOptimizedSrc(src);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden bg-slate-800 ${className}`}
            style={{ aspectRatio }}
        >
            {/* Placeholder */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
            )}

            {/* Actual Image */}
            {isInView && !hasError && (
                <img
                    ref={imgRef}
                    src={optimizedSrc}
                    alt={alt}
                    loading="lazy"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`
                        w-full h-full object-cover
                        transition-opacity duration-500
                        ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    `}
                    {...props}
                />
            )}

            {/* Error State */}
            {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                    <i className="fas fa-image text-2xl mb-2"></i>
                    <span className="text-xs">Imagem indisponível</span>
                </div>
            )}
        </div>
    );
};

export default LazyImage;
