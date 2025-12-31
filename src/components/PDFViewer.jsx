import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Trash2, GripHorizontal } from 'lucide-react';

// Configuration du worker PDF.js - Fichier statique depuis public/
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.js';

export function PDFViewer({
    pdfData,
    placedTags = [],
    selectedTag = null,
    onTagPlaced,
    onTagRemoved,
    onTagMoved,
    availableTags = []
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [pageRendering, setPageRendering] = useState(false);
    const [loadingError, setLoadingError] = useState(null);

    // État pour le Drag & Drop
    const [draggingTag, setDraggingTag] = useState(null); // { tag, startX, startY, initialParams }

    // Charger le PDF
    useEffect(() => {
        const loadPDF = async () => {
            if (!pdfData) {
                console.log('Pas de données PDF');
                return;
            }

            try {
                setLoadingError(null);
                console.log('Tentative de chargement PDF...');

                const loadingTask = pdfjsLib.getDocument(pdfData);
                const pdf = await loadingTask.promise;

                console.log('✅ PDF chargé avec succès!', pdf.numPages, 'page(s)');
                setPdfDoc(pdf);
                setTotalPages(pdf.numPages);
            } catch (error) {
                console.error('❌ Erreur chargement PDF:', error);
                setLoadingError(error.message || 'Erreur de chargement');
            }
        };

        loadPDF();
    }, [pdfData]);

    // Rendu de la page
    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || pageRendering) return;

            setPageRendering(true);

            try {
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                await page.render(renderContext).promise;
            } catch (error) {
                console.error('❌ Erreur rendu page:', error);
            } finally {
                setPageRendering(false);
            }
        };

        renderPage();
    }, [pdfDoc, currentPage, scale]);

    // Gestion du clic pour placer une balise (seulement si pas en train de dragger)
    const handleCanvasClick = (e) => {
        if (draggingTag) return; // Ne pas placer si on lâche un drag
        if (!selectedTag || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPercent = (x / canvas.width) * 100;
        const yPercent = (y / canvas.height) * 100;

        const newTag = {
            id: Date.now().toString(),
            key: selectedTag,
            page: currentPage,
            x: xPercent,
            y: yPercent,
            label: availableTags.find(t => t.key === selectedTag)?.label || selectedTag
        };

        onTagPlaced(newTag);
    };

    // Début du drag
    const handleTagMouseDown = (e, tag) => {
        e.stopPropagation(); // Empêcher le clic sur le canvas
        e.preventDefault(); // Empêcher la sélection de texte

        setDraggingTag({
            tag: tag,
            id: tag.id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: tag.x,
            initialY: tag.y
        });
    };

    // Pendant le drag (sur la fenêtre entière pour éviter de perdre le focus)
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!draggingTag || !canvasRef.current) return;

            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect(); // Dimensions actuelles du canvas

            // Calcul du delta en pixels
            const deltaXPixels = e.clientX - draggingTag.startX;
            const deltaYPixels = e.clientY - draggingTag.startY;

            // Conversion du delta en pourcentage du canvas
            const deltaXPercent = (deltaXPixels / rect.width) * 100;
            const deltaYPercent = (deltaYPixels / rect.height) * 100;

            // Nouvelle position
            const newX = draggingTag.initialX + deltaXPercent;
            const newY = draggingTag.initialY + deltaYPercent;

            // Mettre à jour via le parent
            if (onTagMoved) {
                const tagToUpdate = draggingTag.id ? { ...draggingTag.tag, id: draggingTag.id } : draggingTag.tag;
                onTagMoved(tagToUpdate, { x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            if (draggingTag) {
                setDraggingTag(null);
            }
        };

        if (draggingTag) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingTag, onTagMoved]);


    // Rendu des balises placées
    const renderPlacedTags = () => {
        if (!canvasRef.current) return null;

        const tagsOnCurrentPage = placedTags.filter(tag => tag.page === currentPage);

        return tagsOnCurrentPage.map((tag, index) => {
            // Si c'est le tag qu'on bouge, on utilise peut-être une position temporaire ? 
            // Ici on utilise directement les props mises à jour par handleMouseMove -> onTagMoved

            const x = (tag.x / 100) * canvasRef.current.width;
            const y = (tag.y / 100) * canvasRef.current.height;

            const isDragging = draggingTag && (draggingTag.id ? draggingTag.id === tag.id : draggingTag.tag === tag);

            return (
                <div
                    key={`${tag.key}-${index}`}
                    className={`absolute flex items-center gap-1 bg-purple-600 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg transition-colors pointer-events-auto select-none ${isDragging ? 'cursor-grabbing z-50 scale-110 opacity-90' : 'cursor-grab hover:bg-purple-700'}`}
                    style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: 'translate(-50%, -100%)', // Le point d'ancrage est en bas au milieu
                        transition: isDragging ? 'none' : 'transform 0.1s, left 0.1s, top 0.1s' // Pas de transition pendant le drag pour fluidité
                    }}
                    onMouseDown={(e) => handleTagMouseDown(e, tag)}
                >
                    <GripHorizontal className="w-3 h-3 text-purple-200 mr-1" />
                    <span>{tag.label}</span>
                    <div
                        className="ml-2 pl-2 border-l border-purple-400 hover:text-red-300 cursor-pointer p-0.5"
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Empêcher le drag
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onTagRemoved(tag);
                        }}
                    >
                        <Trash2 className="w-3 h-3" />
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">

            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-2 border-b border-slate-200 shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || !pdfDoc}
                        className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>

                    <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-md min-w-[80px] text-center">
                        {totalPages ? `${currentPage} / ${totalPages}` : '--'}
                    </span>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || !pdfDoc}
                        className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-md p-0.5">
                        <button
                            onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
                            disabled={!pdfDoc}
                            className="px-2 py-1 hover:bg-white rounded text-slate-600 disabled:opacity-50 text-xs font-bold transition-all shadow-sm"
                        >
                            -
                        </button>
                        <span className="text-xs font-medium w-12 text-center text-slate-600">{Math.round(scale * 100)}%</span>
                        <button
                            onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
                            disabled={!pdfDoc}
                            className="px-2 py-1 hover:bg-white rounded text-slate-600 disabled:opacity-50 text-xs font-bold transition-all shadow-sm"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* Viewer Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto bg-slate-200/50 p-8 relative flex items-start justify-center select-none"
            >
                {loadingError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md shadow-sm">
                        <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                            ⚠️ Erreur de chargement
                        </h3>
                        <p className="text-sm text-red-700 mb-2">{loadingError}</p>
                        <p className="text-xs text-red-600 mt-2">Vérifiez que le fichier est un PDF valide.</p>
                    </div>
                ) : !pdfDoc ? (
                    <div className="text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-sm text-slate-500 font-medium">Chargement du document...</p>
                    </div>
                ) : (
                    <div className="inline-block relative shadow-2xl transition-all duration-300 ease-out">
                        <canvas
                            ref={canvasRef}
                            onClick={handleCanvasClick}
                            className={`bg-white ${selectedTag ? 'cursor-crosshair' : 'cursor-default'}`}
                            style={{ display: 'block' }} // Évite les petits espaces fantômes
                        />

                        {/* Overlay balises (transparent aux clics, géré par pointer-events) */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="relative w-full h-full pointer-events-none">
                                {renderPlacedTags()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Instruction */}
            {selectedTag && pdfDoc && (
                <div className="bg-purple-600 text-white p-2 text-center text-xs font-medium shadow-md z-20">
                    Cliquez sur le document pour placer : <span className="bg-white/20 px-2 py-0.5 rounded ml-1">{selectedTag}</span>
                </div>
            )}
        </div>
    );
}
