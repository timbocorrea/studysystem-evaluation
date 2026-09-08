import React from 'react';

interface ErrorFallbackProps {
    error: Error;
    errorType: 'domain' | 'notFound' | 'network' | 'unknown';
    onRetry?: () => void;
    onGoBack?: () => void;
}

/**
 * ErrorFallback Component
 * Provides user-friendly error messages based on error type
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
    error,
    errorType,
    onRetry,
    onGoBack
}) => {
    const getErrorConfig = () => {
        switch (errorType) {
            case 'notFound':
                return {
                    icon: 'fa-search',
                    iconColor: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-100 dark:bg-blue-500/10',
                    title: 'Conteúdo Não Encontrado',
                    description: 'O item que você está procurando não existe ou foi removido.',
                    suggestion: 'Verifique se o link está correto ou volte para a página anterior.'
                };
            case 'domain':
                return {
                    icon: 'fa-exclamation-circle',
                    iconColor: 'text-amber-600 dark:text-amber-400',
                    bgColor: 'bg-amber-100 dark:bg-amber-500/10',
                    title: 'Erro de Validação',
                    description: error.message,
                    suggestion: 'Por favor, verifique os dados e tente novamente.'
                };
            case 'network':
                return {
                    icon: 'fa-wifi',
                    iconColor: 'text-cyan-600 dark:text-cyan-400',
                    bgColor: 'bg-cyan-100 dark:bg-cyan-500/10',
                    title: 'Erro de Conexão',
                    description: 'Não foi possível conectar ao servidor.',
                    suggestion: 'Verifique sua conexão com a internet e tente novamente.'
                };
            default:
                return {
                    icon: 'fa-exclamation-triangle',
                    iconColor: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-100 dark:bg-red-500/10',
                    title: 'Algo Deu Errado',
                    description: error.message || 'Ocorreu um erro inesperado.',
                    suggestion: 'Por favor, tente novamente ou contate o suporte se o problema persistir.'
                };
        }
    };

    const config = getErrorConfig();

    return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
                {/* Icon & Title */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                        <i className={`fas ${config.icon} text-2xl ${config.iconColor}`}></i>
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {config.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Código: {errorType.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Error Description */}
                <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                        {config.description}
                    </p>
                </div>

                {/* Suggestion */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                    <div className="flex gap-2">
                        <i className="fas fa-lightbulb text-blue-600 dark:text-blue-400 mt-0.5"></i>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            {config.suggestion}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {onGoBack && (
                        <button
                            onClick={onGoBack}
                            className="flex-1 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-arrow-left text-xs"></i>
                            Voltar
                        </button>
                    )}
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-redo text-xs"></i>
                            Tentar Novamente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ErrorFallback;
