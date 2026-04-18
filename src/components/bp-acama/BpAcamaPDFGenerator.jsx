import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Génère un PDF pour la page BP (ou BP ACAMA selon le tenant)
 * @param {string} elementId - ID de l'élément à capturer
 * @param {string[]} sections - Liste des IDs de sections à ajouter au PDF
 * @param {string} fileName - Nom du fichier de sortie
 * @param {string} orientation - 'landscape' ou 'portrait'
 * @param {boolean} clean - Si true, retire les fonds de couleur pour un rendu plus sobre
 */
export async function generateBpAcamaPDF({ elementId, sections, fileName, orientation = 'landscape', clean = false }) {
    try {
        const isPortrait = orientation === 'portrait';
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const addToPdf = async (id, isNewPage = false) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Section not found: ${id}`);
                return;
            }

            const margin = 10; // 10mm margin
            const contentWidth = pdfWidth - (2 * margin);
            const contentHeight = pdfHeight - (2 * margin);

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    // Masquer explicitement les éléments à ignorer
                    clonedDoc.querySelectorAll('[data-html2canvas-ignore="true"]').forEach(el => {
                        el.style.display = 'none';
                    });

                    const headers = clonedDoc.querySelectorAll('.pdf-header');
                    headers.forEach(header => {
                        header.style.setProperty('display', 'flex', 'important');
                    });

                    // Nettoyage des bordures et ombres pour les sections spécifiques
                    clonedDoc.querySelectorAll('.pdf-no-top-border').forEach(el => {
                        el.style.setProperty('border-top', 'none', 'important');
                        el.style.setProperty('box-shadow', 'none', 'important');
                        el.style.setProperty('padding-top', '0', 'important');
                    });

                    clonedDoc.querySelectorAll('input, select').forEach(el => {
                        const parent = el.parentNode;
                        if (!parent) return;
                        let valueText = el.tagName === 'SELECT' ? (el.options[el.selectedIndex]?.text || '') : (el.value || '');
                        
                        const textEl = clonedDoc.createElement('div');
                        textEl.className = 'text-xs font-bold pb-0.5 min-h-[24px] flex items-center px-1';
                        
                        // Hériter la couleur du parent pour le mode clean et les fonds sombres/clairs
                        const isInsideDark = el.closest('.bg-slate-900, .bg-\\[\\#002060\\], .bg-slate-800');
                        if (isInsideDark && !clean) {
                            textEl.style.color = '#ffffff';
                        } else if (clean && !isInsideDark) {
                            textEl.style.color = '#000000';
                        } else if (clean && isInsideDark) {
                            textEl.style.color = '#ffffff';
                        } else {
                            textEl.style.color = '#1e3a8a'; // text-blue-900 par défaut
                        }

                        if (parent.tagName !== 'TD') {
                            parent.style.display = 'flex';
                            parent.style.flexDirection = 'row';
                            parent.style.alignItems = 'center';
                            parent.style.gap = '4px';
                        }

                        if (parent.classList.contains('justify-center') || 
                            parent.parentNode?.classList.contains('justify-center') || 
                            parent.classList.contains('text-center') || 
                            parent.style.textAlign === 'center') {
                            textEl.style.justifyContent = 'center';
                            textEl.style.width = '100%';
                        }
                        
                        textEl.textContent = valueText;
                        el.replaceWith(textEl);
                    });

                    // Mode CLEAN : Supprimer les fonds de couleur pour les devis/propositions
                    if (clean) {
                        clonedDoc.querySelectorAll('.bg-slate-50, .bg-blue-50, .bg-slate-100, .bg-amber-400, .bg-slate-800, .bg-blue-50\\/30, .bg-white').forEach(el => {
                            el.style.backgroundColor = 'transparent';
                            el.style.backgroundImage = 'none';
                            el.style.boxShadow = 'none';
                            if (el.classList.contains('text-white')) {
                                el.style.color = '#000000';
                            }
                        });
                        clonedDoc.querySelectorAll('.text-white, .text-blue-400, .text-blue-300, .text-blue-200, .text-blue-700, .text-blue-900, .text-slate-500, .text-slate-400').forEach(el => {
                            // Ne pas forcer le noir si on est dans le cadre total HT ou info client qui doivent rester foncés
                            if (!el.closest('.bg-slate-900, .bg-\\[\\#002060\\]')) {
                                el.style.setProperty('color', '#000000', 'important');
                            } else {
                                el.style.setProperty('color', '#ffffff', 'important');
                            }
                        });
                        clonedDoc.querySelectorAll('.border-white\\/10, .border-blue-800\\/50, .border-slate-200, .border-slate-300, .border-blue-300, .border-slate-100, .border-slate-100').forEach(el => {
                            el.style.borderColor = '#000000';
                            el.style.borderWidth = '0.5pt';
                        });
                        // Garder les textes importants en noir (sauf fond sombre)
                        clonedDoc.querySelectorAll('.font-black, .font-bold, .font-medium').forEach(el => {
                            if (!el.closest('.bg-slate-900, .bg-\\[\\#002060\\]')) {
                                el.style.color = '#000000';
                            } else {
                                el.style.color = '#ffffff';
                            }
                        });
                        // Cacher les ombres portées
                        clonedDoc.querySelectorAll('.shadow-xl, .shadow-lg, .shadow-md, .shadow-sm, .shadow-inner').forEach(el => {
                            el.style.boxShadow = 'none';
                        });
                    }

                    clonedDoc.querySelectorAll('.pdf-header-container').forEach(el => {
                        el.style.setProperty('padding', '0', 'important');
                        el.style.setProperty('padding-top', '2mm', 'important');
                        el.style.setProperty('height', 'auto', 'important');
                    });
                    
                    clonedDoc.querySelectorAll('.h-full, .grow, .flex-1, .h-\\[300px\\], .h-\\[250px\\], .min-h-\\[140px\\], .min-h-full').forEach(el => {
                        el.style.setProperty('height', 'auto', 'important');
                        el.style.setProperty('min-height', '0', 'important');
                    });

                    clonedDoc.querySelectorAll('.space-y-8, .space-y-6, .gap-6, .gap-y-6, .gap-8, .space-y-4').forEach(el => {
                        el.style.setProperty('gap', '2mm', 'important');
                    });
                    
                    clonedDoc.querySelectorAll('.recharts-responsive-container, .recharts-wrapper, table').forEach(el => {
                        el.style.setProperty('width', '100%', 'important');
                    });

                    const s = clonedDoc.getElementById(id);
                    if (s) {
                        s.style.display = 'block';
                        s.style.margin = '0';
                        s.style.padding = '0';
                        s.style.overflow = 'visible';
                        
                        if (isPortrait) {
                            s.style.width = '1000px'; 
                        } else {
                            // Détection dynamique du nombre d'années pour garder la même échelle (Image 1)
                            if (id === 'pdf-section-battery') {
                                const yearThs = s.querySelectorAll('thead tr:first-child th, thead tr:first-child td').length - 1; 
                                // On garde 1600px pour 12 ans (référence Image 1)
                                // Au delà, on augmente la largeur pour ne pas compresser les colonnes
                                if (yearThs > 12) {
                                    s.style.width = `${1600 + (yearThs - 12) * 80}px`;
                                } else {
                                    s.style.width = '1600px';
                                }
                            } else {
                                s.style.width = id === 'pdf-section-2' ? '2200px' : '1600px'; 
                            }
                        }

                        const grid = s.querySelector('.grid');
                        if (grid) {
                            grid.style.display = 'grid';
                            if (isPortrait) {
                                if (grid.classList.contains('grid-cols-2')) {
                                    grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
                                } else if (grid.classList.contains('lg:grid-cols-12')) {
                                    grid.style.gridTemplateColumns = 'repeat(12, minmax(0, 1fr))';
                                }
                            } else if (id === 'pdf-section-1') {
                                grid.style.gridTemplateColumns = 'repeat(12, minmax(0, 1fr))';
                            }
                        }
                    }
                },
                ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore')
            });

            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            
            const targetWidth = pdfWidth - (margin * 2);
            const targetHeight = pdfHeight - (margin * 2);

            const widthRatio = targetWidth / imgProps.width;
            const heightRatio = targetHeight / imgProps.height;
            const bestRatio = Math.min(widthRatio, heightRatio);
            
            const finalWidth = imgProps.width * bestRatio;
            const finalHeight = imgProps.height * bestRatio;
            
            const xPos = margin + (targetWidth - finalWidth) / 2;
            const yPos = margin + (targetHeight - finalHeight) / 2;

            if (isNewPage) {
                pdf.addPage();
            }

            pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidth, finalHeight);
        };

        if (sections && sections.length > 0) {
            for (let i = 0; i < sections.length; i++) {
                await addToPdf(sections[i], i > 0);
            }
        } else {
            await addToPdf(elementId, false);
        }

        pdf.save(fileName || 'document.pdf');

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Une erreur est survenue lors de la génération du PDF.');
    }
}

