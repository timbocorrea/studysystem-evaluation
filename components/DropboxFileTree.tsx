import React, { useState, useEffect } from 'react';
import { DropboxService, DropboxItem } from '../services/dropbox/DropboxService';
import { Tree, TreeItem } from './ui/tree';

interface FileTreeNodeProps {
    item: DropboxItem;
    level: number;
    selectedPath: string;
    onSelectFolder: (path: string) => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ item, level, selectedPath, onSelectFolder }) => {
    const isFolder = item.tag === 'folder';
    const isSelected = (item.path_lower || item.id) === selectedPath;
    const [children, setChildren] = useState<DropboxItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Load children when expanding a folder
    const handleExpandData = async () => {
        if (!isFolder) return;
        if (hasLoaded) return; // Already loaded

        setIsLoading(true);
        try {
            const result = await DropboxService.listFolder(item.path_lower || '');
            // Sort: folders first, then files
            result.sort((a, b) => {
                if (a.tag === b.tag) return a.name.localeCompare(b.name);
                return a.tag === 'folder' ? -1 : 1;
            });
            setChildren(result);
            setHasLoaded(true);
        } catch (error) {
            console.error('Error loading folder:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = () => {
        if (isFolder) {
            onSelectFolder(item.path_lower || item.id);
        }
    };

    return (
        <TreeItem
            level={level}
            label={item.name}
            isFolder={isFolder}
            isSelected={isSelected}
            onClick={(e) => {
                e.stopPropagation();
                handleSelect();
                if (isFolder && !isExpanded) {
                    setIsExpanded(true);
                    handleExpandData();
                } else if (isFolder && isExpanded) {
                    setIsExpanded(false);
                }
            }}
            onToggle={() => {
                // If standard toggle is clicked (chevron)
                if (isFolder && !isExpanded) handleExpandData();
                setIsExpanded(!isExpanded);
            }}
            // Custom Icon logic if needed, or let TreeItem default handle it.
            // But we want specific distinct icons for Audio vs Folders
            icon={
                isFolder ? undefined : (
                    <i className="fas fa-file-audio text-slate-400 text-sm"></i>
                )
            }
        >
            {isFolder && isLoading && (
                <div className="pl-6 py-1 text-xs text-slate-400 flex items-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i> Carregando...
                </div>
            )}
            {isFolder && hasLoaded && children.length === 0 && (
                <div className="pl-6 py-1 text-xs text-slate-400 italic">
                    Vazio
                </div>
            )}
            {isFolder && children.map(child => (
                <FileTreeNode
                    key={child.id}
                    item={child}
                    level={level + 1}
                    selectedPath={selectedPath}
                    onSelectFolder={onSelectFolder}
                />
            ))}
        </TreeItem>
    );
};

interface DropboxFileTreeProps {
    onSelectFolder: (path: string) => void;
    currentPath: string;
}

export const DropboxFileTree: React.FC<DropboxFileTreeProps> = ({ onSelectFolder, currentPath }) => {
    const [rootItems, setRootItems] = useState<DropboxItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoot();
    }, []);

    const loadRoot = async () => {
        setLoading(true);
        try {
            const result = await DropboxService.listFolder('');
            // Sort: folders first, then files
            result.sort((a, b) => {
                if (a.tag === b.tag) return a.name.localeCompare(b.name);
                return a.tag === 'folder' ? -1 : 1;
            });
            setRootItems(result);
        } catch (error) {
            console.error('Error loading root:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <i className="fas fa-spinner fa-spin text-indigo-500 text-2xl"></i>
            </div>
        );
    }

    return (
        <Tree className="h-full overflow-y-auto overflow-x-hidden pb-4 bg-transparent p-0">
            {/* Root "Home" Item manually added */}
            <TreeItem
                label="Início"
                isFolder={true} // Home acts as a folder
                isSelected={currentPath === '' || currentPath === '/'}
                level={0}
                onClick={() => onSelectFolder('')}
                icon={<i className="fas fa-home text-indigo-500 text-sm"></i>}
            >
                {rootItems.map(item => (
                    <FileTreeNode
                        key={item.id}
                        item={item}
                        level={1}
                        selectedPath={currentPath}
                        onSelectFolder={onSelectFolder}
                    />
                ))}
            </TreeItem>
        </Tree>
    );
};
