import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Génère un PDF pour la page BP (ou BP ACAMA selon le tenant)
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

            const margin = 10; // 10mm margin
            const contentWidth = pdfWidth - (2 * margin);
            const contentHeight = pdfHeight - (2 * margin);

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    // ... (rest of the onclone logic remains identical)
                    // ... existing headers visible property ...
                    const headers = clonedDoc.querySelectorAll('.pdf-header');
                    headers.forEach(header => {
                        header.style.setProperty('display', 'flex', 'important');
                    });

                    clonedDoc.querySelectorAll('input, select').forEach(el => {
                        const parent = el.parentNode;
                        if (!parent) return;
                        let valueText = el.tagName === 'SELECT' ? (el.options[el.selectedIndex]?.text || '') : (el.value || '');
                        
                        const textEl = clonedDoc.createElement('div');
                        // Ensure centering if parent is flex
                        textEl.className = 'text-xs font-bold text-blue-900 border-b border-slate-200 pb-0.5 min-h-[24px] flex items-center px-1';
                        if (parent.classList.contains('justify-center') || parent.parentNode?.classList.contains('justify-center')) {
                            textEl.style.justifyContent = 'center';
                            textEl.style.width = '100%';
                        }
                        
                        textEl.textContent = valueText;
                        el.style.display = 'none';
                        const suffixEl = parent.querySelector('span.text-slate-500') || parent.querySelector('span.text-slate-400');
                        if (suffixEl) {
                            suffixEl.style.display = 'none';
                            if (suffixEl.textContent) textEl.textContent += ' ' + suffixEl.textContent.trim();
                        }
                        parent.appendChild(textEl);
                    });

                    clonedDoc.querySelectorAll('.pdf-header-container').forEach(el => {
                        el.style.setProperty('padding', '0', 'important'); // Remove internal padding to eliminate white bands
                        el.style.setProperty('padding-top', id === 'pdf-section-1' ? '2mm' : '5mm', 'important');
                        el.style.setProperty('height', 'auto', 'important');
                    });
                    
                    clonedDoc.querySelectorAll('.h-full, .grow, .flex-1, .h-\\[300px\\], .h-\\[250px\\]').forEach(el => {
                        el.style.setProperty('height', 'auto', 'important');
                        el.style.setProperty('min-height', '0', 'important');
                    });

                    clonedDoc.querySelectorAll('.space-y-8, .space-y-6, .gap-6, .gap-y-6').forEach(el => {
                        el.style.setProperty('gap', id === 'pdf-section-1' ? '1mm' : '2mm', 'important');
                    });
                    
                    clonedDoc.querySelectorAll('.recharts-responsive-container, .recharts-wrapper, table').forEach(el => {
                        el.style.setProperty('width', '100%', 'important');
                        if (id === 'pdf-section-2' && el.tagName === 'TABLE') {
                            el.style.setProperty('font-size', '9pt', 'important'); // Balanced font size
                        }
                    });
                    
                    // Only ensure the main background is white, but preserve internal shades
                    clonedDoc.querySelectorAll('.pdf-header-container, #pdf-section-2').forEach(el => {
                        el.style.backgroundColor = '#ffffff';
                    });

                    const s = clonedDoc.getElementById(id);
                    if (s) {
                        // Increase to 2200px for the 20-year table to ensure no truncation of 2045
                        // For Page 1, use 1600px to fill the full landscape width
                        s.style.width = id === 'pdf-section-2' ? '2200px' : '1600px'; 
                        s.style.display = 'block';
                        s.style.margin = '0';
                        s.style.padding = '0';
                        s.style.overflow = 'visible';
                        
                        // Force grid columns for Page 1
                        if (id === 'pdf-section-1') {
                            const grid = s.querySelector('.grid');
                            if (grid) {
                                grid.style.display = 'grid';
                                grid.style.gridTemplateColumns = 'repeat(12, minmax(0, 1fr))';
                                const leftVal = s.querySelector('.xl\\:col-span-5');
                                const rightVal = s.querySelector('.xl\\:col-span-7');
                                if (leftVal) leftVal.style.gridColumn = 'span 5 / span 5';
                                if (rightVal) rightVal.style.gridColumn = 'span 7 / span 7';
                            }
                        }
                    }
                },
                ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore')
            });

            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

            // Fit to content area - Always fill the width as requested
            pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);
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
