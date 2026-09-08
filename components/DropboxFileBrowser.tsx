
import React, { useState, useEffect } from 'react';
import { DropboxService, DropboxItem } from '../services/dropbox/DropboxService';

export interface DropboxFile {
    id: string;
    name: string;
    link: string;
    bytes: number;
    icon: string;
    isDir: boolean;
}

interface DropboxFileBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFile: (url: string, filename: string) => void;
    allowedExtensions?: string[]; // e.g. ['pdf', 'pptx']
    variant?: 'modal' | 'panel';
}

const DropboxFileBrowser: React.FC<DropboxFileBrowserProps> = ({
    isOpen,
    onClose,
    onSelectFile,
    allowedExtensions = ['pdf', 'pptx'],
    variant = 'modal'
}) => {
    // Estado de Autenticação e Navegação
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // Initialize from localStorage if available
    const [currentPath, setCurrentPath] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('dropbox_last_path') || '';
        }
        return '';
    });
    const [items, setItems] = useState<DropboxItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Estado de Seleção
    const [selectedItem, setSelectedItem] = useState<DropboxItem | null>(null);

    // Inicialização
    useEffect(() => {
        if (isOpen) {
            const auth = DropboxService.isAuthenticated();
            setIsAuthenticated(auth);
            if (auth) {
                loadFolder(currentPath);
            }
        }
    }, [isOpen]);

    // Persist path changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('dropbox_last_path', currentPath);
        }
    }, [currentPath]);

    // Carregar pasta
    const loadFolder = async (path: string) => {
        setLoading(true);
        setError(null);
        setSelectedItem(null); // Reset selection on navigation
        try {
            const entries = await DropboxService.listFolder(path);

            // Filtrar apenas pastas e arquivos permitidos
            const filtered = entries.filter(item => {
                if (item.tag === 'folder') return true;
                const ext = item.name.split('.').pop()?.toLowerCase();
                return allowedExtensions.includes(ext || '');
            });

            // Ordenar: Pastas primeiro, depois arquivos
            filtered.sort((a, b) => {
                if (a.tag === b.tag) return a.name.localeCompare(b.name);
                return a.tag === 'folder' ? -1 : 1;
            });

            setItems(filtered);
            setCurrentPath(path);
            setSearchQuery('');
        } catch (err) {
            console.error(err);

            // If loading the persisted path fails (e.g. folder deleted), try root
            if (path !== '') {
                console.log('Falha ao carregar path persistido, tentando raiz...');
                loadFolder('');
                return;
            }

            setError('Falha ao carregar arquivos. Tente reconectar.');
            if ((err as any).message === 'Sessão expirada') {
                setIsAuthenticated(false);
            }
        } finally {
            setLoading(false);
        }
    };

    // Autenticação
    const handleLogin = async () => {
        try {
            // Obter URL de autenticação
            const authUrl = await DropboxService.getAuthUrl();

            // Abrir em um popup centralizado
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                authUrl,
                'DropboxAuth',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
            );

            if (!popup) {
                setError('O bloqueador de popups impediu a abertura da janela de login.');
                return;
            }

            setLoading(true);

            // Função para escutar a mensagem do popup
            const handleMessage = (event: MessageEvent) => {
                // Verificar origem por segurança (opcional, mas recomendado)
                if (event.origin !== window.location.origin) return;

                if (event.data?.type === 'DROPBOX_AUTH_SUCCESS' && event.data?.token) {
                    const token = event.data.token;

                    // Salvar token e atualizar estado
                    DropboxService.setAccessToken(token);
                    setIsAuthenticated(true);
                    loadFolder(''); // Carrega raiz

                    // Limpar listener e fechar popup (caso não tenha fechado)
                    window.removeEventListener('message', handleMessage);
                    popup.close();
                    setLoading(false);
                }
            };

            window.addEventListener('message', handleMessage);

            // Monitorar se o popup foi fechado manualmente pelo usuário
            const checkPopupUrl = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopupUrl);
                    window.removeEventListener('message', handleMessage);
                    setLoading(false);
                    // Se não autenticou, não faz nada (usuário apenas fechou)
                }
            }, 1000);

        } catch (err: any) {
            console.error('Erro ao iniciar login:', err);
            setError(err.message || 'Erro ao iniciar conexão com Dropbox');
            setLoading(false);
        }
    };

    // Navegação
    const handleItemClick = async (item: DropboxItem) => {
        if (item.tag === 'folder') {
            // Entrar na pasta
            loadFolder(item.path_lower || item.id);
        } else {
            // Selecionar arquivo
            setSelectedItem(item);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        // Simplificado para raiz por enquanto
        loadFolder('');
    };

    const handleBack = () => {
        // Lógica simples para voltar um nível
        if (currentPath === '') return;

        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        loadFolder(parentPath);
    };

    const confirmSelection = async () => {
        if (!selectedItem) return;

        setLoading(true);
        try {
            const filePath = selectedItem.path_lower || selectedItem.path_display;
            if (!filePath) throw new Error('Caminho do arquivo não disponível');

            // Check if file is already a shared link (unlikely from listFolder, but good safeguard)
            // Otherwise create/get shared link
            const link = await DropboxService.createSharedLink(filePath);

            // Convert to raw=1 for direct access immediately
            const directLink = link.replace(/dl=[01]/, 'raw=1');

            onSelectFile(directLink, selectedItem.name);
            onClose();
        } catch (err: any) {
            console.error('Error selecting file:', err);
            setError('Erro ao obter link do arquivo. ' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <i className="fab fa-dropbox text-[#0061FE] text-lg"></i>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Selecionar Arquivo do Dropbox</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Conteúdo Principal */}
                <div className="flex-1 flex flex-col overflow-hidden relative">

                    {/* Tela de Login (Se não autenticado) */}
                    {!isAuthenticated ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-2">
                                <i className="fab fa-dropbox text-3xl text-[#0061FE]"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">Conectar Conta</h4>
                                <p className="text-sm text-slate-500 mt-2">
                                    Conecte-se para selecionar seus arquivos ({allowedExtensions.join(', ').toUpperCase()}).
                                </p>
                            </div>
                            <button
                                onClick={handleLogin}
                                className="px-6 py-3 bg-[#0061FE] hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-sign-in-alt"></i>
                                Conectar Dropbox
                            </button>

                            {error && (
                                <div className="text-red-500 text-xs mt-4 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg animate-pulse">
                                    <i className="fas fa-exclamation-circle mr-1"></i>
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        // Navegador de Arquivos (Se autenticado)
                        <div className="flex-1 flex flex-col h-full">

                            {/* Barra de Navegação */}
                            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-2">
                                    {currentPath !== '' && (
                                        <button onClick={handleBack} className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors">
                                            <i className="fas fa-arrow-left"></i>
                                        </button>
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate">
                                            {currentPath === '' ? 'Arquivos' : currentPath.split('/').pop()}
                                        </p>
                                    </div>
                                    <button onClick={loadFolder.bind(null, currentPath)} className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors">
                                        <i className="fas fa-sync-alt text-xs"></i>
                                    </button>
                                </div>

                                {/* Filtro de Arquivos */}
                                <div className="relative">
                                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                    <input
                                        type="text"
                                        placeholder="Filtrar arquivos..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Lista de Arquivos */}
                            <div className="flex-1 overflow-y-auto p-2">
                                {loading && !selectedItem ? (
                                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                                        <i className="fas fa-spinner fa-spin text-indigo-500 text-2xl"></i>
                                        <span className="text-sm text-slate-400">Carregando...</span>
                                    </div>
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-red-500 gap-2 p-4 text-center">
                                        <i className="fas fa-exclamation-circle text-2xl"></i>
                                        <span className="text-sm font-bold">{error}</span>
                                        <button
                                            onClick={() => {
                                                DropboxService.logout();
                                                setIsAuthenticated(false);
                                                handleLogin();
                                            }}
                                            className="text-xs underline mt-2 hover:text-red-700 cursor-pointer"
                                        >
                                            Tentar reconectar
                                        </button>
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-60 text-slate-400 gap-3">
                                        <i className="far fa-folder-open text-4xl opacity-50"></i>
                                        <span className="text-sm">Pasta vazia ou sem arquivos compatíveis</span>
                                        <span className="text-xs opacity-75">({allowedExtensions.join(', ')})</span>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {items
                                            .filter(item => {
                                                if (!searchQuery) return true;
                                                return item.name.toLowerCase().includes(searchQuery.toLowerCase());
                                            })
                                            .map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleItemClick(item)}
                                                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all group ${selectedItem?.id === item.id
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500 shadow-sm'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${item.tag === 'folder'
                                                        ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30'
                                                        : 'bg-blue-100 text-blue-500 dark:bg-blue-900/30'
                                                        }`}>
                                                        <i className={`fas ${item.tag === 'folder' ? 'fa-folder' : 'fa-file-alt'}`}></i>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-bold truncate ${selectedItem?.id === item.id
                                                            ? 'text-indigo-700 dark:text-indigo-400'
                                                            : 'text-slate-700 dark:text-slate-200'
                                                            }`}>
                                                            {item.name}
                                                        </p>
                                                        {item.size && (
                                                            <p className="text-xs text-slate-400">
                                                                {(item.size / 1024 / 1024).toFixed(1)} MB
                                                            </p>
                                                        )}
                                                    </div>
                                                    {selectedItem?.id === item.id && (
                                                        <i className="fas fa-check-circle text-indigo-500 text-lg animate-in zoom-in duration-200"></i>
                                                    )}
                                                    {item.tag === 'folder' && (
                                                        <i className="fas fa-chevron-right text-sm text-slate-300 group-hover:text-slate-400"></i>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer de Ação */}
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold text-sm transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmSelection}
                                        disabled={!selectedItem || loading}
                                        className={`px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 ${!selectedItem || loading
                                            ? 'opacity-50 cursor-not-allowed grayscale'
                                            : 'hover:bg-indigo-700 active:scale-95'
                                            }`}
                                    >
                                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                                        Selecionar Arquivo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DropboxFileBrowser;
