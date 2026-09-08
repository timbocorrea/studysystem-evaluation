import { useState, useCallback, useRef } from 'react';

interface FormatState {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    fontSize: string;
    fontFamily: string;
    textAlign: string;
}

interface UseRichTextEditorReturn {
    currentFormat: FormatState;
    applyFormat: (command: string, value?: string) => void;
    updateFormatState: () => void;
    saveSelection: () => void;
    restoreSelection: () => void;
}

/**
 * Custom hook to manage rich text formatting
 * Encapsulates execCommand logic for future migration to TipTap/Slate.js
 */
export const useRichTextEditor = (): UseRichTextEditorReturn => {
    const [currentFormat, setCurrentFormat] = useState<FormatState>({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        fontSize: '16px',
        fontFamily: 'inherit',
        textAlign: 'left'
    });

    const savedRange = useRef<Range | null>(null);

    /**
     * Apply formatting command using execCommand
     */
    const applyFormat = useCallback((command: string, value?: string) => {
        try {
            document.execCommand(command, false, value);
            updateFormatState();
        } catch (error) {
            console.error('Error applying format:', error);
        }
    }, []);

    /**
     * Update current format state based on selection
     */
    const updateFormatState = useCallback(() => {
        try {
            setCurrentFormat({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                strikethrough: document.queryCommandState('strikeThrough'),
                fontSize: document.queryCommandValue('fontSize') || '16px',
                fontFamily: document.queryCommandValue('fontName') || 'inherit',
                textAlign: document.queryCommandValue('justifyLeft') ? 'left' :
                    document.queryCommandValue('justifyCenter') ? 'center' :
                        document.queryCommandValue('justifyRight') ? 'right' : 'left'
            });
        } catch (error) {
            console.error('Error updating format state:', error);
        }
    }, []);

    /**
     * Save current selection
     */
    const saveSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedRange.current = selection.getRangeAt(0);
        }
    }, []);

    /**
     * Restore previously saved selection
     */
    const restoreSelection = useCallback(() => {
        if (savedRange.current) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(savedRange.current);
        }
    }, []);

    return {
        currentFormat,
        applyFormat,
        updateFormatState,
        saveSelection,
        restoreSelection
    };
};
