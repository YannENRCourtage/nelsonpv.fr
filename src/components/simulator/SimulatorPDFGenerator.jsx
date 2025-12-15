import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Génère un PDF du simulateur de rentabilité en capturant le contenu HTML
 * Format Paysage
 */
export async function generateSimulatorPDF({ elementId, fileName }) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        // Capture du contenu
        const canvas = await html2canvas(element, {
            scale: 2, // Meilleure qualité
            useCORS: true,
            logging: false,
            backgroundColor: '#f9fafb', // gray-50
            ignoreElements: (element) => element.hasAttribute('data-html2canvas-ignore')
        });

        // Dimensions du PDF (A4 Paysage)
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculer les dimensions de l'image dans le PDF
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        // Première page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Pages suivantes si nécessaire
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(fileName || 'simulation.pdf');

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Une erreur est survenue lors de la génération du PDF.');
    }
}
