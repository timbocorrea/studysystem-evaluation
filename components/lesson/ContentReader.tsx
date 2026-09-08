import React, { useEffect, useRef, useState } from 'react';

import { Lesson } from '../../domain/entities';
import { useLessonStore } from '../../stores/useLessonStore';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface HighlightData {
    id: string;
    text: string;
    color: 'yellow' | 'green' | 'blue' | 'pink';
    onClick?: () => void;
}

interface ContentReaderProps {
    lesson: Lesson;
    highlights: HighlightData[];
    onBlockClick?: (blockId: string, index: number) => void;
    onTrackAction?: (action: string) => void;
    currentProgress?: number; // 0 to 100
    blockRefs?: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
    onSeek?: (percentage: number) => void;
    // Text Answer Block props
    studentAnswers?: Map<string, any>; // Use any to avoid complex type import if not easy, but it contains StudentAnswer objects
    onSaveAnswer?: (blockId: string, answerText: string) => Promise<void>;
    savingBlockIds?: Set<string>;
}

const ContentReader: React.FC<ContentReaderProps> = React.memo(({
    lesson,
    highlights,
    onBlockClick,
    onTrackAction,
    currentProgress = 0,
    blockRefs,
    onSeek,
    studentAnswers,
    onSaveAnswer,
    savingBlockIds
}) => {
    const { activeBlockId, fontSize, contentTheme, audioEnabled } = useLessonStore();
    const contentRef = useRef<HTMLDivElement>(null);
    // Local state for text answer blocks being edited
    const [editingBlocks, setEditingBlocks] = useState<Set<string>>(new Set());
    const [localAnswers, setLocalAnswers] = useState<Map<string, string>>(new Map());

    // Scroll to active block logic moved to parent (LessonViewer) to avoid conflicts
    useEffect(() => {
        // Keeping this effect empty or removing it entirely if not needed for anything else.
        // The parent component handles scrolling via ref logic.
    }, [activeBlockId]);

    const getBackgroundColor = (color: string) => {
        switch (color) {
            case 'yellow': return '#fef08a';
            case 'green': return '#86efac';
            case 'blue': return '#93c5fd';
            case 'pink': return '#f9a8d4';
            default: return '#fef08a';
        }
    };

    /**
     * Applies highlights to HTML content by replacing text occurrences with <mark> tags.
     * Uses a regex that attempts to avoid replacing text inside HTML tags.
     */
    const applyHighlights = (html: string, highlights: HighlightData[]) => {
        if (!highlights || highlights.length === 0) return html;

        let enhancedHtml = html;

        // Sort highlights by length (descending) to prioritize longer phrases
        const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);

        sortedHighlights.forEach(highlight => {
            if (!highlight.text || highlight.text.trim() === '') return;

            // Create a fuzzy pattern that allows optional HTML tags between characters
            // This enables matching text segments like "habilidades essenciais" even if 
            // the source HTML is "habilidades <strong>essenciais</strong>"
            const charPatterns = highlight.text.split('').map(char => {
                const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // If it's a space, allow multiple spaces or tags
                if (char === ' ') return '(?:\\s+|<[^>]+>)*';
                return escaped;
            });

            // Join with optional tag pattern to allow tags between any character
            const fuzzyPattern = charPatterns.join('(?:<[^>]+>)*');

            // Regex to match the fuzzy pattern NOT inside tag attributes (lookahead check)
            const regex = new RegExp(`(${fuzzyPattern})(?![^<]*>)`, 'gi');

            enhancedHtml = enhancedHtml.replace(regex, (match) => {
                const colorHex = getBackgroundColor(highlight.color);
                return `<mark class="highlight-${highlight.color}" data-note-id="${highlight.id}" style="background-color: ${colorHex}; padding: 2px 4px; border-radius: 4px; cursor: pointer;">${match}</mark>`;
            });
        });

        return enhancedHtml;
    };

    const renderContent = () => {
        if (lesson.contentBlocks && lesson.contentBlocks.length > 0) {
            return lesson.contentBlocks.map((block, index) => {
                const hasAudio = !!block.audioUrl;
                const isActive = activeBlockId === block.id;
                const isTextAnswer = (block as any).type === 'text_answer';

                // --- Text Answer Block Rendering ---
                if (isTextAnswer) {
                    const studentAnswerObj = studentAnswers?.get(block.id);
                    const savedAnswer = studentAnswerObj?.answerText || '';
                    const feedbackText = studentAnswerObj?.feedbackText;
                    const grade = studentAnswerObj?.grade;
                    
                    const localAnswer = localAnswers.get(block.id);
                    const isEditing = editingBlocks.has(block.id);
                    const isSaving = savingBlockIds?.has(block.id) || false;
                    const displayAnswer = localAnswer !== undefined ? localAnswer : savedAnswer;
                    const hasSavedAnswer = savedAnswer.length > 0;
                    const isGraded = !!feedbackText || !!grade;

                    return (
                        <div
                            key={block.id}
                            ref={(el) => {
                                if (blockRefs) blockRefs.current[block.id] = el;
                            }}
                            data-block-id={block.id}
                            className="content-block"
                            style={{
                                marginBottom: `${block.spacing || 1.5}rem`,
                                padding: '1.25rem',
                                borderLeft: '4px solid #f59e0b',
                                backgroundColor: contentTheme === 'dark' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)',
                                borderRadius: '20px',
                                transition: 'all 0.2s ease',
                                border: isGraded ? (contentTheme === 'dark' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(16, 185, 129, 0.3)') : 'none',
                                borderLeftWidth: '4px',
                                borderLeftColor: isGraded ? '#10b981' : '#f59e0b'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    fontSize: '13px', fontWeight: 700,
                                    color: isGraded ? '#10b981' : (contentTheme === 'dark' ? '#fbbf24' : '#b45309')
                                }}>
                                    <i className={isGraded ? "fas fa-check-circle" : "fas fa-pen-to-square"}></i>
                                    <span>{isGraded ? 'Atividade Avaliada' : 'Sua Resposta'}</span>
                                </div>
                                {grade && (
                                    <div style={{
                                        padding: '4px 12px', borderRadius: '10px',
                                        backgroundColor: '#10b98120', color: '#10b981',
                                        fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }}>
                                        Nota: {grade}
                                    </div>
                                )}
                            </div>

                            {/* Textarea or Saved Answer */}
                            {(!hasSavedAnswer || isEditing) && !isGraded ? (
                                <>
                                    <textarea
                                        value={displayAnswer}
                                        onChange={(e) => {
                                            const newMap = new Map(localAnswers);
                                            newMap.set(block.id, e.target.value);
                                            setLocalAnswers(newMap);
                                        }}
                                        placeholder="Escreva sua resposta aqui..."
                                        rows={5}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            border: `1px solid ${contentTheme === 'dark' ? '#475569' : '#cbd5e1'}`,
                                            backgroundColor: contentTheme === 'dark' ? '#1e293b' : '#f8fafc',
                                            color: contentTheme === 'dark' ? '#e2e8f0' : '#1e293b',
                                            fontSize: '14px',
                                            lineHeight: '1.7',
                                            resize: 'vertical',
                                            outline: 'none',
                                            fontFamily: 'inherit',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                                        onBlur={(e) => e.target.style.borderColor = contentTheme === 'dark' ? '#475569' : '#cbd5e1'}
                                    />
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                                        {/* Limpar button */}
                                        {displayAnswer.trim().length > 0 && (
                                            <button
                                                disabled={isSaving}
                                                onClick={async () => {
                                                    // Clear the local text
                                                    const newMap = new Map(localAnswers);
                                                    newMap.set(block.id, '');
                                                    setLocalAnswers(newMap);
                                                    // If there was a saved answer, save empty to DB
                                                    if (hasSavedAnswer && onSaveAnswer) {
                                                        await onSaveAnswer(block.id, '');
                                                        // Exit editing mode
                                                        const newEditing = new Set(editingBlocks);
                                                        newEditing.delete(block.id);
                                                        setEditingBlocks(newEditing);
                                                    }
                                                    onTrackAction?.('Limpou caixa de resposta');
                                                }}
                                                style={{
                                                    padding: '8px 20px', borderRadius: '8px',
                                                    fontSize: '12px', fontWeight: 700,
                                                    border: `1px solid ${contentTheme === 'dark' ? '#ef444480' : '#fca5a580'}`,
                                                    backgroundColor: 'transparent',
                                                    color: contentTheme === 'dark' ? '#f87171' : '#dc2626',
                                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                                    marginRight: 'auto',
                                                }}
                                            >
                                                <i className="fas fa-eraser" style={{ marginRight: '5px' }}></i>
                                                Limpar
                                            </button>
                                        )}
                                        {isEditing && (
                                            <button
                                                onClick={() => {
                                                    const newEditing = new Set(editingBlocks);
                                                    newEditing.delete(block.id);
                                                    setEditingBlocks(newEditing);
                                                    // Reset local to saved
                                                    const newMap = new Map(localAnswers);
                                                    newMap.delete(block.id);
                                                    setLocalAnswers(newMap);
                                                }}
                                                style={{
                                                    padding: '8px 20px', borderRadius: '8px',
                                                    fontSize: '12px', fontWeight: 700,
                                                    border: `1px solid ${contentTheme === 'dark' ? '#475569' : '#cbd5e1'}`,
                                                    backgroundColor: 'transparent',
                                                    color: contentTheme === 'dark' ? '#94a3b8' : '#64748b',
                                                    cursor: 'pointer',
                                                }}
                                            >Cancelar</button>
                                        )}
                                        <button
                                            disabled={isSaving || !displayAnswer.trim()}
                                            onClick={async () => {
                                                if (onSaveAnswer && displayAnswer.trim()) {
                                                    await onSaveAnswer(block.id, displayAnswer.trim());
                                                    const newEditing = new Set(editingBlocks);
                                                    newEditing.delete(block.id);
                                                    setEditingBlocks(newEditing);
                                                    onTrackAction?.('Salvou resposta de texto');
                                                }
                                            }}
                                            style={{
                                                padding: '8px 24px', borderRadius: '8px',
                                                fontSize: '12px', fontWeight: 700,
                                                backgroundColor: isSaving ? '#9ca3af' : '#f59e0b',
                                                color: '#fff', border: 'none',
                                                cursor: isSaving || !displayAnswer.trim() ? 'not-allowed' : 'pointer',
                                                opacity: isSaving || !displayAnswer.trim() ? 0.6 : 1,
                                                transition: 'all 0.2s',
                                            }}
                                        >{isSaving ? 'Salvando...' : 'Salvar'}</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Read-only saved answer */}
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        backgroundColor: contentTheme === 'dark' ? 'rgba(15, 23, 42, 0.4)' : '#fff',
                                        border: `1px solid ${contentTheme === 'dark' ? '#334155' : '#e2e8f0'}`,
                                        color: contentTheme === 'dark' ? '#e2e8f0' : '#334155',
                                        fontSize: '14px',
                                        lineHeight: '1.7',
                                        whiteSpace: 'pre-wrap',
                                    }}>{savedAnswer || 'Sem resposta enviada.'}</div>
                                    
                                    {/* Feedback Area */}
                                    {feedbackText && (
                                        <div style={{
                                            marginTop: '16px',
                                            padding: '16px',
                                            borderRadius: '16px',
                                            backgroundColor: '#10b98110',
                                            border: '1px dashed #10b98140',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                fontSize: '10px', fontWeight: 900, color: '#10b981',
                                                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px'
                                            }}>Feedback do Instrutor</div>
                                            <p style={{
                                                fontSize: '13px', color: contentTheme === 'dark' ? '#d1d5db' : '#4b5563',
                                                lineHeight: '1.6', margin: 0
                                            }}>{feedbackText}</p>
                                        </div>
                                    )}

                                    {!isGraded && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                            <button
                                                onClick={() => {
                                                    const newEditing = new Set(editingBlocks);
                                                    newEditing.add(block.id);
                                                    setEditingBlocks(newEditing);
                                                    // Pre-populate local with saved
                                                    const newMap = new Map(localAnswers);
                                                    newMap.set(block.id, savedAnswer);
                                                    setLocalAnswers(newMap);
                                                }}
                                                style={{
                                                    padding: '8px 20px', borderRadius: '8px',
                                                    fontSize: '12px', fontWeight: 700,
                                                    border: `1px solid ${contentTheme === 'dark' ? '#475569' : '#cbd5e1'}`,
                                                    backgroundColor: 'transparent',
                                                    color: contentTheme === 'dark' ? '#fbbf24' : '#b45309',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>
                                                Editar Resposta
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                }

                // --- Standard Block Rendering ---
                // Apply highlights to the block text
                const htmlWithHighlights = applyHighlights(block.text, highlights);

                return (
                    <div
                        key={block.id}
                        ref={(el) => {
                            if (blockRefs) {
                                blockRefs.current[block.id] = el;
                            }
                        }}
                        data-block-id={block.id}
                        className={`content-block ${isActive ? 'active-block' : ''} ${hasAudio ? 'has-audio' : ''}`}
                        style={{
                            marginBottom: `${block.spacing || (window.innerWidth < 640 ? 1.25 : 1.5)}rem`,
                            fontSize: window.innerWidth < 640 ? '1.125rem' : (window.innerWidth < 1024 ? '1rem' : '1rem'), // Responsive base size
                            lineHeight: (block as any).lineHeight ? parseFloat((block as any).lineHeight) : (window.innerWidth < 640 ? 1.6 : 1.8),
                            padding: ((hasAudio && audioEnabled) || (block as any).featured) ? '1rem' : '0',
                            borderLeft: (hasAudio && audioEnabled) ? '4px solid #6366f1' : ((block as any).featured ? `4px solid ${(block as any).featuredColor || '#eab308'}` : 'none'),
                            backgroundColor: isActive ? (contentTheme === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)') : ((block as any).featured ? `${(block as any).featuredColor || '#eab308'}15` : 'transparent'),
                            borderRadius: (hasAudio && audioEnabled) ? '8px' : '0',
                            cursor: (hasAudio && audioEnabled) ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            display: 'flow-root'
                        }}
                        onClick={(e) => {
                            // Check if user is selecting text - Ignore click if there is a selection
                            const selection = window.getSelection();
                            if (selection && selection.toString().length > 0) {
                                return;
                            }

                            // Check if a highlight was clicked
                            const target = e.target as HTMLElement;
                            const mark = target.closest('mark');

                            if (mark && mark.dataset.noteId) {
                                e.stopPropagation();
                                const noteId = mark.dataset.noteId;
                                const highlight = highlights.find(h => h.id === noteId);
                                highlight?.onClick?.();
                                return;
                            }

                            // Normal block click (Audio)
                            if (hasAudio && audioEnabled && onBlockClick) {
                                e.stopPropagation(); // Prevent parent handlers (like ContextMenu reset)
                                onBlockClick(block.id, index);
                                onTrackAction?.(`Clicou no bloco de áudio ${index + 1}`);
                            }
                        }}
                    >
                        {hasAudio && audioEnabled && (
                            <>
                                {/* Check if URL is expired temporary Dropbox link */}
                                {(() => {
                                    const isExpiredDropboxUrl = block.audioUrl &&
                                        (block.audioUrl.includes('dl.dropboxusercontent.com/cd/0/get/') ||
                                            block.audioUrl.includes('uc84454b801acebe9d64c74754ef'));

                                    if (isExpiredDropboxUrl) {
                                        return (
                                            <div className="audio-warning" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '8px',
                                                padding: '8px 12px',
                                                backgroundColor: contentTheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                                                borderLeft: '4px solid #ef4444',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#ef4444',
                                            }}>
                                                <i className="fas fa-exclamation-triangle"></i>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700 }}>URL de Áudio Expirada</div>
                                                    <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.9 }}>
                                                        Este áudio precisa ser re-adicionado do Dropbox
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="audio-indicator" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '8px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: '#6366f1',
                                        }}>
                                            <i className={`fas ${isActive ? 'fa-volume-up' : 'fa-headphones'}`}></i>
                                            <span>{isActive ? 'Tocando...' : 'Clique para ouvir'}</span>
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                        <div
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlWithHighlights) }}
                            style={{ display: 'block' }}
                        />

                        {/* Audio Progress Bar for Active Block */}
                        {isActive && hasAudio && (
                            <div
                                className="mt-3 w-full h-2 bg-indigo-500/10 rounded-full overflow-hidden cursor-pointer hover:h-2.5 transition-all group"
                                onClick={(e) => {
                                    if (onSeek) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const percentage = (x / rect.width) * 100;
                                        onSeek(Math.max(0, Math.min(100, percentage)));
                                        onTrackAction?.('Navegou na barra de progresso do áudio');
                                    }
                                }}
                                title="Clique para avançar ou retroceder"
                            >
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-200 ease-linear group-hover:bg-indigo-600"
                                    style={{
                                        width: `${currentProgress}%`,
                                    }}
                                ></div>
                            </div>
                        )}
                    </div>
                );
            });
        } else if (lesson.content) {
            // Apply highlights to the full content fallback
            const htmlWithHighlights = applyHighlights(lesson.content, highlights);

            return (
                <div
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlWithHighlights) }}
                    style={{ fontSize: '1rem', lineHeight: 1.8 }}
                    onClick={(e) => {
                        // Check if a highlight was clicked
                        const target = e.target as HTMLElement;
                        const mark = target.closest('mark');

                        if (mark && mark.dataset.noteId) {
                            e.stopPropagation();
                            const noteId = mark.dataset.noteId;
                            const highlight = highlights.find(h => h.id === noteId);
                            highlight?.onClick?.();
                        }
                    }}
                />
            );
        }

        return <p style={{ color: '#94a3b8', textAlign: 'center' }}>Sem conteúdo disponível</p>;
    };

    return (
        <div
            ref={contentRef}
            className={`content-reader ${contentTheme === 'dark' ? 'dark-theme' : 'light-theme'}`}
            style={{
                padding: window.innerWidth < 640 ? '1.25rem' : (window.innerWidth < 1024 ? '1.5rem' : '2rem'),
                maxWidth: '100%',
                margin: '0 auto',
                color: contentTheme === 'dark' ? '#e2e8f0' : '#1e293b',
                backgroundColor: contentTheme === 'dark' ? '#0f172a' : '#ffffff',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                // Use zoom for robust scaling of all content (including external HTML/Tailwind classes)
                // @ts-ignore - Zoom is non-standard but widely supported in browsers for this use case
                zoom: fontSize / 100
            }}
        >
            <h2 style={{
                fontSize: window.innerWidth < 640 ? '1.5rem' : (window.innerWidth < 1024 ? '1.625rem' : '1.75rem'), // Responsive title size
                fontWeight: 800,
                marginBottom: '1.5rem',
                color: contentTheme === 'dark' ? '#fff' : '#0f172a',
            }}>
                {lesson.title}
            </h2>


            {/* Injected Styles for Responsive Content */}
            <style>{`
                /* Responsive video wrapper (padding-bottom technique) */
                .content-reader .video-wrapper,
                .content-reader .embed-wrapper {
                    position: relative;
                    width: 100%;
                    max-width: 100%;
                    margin: 1rem 0;
                    border-radius: 0.75rem;
                    overflow: hidden;
                }

                /* iFrames INSIDE a video-wrapper fill the container */
                .content-reader .video-wrapper iframe,
                .content-reader .video-wrapper video {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 0;
                    margin: 0;
                }

                /* Standalone iFrames (not inside wrapper) */
                .content-reader iframe:not(.video-wrapper iframe),
                .content-reader video:not(.video-wrapper video),
                .content-reader embed,
                .content-reader object {
                    max-width: 100%;
                    width: 100%;
                    height: auto;
                    aspect-ratio: 16/9;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    display: block;
                }

                /* Float containment: ensure content blocks properly contain floated images */
                .content-reader .content-block {
                    overflow: hidden;
                }

                /* The inner div that holds the HTML content must also establish
                   a block formatting context so floats work inside it */
                .content-reader .content-block > div {
                    display: flow-root;
                }

                /* Responsive logic for images: Drop float and expand to full width on mobile */
                @media (max-width: 768px) {
                    .content-reader img {
                        float: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        margin: 1.5rem auto !important;
                        display: block !important;
                    }
                }
            `}</style>

            {renderContent()}
        </div >
    );
});

export default ContentReader;
