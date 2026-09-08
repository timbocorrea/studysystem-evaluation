import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlockEditor, Block } from '../../hooks/useBlockEditor';

describe('useBlockEditor', () => {
    const createMockBlock = (id: string, text: string = 'Test'): Block => ({
        id,
        type: 'text',
        text: `<p>${text}</p>`,
        spacing: 0
    });

    describe('Initialization', () => {
        it('should initialize with empty blocks', () => {
            const { result } = renderHook(() => useBlockEditor());

            expect(result.current.blocks).toEqual([]);
            expect(result.current.selectedBlocks.size).toBe(0);
        });

        it('should initialize with provided blocks', () => {
            const initialBlocks = [
                createMockBlock('block-1'),
                createMockBlock('block-2')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            expect(result.current.blocks).toEqual(initialBlocks);
        });
    });

    describe('addBlock', () => {
        it('should add block at the end by default', () => {
            const { result } = renderHook(() => useBlockEditor());

            act(() => {
                result.current.addBlock(createMockBlock('block-1'));
            });

            expect(result.current.blocks).toHaveLength(1);
            expect(result.current.blocks[0].id).toBe('block-1');
        });

        it('should add block at specific position', () => {
            const initialBlocks = [
                createMockBlock('block-1'),
                createMockBlock('block-3')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.addBlock(createMockBlock('block-2'), 1);
            });

            expect(result.current.blocks).toHaveLength(3);
            expect(result.current.blocks[1].id).toBe('block-2');
        });
    });

    describe('updateBlock', () => {
        it('should update block properties', () => {
            const initialBlocks = [createMockBlock('block-1', 'Original')];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.updateBlock('block-1', { text: '<p>Updated</p>' });
            });

            expect(result.current.blocks[0].text).toBe('<p>Updated</p>');
        });

        it('should not affect other blocks', () => {
            const initialBlocks = [
                createMockBlock('block-1'),
                createMockBlock('block-2')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.updateBlock('block-1', { text: '<p>Updated</p>' });
            });

            expect(result.current.blocks[1].text).toBe('<p>Test</p>');
        });
    });

    describe('removeBlock', () => {
        it('should remove block by id', () => {
            const initialBlocks = [
                createMockBlock('block-1'),
                createMockBlock('block-2')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.removeBlock('block-1');
            });

            expect(result.current.blocks).toHaveLength(1);
            expect(result.current.blocks[0].id).toBe('block-2');
        });

        it('should remove block from selection when removed', () => {
            const initialBlocks = [createMockBlock('block-1')];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.selectBlock('block-1');
                result.current.removeBlock('block-1');
            });

            expect(result.current.selectedBlocks.has('block-1')).toBe(false);
        });
    });

    describe('moveBlock', () => {
        it('should move block from one position to another', () => {
            const initialBlocks = [
                createMockBlock('block-1', 'First'),
                createMockBlock('block-2', 'Second'),
                createMockBlock('block-3', 'Third')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.moveBlock(0, 2); // Move first to last
            });

            expect(result.current.blocks[0].id).toBe('block-2');
            expect(result.current.blocks[2].id).toBe('block-1');
        });
    });

    describe('Block Selection', () => {
        it('should select a block', () => {
            const initialBlocks = [createMockBlock('block-1')];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.selectBlock('block-1');
            });

            expect(result.current.selectedBlocks.has('block-1')).toBe(true);
        });

        it('should select multiple blocks', () => {
            const initialBlocks = [
                createMockBlock('block-1'),
                createMockBlock('block-2')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.selectBlock('block-1');
                result.current.selectBlock('block-2');
            });

            expect(result.current.selectedBlocks.size).toBe(2);
        });

        it('should deselect a block', () => {
            const initialBlocks = [createMockBlock('block-1')];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.selectBlock('block-1');
                result.current.deselectBlock('block-1');
            });

            expect(result.current.selectedBlocks.has('block-1')).toBe(false);
        });

        it('should clear all selections', () => {
            const initialBlocks = [
                createMockBlock('block-1'),
                createMockBlock('block-2')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.selectBlock('block-1');
                result.current.selectBlock('block-2');
                result.current.clearSelection();
            });

            expect(result.current.selectedBlocks.size).toBe(0);
        });
    });

    describe('removeSelectedBlocks', () => {
        it('should remove all selected blocks', () => {
            const initialBlocks = [
                createMockBlock('block-1'),
                createMockBlock('block-2'),
                createMockBlock('block-3')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            act(() => {
                result.current.selectBlock('block-1');
                result.current.selectBlock('block-3');
                result.current.removeSelectedBlocks();
            });

            expect(result.current.blocks).toHaveLength(1);
            expect(result.current.blocks[0].id).toBe('block-2');
            expect(result.current.selectedBlocks.size).toBe(0);
        });
    });

    describe('reorderBlocks', () => {
        it('should replace blocks with new order', () => {
            const initialBlocks = [
                createMockBlock('block-1'),
                createMockBlock('block-2'),
                createMockBlock('block-3')
            ];

            const { result } = renderHook(() =>
                useBlockEditor({ initialBlocks })
            );

            const newOrder = [
                createMockBlock('block-3'),
                createMockBlock('block-1'),
                createMockBlock('block-2')
            ];

            act(() => {
                result.current.reorderBlocks(newOrder);
            });

            expect(result.current.blocks[0].id).toBe('block-3');
            expect(result.current.blocks[1].id).toBe('block-1');
            expect(result.current.blocks[2].id).toBe('block-2');
        });
    });
});
