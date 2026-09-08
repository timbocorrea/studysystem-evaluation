import React, { useEffect } from 'react';

interface MobileModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    icon?: string;
    iconColor?: string;
    maxWidth?: string;
    showHandle?: boolean;
}

/**
 * MobileModal - Modal responsivo que se comporta como Bottom Sheet em mobile
 * 
 * Features:
 * - Desktop: Modal centralizado tradicional
 * - Mobile: Bottom Sheet estático com botão de fechar
 * - Acessibilidade com touch targets de 44px+
 */
const MobileModal: React.FC<MobileModalProps> = ({
    isOpen,
    onClose,
    children,
    title,
    subtitle,
    icon,
    iconColor = 'text-indigo-400',
    maxWidth = 'max-w-lg',
    showHandle = true
}) => {
    // Native keydown handler to close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <div
                        className={`
                            relative z-10 w-full bg-[#0a0e14]/95 backdrop-blur-xl border border-white/10 shadow-2xl
                            
                            /* Mobile: Bottom Sheet */
                            max-md:rounded-t-3xl max-md:rounded-b-none
                            max-md:max-h-[90vh]
                            
                            /* Desktop: Centered Modal */
                            md:rounded-3xl md:mx-4 md:max-h-[85vh]
                            ${maxWidth}
                            
                            flex flex-col overflow-hidden
                        `}
                    >
                        {/* Drag Handle - Mobile Only */}
                        {showHandle && (
                            <div className="md:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                            </div>
                        )}

                        {/* Header */}
                        {(title || icon) && (
                            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                                <div className="flex items-center gap-3">
                                    {icon && (
                                        <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${iconColor}`}>
                                            <i className={icon}></i>
                                        </div>
                                    )}
                                    <div>
                                        {title && <h3 className="text-lg font-black text-white">{title}</h3>}
                                        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                    aria-label="Fechar modal"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MobileModal;
