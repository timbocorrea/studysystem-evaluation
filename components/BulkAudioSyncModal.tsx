import React, { useState, useEffect } from 'react';
import { DropboxService, DropboxItem } from '../services/dropbox/DropboxService';
import { IContentBlock } from '../domain/entities';
import { SearchableSelect } from './SearchableSelect';
import { DropboxFileTree } from './DropboxFileTree';
import { MiniAudioPlayer } from './MiniAudioPlayer';
import { toast } from 'sonner';

interface BulkAudioSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedBlocks: IContentBlock[];
    onSync: (blockId: string, audioUrl: string, filename: string) => Promise<void>;
}

interface BlockAudioMapping {
    blockId: string;
    audioPath: string | null;
    audioUrl: string | null;
    filename: string | null;
    status: 'pending' | 'syncing' | 'success' | 'error';
    error?: string;
}

const BulkAudioSyncModal: React.FC<BulkAudioSyncModalProps> = ({
    isOpen,
    onClose,
    selectedBlocks,
    onSync
}) => {
    const [dropboxFiles, setDropboxFiles] = useState<DropboxItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPath, setCurrentPath] = useState('');
    const [mappings, setMappings] = useState<Map<string, BlockAudioMapping>>(new Map());
    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalToSync, setTotalToSync] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [hideSynced, setHideSynced] = useState(true); // Default to hiding synced blocks
    const blockRefs = React.useRef<Map<string, HTMLDivElement | null>>(new Map());

    // Initialize mappings when blocks change
    // Initialize/Update mappings when blocks change
    useEffect(() => {
        setMappings(prev => {
            const newMappings = new Map(prev);
            const currentBlockIds = new Set(selectedBlocks.map(b => b.id));

            // Remove blocks that are no longer selected
            for (const key of newMappings.keys()) {
                if (!currentBlockIds.has(key)) {
                    newMappings.delete(key);
                }
            }

            // Add new blocks without overwriting existing ones
            selectedBlocks.forEach((block, index) => {
                if (!newMappings.has(block.id)) {
                    const hasAudio = !!block.audioUrl;
                    console.log(`[SyncModal] Initializing block ${index} (${block.id}): hasAudio=${hasAudio}, url=${block.audioUrl?.substring(0, 50)}...`);

                    newMappings.set(block.id, {
                        blockId: block.id,
                        audioPath: null, // explicit null
                        audioUrl: block.audioUrl || null,
                        filename: hasAudio ? 'Áudio Já Sincronizado' : null,
                        status: hasAudio ? 'success' : 'pending'
                    });
                } else {
                    // Log existing mapping to see if it's corrupted
                    const m = newMappings.get(block.id);
                    if (m && m.audioPath && m.audioPath.startsWith('http')) {
                        console.error(`[SyncModal] ⚠️ CORRUPTED MAPPING FOUND during update for ${block.id}:`, m);
                        // Auto-fix if corrupted
                        m.audioPath = null;
                        m.status = m.audioUrl ? 'success' : 'pending';
                    }
                }
            });

            return newMappings;
        });
    }, [selectedBlocks]);

    // List files when path or auth changes
    useEffect(() => {
        if (isAuthenticated) {
            loadFiles(currentPath);
        }
    }, [isAuthenticated, currentPath]);

    // Check auth status on mount
    useEffect(() => {
        const checkAuth = async () => {
            const isAuth = await DropboxService.isAuthenticated();
            setIsAuthenticated(isAuth);
            if (isAuth) {
                loadFiles('');
            }
        };
        checkAuth();
    }, []);

    const loadFiles = async (path: string) => {
        setLoading(true);
        try {
            const result = await DropboxService.listFolder(path);
            setDropboxFiles(result);
        } catch (error) {
            console.error('Error loading files:', error);
            const msg = error instanceof Error ? error.message : '';
            // Catch all auth-related errors and reset state to show Connect button
            if (
                msg.includes('autenticado') ||
                msg.includes('expirada') ||
                msg.includes('Permissões insuficientes') ||
                msg.includes('401')
            ) {
                setIsAuthenticated(false);
                toast.error('Sessão do Dropbox expirada. Reconecte sua conta.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Listen for Dropbox auth success from popup window
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'DROPBOX_AUTH_SUCCESS' && event.data?.token) {
                console.log('[SyncModal] Received Dropbox token from popup');
                // Initialize the token on the main window's DropboxService instance
                DropboxService.setAccessToken(event.data.token);
                setIsAuthenticated(true);
                loadFiles('');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleLogin = async () => {
        try {
            setAuthError(null);
            const authUrl = await DropboxService.getAuthUrl();

            // Open Dropbox auth in a POPUP instead of redirecting
            // This prevents Supabase from intercepting the #access_token hash
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.innerWidth - width) / 2;
            const top = window.screenY + (window.innerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'dropbox-auth',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
            );

            if (!popup) {
                setAuthError('Popup bloqueado pelo navegador. Permita popups para este site.');
                return;
            }

            // Monitor popup close (in case user closes it manually)
            const pollTimer = setInterval(() => {
                if (popup.closed) {
                    clearInterval(pollTimer);
                    // Check if auth was successful (token saved by callback page)
                    const isAuth = DropboxService.isAuthenticated();
                    if (isAuth) {
                        setIsAuthenticated(true);
                        loadFiles('');
                    }
                }
            }, 500);
        } catch (error) {
            console.error('Login error:', error);
            setAuthError('Falha ao conectar com Dropbox. Tente novamente.');
        }
    };

    const handleFolderClick = (path: string) => {
        setCurrentPath(path);
    };

    const handleFileSelect = (blockId: string, file: DropboxItem) => {
        console.log(`[SyncModal] Selecting file for block ${blockId}:`, file.path_lower);

        // Ensure we are using path_lower for internal logic, NOT the temporary download URL
        const selectedPath = file.path_lower || file.id;

        setMappings(prev => {
            const newMappings = new Map(prev);
            const mapping = newMappings.get(blockId);
            if (mapping) {
                mapping.audioPath = selectedPath;
                mapping.filename = file.name;
                mapping.status = 'pending';
                mapping.error = undefined;
                mapping.audioUrl = null; // Clear any previous URL until sync
            }
            return newMappings;
        });

        // Auto-scroll to next pending block after selecting a file
        setTimeout(() => {
            const blockIds = selectedBlocks.map(b => b.id);
            const currentIdx = blockIds.indexOf(blockId);
            // Find the next block that is still pending (no audio selected)
            for (let i = currentIdx + 1; i < blockIds.length; i++) {
                const nextBlockId = blockIds[i];
                const nextMapping = mappings.get(nextBlockId);
                // Skip blocks that are already synced or have audio selected
                if (nextMapping && nextMapping.status !== 'success' && !nextMapping.audioPath) {
                    const el = blockRefs.current.get(nextBlockId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        console.log(`[SyncModal] Auto-scrolled to next pending block ${i + 1} (${nextBlockId})`);

                        // Foco automático no próximo input usando o índice real da lista (i)
                        setTimeout(() => {
                            const nextInput = document.getElementById(`audio-input-${i}`);
                            if (nextInput) {
                                nextInput.focus();
                            }
                        }, 50);
                    }
                    break;
                }
            }
        }, 150);
    };

    const handleSyncAll = async () => {
        console.log('[SyncModal] handleSyncAll started. Mappings:', Array.from(mappings.entries()));

        // Only count pending items that have a path selected
        const toSyncCount = Array.from(mappings.values()).filter(m => m.audioPath && m.status !== 'success').length;
        if (toSyncCount === 0) {
            toast.error("Nenhum áudio novo selecionado para sincronizar.");
            return;
        }

        setSyncing(true);
        setTotalToSync(toSyncCount);
        setProgress(0);

        let successCount = 0;
        let errorCount = 0;

        for (const [blockId, mapping] of mappings.entries()) {
            console.log(`[SyncModal] Processing block ${blockId}:`, mapping);

            // Skip if no path selected OR already synced/syncing
            if (!mapping.audioPath || mapping.status === 'success' || mapping.status === 'syncing') {
                console.log(`[SyncModal] Skipping block ${blockId} (reason: path=${!mapping.audioPath}, status=${mapping.status})`);
                continue;
            }

            // Safety check: Is the path a URL?
            if (mapping.audioPath.startsWith('http')) {
                console.error(`[SyncModal] ❌ CRITICAL: Attempting to sync URL as path: ${mapping.audioPath}`);
                continue;
            }

            // Update status to syncing
            setMappings(prev => {
                const newMappings = new Map(prev);
                const m = newMappings.get(blockId);
                if (m) m.status = 'syncing';
                return newMappings;
            });

            // Auto-scroll to block being synced
            const el = blockRefs.current.get(blockId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            try {
                // Create permanent shared link
                const permanentUrl = await DropboxService.createSharedLink(mapping.audioPath);

                // Update mapping with URL
                setMappings(prev => {
                    const newMappings = new Map(prev);
                    const m = newMappings.get(blockId);
                    if (m) m.audioUrl = permanentUrl;
                    return newMappings;
                });

                // Call onSync callback
                await onSync(blockId, permanentUrl, mapping.filename || '');

                // Update status to success
                setMappings(prev => {
                    const newMappings = new Map(prev);
                    const m = newMappings.get(blockId);
                    if (m) m.status = 'success';
                    return newMappings;
                });
                successCount++;
            } catch (error) {
                console.error(`Error syncing block ${blockId}:`, error);
                errorCount++;
                setMappings(prev => {
                    const newMappings = new Map(prev);
                    const m = newMappings.get(blockId);
                    if (m) {
                        m.status = 'error';
                        m.error = error instanceof Error ? error.message : 'Erro desconhecido';
                    }
                    return newMappings;
                });
            } finally {
                setProgress(prev => prev + 1);
            }
        }

        setSyncing(false);

        if (successCount > 0 && errorCount === 0) {
            toast.success('Todos os áudios foram sincronizados com sucesso!');
            setTimeout(() => {
                onClose();
            }, 500);
        } else if (successCount > 0 && errorCount > 0) {
            toast.warning(`${successCount} áudios sincronizados, mas ${errorCount} falharam.`);
        }
    };

    const getStatusIcon = (status: BlockAudioMapping['status']) => {
        switch (status) {
            case 'pending': return '⚪';
            case 'syncing': return '⏳';
            case 'success': return '✅';
            case 'error': return '❌';
        }
    };

    const getStatusColor = (status: BlockAudioMapping['status']) => {
        switch (status) {
            case 'pending': return 'text-slate-400';
            case 'syncing': return 'text-blue-500';
            case 'success': return 'text-green-500';
            case 'error': return 'text-red-500';
        }
    };

    // Calculate counts correctly
    const syncedCount = Array.from(mappings.values()).filter(m => m.status === 'success').length;
    const pendingSelectionCount = Array.from(mappings.values()).filter(m => !!m.audioPath && m.status !== 'success').length;
    // Remaining are blocks that involve neither success nor a pending selection
    const totalCount = mappings.size;
    const remainingCount = Math.max(0, totalCount - syncedCount - pendingSelectionCount);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                Sincronizar Áudios do Dropbox
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {remainingCount} {remainingCount === 1 ? 'bloco restante' : 'blocos restantes'} para selecionar
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Toggle Show/Hide Synced */}
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400 select-none">
                                <input
                                    type="checkbox"
                                    checked={hideSynced}
                                    onChange={(e) => setHideSynced(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                />
                                Ocultar já sincronizados
                            </label>

                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left Column: File Tree */}
                    <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col">
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-medium text-xs text-slate-500 uppercase tracking-wider">
                            Navegador
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {isAuthenticated ? (
                                <DropboxFileTree
                                    currentPath={currentPath}
                                    onSelectFolder={handleFolderClick}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
                                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-2">
                                        <i className="fab fa-dropbox text-3xl text-[#0061FE]"></i>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">Conectar Dropbox</h4>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Conecte sua conta para selecionar seus arquivos de áudio.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleLogin}
                                        className="w-full py-2.5 bg-[#0061FE] hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <i className="fas fa-sign-in-alt"></i>
                                        Conectar
                                    </button>
                                    {authError && (
                                        <div className="text-red-500 text-[10px] bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                                            {authError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Content Blocks */}
                    <div className="w-2/3 flex flex-col bg-white dark:bg-slate-900">
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                            <div className="font-medium text-xs text-slate-500 uppercase tracking-wider">
                                Blocos & Arquivos
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                                {currentPath || '/'}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                {selectedBlocks.map((block, index) => {
                                    const mapping = mappings.get(block.id);
                                    if (!mapping) return null;

                                    // Filter out synced items if toggle is active
                                    if (hideSynced && mapping.status === 'success') return null;

                                    const isSelected = !!mapping.audioPath || mapping.status === 'success';

                                    // Filter files that are already selected in OTHER blocks
                                    const otherSelectedPaths = new Set(
                                        Array.from(mappings.values())
                                            .filter(m => m.blockId !== block.id && m.audioPath)
                                            .map(m => m.audioPath)
                                    );

                                    const availableFiles = dropboxFiles.filter(f =>
                                        f.tag === 'file' &&
                                        !otherSelectedPaths.has(f.path_lower || f.id)
                                    );

                                    const selectOptions = [
                                        // Keep current selection if valid
                                        ...(mapping.audioPath && mapping.filename && !dropboxFiles.find(f => (f.path_lower || f.id) === mapping.audioPath)
                                            ? [{ value: mapping.audioPath, label: `current: ${mapping.filename}` }]
                                            : []),
                                        // Available files
                                        ...availableFiles.map(file => ({
                                            value: file.path_lower || file.id,
                                            label: file.name
                                        }))
                                    ];

                                    return (
                                        <div
                                            key={block.id}
                                            ref={(el) => { blockRefs.current.set(block.id, el); }}
                                            className={`rounded-xl p-4 border transition-all duration-300 ${isSelected
                                                ? 'bg-green-50/50 dark:bg-green-900/10 border-green-500 dark:border-green-500 ring-1 ring-green-500'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Status Icon */}
                                                <div className={`text-2xl ${getStatusColor(mapping.status)}`}>
                                                    {getStatusIcon(mapping.status)}
                                                </div>

                                                {/* Block Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-bold text-slate-400">
                                                            Bloco {index + 1}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                                                        {block.text.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                                    </p>

                                                    {/* Audio Selection */}
                                                    <div className="flex items-center gap-2">
                                                        <SearchableSelect
                                                            id={`audio-input-${index}`}
                                                            value={mapping.audioPath || ''}
                                                            onChange={(val) => {
                                                                const file = dropboxFiles.find(f => (f.path_lower || f.id) === val);
                                                                if (file) {
                                                                    handleFileSelect(block.id, file);
                                                                }
                                                            }}
                                                            disabled={syncing || mapping.status === 'success'}
                                                            options={selectOptions}
                                                            placeholder="Selecionar áudio..."
                                                            className="flex-1 min-w-0"
                                                            noOptionsMessage={dropboxFiles.some(f => f.tag === 'folder')
                                                                ? "Use as pastas ao lado ⬅️ para encontrar os arquivos"
                                                                : "Nenhum arquivo encontrado nesta pasta"}
                                                        />

                                                        {/* Audio Preview & Remove */}
                                                        {mapping.audioPath && (
                                                            <div className="flex-shrink-0 flex items-center gap-1">
                                                                <MiniAudioPlayer
                                                                    path={mapping.audioPath || undefined}
                                                                    url={mapping.audioUrl || undefined}
                                                                    filename={mapping.filename || 'Audio'}
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        if (syncing) return;
                                                                        setMappings(prev => {
                                                                            const newMappings = new Map(prev);
                                                                            const m = newMappings.get(block.id);
                                                                            if (m) {
                                                                                m.audioPath = null;
                                                                                m.filename = null;
                                                                                m.audioUrl = null;
                                                                                m.status = 'pending';
                                                                            }
                                                                            return newMappings;
                                                                        });
                                                                    }}
                                                                    disabled={syncing}
                                                                    className="w-6 h-6 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                                                                    title="Remover áudio selecionado"
                                                                >
                                                                    <i className="fas fa-times text-xs"></i>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Error Message */}
                                                    {mapping.status === 'error' && mapping.error && (
                                                        <p className="text-xs text-red-500 mt-2">
                                                            {mapping.error}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                    {syncing && (
                        <div className="w-full">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Sincronizando...</span>
                                <span>{Math.round((progress / totalToSync) * 100)}% ({progress}/{totalToSync})</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${(progress / totalToSync) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            Selecionados: <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {Array.from(mappings.values()).filter(m => !!m.audioPath && m.status !== 'success').length}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                disabled={syncing}
                                className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSyncAll}
                                disabled={syncing || Array.from(mappings.values()).every(m => !m.audioPath)}
                                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {syncing && <i className="fas fa-spinner fa-spin"></i>}
                                {syncing ? 'Sincronizando...' : 'Sincronizar Todos'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkAudioSyncModal;
