import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOMServer from 'react-dom/server';
import React from 'react';

/**
 * Génère un PDF du simulateur de rentabilité
 * Page 1: Paramètres, Coûts, Rentabilité, Graphique
 * Page 2: Business Plan
 */
export async function generateSimulatorPDF(data) {
    const { params, costs, metrics } = data;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // === PAGE 1: RÉSUMÉ ===

    // Header
    doc.setFontSize(24);
    doc.setTextColor(20, 184, 166); // Teal color
    doc.text('Simulateur de Gain Producteur', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(new Date().toLocaleDateString('fr-FR'), pageWidth / 2, 27, { align: 'center' });

    let yPos = 40;

    // Section Paramètres
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('⚡ Paramètres', 15, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setTextColor(60);
    const paramLines = [
        `Puissance: ${params.power || 0} kWc`,
        `Production annuelle: ${(params.production || 0).toLocaleString()} kWh`,
        `Production estimée: ${(params.estimatedProduction || 0).toLocaleString()} kWh`,
        `Tarif TH: ${params.tarifTH || 0} €/kWh`,
        `Tarif ACC: ${params.tarifACC || 0} €/kWh`,
        `Prix d'achat ACC: ${((params.prixAchatACC || 0) * 100).toFixed(0)}%`
    ];

    paramLines.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 5;
    });

    yPos += 5;

    // Section Coûts
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('💰 Coûts du Projet', 15, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setTextColor(60);
    const costLines = [
        `Installation: ${(costs.installation || 0).toLocaleString()} €`,
        `Charpente: ${(costs.charpente || 0).toLocaleString()} €`,
        `Raccordement: ${(costs.raccordement || 0).toLocaleString()} €`,
        `Développement: ${(costs.developpement || 0).toLocaleString()} €`
    ];

    costLines.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 5;
    });

    yPos += 2;
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235); // Blue
    doc.text(`Coût Total: ${metrics.totalCost.toLocaleString()} €`, 20, yPos);
    yPos += 10;

    // Section Rentabilité
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('📈 Rentabilité', 15, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setTextColor(60);
    const profitLines = [
        `TRI moyen: ${metrics.tri.toFixed(2)}%`,
        `DRCI Moyen: ${metrics.drci.toFixed(2)} ans`,
        `Retour sans ACC: ${metrics.paybackWithoutACC.toFixed(1)} ans`,
        `Retour avec ACC: ${metrics.paybackWithACC.toFixed(1)} ans`
    ];

    profitLines.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 5;
    });

    yPos += 10;

    // Note pour le graphique
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('📊 Graphique des gains cumulés disponible dans l\'application', 15, yPos);
    yPos += 10;

    // Footer Page 1
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Page 1 / 2', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // === PAGE 2: BUSINESS PLAN ===
    doc.addPage();

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Business Plan (20 ans)', pageWidth / 2, 15, { align: 'center' });

    // Créer un tableau simplifié du BP
    const bp = metrics.businessPlan;
    if (bp && bp.length > 0) {
        const startY = 25;
        const rowHeight = 6;
        const colWidth = 18;
        const firstColWidth = 50;

        // Headers - Années (afficher 10 ans par page)
        doc.setFontSize(7);
        doc.setTextColor(0);

        // Première moitié (années 0-9)
        let currentY = startY;
        doc.text('Année', 10, currentY);
        for (let i = 0; i < Math.min(10, bp.length); i++) {
            doc.text(bp[i].annee.toString(), firstColWidth + (i * colWidth), currentY, { align: 'center' });
        }
        currentY += rowHeight;

        // Lignes principales
        const mainRows = [
            { label: 'Total CA (€)', key: 'totalCA' },
            { label: 'Total Charges (€)', key: 'totalCharges' },
            { label: 'EBE (€)', key: 'ebe' },
            { label: 'Résultat Net (€)', key: 'resultatNet' }
        ];

        mainRows.forEach(row => {
            doc.setTextColor(60);
            doc.text(row.label, 10, currentY);

            for (let i = 0; i < Math.min(10, bp.length); i++) {
                const value = bp[i][row.key] || 0;
                const formatted = Math.round(value).toLocaleString('fr-FR');
                doc.text(formatted, firstColWidth + (i * colWidth), currentY, { align: 'right' });
            }
            currentY += rowHeight;
        });

        // Deuxième moitié (années 10-19) si espace disponible
        if (bp.length > 10 && currentY < pageHeight - 60) {
            currentY += 10;
            doc.setTextColor(0);
            doc.text('Année', 10, currentY);
            for (let i = 10; i < bp.length; i++) {
                doc.text(bp[i].annee.toString(), firstColWidth + ((i - 10) * colWidth), currentY, { align: 'center' });
            }
            currentY += rowHeight;

            mainRows.forEach(row => {
                doc.setTextColor(60);
                doc.text(row.label, 10, currentY);

                for (let i = 10; i < bp.length; i++) {
                    const value = bp[i][row.key] || 0;
                    const formatted = Math.round(value).toLocaleString('fr-FR');
                    doc.text(formatted, firstColWidth + ((i - 10) * colWidth), currentY, { align: 'right' });
                }
                currentY += rowHeight;
            });
        }
    }

    // Footer Page 2
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Page 2 / 2', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Télécharger le PDF
    doc.save(`Simulateur_Rentabilite_${new Date().toISOString().split('T')[0]}.pdf`);
}
