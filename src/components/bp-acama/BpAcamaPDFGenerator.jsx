import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Génère un PDF pour la page BP ACAMA
 * Format Paysage
 */
export async function generateBpAcamaPDF({ elementId, sections, fileName }) {
    try {
        const pdf = new jsPDF({
            orientation: 'landscape',
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
            
            if (isNewPage) pdf.addPage();

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    // Show PDF headers in the cloned document
                    const headers = clonedDoc.querySelectorAll('.pdf-header');
                    headers.forEach(header => {
                        header.style.setProperty('display', 'flex', 'important');
                    });

                    // Replace inputs and selects with their values for visibility
                    clonedDoc.querySelectorAll('input, select').forEach(el => {
                        const parent = el.parentNode;
                        if (!parent) return;

                        let valueText = '';
                        if (el.tagName === 'SELECT') {
                            valueText = el.options[el.selectedIndex]?.text || '';
                        } else {
                            // Format number values to match display (e.g. 4 decimals if needed)
                            valueText = el.value || '';
                        }

                        // Create a replacement text element
                        const textEl = clonedDoc.createElement('div');
                        textEl.className = 'text-xs font-bold text-blue-900 border-b border-slate-200 pb-0.5 min-h-[24px] flex items-center px-1';
                        textEl.textContent = valueText;
                        
                        // Hide original element
                        el.style.display = 'none';
                        
                        // Hide any suffix span inside the field - Match "text-slate-500" from Field component
                        const suffixEl = parent.querySelector('span.text-slate-500') || parent.querySelector('span.text-slate-400');
                        if (suffixEl) {
                            suffixEl.style.display = 'none';
                            if (suffixEl.textContent) {
                                // Important: unit goes AFTER value (e.g. 1910 m²)
                                textEl.textContent += ' ' + suffixEl.textContent.trim();
                            }
                        }

                        parent.appendChild(textEl);
                    });

                    // Compacter la mise en page pour que tout rentre
                    clonedDoc.querySelectorAll('.pdf-header-container').forEach(el => {
                        el.style.setProperty('padding', '2mm', 'important');
                        el.style.setProperty('padding-top', '5mm', 'important');
                        el.style.setProperty('height', 'auto', 'important');
                        el.style.setProperty('min-height', 'auto', 'important');
                        el.style.setProperty('max-height', 'none', 'important');
                        el.style.setProperty('overflow', 'visible', 'important');
                    });
                    
                    // Remove height constraints that could cause truncation
                    clonedDoc.querySelectorAll('.h-full, .grow, .flex-1, .h-\\[300px\\], .h-\\[250px\\]').forEach(el => {
                        el.style.setProperty('height', 'auto', 'important');
                        el.style.setProperty('min-height', '0', 'important');
                        el.style.setProperty('flex', 'none', 'important');
                    });

                    clonedDoc.querySelectorAll('.space-y-8, .space-y-6, .gap-6, .gap-y-6').forEach(el => {
                        el.style.setProperty('gap', '2mm', 'important');
                        el.style.setProperty('margin-top', '0', 'important');
                        el.style.setProperty('margin-bottom', '0', 'important');
                    });
                    
                    // Make charts and tables full width and larger font for Page 2
                    clonedDoc.querySelectorAll('.recharts-responsive-container, .recharts-wrapper, table').forEach(el => {
                        el.style.setProperty('width', '100%', 'important');
                        el.style.setProperty('max-width', 'none', 'important');
                        if (id === 'pdf-section-2' && el.tagName === 'TABLE') {
                            el.style.setProperty('font-size', '12pt', 'important');
                        }
                    });
                    
                    // Force white background and adjust any table/grid spacing if needed
                    clonedDoc.querySelectorAll('.bg-white, .bg-slate-50, .bg-slate-100').forEach(el => {
                        el.style.backgroundColor = '#ffffff';
                        el.style.backgroundImage = 'none';
                    });

                    // Ensure the main section is full width with very thin margins
                    const s = clonedDoc.getElementById(id);
                    if (s) {
                        s.style.width = pdfWidth + 'mm';
                        s.style.margin = '0';
                        s.style.padding = '0';
                        s.style.border = 'none';
                        s.style.borderRadius = '0';
                        s.style.boxSizing = 'border-box';
                    }
                },
                ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore')
            });

            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Fit to page
            if (imgHeight > pdfHeight) {
                const ratio = pdfHeight / imgHeight;
                const scaledWidth = pdfWidth * ratio;
                const xOffset = (pdfWidth - scaledWidth) / 2;
                pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, pdfHeight);
            } else {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            }
        };

        if (sections && sections.length > 0) {
            for (let i = 0; i < sections.length; i++) {
                await addToPdf(sections[i], i > 0);
            }
        } else {
            // Fallback to original behavior
            await addToPdf(elementId, false);
        }

        pdf.save(fileName || 'document.pdf');

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Une erreur est survenue lors de la génération du PDF.');
    }
}
