import React, { useState, useRef, useEffect } from 'react';
import { DropboxService, DropboxItem } from '../services/dropbox/DropboxService';

export interface DropboxFile {
  id: string;
  name: string;
  link: string;
  bytes: number;
  icon: string;
  isDir: boolean;
}

interface DropboxAudioBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudio: (url: string, filename: string) => void;
  appKey: string;
  initialFile?: DropboxFile | null;
  variant?: 'modal' | 'panel';
  usedAudioUrls?: string[]; // URLs of audio files already used in blocks
}

const DropboxAudioBrowser: React.FC<DropboxAudioBrowserProps> = ({
  isOpen,
  onClose,
  onSelectAudio,
  variant = 'modal',
  usedAudioUrls = []
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

  // Estado de Seleção e Preview
  const [selectedItem, setSelectedItem] = useState<DropboxItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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
    try {
      const entries = await DropboxService.listFolder(path);

      // Filtrar apenas pastas e arquivos de áudio
      const filtered = entries.filter(item => {
        if (item.tag === 'folder') return true;
        const ext = item.name.split('.').pop()?.toLowerCase();
        return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma', 'aiff', 'alac', 'm4b', 'opus', 'webm', 'mid', 'midi'].includes(ext || '');
      });

      // Ordenar: Pastas primeiro, depois arquivos
      filtered.sort((a, b) => {
        if (a.tag === b.tag) return a.name.localeCompare(b.name);
        return a.tag === 'folder' ? -1 : 1;
      });

      console.log('✅ Dropbox filter - Skipping filter to show all files (Used files will be visible)');
      const availableItems = filtered;

      setItems(availableItems);
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
      setLoading(true);
      try {
        // Validar que temos um caminho válido
        const filePath = item.path_lower || item.path_display;
        if (!filePath) {
          throw new Error('Caminho do arquivo não disponível');
        }

        // Obter link compartilhado PERMANENTE (não expira)
        console.log('🔗 Creating permanent shared link for:', item.name);
        console.log('📂 File path:', filePath);
        const link = await DropboxService.createSharedLink(filePath);
        console.log('✅ Permanent link created:', link);
        setPreviewUrl(link);
      } catch (err: any) {
        console.error('Error creating shared link:', err);

        // Verificar se é erro de autenticação
        if (err?.status === 401 || err?.error?.error_summary?.includes('invalid_access_token')) {
          setError('Sessão do Dropbox expirada. Por favor, reconecte.');
        } else if (err?.status === 400) {
          setError('Erro ao obter link do arquivo. Verifique se o arquivo existe no Dropbox.');
        } else {
          setError('Erro ao obter link do arquivo. Tentar reconectar.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      loadFolder(''); // Raiz
      return;
    }
    // Reconstrói o caminho baseado nos segmentos atuais
    // Obs: Isso é simplificado. O ideal seria manter um array de objetos path/name
    // Para simplicidade, vamos assumir navegação simples ou resetar para raiz
    // Melhor implementação: Botão "Voltar" ou "Raiz"
    loadFolder('');
  };

  const handleBack = () => {
    // Lógica simples para voltar um nível (exige persistência de histórico ou manipulação de string)
    if (currentPath === '') return;

    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    loadFolder(parentPath);
  };

  // Audio Controls
  const togglePreview = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const confirmSelection = () => {
    if (selectedItem && previewUrl) {
      onSelectAudio(previewUrl, selectedItem.name);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Renderização Exclusiva do Painel (Variant Panel)
  // Se precisarmos do modal, podemos manter o código antigo, mas focaremos no Panel
  const isPanel = variant === 'panel';

  return (
    <div className={`absolute top-4 right-0 bottom-4 w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-500 ease-in-out transform ${isOpen ? 'translate-x-[100%] opacity-100 z-10' : 'translate-x-[20%] opacity-0 -z-10'} flex flex-col rounded-r-3xl overflow-hidden`}>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <i className="fab fa-dropbox text-[#0061FE] text-lg"></i>
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">Dropbox</h3>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400">
          <i className="fas fa-times text-xs"></i>
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
              <p className="text-xs text-slate-500 mt-2">
                Conecte-se para acessar seus arquivos de áudio diretamente aqui.
              </p>
            </div>
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-[#0061FE] hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
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
                  <button onClick={handleBack} className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500">
                    <i className="fas fa-arrow-left text-xs"></i>
                  </button>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                    {currentPath === '' ? 'Arquivos' : currentPath.split('/').pop()}
                  </p>
                </div>
                <button onClick={loadFolder.bind(null, currentPath)} className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500">
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
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              {/* Contador de Arquivos Disponíveis */}
              <div className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <i className="fas fa-music text-indigo-600 dark:text-indigo-400 text-xs"></i>
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {items.filter(item => item.tag === 'file').length} {items.filter(item => item.tag === 'file').length === 1 ? 'arquivo disponível' : 'arquivos disponíveis'}
                </span>
              </div>
            </div>

            {/* Lista de Arquivos */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <i className="fas fa-spinner fa-spin text-indigo-500"></i>
                  <span className="text-xs text-slate-400">Carregando...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-40 text-red-500 gap-2 p-4 text-center">
                  <i className="fas fa-exclamation-circle text-2xl"></i>
                  <span className="text-xs font-bold">{error}</span>
                  <button
                    onClick={() => {
                      DropboxService.logout();
                      setIsAuthenticated(false);
                      handleLogin();
                    }}
                    className="text-[10px] underline mt-2 hover:text-red-700"
                  >
                    Tentar reconectar
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                  <i className="far fa-folder-open text-2xl opacity-50"></i>
                  <span className="text-xs">Pasta vazia</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {items
                    .filter(item => {
                      if (!searchQuery) return true;
                      // Search for query anywhere in filename (case-insensitive)
                      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    })
                    .map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors group ${selectedItem?.id === item.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${item.tag === 'folder'
                          ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30'
                          : 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30'
                          }`}>
                          <i className={`fas ${item.tag === 'folder' ? 'fa-folder' : 'fa-music'}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${selectedItem?.id === item.id
                            ? 'text-indigo-700 dark:text-indigo-400'
                            : 'text-slate-700 dark:text-slate-200'
                            }`}>
                            {item.name}
                          </p>
                          {item.size && (
                            <p className="text-[10px] text-slate-400">
                              {(item.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          )}
                        </div>
                        {usedAudioUrls.includes(item.name) && (
                          <span className="text-[10px] bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Usado
                          </span>
                        )}
                        {item.tag === 'folder' && (
                          <i className="fas fa-chevron-right text-xs text-slate-300 group-hover:text-slate-400"></i>
                        )}
                      </div>
                    ))}
                  {items.filter(item => !searchQuery || item.name.toLowerCase().startsWith(searchQuery.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">
                      Nenhum arquivo encontrado com "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Preview e Ação */}
            {selectedItem && selectedItem.tag === 'file' && (
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                {loading && !previewUrl ? (
                  <div className="h-10 flex items-center justify-center text-xs text-slate-400">
                    <i className="fas fa-circle-notch fa-spin mr-2"></i> Preparando...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <audio ref={audioRef} src={previewUrl || undefined} onEnded={() => setIsPlaying(false)} className="hidden" />

                    <div className="flex gap-2">
                      <button
                        onClick={togglePreview}
                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2"
                      >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        {isPlaying ? 'Pausar' : 'Ouvir'}
                      </button>
                      <button
                        onClick={confirmSelection}
                        className="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95"
                      >
                        Usar Arquivo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropboxAudioBrowser;
