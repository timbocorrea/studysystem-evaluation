import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRichTextEditor } from '../../hooks/useRichTextEditor';

// Mock document.execCommand and queryCommand functions
beforeEach(() => {
    document.execCommand = vi.fn();
    document.queryCommandState = vi.fn(() => false);
    document.queryCommandValue = vi.fn(() => '');
});

describe('useRichTextEditor', () => {
    describe('Initialization', () => {
        it('should initialize with default format state', () => {
            const { result } = renderHook(() => useRichTextEditor());

            expect(result.current.currentFormat).toEqual({
                bold: false,
                italic: false,
                underline: false,
                strikethrough: false,
                fontSize: '16px',
                fontFamily: 'inherit',
                textAlign: 'left'
            });
        });
    });

    describe('applyFormat', () => {
        it('should call execCommand with correct parameters', () => {
            const { result } = renderHook(() => useRichTextEditor());

            act(() => {
                result.current.applyFormat('bold');
            });

            expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
        });

        it('should call execCommand with value', () => {
            const { result } = renderHook(() => useRichTextEditor());

            act(() => {
                result.current.applyFormat('fontSize', '18px');
            });

            expect(document.execCommand).toHaveBeenCalledWith('fontSize', false, '18px');
        });
    });

    describe('updateFormatState', () => {
        it('should update format state from queryCommand', () => {
            vi.mocked(document.queryCommandState).mockImplementation((command) => {
                return command === 'bold';
            });

            const { result } = renderHook(() => useRichTextEditor());

            act(() => {
                result.current.updateFormatState();
            });

            expect(result.current.currentFormat.bold).toBe(true);
        });
    });

    describe('Selection Management', () => {
        it('should save and restore selection', () => {
            const mockRange = {
                startContainer: document.body,
                endContainer: document.body,
                startOffset: 0,
                endOffset: 0
            } as unknown as Range;

            const mockSelection = {
                rangeCount: 1,
                getRangeAt: vi.fn(() => mockRange),
                removeAllRanges: vi.fn(),
                addRange: vi.fn()
            };

            vi.stubGlobal('getSelection', () => mockSelection);

            const { result } = renderHook(() => useRichTextEditor());

            act(() => {
                result.current.saveSelection();
            });

            expect(mockSelection.getRangeAt).toHaveBeenCalled();

            act(() => {
                result.current.restoreSelection();
            });

            expect(mockSelection.addRange).toHaveBeenCalled();
        });
    });
});
