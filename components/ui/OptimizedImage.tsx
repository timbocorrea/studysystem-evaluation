import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'origin';
    fit?: 'cover' | 'contain' | 'fill';
}

/**
 * Componente de imagem otimizado para integração com Supabase Image Transformation.
 * Reduz o consumo de banda (Egress) e melhora o LCP.
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    width,
    height,
    quality = 80,
    format = 'webp',
    fit = 'cover',
    className,
    loading = 'lazy',
    ...props
}) => {
    // Se não for uma URL do Supabase, retorna a imagem padrão
    const isSupabaseStorage = src?.includes('supabase.co/storage/v1/object/public');
    
    let optimizedSrc = src;
    
    if (isSupabaseStorage) {
        const params = new URLSearchParams();
        if (width) params.append('width', width.toString());
        if (height) params.append('height', height.toString());
        if (quality) params.append('quality', quality.toString());
        if (format !== 'origin') params.append('format', format);
        if (fit) params.append('resize', fit);
        
        // Supabase usa parâmetros na query string para transformação
        const separator = src.includes('?') ? '&' : '?';
        optimizedSrc = `${src}${separator}${params.toString()}`;
    }

    return (
        <img
            src={optimizedSrc}
            className={className}
            loading={loading}
            width={width}
            height={height}
            {...props}
        />
    );
};

export default OptimizedImage;
