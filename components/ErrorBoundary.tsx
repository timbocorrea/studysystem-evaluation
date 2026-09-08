import React, { Component, ReactNode, ErrorInfo } from 'react';
import { DomainError, NotFoundError } from '../domain/errors';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, errorInfo: React.ErrorInfo, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorType: 'domain' | 'notFound' | 'unknown';
}

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * Improves application robustness by preventing the entire app from crashing
 * when a component throws an error.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorType: 'unknown'
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Classify error type
        let errorType: 'domain' | 'notFound' | 'unknown' = 'unknown';

        if (error instanceof DomainError) {
            errorType = 'domain';
        } else if (error instanceof NotFoundError) {
            errorType = 'notFound';
        }

        return {
            hasError: true,
            error,
            errorType
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console for debugging
        console.error('🚨 [ErrorBoundary] Caught error:', error);
        console.error('📍 [ErrorBoundary] Component stack:', errorInfo.componentStack);

        // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
        // this.logErrorToService(error, errorInfo);

        this.setState({
            error,
            errorInfo
        });
    }

    resetError = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            errorType: 'unknown'
        });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback(
                    this.state.error,
                    this.state.errorInfo!,
                    this.resetError
                );
            }

            // Default fallback
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                                <i className="fas fa-exclamation-triangle text-2xl text-red-600 dark:text-red-400"></i>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                    Algo deu errado
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {this.state.errorType === 'notFound' ? 'Conteúdo não encontrado' :
                                        this.state.errorType === 'domain' ? 'Erro de validação' :
                                            'Erro inesperado'}
                                </p>
                            </div>
                        </div>

                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-300">
                                {this.state.error.message}
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                                    Stack Trace (Dev Only)
                                </summary>
                                <pre className="mt-2 overflow-auto text-[10px] text-slate-600 dark:text-slate-400">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-home"></i>
                                Ir para o Início
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={this.resetError}
                                    className="flex-1 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                                >
                                    Tentar Novamente
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                                >
                                    Recarregar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
