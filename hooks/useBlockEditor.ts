import { useReducer, useCallback } from 'react';

export interface Block {
    id: string;
    type: string;
    text: string;
    spacing?: number;
    audioUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    [key: string]: any;
}

interface BlockState {
    blocks: Block[];
    selectedBlocks: Set<string>;
}

type BlockAction =
    | { type: 'SET_BLOCKS'; payload: Block[] }
    | { type: 'ADD_BLOCK'; payload: { block: Block; position?: number } }
    | { type: 'UPDATE_BLOCK'; payload: { id: string; updates: Partial<Block> } }
    | { type: 'REMOVE_BLOCK'; payload: string }
    | { type: 'MOVE_BLOCK'; payload: { fromIndex: number; toIndex: number } }
    | { type: 'REORDER_BLOCKS'; payload: Block[] }
    | { type: 'SELECT_BLOCK'; payload: string }
    | { type: 'DESELECT_BLOCK'; payload: string }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'REMOVE_SELECTED_BLOCKS' };

const blockReducer = (state: BlockState, action: BlockAction): BlockState => {
    switch (action.type) {
        case 'SET_BLOCKS':
            return {
                ...state,
                blocks: action.payload
            };

        case 'ADD_BLOCK': {
            const { block, position } = action.payload;
            const newBlocks = [...state.blocks];

            if (position !== undefined && position >= 0 && position <= newBlocks.length) {
                newBlocks.splice(position, 0, block);
            } else {
                newBlocks.push(block);
            }

            return {
                ...state,
                blocks: newBlocks
            };
        }

        case 'UPDATE_BLOCK': {
            const { id, updates } = action.payload;
            return {
                ...state,
                blocks: state.blocks.map(block =>
                    block.id === id ? { ...block, ...updates } : block
                )
            };
        }

        case 'REMOVE_BLOCK':
            return {
                ...state,
                blocks: state.blocks.filter(block => block.id !== action.payload),
                selectedBlocks: new Set(
                    Array.from(state.selectedBlocks).filter(id => id !== action.payload)
                )
            };

        case 'MOVE_BLOCK': {
            const { fromIndex, toIndex } = action.payload;
            const newBlocks = [...state.blocks];
            const [movedBlock] = newBlocks.splice(fromIndex, 1);
            newBlocks.splice(toIndex, 0, movedBlock);

            return {
                ...state,
                blocks: newBlocks
            };
        }

        case 'REORDER_BLOCKS':
            return {
                ...state,
                blocks: action.payload
            };

        case 'SELECT_BLOCK': {
            const newSelection = new Set(state.selectedBlocks);
            newSelection.add(action.payload);
            return {
                ...state,
                selectedBlocks: newSelection
            };
        }

        case 'DESELECT_BLOCK': {
            const newSelection = new Set(state.selectedBlocks);
            newSelection.delete(action.payload);
            return {
                ...state,
                selectedBlocks: newSelection
            };
        }

        case 'CLEAR_SELECTION':
            return {
                ...state,
                selectedBlocks: new Set()
            };

        case 'REMOVE_SELECTED_BLOCKS':
            return {
                ...state,
                blocks: state.blocks.filter(block => !state.selectedBlocks.has(block.id)),
                selectedBlocks: new Set()
            };

        default:
            return state;
    }
};

interface UseBlockEditorProps {
    initialBlocks?: Block[];
}

export const useBlockEditor = ({ initialBlocks = [] }: UseBlockEditorProps = {}) => {
    const [state, dispatch] = useReducer(blockReducer, {
        blocks: initialBlocks,
        selectedBlocks: new Set<string>()
    });

    const setBlocks = useCallback((blocks: Block[]) => {
        dispatch({ type: 'SET_BLOCKS', payload: blocks });
    }, []);

    const addBlock = useCallback((block: Block, position?: number) => {
        dispatch({ type: 'ADD_BLOCK', payload: { block, position } });
    }, []);

    const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
        dispatch({ type: 'UPDATE_BLOCK', payload: { id, updates } });
    }, []);

    const removeBlock = useCallback((id: string) => {
        dispatch({ type: 'REMOVE_BLOCK', payload: id });
    }, []);

    const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
        dispatch({ type: 'MOVE_BLOCK', payload: { fromIndex, toIndex } });
    }, []);

    const reorderBlocks = useCallback((blocks: Block[]) => {
        dispatch({ type: 'REORDER_BLOCKS', payload: blocks });
    }, []);

    const selectBlock = useCallback((id: string) => {
        dispatch({ type: 'SELECT_BLOCK', payload: id });
    }, []);

    const deselectBlock = useCallback((id: string) => {
        dispatch({ type: 'DESELECT_BLOCK', payload: id });
    }, []);

    const clearSelection = useCallback(() => {
        dispatch({ type: 'CLEAR_SELECTION' });
    }, []);

    const removeSelectedBlocks = useCallback(() => {
        dispatch({ type: 'REMOVE_SELECTED_BLOCKS' });
    }, []);

    return {
        blocks: state.blocks,
        selectedBlocks: state.selectedBlocks,
        setBlocks,
        addBlock,
        updateBlock,
        removeBlock,
        moveBlock,
        reorderBlocks,
        selectBlock,
        deselectBlock,
        clearSelection,
        removeSelectedBlocks
    };
};
