import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';

// Configuration du worker PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function PDFViewer({
    pdfData,
    placedTags = [],
    selectedTag = null,
    onTagPlaced,
    onTagRemoved,
    availableTags = []
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [pageRendering, setPageRendering] = useState(false);

    // Charger le PDF
    useEffect(() => {
        const loadPDF = async () => {
            try {
                const loadingTask = pdfjsLib.getDocument(pdfData);
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setTotalPages(pdf.numPages);
            } catch (error) {
                console.error('Erreur chargement PDF:', error);
            }
        };

        if (pdfData) {
            loadPDF();
        }
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
                console.error('Erreur rendu page:', error);
            } finally {
                setPageRendering(false);
            }
        };

        renderPage();
    }, [pdfDoc, currentPage, scale, pageRendering]);

    // Gestion du clic pour placer une balise
    const handleCanvasClick = (e) => {
        if (!selectedTag || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Coordonnées du clic
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Conversion en pourcentages (pour adaptabilité)
        const xPercent = (x / canvas.width) * 100;
        const yPercent = (y / canvas.height) * 100;

        // Créer la balise placée
        const newTag = {
            key: selectedTag,
            page: currentPage,
            x: xPercent,
            y: yPercent,
            label: availableTags.find(t => t.key === selectedTag)?.label || selectedTag
        };

        onTagPlaced(newTag);
    };

    // Rendu des balises placées sur la page actuelle
    const renderPlacedTags = () => {
        if (!canvasRef.current) return null;

        const canvas = canvasRef.current;
        const tagsOnCurrentPage = placedTags.filter(tag => tag.page === currentPage);

        return tagsOnCurrentPage.map((tag, index) => {
            const x = (tag.x / 100) * canvas.width;
            const y = (tag.y / 100) * canvas.height;

            return (
                <div
                    key={`${tag.key}-${index}`}
                    className="absolute flex items-center gap-2 bg-purple-600 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg cursor-pointer hover:bg-purple-700 transition"
                    style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: 'translate(-50%, -100%)'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onTagRemoved(tag);
                    }}
                >
                    <span>{tag.label}</span>
                    <Trash2 className="w-3 h-3" />
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col h-full">

            {/* Toolbar */}
            <div className="flex items-center justify-between bg-slate-100 p-3 border-b border-slate-300">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-sm font-medium">
                        Page {currentPage} / {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
                        className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                    >
                        -
                    </button>
                    <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
                        className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Viewer Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto bg-slate-200 p-4 relative"
            >
                <div className="inline-block relative">
                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        className={`shadow-2xl border border-slate-300 ${selectedTag ? 'cursor-crosshair' : 'cursor-default'}`}
                    />

                    {/* Overlay pour balises placées */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="relative w-full h-full pointer-events-auto">
                            {renderPlacedTags()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Instruction */}
            {selectedTag && (
                <div className="bg-purple-100 border-t border-purple-300 p-3">
                    <p className="text-sm text-purple-800 font-medium text-center">
                        🖱️ Cliquez sur le document pour placer : <code className="bg-purple-200 px-2 py-1 rounded">{selectedTag}</code>
                    </p>
                </div>
            )}
        </div>
    );
}
