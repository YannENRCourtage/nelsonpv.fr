import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Génère un PDF du simulateur de rentabilité en capturant le contenu HTML
 * Format Paysage
 */
export async function generateSimulatorPDF({ elementId, fileName }) {
    const topSection = document.getElementById('simulator-top-section');
    const businessPlanSection = document.getElementById('business-plan-section');

    // Fallback: Use original elementId if specific sections not found
    if (!topSection || !businessPlanSection) {
        console.warn('Specific sections not found, using fallback ID:', elementId);
        const element = document.getElementById(elementId);
        if (!element) return;

        // ... Original single-page logic could be here, but simpler to just alert or try best effort
        // For now, we assume the IDs exist as we added them.
    }

    try {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const addToPdf = async (element, isNewPage = false) => {
            if (isNewPage) pdf.addPage();

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#f9fafb',
                ignoreElements: (element) => element.hasAttribute('data-html2canvas-ignore')
            });

            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Fit to page if too tall
            if (imgHeight > pdfHeight) {
                const ratio = pdfHeight / imgHeight;
                const scaledWidth = pdfWidth * ratio;
                const xOffset = (pdfWidth - scaledWidth) / 2;
                pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, pdfHeight);
            } else {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            }
        };

        if (topSection) await addToPdf(topSection, false);
        if (businessPlanSection) await addToPdf(businessPlanSection, true);

        pdf.save(fileName || 'simulation.pdf');

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Une erreur est survenue lors de la génération du PDF.');
    }
}
