import React, { useState, useEffect, useCallback, useRef } from 'react';
// Imports removidos de framer-motion para performance
import { convertDropboxUrl, convertGoogleDriveUrl } from '@/utils/mediaUtils';

interface SlideViewerProps {
    title: string;
    slides?: string[];
    fileUrl?: string;
    fileType?: 'pdf' | 'pptx' | 'ppt';
    onClose?: () => void;
}

const SlideViewer: React.FC<SlideViewerProps> = ({ title, slides = [], fileUrl, fileType, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [direction, setDirection] = useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const renderTaskRef = React.useRef<any>(null);

    // PDF State
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState(0);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    const isFileMode = !!fileUrl;
    // If PDF, use pdf pages. If Image slides, use array length.
    const totalSlides = isFileMode && fileType === 'pdf' ? numPages : slides.length;

    // --- PDF Loading Logic ---
    useEffect(() => {
        const isExtUrl = fileUrl?.includes('dropbox.com') || fileUrl?.includes('dropboxusercontent.com') || fileUrl?.includes('drive.google.com');
        if (!fileUrl || fileType !== 'pdf' || isExtUrl) return;

        let isMounted = true;
        setPdfLoading(true);
        setPdfError(null);

        const loadPdf = async () => {
            try {
                // Dynamically import PDF.js
                const pdfjsLib = await import('pdfjs-dist');
                // Configure worker
                // Use unpkg to ensure we get the correct version matches the installed package
                // and use .mjs for proper ESM loading which is required by pdfjs-dist v4+
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

                // Handle Dropbox CORS issues by converting www.dropbox.com to dl.dropboxusercontent.com
                let corsFriendlyUrl = convertDropboxUrl(fileUrl);
                corsFriendlyUrl = convertGoogleDriveUrl(corsFriendlyUrl);

                // Load Document
                const loadingTask = pdfjsLib.getDocument(corsFriendlyUrl);
                const pdf = await loadingTask.promise;

                if (!isMounted) return;

                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                setCurrentIndex(0); // Reset to first page
            } catch (err: any) {
                console.error("Error loading PDF:", err);
                if (isMounted) setPdfError("Não foi possível carregar o PDF. Verifique se o link é público.");
            } finally {
                if (isMounted) setPdfLoading(false);
            }
        };

        loadPdf();

        return () => { isMounted = false; };
    }, [fileUrl, fileType]);

    // --- PDF Rendering Logic ---
    const renderPage = useCallback(async (pageNum: number) => {
        if (!pdfDoc || !canvasRef.current) return;

        // Cancel previous render if any
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
        }

        try {
            const page = await pdfDoc.getPage(pageNum + 1); // PDF pages are 1-based
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (!context) return;

            // Calculate scale to fit container width/height while maintaining aspect ratio
            const container = containerRef.current;
            const containerWidth = container ? container.clientWidth : 800;
            const containerHeight = container ? container.clientHeight : 600;

            // Base viewport at scale 1
            const viewport = page.getViewport({ scale: 1 });

            // Determine best scale (fit width or height)
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY) * 1.5; // Slight boost for sharpness (Retina)

            const scaledViewport = page.getViewport({ scale });

            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport,
            };

            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask;

            await renderTask.promise;
        } catch (err: any) {
            if (err.name !== 'RenderingCancelledException') {
                console.error("Page render error:", err);
            }
        }
    }, [pdfDoc]);

    // Re-render when index changes or resize
    useEffect(() => {
        if (fileType === 'pdf' && pdfDoc) {
            renderPage(currentIndex);
        }
    }, [currentIndex, fileType, pdfDoc, renderPage, isFullscreen]);

    // Handle Window Resize for PDF
    useEffect(() => {
        if (fileType !== 'pdf') return;
        const handleResize = () => {
            // Debounce slightly or just call render
            if (pdfDoc) renderPage(currentIndex);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [pdfDoc, currentIndex, renderPage, fileType]);


    // --- Navigation Logic ---
    const goToSlide = useCallback((index: number) => {
        if (index < 0 || index >= totalSlides) return;
        setDirection(index > currentIndex ? 1 : -1);
        setCurrentIndex(index);
    }, [currentIndex, totalSlides]);

    const goNext = useCallback(() => {
        if (currentIndex < totalSlides - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, totalSlides]);

    const goPrev = useCallback(() => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            await containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    // Keyboard navigation (Unify for all modes)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    goNext();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    goPrev();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                        setIsFullscreen(false);
                    }
                    break;
                case 'f':
                case 'F':
                    toggleFullscreen();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goNext, goPrev, toggleFullscreen]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // =========== RENDERERS ===========

    const isExternalDocUrl = fileUrl?.includes('dropbox.com') || fileUrl?.includes('dropboxusercontent.com') || fileUrl?.includes('drive.google.com');

    // External Doc Fallback (PPTX or PDF via Dropbox/Drive)
    if (isFileMode && (fileType === 'pptx' || fileType === 'ppt' || (fileType === 'pdf' && isExternalDocUrl))) {
        let viewerUrl = '';
        if (fileType === 'pptx' || fileType === 'ppt') {
            const directUrl = convertDropboxUrl(convertGoogleDriveUrl(fileUrl));
            viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`;
        } else {
            // Use Google Docs Viewer for Dropbox PDFs to avoid browser CORS restrictions on canvas
            const directUrl = convertDropboxUrl(convertGoogleDriveUrl(fileUrl));
            viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(directUrl)}&embedded=true`;
        }

        return (
            <div
                ref={containerRef}
                className={`relative w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 group flex flex-col`}
            >
                {/* Header Document */}
                <div className="flex items-center justify-between bg-slate-800 px-3 py-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${fileType === 'pdf' ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
                            <i className={`fas ${fileType === 'pdf' ? 'fa-file-pdf text-red-400' : 'fa-file-powerpoint text-orange-400'} text-xs`}></i>
                        </div>
                        <span className="text-white text-xs font-bold truncate max-w-[250px]">{title}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${fileType === 'pdf' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {fileType === 'pdf' ? 'PDF' : 'PPTX'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" title="Abrir em nova aba">
                            <i className="fas fa-external-link-alt text-[10px]"></i>
                        </a>
                        <button onClick={toggleFullscreen} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" title="Tela Cheia">
                            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-[10px]`}></i>
                        </button>
                    </div>
                </div>
                <div className={`${isFullscreen ? 'flex-1' : 'aspect-[4/3]'} bg-slate-950`}>
                    <iframe src={viewerUrl} className="w-full h-full border-0" title={title} allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                </div>
            </div>
        );
    }

    // PDF Client-Side Renderer OR Image Slides
    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 group flex flex-col`}
        >
            {/* Header (Unified) */}
            <div className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${fileType === 'pdf' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                        <i className={`fas ${fileType === 'pdf' ? 'fa-file-pdf text-red-400' : 'fa-images text-amber-400'} text-xs`}></i>
                    </div>
                    <span className="text-white text-xs font-bold truncate max-w-[200px]">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Page Indicator */}
                    <span className="text-white/80 text-[10px] font-bold bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
                        {totalSlides > 0 ? `${currentIndex + 1} / ${totalSlides}` : '0 / 0'}
                    </span>

                    {isFileMode && (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" title="Download / Abrir">
                            <i className="fas fa-external-link-alt text-[10px]"></i>
                        </a>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                    >
                        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`relative ${isFullscreen ? 'w-full flex-1' : 'aspect-[4/3]'} flex items-center justify-center bg-slate-950 overflow-hidden`}>

                {/* PDF Mode */}
                {fileType === 'pdf' && (
                    <>
                        {pdfLoading && (
                            <div className="flex flex-col items-center gap-3">
                                <i className="fas fa-spinner fa-spin text-red-500 text-2xl"></i>
                                <span className="text-slate-400 text-xs">Carregando PDF...</span>
                            </div>
                        )}

                        {pdfError && (
                            <div className="flex flex-col items-center gap-2 text-center p-4">
                                <i className="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
                                <p className="text-white text-sm font-bold">Erro ao exibir PDF</p>
                                <p className="text-slate-400 text-xs max-w-xs">{pdfError}</p>
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
                                    Abrir link original
                                </a>
                            </div>
                        )}

                        <div key={currentIndex} className="w-full h-full flex items-center justify-center animate-in fade-in slide-in-from-right-5 duration-500">
                            <canvas
                                ref={canvasRef}
                                className={`max-w-full max-h-full object-contain shadow-2xl transition-opacity duration-300 ${pdfLoading ? 'opacity-0' : 'opacity-100'}`}
                            />
                        </div>
                    </>
                )}

                {/* Slides (Images) Mode - Transição Horizontal */}
                {!isFileMode && slides.length > 0 && (
                    <div className="w-full h-full relative overflow-hidden">
                        <img
                            key={currentIndex}
                            src={slides[currentIndex]}
                            alt={`Slide ${currentIndex + 1}`}
                            className={`w-full h-full object-contain select-none animate-in fade-in slide-in-from-${direction > 0 ? 'right' : 'left'}-10 duration-500`}
                            draggable={false}
                        />
                    </div>
                )}

                {(!isFileMode && slides.length === 0) && (
                    <div className="text-center text-slate-400">
                        <i className="fas fa-images text-4xl mb-3 opacity-30"></i>
                        <p className="text-sm font-medium">Nenhum slide disponível</p>
                    </div>
                )}


                {/* Navigation Arrows (Common) */}
                {totalSlides > 1 && (
                    <>
                        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"></div>
                        <button
                            onClick={goPrev}
                            disabled={currentIndex === 0}
                            className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-md ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-white/10 hover:bg-white/20 text-white opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0'}`}
                            title="Anterior"
                        >
                            <i className="fas fa-chevron-left text-lg"></i>
                        </button>

                        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"></div>
                        <button
                            onClick={goNext}
                            disabled={currentIndex === totalSlides - 1}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-md ${currentIndex === totalSlides - 1 ? 'opacity-0 pointer-events-none' : 'bg-white/10 hover:bg-white/20 text-white opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0'}`}
                            title="Próximo"
                        >
                            <i className="fas fa-chevron-right text-lg"></i>
                        </button>
                    </>
                )}
            </div>

            {/* Bottom Progress Bar (Common) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-full h-1 bg-white/20 rounded-full mb-2 overflow-hidden cursor-pointer" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = clickX / rect.width;
                    const targetIndex = Math.floor(percent * totalSlides);
                    goToSlide(targetIndex);
                }}>
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${fileType === 'pdf' ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                        style={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
                    />
                </div>

                {/* PDF does not show dots usually due to high count, but showing navigation hint */}
                <div className="flex items-center justify-center gap-4 mt-1 text-[9px] text-white/50 font-medium">
                    <span><kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px] font-mono">←</kbd> <kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px] font-mono">→</kbd> Navegar</span>
                    {fileType === 'pdf' && <span><i className="fas fa-mouse-pointer mr-1"></i> Clique na barra para pular</span>}
                </div>
            </div>
        </div>
    );
};

export default SlideViewer;
