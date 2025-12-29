import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

// Configuration du worker PDF.js - Fichier statique depuis public/
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.js';

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
    const [loadingError, setLoadingError] = useState(null);

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
                console.log('Type de données:', typeof pdfData);
                console.log('Début des données:', pdfData.substring(0, 100));

                const loadingTask = pdfjsLib.getDocument(pdfData);

                loadingTask.onProgress = (progress) => {
                    console.log(`Chargement: ${progress.loaded} / ${progress.total}`);
                };

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
                console.log(`Rendu page ${currentPage}...`);
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
                console.log('✅ Page rendue');
            } catch (error) {
                console.error('❌ Erreur rendu page:', error);
            } finally {
                setPageRendering(false);
            }
        };

        renderPage();
    }, [pdfDoc, currentPage, scale]);

    // Gestion du clic pour placer une balise
    const handleCanvasClick = (e) => {
        if (!selectedTag || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Coordonnées du clic
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Conversion en pourcentages
        const xPercent = (x / canvas.width) * 100;
        const yPercent = (y / canvas.height) * 100;

        const newTag = {
            key: selectedTag,
            page: currentPage,
            x: xPercent,
            y: yPercent,
            label: availableTags.find(t => t.key === selectedTag)?.label || selectedTag
        };

        console.log('Balise placée:', newTag);
        onTagPlaced(newTag);
    };

    // Rendu des balises placées
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
                    className="absolute flex items-center gap-2 bg-purple-600 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg cursor-pointer hover:bg-purple-700 transition pointer-events-auto"
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
                        disabled={currentPage === 1 || !pdfDoc}
                        className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-sm font-medium">
                        Page {currentPage} / {totalPages || 0}
                    </span>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || !pdfDoc}
                        className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
                        disabled={!pdfDoc}
                        className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                        -
                    </button>
                    <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
                        disabled={!pdfDoc}
                        className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Viewer Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto bg-slate-200 p-4 relative flex items-center justify-center"
            >
                {loadingError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                        <h3 className="font-bold text-red-900 mb-2">Erreur de chargement</h3>
                        <p className="text-sm text-red-700 mb-2">{loadingError}</p>
                        <p className="text-xs text-red-600 mt-2">Vérifiez que le fichier est un PDF valide.</p>
                        <p className="text-xs text-red-500 mt-2">Si le problème persiste, essayez avec un autre PDF.</p>
                    </div>
                ) : !pdfDoc ? (
                    <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-sm text-slate-600">Chargement du PDF...</p>
                    </div>
                ) : (
                    <div className="inline-block relative">
                        <canvas
                            ref={canvasRef}
                            onClick={handleCanvasClick}
                            className={`shadow-2xl border border-slate-300 bg-white ${selectedTag ? 'cursor-crosshair' : 'cursor-default'}`}
                        />

                        {/* Overlay balises */}
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
                <div className="bg-purple-100 border-t border-purple-300 p-3">
                    <p className="text-sm text-purple-800 font-medium text-center">
                        🖱️ Cliquez sur le document pour placer : <code className="bg-purple-200 px-2 py-1 rounded">{selectedTag}</code>
                    </p>
                </div>
            )}
        </div>
    );
}
