import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabaseClient as supabase } from '../services/Dependencies';

const BUCKET_NAME = 'lesson-resources';
const INDEX_CACHE_TTL_MS = 5 * 60 * 1000;

interface FileInfo {
    name: string;
    id: string | null;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: any;
}

interface FileManagementProps {
    path?: string;
    onPathChange?: (path: string) => void;
}

const FileManagement: React.FC<FileManagementProps> = ({ path, onPathChange }) => {
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'images' | 'videos' | 'audios' | 'documents'>('all');
    const [internalPath, setInternalPath] = useState('');
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [folderStats, setFolderStats] = useState<Record<string, { count: number, size: number }>>({});
    const [globalStats, setGlobalStats] = useState({ total: 0, images: 0, media: 0, size: 0 });

    const currentPath = path !== undefined ? path : internalPath;
    const setCurrentPath = onPathChange || setInternalPath;
    const pathCacheRef = useRef<Record<string, FileInfo[]>>({});
    const fullIndexCacheRef = useRef<{ data: FileInfo[]; cachedAt: number } | null>(null);

    const getPathItems = useCallback(async (pathToList: string, forceRefresh = false): Promise<FileInfo[]> => {
        if (!forceRefresh && pathCacheRef.current[pathToList]) {
            return pathCacheRef.current[pathToList];
        }

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list(pathToList);

        if (error) throw error;
        const items = (data || []) as FileInfo[];
        pathCacheRef.current[pathToList] = items;
        return items;
    }, []);

    

    useEffect(() => {
        if (filterType === 'all') {
            loadFiles(currentPath);
        }
    }, [currentPath, filterType]);

    useEffect(() => {
        if (filterType !== 'all') {
            // Flat mode ignores currentPath, so avoid reloading when only path changes.
            loadFiles('');
        }
    }, [filterType]);

    useEffect(() => {
        // Calculate global stats only when in root or initial load
        calculateGlobalStats();
    }, []);

    const calculateGlobalStats = async (forceRefresh = false) => {
        try {
            const rootItems = await getPathItems('', forceRefresh);
            if (!rootItems) return;

            let totalCount = 0;
            let totalSize = 0;
            let imgCount = 0;
            let mediaCount = 0;
            const newFolderStats: Record<string, { count: number, size: number }> = {};

            const folders = rootItems.filter(i => i.id === null);
            const rootFiles = rootItems.filter(i => i.id !== null);

            totalCount += rootFiles.length;
            rootFiles.forEach(f => {
                totalSize += f.metadata?.size || 0;
                const type = getFileType(f.name);
                if (type === 'image') imgCount++;
                if (type === 'video' || type === 'audio') mediaCount++;
            });

            const folderResults = await Promise.all(
                folders.map(async (folder) => ({
                    folderName: folder.name,
                    items: await getPathItems(folder.name, forceRefresh)
                }))
            );

            folderResults.forEach(({ folderName, items }) => {
                const folderCount = items.length;
                const folderSize = items.reduce((acc, item) => acc + (item.metadata?.size || 0), 0);

                newFolderStats[folderName] = { count: folderCount, size: folderSize };
                totalCount += folderCount;
                totalSize += folderSize;

                items.forEach(f => {
                    const type = getFileType(f.name);
                    if (type === 'image') imgCount++;
                    if (type === 'video' || type === 'audio') mediaCount++;
                });
            });

            setGlobalStats({ total: totalCount, images: imgCount, media: mediaCount, size: totalSize });
            setFolderStats(newFolderStats);
        } catch (err) {
            // Keep UI functional even if stats fail; listing still works.
            console.error('Failed to calculate global stats:', err);
        }
    };

    const loadFiles = async (path: string = '', forceRefresh = false) => {
        try {
            setLoading(true);
            setError('');

            // If filtering, we want to see ALL files of that type, regardless of folder structure
            if (filterType !== 'all') {
                const cachedIndex = fullIndexCacheRef.current;
                const isCacheValid =
                    !forceRefresh &&
                    !!cachedIndex &&
                    (Date.now() - cachedIndex.cachedAt) < INDEX_CACHE_TTL_MS;

                if (isCacheValid && cachedIndex) {
                    setFiles(cachedIndex.data);
                    return;
                }

                const allFiles: FileInfo[] = [];

                // 1. Get root files
                const rootData = await getPathItems('', forceRefresh);

                if (rootData) {
                    // Add root files that match
                    const rootFiles = rootData.filter(i => i.id !== null);
                    allFiles.push(...rootFiles);

                    // 2. Get folders
                    const folders = rootData.filter(i => i.id === null);

                    // 3. Fetch content from each folder
                    // Parallel fetching for performance
                    await Promise.all(folders.map(async (folder) => {
                        const folderData = await getPathItems(folder.name, forceRefresh);
                        if (folderData) {
                            const filesInFolder = folderData.filter(f => f.id !== null).map(f => ({
                                ...f,
                                name: `${folder.name}/${f.name}` // Prepend folder name for flattening
                            }));
                            allFiles.push(...filesInFolder);
                        }
                    }));
                }

                fullIndexCacheRef.current = {
                    data: allFiles,
                    cachedAt: Date.now()
                };
                setFiles(allFiles);
            } else {
                // Normal behavior: list current path
                const data = await getPathItems(path, forceRefresh);
                setFiles(data || []);
            }

        } catch (err: any) {
            setError(err.message || 'Erro ao carregar arquivos');
        } finally {
            setLoading(false);
        }
    };

    const getFileUrl = (filePath: string) => {
        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);
        return data.publicUrl;
    };

    const downloadFile = async (fileName: string) => {
        const fullPath = currentPath ? currentPath + '/' + fileName : fileName;
        const url = getFileUrl(fullPath);
        window.open(url, '_blank');
    };

    const openFolder = (folderName: string) => {
        const newPath = currentPath ? currentPath + '/' + folderName : folderName;
        setCurrentPath(newPath);
    };

    const goBack = () => {
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
    };

    const deleteFile = async (fileName: string) => {
        if (!window.confirm('Tem certeza que deseja excluir "' + fileName + '"?')) return;

        try {
            setDeleting(fileName);
            const fullPath = currentPath ? currentPath + '/' + fileName : fileName;
            const { error: deleteError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([fullPath]);

            if (deleteError) throw deleteError;

            // Invalidate caches to avoid stale UI and stale stats after delete.
            pathCacheRef.current = {};
            fullIndexCacheRef.current = null;
            await Promise.all([
                loadFiles(filterType === 'all' ? currentPath : '', true),
                calculateGlobalStats(true)
            ]);
        } catch (err: any) {
            toast.error('Erro ao excluir arquivo: ' + err.message);
        } finally {
            setDeleting(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFileType = (fileName: string): string => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
        if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext || '')) return 'video';
        if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'].includes(ext || '')) return 'audio';
        if (['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext || '')) return 'document';
        return 'other';
    };

    const getFileIcon = (fileName: string): string => {
        const type = getFileType(fileName);
        switch (type) {
            case 'image': return 'fas fa-image text-blue-500';
            case 'video': return 'fas fa-video text-cyan-500';
            case 'audio': return 'fas fa-music text-green-500';
            case 'document': return 'fas fa-file-alt text-red-500';
            default: return 'fas fa-file text-slate-500';
        }
    };

    const filteredFiles = files.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        // If 'all', we are in browsing mode (folders + files)
        // If filtered, 'files' already contains flat list of everything matching, 
        // BUT we still need to apply the type check strictly because 'loadFiles' fetched EVERYTHING to flatten it.
        // Wait, 'loadFiles' above fetches everything. so we DO need to filter by type here still.
        // Actually, let's keep the filter logic here to be safe and cleaner.

        if (filterType === 'all') return true;

        // If filtering, we are in Flat Mode. Folders are not "files" in this mode usually,
        // but if we want to show *folders* that match? 
        // No, user wants to see their audios/images.
        // So in Flat Mode (filter != all), we usually just show files.
        // Unless it's a "folder" that is somehow relevant? No.
        if (file.id === null) return false; // Hide folders in flat filter mode

        const fileType = getFileType(file.name);
        return fileType === filterType.replace('s', '');
    });

    const currentStats = currentPath === '' ? globalStats : {
        total: files.length,
        images: files.filter(f => getFileType(f.name) === 'image').length,
        media: files.filter(f => getFileType(f.name) === 'video').length + files.filter(f => getFileType(f.name) === 'audio').length,
        size: files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
                    Gerenciar Arquivos
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Visualize e gerencie todos os arquivos enviados para o sistema
                </p>

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={() => setCurrentPath('')}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        <i className="fas fa-home mr-1"></i>
                        Raiz
                    </button>
                    {currentPath.split('/').filter(Boolean).map((folder, index, arr) => (
                        <React.Fragment key={index}>
                            <i className="fas fa-chevron-right text-xs text-slate-400"></i>
                            <button
                                onClick={() => setCurrentPath(arr.slice(0, index + 1).join('/'))}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {folder}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                            <i className="fas fa-folder text-indigo-600 dark:text-indigo-400"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{currentStats.total}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Total de Arquivos</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <i className="fas fa-image text-blue-600 dark:text-blue-400"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{currentStats.images}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Imagens</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                            <i className="fas fa-video text-cyan-600 dark:text-cyan-400"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{currentStats.media}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Mídia</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <i className="fas fa-hdd text-green-600 dark:text-green-400"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatSize(currentStats.size)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Espaço Usado</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Buscar arquivos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'images', 'videos', 'audios', 'documents'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type as any)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterType === type
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Carregando arquivos...</p>
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <i className="fas fa-folder-open text-4xl mb-2"></i>
                    <p>Nenhum arquivo encontrado</p>
                    {currentPath && (
                        <button
                            onClick={goBack}
                            className="mt-4 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            Voltar
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Arquivo</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Tamanho</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Data</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFiles.map(file => {
                                    const isFolder = file.id === null;
                                    const isImage = !isFolder && getFileType(file.name) === 'image';
                                    const fullPath = currentPath ? currentPath + '/' + file.name : file.name;

                                    return (
                                        <tr key={file.name} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {isFolder ? (
                                                        <>
                                                            <i className="fas fa-folder text-yellow-500"></i>
                                                            <button
                                                                onClick={() => openFolder(file.name)}
                                                                className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-md text-left"
                                                            >
                                                                {file.name}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className={getFileIcon(file.name)}></i>
                                                            <span className="font-medium text-slate-800 dark:text-white truncate max-w-md">
                                                                {file.name}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {isFolder
                                                    ? (folderStats[file.name] ? `${folderStats[file.name].count} items · ${formatSize(folderStats[file.name].size)}` : 'Calculando...')
                                                    : formatSize(file.metadata?.size || 0)
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {formatDate(file.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!isFolder && isImage && (
                                                        <button
                                                            onClick={() => setPreviewFile(getFileUrl(fullPath))}
                                                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                                                            title="Visualizar"
                                                        >
                                                            <i className="fas fa-eye"></i>
                                                        </button>
                                                    )}
                                                    {!isFolder && (
                                                        <button
                                                            onClick={() => downloadFile(file.name)}
                                                            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
                                                            title="Download"
                                                        >
                                                            <i className="fas fa-download"></i>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteFile(file.name)}
                                                        disabled={deleting === file.name}
                                                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {deleting === file.name ? (
                                                            <><i className="fas fa-spinner fa-spin mr-1"></i> Excluindo...</>
                                                        ) : (
                                                            <><i className="fas fa-trash mr-1"></i> Excluir</>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden grid grid-cols-1 gap-3">
                        {filteredFiles.map(file => {
                            const isFolder = file.id === null;
                            const isImage = !isFolder && getFileType(file.name) === 'image';
                            const fullPath = currentPath ? currentPath + '/' + file.name : file.name;

                            return (
                                <div key={file.name} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            {isFolder ? (
                                                <i className="fas fa-folder text-yellow-500"></i>
                                            ) : (
                                                <i className={getFileIcon(file.name)}></i>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {isFolder ? (
                                                <button
                                                    onClick={() => openFolder(file.name)}
                                                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline block text-left truncate"
                                                >
                                                    {file.name}
                                                </button>
                                            ) : (
                                                <p className="font-semibold text-slate-800 dark:text-white truncate">
                                                    {file.name}
                                                </p>
                                            )}
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                {isFolder
                                                    ? (folderStats[file.name] ? `${folderStats[file.name].count} items · ${formatSize(folderStats[file.name].size)}` : 'Calculando...')
                                                    : formatSize(file.metadata?.size || 0)
                                                }
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {formatDate(file.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {!isFolder && isImage && (
                                            <button
                                                onClick={() => setPreviewFile(getFileUrl(fullPath))}
                                                className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                                                title="Visualizar"
                                            >
                                                <i className="fas fa-eye mr-2"></i> Visualizar
                                            </button>
                                        )}
                                        {!isFolder && (
                                            <button
                                                onClick={() => downloadFile(file.name)}
                                                className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
                                                title="Download"
                                            >
                                                <i className="fas fa-download mr-2"></i> Download
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteFile(file.name)}
                                            disabled={deleting === file.name}
                                            className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {deleting === file.name ? (
                                                <><i className="fas fa-spinner fa-spin mr-2"></i> Excluindo...</>
                                            ) : (
                                                <><i className="fas fa-trash mr-2"></i> Excluir</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Preview Modal */}
            {previewFile && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setPreviewFile(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setPreviewFile(null)}
                            className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors"
                        >
                            <i className="fas fa-times text-2xl"></i>
                        </button>
                        <img
                            src={previewFile}
                            alt="Preview"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileManagement;

