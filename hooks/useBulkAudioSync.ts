import { useState, useCallback } from 'react';

interface UseBulkAudioSyncReturn {
    selectedBlockIds: Set<string>;
    toggleBlockSelection: (blockId: string) => void;
    selectAll: (blockIds: string[]) => void;
    deselectAll: () => void;
    isSelected: (blockId: string) => boolean;
    selectedCount: number;
}

export const useBulkAudioSync = (): UseBulkAudioSyncReturn => {
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());

    const toggleBlockSelection = useCallback((blockId: string) => {
        setSelectedBlockIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(blockId)) {
                newSet.delete(blockId);
            } else {
                newSet.add(blockId);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback((blockIds: string[]) => {
        setSelectedBlockIds(new Set(blockIds));
    }, []);

    const deselectAll = useCallback(() => {
        setSelectedBlockIds(new Set());
    }, []);

    const isSelected = useCallback((blockId: string) => {
        return selectedBlockIds.has(blockId);
    }, [selectedBlockIds]);

    return {
        selectedBlockIds,
        toggleBlockSelection,
        selectAll,
        deselectAll,
        isSelected,
        selectedCount: selectedBlockIds.size,
    };
};
