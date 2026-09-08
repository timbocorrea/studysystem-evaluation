import React, { useState, useEffect } from 'react';
import { serializeRange, deserializeRange, findRangeByText } from '../utils/xpathUtils';
import { LessonNotesRepository, LessonNote } from '../repositories/LessonNotesRepository';
import BuddyContextModal from './BuddyContextModal';
import MergeNotesModal from './MergeNotesModal';
import { toast } from 'sonner';

interface Note {
    id: string;
    title?: string;
    content: string;
    hasHighlight: boolean;
    highlightedText?: string;
    highlightColor?: 'yellow' | 'green' | 'blue' | 'pink';
    position: number;
    xpathStart?: string;
    offsetStart?: number;
    xpathEnd?: string;
    offsetEnd?: number;
    extraHighlights?: any[];
    createdAt?: string;
}

interface NotesPanelProps {
    userId: string;
    lessonId: string;
    refreshTrigger?: any; // Dispara restauracao quando mudar (ex: activeBlockId)
    onNoteSelect?: () => void;
    focusedNoteId?: string | null;
    onNotesChange?: (notes: Note[]) => void;
    externalDraft?: { text: string, range?: Range } | null;
}

const NotesPanelPrototype: React.FC<NotesPanelProps> = ({
    userId,
    lessonId,
    refreshTrigger,
    onNoteSelect,
    focusedNoteId,
    onNotesChange,
    externalDraft
}) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [selectedColor, setSelectedColor] = useState<'yellow' | 'green' | 'blue' | 'pink'>('yellow');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [savedSelection, setSavedSelection] = useState<{ text: string, range?: Range } | null>(null);
    const [appliedHighlightId, setAppliedHighlightId] = useState<string | null>(null); // Track applied highlight for color changes


    // Buddy Integration State
    const [showBuddyModal, setShowBuddyModal] = useState(false);
    const [buddyContext, setBuddyContext] = useState<string>('');
    const [activeBuddyNoteId, setActiveBuddyNoteId] = useState<string | null>(null);
    const [buddyNoteContent, setBuddyNoteContent] = useState<string>('');
    const [visibleNotes, setVisibleNotes] = useState<Set<string>>(new Set());
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [noteToMergeId, setNoteToMergeId] = useState<string | null>(null);

    const toggleNoteVisibility = (noteId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setVisibleNotes(prev => {
            const next = new Set(prev);
            if (next.has(noteId)) {
                next.delete(noteId);
            } else {
                next.add(noteId);
            }
            return next;
        });
    };

    // Handle external draft (from context menu)
    useEffect(() => {
        if (externalDraft) {
            setSavedSelection(externalDraft);
            setNewNoteContent(externalDraft.text);
            setShowColorPicker(true);
            setAppliedHighlightId(null);

            // Scroll notes panel to bottom to show picker
            setTimeout(() => {
                const container = document.querySelector('.notes-list-container');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 100);
        }
    }, [externalDraft]);



    // Carregar notas e restaurar destaques
    useEffect(() => {
        let isMounted = true;

        const loadNotesAndHighlights = async () => {
            if (!userId || !lessonId) return;

            // Se ja temos notas carregadas e e apenas um refresh do DOM, nao precisamos recarregar do banco
            // A menos que seja a primeira carga (loading is true)
            if (loading) {
                const dbNotes = await LessonNotesRepository.loadNotes(userId, lessonId);

                if (!isMounted) return;

                // Converter para formato frontend
                const frontendNotes: Note[] = dbNotes.map(n => ({
                    id: n.id,
                    title: n.title,
                    content: n.content || '',
                    hasHighlight: n.has_highlight,
                    highlightedText: n.highlighted_text,
                    highlightColor: n.highlight_color,
                    position: n.position,
                    xpathStart: n.xpath_start,
                    offsetStart: n.offset_start,
                    xpathEnd: n.xpath_end,
                    offsetEnd: n.offset_end,
                    extraHighlights: n.extra_highlights, // Added extraHighlights mapping
                    createdAt: n.created_at
                }));

                setNotes(frontendNotes);
                setLoading(false);
                restoreDomHighlights(frontendNotes);

                // Notifica pai na carga inicial
                if (onNotesChange) onNotesChange(frontendNotes);
            } else {
                // Apenas restaurar destaques no DOM (refresh disparado)
                restoreDomHighlights(notes);
            }
        };

        const restoreDomHighlights = (notesToRestore: Note[]) => {
            // Helper to apply a single highlight
            const applyHighlight = (id: string, color: string, xpathStart: string, xpathEnd: string, offsetStart: number, offsetEnd: number) => {
                try {
                    const range = deserializeRange({
                        xpathStart,
                        offsetStart,
                        xpathEnd,
                        offsetEnd
                    });

                    if (range) {
                        // Crucial: Check if this specific range is already highlighted to avoid double-wrapping
                        // We do this by checking if the startContainer is already inside a mark with the same ID
                        // or if the common ancestor is a mark.
                        let isAlreadyHighlighted = false;
                        let parent = range.commonAncestorContainer as HTMLElement;
                        while (parent && parent.nodeName !== 'BODY') {
                            if (parent.nodeName === 'MARK' && parent.getAttribute('data-note-id') === id) {
                                isAlreadyHighlighted = true;
                                break;
                            }
                            parent = parent.parentElement as HTMLElement;
                        }
                        if (isAlreadyHighlighted) return;

                        const highlightSpan = document.createElement('mark');
                        highlightSpan.className = `highlight-${color}`;
                        highlightSpan.style.backgroundColor =
                            color === 'yellow' ? '#fef08a' :
                                color === 'green' ? '#86efac' :
                                    color === 'blue' ? '#93c5fd' : '#f9a8d4';
                        highlightSpan.style.padding = '2px 4px';
                        highlightSpan.style.borderRadius = '4px';
                        highlightSpan.style.cursor = 'pointer';
                        highlightSpan.setAttribute('data-note-id', id);

                        const contents = range.extractContents();
                        highlightSpan.appendChild(contents);
                        range.insertNode(highlightSpan);
                        console.log('Destaque restaurado:', id);
                    }
                } catch (e) {
                    // Silencioso
                }
            };

            // Restaurar destaques no DOM
            // Aguardar um pouco para garantir que o conteudo da aula renderizou
            setTimeout(() => {
                notesToRestore.forEach(note => {
                    // 1. Restaurar destaque principal
                    if (note.hasHighlight && note.xpathStart && note.xpathEnd) {
                        applyHighlight(
                            note.id,
                            note.highlightColor || 'yellow',
                            note.xpathStart,
                            note.xpathEnd,
                            note.offsetStart!,
                            note.offsetEnd!
                        );
                    }

                    // 2. Restaurar destaques vinculados (extra highlights)
                    if (note.extraHighlights && Array.isArray(note.extraHighlights)) {
                        note.extraHighlights.forEach(extra => {
                            if (extra.xpathStart && extra.xpathEnd) {
                                applyHighlight(
                                    note.id,
                                    extra.color || 'yellow',
                                    extra.xpathStart,
                                    extra.xpathEnd,
                                    extra.offsetStart,
                                    extra.offsetEnd
                                );
                            }
                        });
                    }
                });
            }, 500); // Delay de 500ms
        };

        loadNotesAndHighlights();

        return () => { isMounted = false; };
    }, [userId, lessonId, refreshTrigger]); // Adicionado refreshTrigger

    // Apply or update highlight with instant visual feedback
    const applyOrUpdateHighlight = async (color: 'yellow' | 'green' | 'blue' | 'pink') => {
        if (!savedSelection) return;

        // If we already have an applied highlight, update its color
        if (appliedHighlightId) {
            const existingMark = document.querySelector(`mark[data-note-id="${appliedHighlightId}"]`);
            if (existingMark) {
                // Update visual color immediately
                const bgColor = color === 'yellow' ? '#fef08a' :
                    color === 'green' ? '#86efac' :
                        color === 'blue' ? '#93c5fd' : '#f9a8d4';
                (existingMark as HTMLElement).style.backgroundColor = bgColor;
                (existingMark as HTMLElement).className = `highlight-${color}`;

                // Update in database
                const note = notes.find(n => n.id === appliedHighlightId);
                if (note) {
                    await LessonNotesRepository.updateNote(appliedHighlightId, {
                        highlight_color: color
                    });
                    // Update local state
                    const updatedNotes = notes.map(n => n.id === appliedHighlightId ? { ...n, highlightColor: color } : n);
                    setNotes(updatedNotes);
                    if (onNotesChange) onNotesChange(updatedNotes);
                }
                setSelectedColor(color);
                return;
            }
        }

        // Create new highlight
        if (!savedSelection.range) return;
        try {
            const position = notes.length;
            const rangeSerialized = serializeRange(savedSelection.range);
            const newNote: Omit<LessonNote, 'id' | 'created_at' | 'updated_at'> = {
                user_id: userId,
                lesson_id: lessonId,
                content: newNoteContent,
                position: position,
                has_highlight: true,
                title: 'Destaque',
                highlighted_text: savedSelection.text,
                highlight_color: color as any,
                xpath_start: rangeSerialized.xpathStart,
                offset_start: rangeSerialized.offsetStart,
                xpath_end: rangeSerialized.xpathEnd,
                offset_end: rangeSerialized.offsetEnd
            };

            const savedNote = await LessonNotesRepository.saveNote(newNote);

            if (savedNote) {
                // Apply visual highlight immediately
                const highlightSpan = document.createElement('mark');
                highlightSpan.className = `highlight-${color}`;
                const bgColor = color === 'yellow' ? '#fef08a' :
                    color === 'green' ? '#86efac' :
                        color === 'blue' ? '#93c5fd' : '#f9a8d4';
                highlightSpan.style.backgroundColor = bgColor;
                highlightSpan.setAttribute('data-note-id', savedNote.id);
                highlightSpan.style.cursor = 'pointer';
                highlightSpan.style.borderRadius = '4px';
                highlightSpan.style.padding = '2px 4px';

                const contents = savedSelection.range!.extractContents();
                highlightSpan.appendChild(contents);
                savedSelection.range!.insertNode(highlightSpan);

                // Update local state
                const noteFrontend: Note = {
                    id: savedNote.id,
                    title: savedNote.title,
                    content: savedNote.content || '',
                    hasHighlight: savedNote.has_highlight,
                    highlightedText: savedNote.highlighted_text,
                    highlightColor: savedNote.highlight_color,
                    position: savedNote.position,
                    xpathStart: savedNote.xpath_start,
                    offsetStart: savedNote.offset_start,
                    xpathEnd: savedNote.xpath_end,
                    offsetEnd: savedNote.offset_end,
                    createdAt: savedNote.created_at
                };

                const updatedNotes = [...notes, noteFrontend];
                setNotes(updatedNotes);
                if (onNotesChange) onNotesChange(updatedNotes);

                setAppliedHighlightId(savedNote.id);
                setSelectedColor(color);

                // Clear draft after success
                setSavedSelection(null);
                setShowColorPicker(false);
                setNewNoteContent('');
            }
        } catch (e) {
            console.error('Erro ao aplicar destaque:', e);
            toast.error('Erro ao aplicar destaque. Tente novamente.');
        }
    };

    const handleCreateNote = async (content: string, highlightData?: { text: string, range: Range, color: string }) => {
        try {
            const position = notes.length;
            const newNote: Omit<LessonNote, 'id' | 'created_at' | 'updated_at'> = {
                user_id: userId,
                lesson_id: lessonId,
                content: content,
                position: position,
                has_highlight: !!highlightData,
                title: highlightData ? 'Destaque' : 'Nota'
            };

            if (highlightData) {
                const rangeSerialized = serializeRange(highlightData.range);
                newNote.highlighted_text = highlightData.text;
                newNote.highlight_color = highlightData.color as any;
                newNote.xpath_start = rangeSerialized.xpathStart;
                newNote.offset_start = rangeSerialized.offsetStart;
                newNote.xpath_end = rangeSerialized.xpathEnd;
                newNote.offset_end = rangeSerialized.offsetEnd;
            }

            const savedNote = await LessonNotesRepository.saveNote(newNote);

            if (savedNote) {
                // Atualizar estado local
                const noteFrontend: Note = {
                    id: savedNote.id,
                    title: savedNote.title,
                    content: savedNote.content || '',
                    hasHighlight: savedNote.has_highlight,
                    highlightedText: savedNote.highlighted_text,
                    highlightColor: savedNote.highlight_color,
                    position: savedNote.position,
                    xpathStart: savedNote.xpath_start,
                    offsetStart: savedNote.offset_start,
                    xpathEnd: savedNote.xpath_end,
                    offsetEnd: savedNote.offset_end,
                    createdAt: savedNote.created_at
                };

                const updatedNotes = [...notes, noteFrontend];
                setNotes(updatedNotes);
                if (onNotesChange) onNotesChange(updatedNotes);

                // Se for destaque, aplicar visualmente no DOM (se ja nao estiver aplicado pelo fluxo de selecao)
                // NOTA: O fluxo de selecao no botao ja aplica o visual antes de salvar?
                // Vamos ajustar para salvar primeiro ou aplicar visual e depois salvar.
                // O fluxo ideal do botao "Adicionar Destaque":
                // 1. Aplica visualmente (para feedback imediato)
                // 2. Salva no banco
                // 3. Se erro, reverte.

                // Mas aqui estamos recebendo o range ja pronto.
                // Se o componente pai/botao ja aplicou o mark, precisamos apenas garantir que o ID esteja correto.
                // Como o ID vem do banco, o ideal e:
                // 1. Criar nota no banco
                // 2. Usar o ID retornado para criar o mark no DOM.

                if (highlightData) {
                    const highlightSpan = document.createElement('mark');
                    highlightSpan.className = `highlight-${highlightData.color}`;
                    highlightSpan.style.backgroundColor =
                        highlightData.color === 'yellow' ? '#fef08a' :
                            highlightData.color === 'green' ? '#86efac' :
                                highlightData.color === 'blue' ? '#93c5fd' : '#f9a8d4';
                    highlightSpan.setAttribute('data-note-id', savedNote.id);
                    highlightSpan.style.cursor = 'pointer';
                    highlightSpan.style.borderRadius = '4px';
                    highlightSpan.style.padding = '2px 4px';

                    const contents = highlightData.range.extractContents();
                    highlightSpan.appendChild(contents);
                    highlightData.range.insertNode(highlightSpan);
                }
            }
        } catch (e) {
            console.error('Erro ao criar nota:', e);
            toast.error('Erro ao salvar nota. Tente novamente.');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Deseja apagar esta nota?')) return;

        try {
            // Remover visualmente primeiro (optimistic update)
            const note = notes.find(n => n.id === noteId);
            if (note?.hasHighlight) {
                const markers = document.querySelectorAll(`mark[data-note-id="${noteId}"]`);
                markers.forEach(mark => {
                    const textNode = document.createTextNode(mark.textContent || '');
                    mark.parentNode?.replaceChild(textNode, mark);
                });
            }

            const updatedNotes = notes.filter(n => n.id !== noteId);
            setNotes(updatedNotes);
            if (onNotesChange) onNotesChange(updatedNotes);

            // Remover do banco
            const success = await LessonNotesRepository.deleteNote(noteId);
            if (!success) {
                toast.error('Erro ao deletar nota do servidor. Recarregue a pagina.');
                // Idealmente reverteria o estado local, mas para simplificar vamos deixar assim
            }
        } catch (e) {
            console.error('Erro ao deletar:', e);
        }
    };

    const handleUpdateNote = async (noteId: string, content: string) => {
        try {
            setNotes(notes.map(n => n.id === noteId ? { ...n, content } : n));
            await LessonNotesRepository.updateNote(noteId, { content });
            setEditingId(null);
        } catch (e) {
            console.error('Erro ao atualizar:', e);
            toast.error('Erro ao salvar alteracoes.');
        }
    };

    const handleRemoveHighlight = async (noteId: string) => {
        try {
            // Remover marks do DOM (pode haver varios se for unificada)
            const markers = document.querySelectorAll(`mark[data-note-id="${noteId}"]`);
            markers.forEach(mark => {
                const textNode = document.createTextNode(mark.textContent || '');
                mark.parentNode?.replaceChild(textNode, mark);
            });

            // Atualizar estado
            setNotes(notes.map(n =>
                n.id === noteId
                    ? { ...n, hasHighlight: false, highlightedText: undefined, highlightColor: undefined }
                    : n
            ));

            // Atualizar banco
            await LessonNotesRepository.updateNote(noteId, {
                has_highlight: false,
                highlighted_text: null as any,
                highlight_color: null as any,
                xpath_start: null as any,
                xpath_end: null as any
            });

            if (onNotesChange) {
                const updatedNotes = notes.map(n =>
                    n.id === noteId
                        ? { ...n, hasHighlight: false, highlightedText: undefined, highlightColor: undefined }
                        : n
                );
                onNotesChange(updatedNotes);
            }

        } catch (e) {
            console.error('Erro ao remover destaque:', e);
        }
    };

    const scrollToHighlight = (note: Note) => {
        if (!note.hasHighlight) return;

        const highlightColorValue = (color?: Note['highlightColor']) => {
            switch (color) {
                case 'green': return '#86efac';
                case 'blue': return '#93c5fd';
                case 'pink': return '#f9a8d4';
                default: return '#fef08a';
            }
        };

        const applyHighlightStyles = (element: HTMLElement, color?: Note['highlightColor']) => {
            element.classList.add(`highlight-${color || 'yellow'}`);
            element.style.backgroundColor = highlightColorValue(color);
            element.style.padding = '2px 4px';
            element.style.borderRadius = '4px';
            element.style.cursor = 'pointer';
            element.setAttribute('data-note-id', note.id);
        };

        const createMarkFromRange = (range: Range) => {
            const highlightSpan = document.createElement('mark');
            applyHighlightStyles(highlightSpan, note.highlightColor);
            const contents = range.extractContents();
            highlightSpan.appendChild(contents);
            range.insertNode(highlightSpan);
            return highlightSpan;
        };

        const tryBuildFromStoredRange = () => {
            if (note.xpathStart && note.xpathEnd && note.offsetStart !== undefined && note.offsetEnd !== undefined) {
                const range = deserializeRange({
                    xpathStart: note.xpathStart,
                    offsetStart: note.offsetStart,
                    xpathEnd: note.xpathEnd,
                    offsetEnd: note.offsetEnd
                });
                if (range) {
                    return createMarkFromRange(range);
                }
            }
            return null;
        };

        const tryBuildFromText = () => {
            if (!note.highlightedText) return null;
            const textRange = findRangeByText(note.highlightedText, document.body);
            return textRange ? createMarkFromRange(textRange) : null;
        };

        const ensureVisible = (attempt = 0) => {
            let mark = document.querySelector(`mark[data-note-id="${note.id}"]`) as HTMLElement | null;

            if (!mark) {
                mark = tryBuildFromStoredRange() || tryBuildFromText();
            }

            if (mark) {
                applyHighlightStyles(mark, note.highlightColor);
                mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                mark.classList.add('ring-2', 'ring-indigo-500', 'highlight-flash');
                setTimeout(() => mark?.classList.remove('ring-2', 'ring-indigo-500', 'highlight-flash'), 2000);

                if (onNoteSelect) {
                    onNoteSelect();
                }
                return;
            }

            // Re-tentar apos pequenos delays para pegar o DOM depois de re-render mobile
            if (attempt < 2) {
                const delay = attempt === 0 ? 120 : 400;
                setTimeout(() => ensureVisible(attempt + 1), delay);
            } else {
                console.warn('Highlight nao encontrado no DOM para scroll');
            }
        };

        ensureVisible();
    };

    const handleAskBuddy = (context: string, noteId: string) => {
        setBuddyContext(context);
        setActiveBuddyNoteId(noteId);

        const note = notes.find(n => n.id === noteId);
        setBuddyNoteContent(note?.content || '');

        setShowBuddyModal(true);
    };

    const handleAddToNote = async (text: string) => {
        if (!activeBuddyNoteId) return;
        const note = notes.find(n => n.id === activeBuddyNoteId);
        if (!note) return;

        const newContent = note.content ? `${note.content}\n\nBuddy:\n${text}` : `Buddy:\n${text}`;

        await handleUpdateNote(activeBuddyNoteId, newContent);
        alert('Resposta adicionada a nota com sucesso!');
    };

    const handleMergeNotes = async (targetNoteId: string) => {
        if (!noteToMergeId || noteToMergeId === targetNoteId) return;

        const sourceNote = notes.find(n => n.id === noteToMergeId);
        const targetNote = notes.find(n => n.id === targetNoteId);

        if (!sourceNote || !targetNote) return;

        try {
            // 1. Prepare highlights to merge
            const currentHighlights = targetNote.extraHighlights || [];
            const sourceHighlightMeta = {
                text: sourceNote.highlightedText,
                color: sourceNote.highlightColor,
                xpathStart: sourceNote.xpathStart,
                xpathEnd: sourceNote.xpathEnd,
                offsetStart: sourceNote.offsetStart,
                offsetEnd: sourceNote.offsetEnd
            };

            // Also include source's own extra highlights if any
            const newExtraHighlights = [...currentHighlights, sourceHighlightMeta];
            if (sourceNote.extraHighlights && Array.isArray(sourceNote.extraHighlights)) {
                newExtraHighlights.push(...sourceNote.extraHighlights);
            }

            // 1.5 Concatenate content
            const sourceIndex = notes.findIndex(n => n.id === noteToMergeId) + 1;
            const separator = '\n\n' + '-'.repeat(30) + '\n' + `Unificado da Nota ${sourceIndex}` + '\n' + '-'.repeat(30) + '\n';
            const mergedContent = targetNote.content
                ? `${targetNote.content}${separator}${sourceNote.content || 'Sem conte├║do'}`
                : sourceNote.content;

            // 2. Update target note in DB
            const successUpdate = await LessonNotesRepository.updateNote(targetNoteId, {
                content: mergedContent,
                extra_highlights: newExtraHighlights
            });
            if (!successUpdate) throw new Error('Falha ao atualizar nota de destino');

            // 3. Delete source note from DB
            const successDelete = await LessonNotesRepository.deleteNote(noteToMergeId);
            if (!successDelete) throw new Error('Falha ao deletar nota de origem');

            // 4. Update DOM highlights
            // Change data-note-id of all marks that point to sourceId to targetId
            const marks = document.querySelectorAll(`mark[data-note-id="${noteToMergeId}"]`);
            marks.forEach(mark => {
                mark.setAttribute('data-note-id', targetNoteId);
            });

            // 5. Update local state
            const updatedNotes = notes
                .filter(n => n.id !== noteToMergeId)
                .map(n => n.id === targetNoteId ? {
                    ...n,
                    content: mergedContent,
                    extraHighlights: newExtraHighlights
                } : n);

            setNotes(updatedNotes);
            if (onNotesChange) onNotesChange(updatedNotes);

            toast.success(`Notas unificadas com sucesso na Nota ${notes.findIndex(n => n.id === targetNoteId) + 1}!`);
        } catch (error) {
            console.error('Erro ao unificar notas:', error);
            toast.error('Erro ao unificar notas. Tente novamente.');
        } finally {
            setNoteToMergeId(null);
            setIsMergeModalOpen(false);
        }
    };

    const scrollToSpecificHighlight = (highlight: any, noteId: string) => {
        // Mock a temporary note object to reuse scrollToHighlight logic
        const tempNote: Note = {
            id: noteId,
            hasHighlight: true,
            highlightedText: highlight.text,
            highlightColor: highlight.color,
            xpathStart: highlight.xpathStart,
            xpathEnd: highlight.xpathEnd,
            offsetStart: highlight.offsetStart,
            offsetEnd: highlight.offsetEnd,
            content: '',
            position: 0
        };
        scrollToHighlight(tempNote);
    };

    const highlightColorClasses = {
        yellow: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10',
        green: 'border-green-400 bg-green-50 dark:bg-green-900/10',
        blue: 'border-blue-400 bg-blue-50 dark:bg-blue-900/10',
        pink: 'border-pink-400 bg-pink-50 dark:bg-pink-900/10'
    };

    const colorOptions = [
        { value: 'yellow' as const, label: 'Amarelo', bgClass: 'bg-yellow-400', borderClass: 'border-yellow-400' },
        { value: 'green' as const, label: 'Verde', bgClass: 'bg-green-400', borderClass: 'border-green-400' },
        { value: 'blue' as const, label: 'Azul', bgClass: 'bg-blue-400', borderClass: 'border-blue-400' },
        { value: 'pink' as const, label: 'Rosa', bgClass: 'bg-pink-400', borderClass: 'border-pink-400' }
    ];

    // Scroll to note when focusedNoteId changes
    useEffect(() => {
        if (focusedNoteId && !loading) {
            const noteCard = document.getElementById(`note-card-${focusedNoteId}`);
            if (noteCard) {
                noteCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                noteCard.classList.add('ring-4', 'ring-indigo-500', 'ring-opacity-50');
                setTimeout(() => noteCard.classList.remove('ring-4', 'ring-indigo-500', 'ring-opacity-50'), 2000);
            }
        }
    }, [focusedNoteId, loading]);

    if (loading) {
        return (
            <div className="h-full min-h-[400px] flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="text-center text-slate-500">
                    <i className="fas fa-circle-notch fa-spin text-2xl mb-2"></i>
                    <p className="text-sm">Carregando notas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <i className="fas fa-sticky-note text-indigo-600 dark:text-indigo-400"></i>
                        Minhas Notas
                    </h3>
                    <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-full">
                        {notes.length}
                    </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Clique nas notas destacadas para navegar no conteudo
                </p>
            </div>

            {/* Lista de Notas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {notes.map((note, index) => (
                    <div
                        key={note.id}
                        id={`note-card-${note.id}`}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${note.hasHighlight
                            ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
                            : 'cursor-default'
                            } ${note.hasHighlight && note.highlightColor
                                ? highlightColorClasses[note.highlightColor]
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                        onClick={() => scrollToHighlight(note)}
                    >
                        {/* Cabecalho da Nota */}
                        <div className="flex items-start gap-2 mb-2">
                            {note.hasHighlight && (
                                <span className="w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-xs flex items-center justify-center font-black flex-shrink-0 shadow-sm">
                                    {index + 1}
                                </span>
                            )}
                            <div className="flex-1 min-w-0">
                                {note.title && (
                                    <span className="inline-block text-xs font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-1 rounded-lg mb-1 shadow-sm border border-slate-200 dark:border-slate-600">
                                        {note.title}
                                    </span>
                                )}
                            </div>
                            {note.hasHighlight && (
                                <i className="fas fa-highlighter text-slate-400 dark:text-slate-500 text-xs"></i>
                            )}
                        </div>

                        {/* Texto destacado principal */}
                        {note.hasHighlight && note.highlightedText && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    scrollToHighlight(note);
                                }}
                                className={`text-xs italic text-slate-600 dark:text-slate-400 border-l-4 pl-3 py-1 mb-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${note.highlightColor === 'yellow' ? 'border-yellow-500' :
                                    note.highlightColor === 'green' ? 'border-green-500' :
                                        note.highlightColor === 'blue' ? 'border-blue-500' : 'border-pink-500'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <i className="fas fa-quote-left text-[8px] mr-1 opacity-50"></i>
                                        {note.highlightedText.length > 80
                                            ? `${note.highlightedText.substring(0, 80)}...`
                                            : note.highlightedText}
                                        <i className="fas fa-quote-right text-[8px] ml-1 opacity-50"></i>
                                    </div>
                                    <i className="fas fa-external-link-alt text-[10px] opacity-0 group-hover:opacity-50 transition-opacity ml-2"></i>
                                </div>
                            </div>
                        )}

                        {/* Destaques Vinculados (Multi-Highlight) */}
                        {note.extraHighlights && note.extraHighlights.length > 0 && (
                            <div className="mb-3 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                                    <i className="fas fa-link"></i>
                                    Destaques Vinculados
                                </p>
                                {note.extraHighlights.map((extra, idx) => (
                                    <div
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            scrollToSpecificHighlight(extra, note.id);
                                        }}
                                        className={`text-[11px] italic text-slate-500 dark:text-slate-400 border-l-2 pl-2 py-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group flex items-center justify-between ${extra.color === 'yellow' ? 'border-yellow-400/50' :
                                            extra.color === 'green' ? 'border-green-400/50' :
                                                extra.color === 'blue' ? 'border-blue-400/50' : 'border-pink-400/50'
                                            }`}
                                    >
                                        <span className="truncate flex-1">
                                            {extra.text?.length > 60 ? `${extra.text.substring(0, 60)}...` : extra.text}
                                        </span>
                                        <i className="fas fa-eye text-[10px] opacity-0 group-hover:opacity-50 transition-opacity"></i>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Conteudo da nota (Collapsible) */}
                        {(visibleNotes.has(note.id) || editingId === note.id) && (
                            <div className="mb-2 animate-in slide-in-from-top-2 duration-200">
                                {editingId === note.id ? (
                                    <textarea
                                        defaultValue={note.content}
                                        className="w-full border border-indigo-300 dark:border-indigo-700 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        rows={4}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => handleUpdateNote(note.id, e.target.value)}
                                    />
                                ) : (
                                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                        {note.content}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Acoes */}
                        <div className="flex gap-2 items-center flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/50">
                            {/* Toggle Bundle Button */}
                            <button
                                onClick={(e) => toggleNoteVisibility(note.id, e)}
                                className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-medium flex items-center gap-1 mr-auto transition-colors"
                            >
                                <i className={`fas fa-chevron-${visibleNotes.has(note.id) ? 'up' : 'down'}`}></i>
                                {visibleNotes.has(note.id) ? 'Ocultar Nota' : 'Ver Nota'}
                            </button>

                            {/* Unificar Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNoteToMergeId(note.id);
                                    setIsMergeModalOpen(true);
                                }}
                                className="text-xs text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 font-medium flex items-center gap-1 transition-colors"
                                title="Unificar com outra nota para vincular racioc├¡nio"
                            >
                                <i className="fas fa-link"></i>
                                Unificar
                            </button>

                            {editingId === note.id ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(null);
                                    }}
                                    className="text-xs text-green-600 dark:text-green-400 hover:underline font-bold"
                                >
                                    <i className="fas fa-check mr-1"></i>Concluir
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingId(note.id);
                                            setVisibleNotes(prev => new Set(prev).add(note.id));
                                        }}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                                    >
                                        <i className="fas fa-edit"></i>Editar
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteNote(note.id);
                                        }}
                                        className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                                    >
                                        <i className="fas fa-trash"></i>Apagar
                                    </button>

                                    {/* Action: Ask Buddy Button (Only for highlights) */}
                                    {note.hasHighlight && note.highlightedText && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAskBuddy(note.highlightedText!, note.id);
                                            }}
                                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold ml-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                            title="Perguntar ao Buddy sobre este trecho"
                                        >
                                            <i className="fas fa-robot text-[10px]"></i>
                                            Perguntar
                                        </button>
                                    )}

                                    {note.hasHighlight && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveHighlight(note.id);
                                            }}
                                            className="text-xs text-slate-500 dark:text-slate-400 hover:underline ml-auto"
                                            title="Remover destaque do texto"
                                        >
                                            <i className="fas fa-unlink"></i>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Data */}
                        {note.createdAt && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                                <i className="fas fa-clock"></i>
                                {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                        )}
                    </div>
                ))}

                {/* Mensagem vazia */}
                {!loading && notes.length === 0 && (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                        <i className="fas fa-inbox text-4xl mb-3 opacity-30"></i>
                        <p className="text-sm font-medium">Nenhuma nota ainda</p>
                        <p className="text-xs mt-1">Adicione sua primeira nota abaixo</p>
                    </div>
                )}
            </div>

            {/* Nova Nota */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Digite sua nota aqui..."
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 mb-2 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                    rows={3}
                />

                {showColorPicker && (
                    <div className="mb-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-600 animate-in slide-in-from-top-2 duration-200">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Escolha a cor do destaque:</p>
                        <div className="flex gap-2">
                            {colorOptions.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => applyOrUpdateHighlight(color.value)}
                                    className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${selectedColor === color.value
                                        ? `${color.borderClass} ${color.bgClass} text-white font-bold shadow-md scale-105`
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:scale-105'
                                        }`}
                                    title={color.label}
                                >
                                    <i className="fas fa-highlighter text-sm"></i>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (newNoteContent.trim()) {
                                if (savedSelection && savedSelection.range) {
                                    handleCreateNote(newNoteContent, {
                                        text: savedSelection.text,
                                        range: savedSelection.range,
                                        color: selectedColor
                                    });
                                    // Clear selection state after creating
                                    setSavedSelection(null);
                                    setShowColorPicker(false);
                                } else {
                                    handleCreateNote(newNoteContent);
                                }
                                setNewNoteContent('');
                            }
                        }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-plus-circle"></i>
                        Adicionar Nota
                    </button>
                    <button
                        onClick={() => {
                            if (showColorPicker) {
                                // Closing picker - clear state
                                setShowColorPicker(false);
                                setSavedSelection(null);
                                setAppliedHighlightId(null);
                                return;
                            }

                            // Opening picker - save selection if text is selected
                            const selection = window.getSelection();
                            const selectedText = selection?.toString().trim();

                            if (!selectedText || selectedText.length === 0) {
                                toast.error('Selecione um texto primeiro para destacar');
                                return;
                            }

                            const range = selection?.getRangeAt(0);
                            if (range) {
                                setSavedSelection({
                                    text: selectedText,
                                    range: range.cloneRange()
                                });
                                // Capture text into textarea automatically
                                if (!newNoteContent.trim()) {
                                    setNewNoteContent(selectedText);
                                }
                                setShowColorPicker(true);
                            }
                        }}
                        className={`px-4 rounded-xl font-bold text-sm transition-all border-2 active:scale-95 ${showColorPicker
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                            : selectedColor === 'yellow' ? 'bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' :
                                selectedColor === 'green' ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700' :
                                    selectedColor === 'blue' ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700' :
                                        'bg-pink-100 hover:bg-pink-200 dark:bg-pink-900/20 dark:hover:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-300 dark:border-pink-700'
                            }`}
                        title={showColorPicker ? (savedSelection ? 'Aplicar destaque' : 'Fechar seletor') : 'Selecione texto e clique para destacar'}
                    >
                        <i className="fas fa-highlighter"></i>
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                    Dica: Selecione texto no conteudo da aula e clique no destaque
                </p>
            </div>

            {/* Buddy Context Modal */}
            <BuddyContextModal
                isOpen={showBuddyModal}
                onClose={() => setShowBuddyModal(false)}
                initialContext={buddyContext}
                lessonId={lessonId}
                onAddToNote={handleAddToNote}
                existingNoteContent={buddyNoteContent}
            />

            <MergeNotesModal
                isOpen={isMergeModalOpen}
                onClose={() => setIsMergeModalOpen(false)}
                currentNoteNumber={notes.findIndex(n => n.id === noteToMergeId) + 1}
                availableNotes={notes.map((n, idx) => ({ id: n.id, number: idx + 1, text: n.highlightedText }))}
                onMerge={handleMergeNotes}
            />
        </div>
    );
};

export default NotesPanelPrototype;
