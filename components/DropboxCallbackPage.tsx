import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropboxService } from '../services/dropbox/DropboxService';

const DropboxCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const processCallback = async () => {
            try {
                const token = await DropboxService.handleAuthCallback();

                if (token) {
                    setStatus('success');

                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'DROPBOX_AUTH_SUCCESS',
                            token: token
                        }, window.location.origin);

                        setTimeout(() => {
                            window.close();
                        }, 1000);
                    } else {
                        const returnUrl = sessionStorage.getItem('dropbox_return_url') || '/';
                        sessionStorage.removeItem('dropbox_return_url');

                        setTimeout(() => {
                            window.location.href = returnUrl;
                        }, 500);
                    }
                } else {
                    setStatus('error');
                    setErrorMessage('Não foi possível obter o token de acesso. Verifique se você autorizou o aplicativo.');
                }
            } catch (error) {
                console.error('Dropbox Callback Error:', error);
                setStatus('error');
                const msg = error instanceof Error ? error.message : 'Ocorreu um erro ao processar o login do Dropbox.';
                setErrorMessage(msg);
            }
        };

        processCallback();
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">

                {status === 'processing' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <h2 className="text-xl font-bold">Conectando ao Dropbox...</h2>
                        <p className="text-sm text-slate-500">Por favor, aguarde enquanto finalizamos a autenticação.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center space-y-4 text-green-600">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl">
                            <i className="fas fa-check"></i>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Conectado com Sucesso!</h2>
                        <p className="text-sm text-slate-500">Esta janela será fechada automaticamente...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center space-y-4 text-red-600">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-2xl">
                            <i className="fas fa-times"></i>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Falha na Conexão</h2>
                        <p className="text-sm text-slate-500">{errorMessage}</p>
                        <button
                            onClick={() => window.close()}
                            className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-slate-800 dark:text-slate-200 font-medium"
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DropboxCallbackPage;
