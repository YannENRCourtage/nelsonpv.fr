// Service de génération de la proposition commerciale & devis solaire avec fusion PDF des fiches techniques fabricants
import jsPDF from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Couleurs charte ENR Courtage Énergie
const COLORS = {
    primary: [30, 58, 138],      // #1e3a8a (Bleu nuit professionnel)
    secondary: [245, 158, 11],   // #f59e0b (Ambre / Solaire)
    accent: [16, 185, 129],      // #10b981 (Émeraude / Écologie)
    dark: [30, 41, 59],          // #1e293b (Slate sombre)
    gray: [100, 116, 139],       // #64748b (Slate moyen)
    lightGray: [241, 245, 249],  // #f1f5f9 (Fond doux)
    border: [226, 232, 240],     // #e2e8f0
    white: [255, 255, 255]
};

function formatEuro(val) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
}

function formatNumber(val, decimals = 0) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(val || 0);
}

/**
 * Génère le document PDF complet (Étude + Devis + Fiches techniques constructeurs)
 */
export async function generateQuoteProposalPdf({
    project = {},
    quoteData = {},
    energyTarifs = {},
    onProgress = () => {}
}) {
    onProgress({ step: 1, percent: 15, message: "Génération de l'offre commerciale et de l'étude technico-économique..." });

    // Initialisation jsPDF A4 Portrait
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Données client et devis
    const clientName = (quoteData.clientName || `${project.firstName || ''} ${project.name || 'Client'}`).trim() || 'Client';
    const clientAddress = quoteData.clientAddress || project.address || '';
    const clientZipCity = `${quoteData.clientZip || project.zip || ''} ${quoteData.clientCity || project.city || ''}`.trim();
    const clientPhone = quoteData.clientPhone || project.phone || '';
    const clientEmail = quoteData.clientEmail || project.email || '';
    const prm = project.enedisPrm || project.pdl || '';
    const quoteNumber = quoteData.quoteNumber || `DEV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const validityDays = quoteData.validityDays || 30;

    // Données techniques
    const powerKwc = parseFloat(quoteData.powerKwc || project.projectSize || 9.0) || 9.0;
    const annualProductionKwh = Math.round(powerKwc * (parseFloat(project.solarYieldRoof1 || 1150) || 1150));
    const autoConsomPercent = quoteData.autoConsomPercent || 70;
    const autoConsomKwh = Math.round(annualProductionKwh * (autoConsomPercent / 100));
    const surplusKwh = annualProductionKwh - autoConsomKwh;

    // Tarifs énergie
    const trvKwh = energyTarifs.trvBase || 0.2516;
    const tarifRachatKwh = energyTarifs.tarifAchatRetenu || 0.1269;
    const primeAuto = energyTarifs.primeTotal || (powerKwc <= 3 ? 900 : (powerKwc <= 9 ? 2070 : 0));

    // Économies financières annuelles estimées
    const econoFactureAn = Math.round(autoConsomKwh * trvKwh);
    const revenuVenteAn = Math.round(surplusKwh * tarifRachatKwh);
    const gainTotalAn1 = econoFactureAn + revenuVenteAn;
    const gain20Ans = Math.round((gainTotalAn1 * 20 * 1.02) + primeAuto); // Prise en compte inflation modérée 2%

    // Co2 économisé (40g CO2/kWh évité vs mix européen ~250g)
    const co2Tonnes20Ans = ((annualProductionKwh * 20 * 0.21) / 1000).toFixed(1);

    // =========================================================================
    // PAGE 1 : PAGE DE GARDE & PRÉSENTATION DU PROJET
    // =========================================================================
    // En-tête bandeau
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Logo texte ou graphisme
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ENR COURTAGE ÉNERGIE', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Bureau d\'Études & Solutions Solaires Clé en Main', margin, 26);
    doc.text('contact@enr-courtage.fr | www.enr-courtage.fr', margin, 32);

    // Tag Devis
    doc.setFillColor(...COLORS.secondary);
    doc.roundedRect(pageWidth - margin - 55, 12, 55, 18, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DEVIS & ÉTUDE', pageWidth - margin - 27.5, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.text(quoteNumber, pageWidth - margin - 27.5, 26, { align: 'center' });

    // Titre de la proposition
    let curY = 56;
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PROPOSITION COMMERCIALE & TECHNIQUE', margin, curY);

    curY += 7;
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(13);
    doc.text(`Centrale Solaire Photovoltaïque ${powerKwc} kWc en Autoconsommation`, margin, curY);

    // Cadre Coordonnées Client & Entreprise
    curY += 12;
    const boxWidth = (contentWidth - 6) / 2;
    const boxHeight = 44;

    // Encadré Émetteur
    doc.setFillColor(...COLORS.lightGray);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, curY, boxWidth, boxHeight, 3, 3, 'FD');

    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ÉMETTEUR / EXPERT SOLAIRE', margin + 6, curY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text('ENR COURTAGE ÉNERGIE SAS', margin + 6, curY + 17);
    doc.text('Conseil en Transition Énergétique', margin + 6, curY + 23);
    doc.text('Garantie Décennale & Certification RGE QualiPV', margin + 6, curY + 29);
    doc.text(`Conseiller : ${quoteData.commercialName || 'Pôle Ingénierie Solaire'}`, margin + 6, curY + 35);

    // Encadré Bénéficiaire (Client)
    doc.roundedRect(margin + boxWidth + 6, curY, boxWidth, boxHeight, 3, 3, 'FD');
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DESTINATAIRE / CLIENT', margin + boxWidth + 12, curY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text(clientName, margin + boxWidth + 12, curY + 17);
    if (clientAddress) doc.text(clientAddress, margin + boxWidth + 12, curY + 23);
    if (clientZipCity) doc.text(clientZipCity, margin + boxWidth + 12, curY + 29);
    const contactLine = [clientPhone, clientEmail].filter(Boolean).join(' • ');
    if (contactLine) doc.text(contactLine, margin + boxWidth + 12, curY + 35);

    // Métadonnées devis
    curY += boxHeight + 10;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, curY, contentWidth, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text(`Date d'émission : ${dateStr}`, margin + 6, curY + 8);
    doc.text(`Durée de validité : ${validityDays} jours`, margin + 65, curY + 8);
    if (prm) doc.text(`Point Livraison (PRM Enedis) : ${prm}`, margin + 120, curY + 8);

    // Synthèse du projet sous forme de cartes d'indicateurs
    curY += 18;
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SYNTHÈSE CLÉ EN MAIN DE VOTRE INSTALLATION', margin, curY);

    curY += 6;
    const kpiWidth = (contentWidth - 9) / 4;
    const kpiHeight = 24;

    const kpis = [
        { label: 'Puissance Crête', val: `${powerKwc} kWc`, sub: `${quoteData.nbPanels || Math.round(powerKwc * 2.3)} modules bi-verre` },
        { label: 'Production Annuelle', val: `${formatNumber(annualProductionKwh)} kWh`, sub: `Productible ~${Math.round(annualProductionKwh / powerKwc)} kWh/kWc` },
        { label: 'Autoconsommation', val: `${autoConsomPercent}%`, sub: `Surplus racheté EDF OA` },
        { label: 'Gain Estimé 20 ans', val: formatEuro(gain20Ans), sub: `Économies & primes` }
    ];

    kpis.forEach((kpi, idx) => {
        const kX = margin + idx * (kpiWidth + 3);
        doc.setFillColor(idx === 3 ? 240 : 248, idx === 3 ? 253 : 250, idx === 3 ? 244 : 252);
        doc.setDrawColor(...(idx === 3 ? COLORS.accent : COLORS.border));
        doc.roundedRect(kX, curY, kpiWidth, kpiHeight, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.gray);
        doc.text(kpi.label.toUpperCase(), kX + kpiWidth / 2, curY + 6, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(...(idx === 3 ? COLORS.accent : COLORS.primary));
        doc.text(kpi.val, kX + kpiWidth / 2, curY + 14, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.gray);
        doc.text(kpi.sub, kX + kpiWidth / 2, curY + 20, { align: 'center' });
    });

    // Présentation & Engagements
    curY += kpiHeight + 14;
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('NOTRE ENGAGEMENT DE QUALITÉ & SERVICE', margin, curY);

    curY += 6;
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(margin, curY, contentWidth, 70, 3, 3, 'F');

    const points = [
        { title: 'Matériel Haute Performance Certifié', desc: 'Modules biverre dernière génération (rendement > 22%), garantis 25 à 30 ans avec dégradation minimale.' },
        { title: 'Sécurité et Conformité Normative', desc: 'Conformité stricte au guide UTE C15-712-1, parafoudres Type 2, protection différentielle et coupure pompier.' },
        { title: 'Démarches Administratives 100% Incluses', desc: 'Prise en charge intégrale : Déclaration Préalable en Mairie, Raccordement Enedis et conformité Consuel.' },
        { title: 'Valorisation Énergétique Optimisée', desc: `Vente du surplus garantie 20 ans au tarif d'achat réglementé EDF OA (${tarifRachatKwh} €/kWh) et prime d'État versée.` },
        { title: 'Supervision Digitale en Temps Réel', desc: 'Application smartphone gratuite pour suivre en direct votre production solaire, autoconsommation et économies.' }
    ];

    let pY = curY + 8;
    points.forEach((pt) => {
        doc.setFillColor(...COLORS.secondary);
        doc.circle(margin + 6, pY - 1.5, 1.8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.dark);
        doc.text(pt.title, margin + 12, pY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.gray);
        doc.text(pt.desc, margin + 12, pY + 4.5);
        pY += 12;
    });

    // Bas de page 1
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Page 1 / 3 — Proposition Commerciale & Présentation', margin, pageHeight - 8);
    doc.text('ENR COURTAGE ÉNERGIE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });

    // =========================================================================
    // PAGE 2 : ÉTUDE TECHNICO-ÉCONOMIQUE & BILAN DE RENTABILITÉ
    // =========================================================================
    doc.addPage();

    // En-tête de page standard
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ÉTUDE TECHNICO-ÉCONOMIQUE & RENTABILITÉ FINANCIÈRE', margin, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Projet : ${clientName} — ${powerKwc} kWc`, pageWidth - margin, 13, { align: 'right' });

    curY = 32;

    // Section 1 : Répartition de l'énergie produite
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. PRODUCTION ET VALORISATION DE L\'ÉNERGIE (ANNÉE 1)', margin, curY);

    curY += 6;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, curY, contentWidth, 38, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.dark);
    doc.text('Énergie solaire produite par an :', margin + 6, curY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatNumber(annualProductionKwh)} kWh/an`, margin + 80, curY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.accent);
    doc.text('Part autoconsommée directement :', margin + 6, curY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`${autoConsomPercent}% soit ${formatNumber(autoConsomKwh)} kWh/an valorisés au TRV (${trvKwh} €/kWh)`, margin + 80, curY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.secondary);
    doc.text('Surplus réinjecté sur le réseau :', margin + 6, curY + 26);
    doc.setFont('helvetica', 'normal');
    doc.text(`${100 - autoConsomPercent}% soit ${formatNumber(surplusKwh)} kWh/an rachetés par EDF OA (${tarifRachatKwh} €/kWh)`, margin + 80, curY + 26);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Gains énergétiques annuels (Année 1) :', margin + 6, curY + 34);
    doc.text(`${formatEuro(gainTotalAn1)} / an`, margin + 80, curY + 34);

    // Section 2 : Tableau prévisionnel sur 25 ans
    curY += 48;
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. PLAN FINANCIER & RETOUR SUR INVESTISSEMENT SUR 25 ANS', margin, curY);

    curY += 6;
    // Entête tableau
    const thCols = [
        { label: 'Horizon', w: 25 },
        { label: 'Économies Facture', w: 35 },
        { label: 'Revenus EDF OA', w: 35 },
        { label: 'Prime d\'État', w: 30 },
        { label: 'Gains Cumulés', w: contentWidth - 125 }
    ];

    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, curY, contentWidth, 8, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    let colX = margin;
    thCols.forEach(col => {
        doc.text(col.label, colX + 3, curY + 5.5);
        colX += col.w;
    });

    curY += 8;

    const horizons = [
        { an: 'Année 1', mult: 1, prime: primeAuto },
        { an: 'Année 5', mult: 5, prime: primeAuto },
        { an: 'Année 10', mult: 10, prime: primeAuto },
        { an: 'Année 15', mult: 15, prime: primeAuto },
        { an: 'Année 20', mult: 20, prime: primeAuto },
        { an: 'Année 25', mult: 25, prime: primeAuto }
    ];

    horizons.forEach((h, i) => {
        const isOdd = i % 2 === 1;
        doc.setFillColor(isOdd ? 248 : 255, isOdd ? 250 : 255, isOdd ? 252 : 255);
        doc.rect(margin, curY, contentWidth, 7.5, 'F');

        const factor = h.mult * 1.02; // Inflation légère de l'énergie
        const ecoFact = Math.round(econoFactureAn * factor);
        const revOa = Math.round(revenuVenteAn * h.mult);
        const gainsCumules = ecoFact + revOa + h.prime;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.dark);

        let cellX = margin;
        doc.setFont('helvetica', 'bold');
        doc.text(h.an, cellX + 3, curY + 5);
        cellX += thCols[0].w;

        doc.setFont('helvetica', 'normal');
        doc.text(formatEuro(ecoFact), cellX + 3, curY + 5);
        cellX += thCols[1].w;

        doc.text(formatEuro(revOa), cellX + 3, curY + 5);
        cellX += thCols[2].w;

        doc.text(formatEuro(h.prime), cellX + 3, curY + 5);
        cellX += thCols[3].w;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.accent);
        doc.text(formatEuro(gainsCumules), cellX + 3, curY + 5);

        curY += 7.5;
    });

    // Section 3 : Bilan Écologique & Impact Carbone
    curY += 14;
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('3. IMPACT ENVIRONNEMENTAL & DÉCARBONATION', margin, curY);

    curY += 6;
    doc.setFillColor(240, 253, 244); // Vert très clair
    doc.setDrawColor(...COLORS.accent);
    doc.roundedRect(margin, curY, contentWidth, 24, 3, 3, 'FD');

    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Centrale Éco-Responsable & Énergie 100% Verte', margin + 6, curY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`En produisant votre propre électricité photovoltaïque, vous évitez le rejet d'environ ${co2Tonnes20Ans} tonnes de CO2`, margin + 6, curY + 15);
    doc.text(`sur 20 ans, soit l'équivalent de ${(annualProductionKwh * 0.15).toFixed(0)} arbres plantés ou ${(annualProductionKwh * 0.8).toFixed(0)} km parcourus en véhicule électrique.`, margin + 6, curY + 20);

    // Section 4 : Aides d'État & Cadre Réglementaire
    curY += 32;
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('4. TARIFS D\'ACHAT EDF OA & SUBVENTIONS D\'ÉTAT', margin, curY);

    curY += 6;
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(margin, curY, contentWidth, 34, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.dark);
    doc.text(`• Arrêté Tarifaire S21 : Contrat d'achat garanti par l'État sur 20 ans, indexé sur l'inflation.`, margin + 6, curY + 8);
    doc.text(`• Tarif d'achat du surplus : ${tarifRachatKwh} €/kWh injecté sur le réseau Enedis.`, margin + 6, curY + 14);
    if (primeAuto > 0) {
        doc.text(`• Prime à l'autoconsommation : ${formatEuro(primeAuto)} allouée par l'État, versée en une fois par EDF OA.`, margin + 6, curY + 20);
    } else {
        doc.text(`• Installations tertiaires > 100 kWc : Vente totale ou autoconsommation avec valorisation de gré à gré (PPA).`, margin + 6, curY + 20);
    }
    doc.text(`• Économies sur la facture : Chaque kWh autoconsommé remplace un kWh acheté au tarif TRV (${trvKwh} €/kWh).`, margin + 6, curY + 26);

    // Bas de page 2
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Page 2 / 3 — Étude Technico-Économique & Rentabilité', margin, pageHeight - 8);
    doc.text('ENR COURTAGE ÉNERGIE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });

    // =========================================================================
    // PAGE 3 : DEVIS CHIFFRÉ DÉTAILLÉ & BON POUR ACCORD
    // =========================================================================
    doc.addPage();

    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`DEVIS CHIFFRÉ DÉTAILLÉ N° ${quoteNumber}`, margin, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${dateStr} — Validité ${validityDays} jours`, pageWidth - margin, 13, { align: 'right' });

    curY = 28;

    // Tableau des lignes de devis
    const devisCols = [
        { label: 'Réf.', w: 26 },
        { label: 'Désignation & Spécifications', w: 82 },
        { label: 'Qté', w: 14, align: 'right' },
        { label: 'P.U. HT', w: 18, align: 'right' },
        { label: 'Rem.', w: 12, align: 'right' },
        { label: 'Total HT', w: 18, align: 'right' },
        { label: 'TVA', w: 10, align: 'right' }
    ];

    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, curY, contentWidth, 7, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    let headerX = margin;
    devisCols.forEach(col => {
        const textX = col.align === 'right' ? headerX + col.w - 2 : headerX + 2;
        doc.text(col.label, textX, curY + 4.8, { align: col.align || 'left' });
        headerX += col.w;
    });

    curY += 7;

    const sections = quoteData.sections || [];
    let totalHtBrut = 0;
    const tvaBases = { 20: 0, 10: 0, 5.5: 0, 0: 0 };

    sections.forEach(sec => {
        // Ligne de titre de section
        doc.setFillColor(230, 238, 248);
        doc.rect(margin, curY, contentWidth, 5.5, 'F');
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(sec.title || 'Section', margin + 2, curY + 4);
        curY += 5.5;

        (sec.lines || []).forEach((line, lIdx) => {
            const qty = parseFloat(line.quantite || 1);
            const pu = parseFloat(line.prixUnitaireHt || 0);
            const rem = parseFloat(line.remisePourcent || 0);
            const lineHt = qty * pu * (1 - rem / 100);
            const tvaRate = parseFloat(line.tauxTva !== undefined ? line.tauxTva : 20);

            totalHtBrut += qty * pu;
            if (tvaBases[tvaRate] !== undefined) {
                tvaBases[tvaRate] += lineHt;
            } else {
                tvaBases[20] += lineHt;
            }

            const isAlt = lIdx % 2 === 1;
            doc.setFillColor(isAlt ? 250 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
            doc.rect(margin, curY, contentWidth, 8, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...COLORS.dark);

            let cellX = margin;
            // Réf
            doc.setFont('helvetica', 'bold');
            doc.text((line.ref || '').slice(0, 15), cellX + 2, curY + 5);
            cellX += devisCols[0].w;

            // Désignation
            doc.setFont('helvetica', 'normal');
            const desig = (line.designation || '').slice(0, 52);
            doc.text(desig, cellX + 2, curY + 5);
            cellX += devisCols[1].w;

            // Qté
            doc.text(`${qty} ${line.unite || 'U'}`, cellX + devisCols[2].w - 2, curY + 5, { align: 'right' });
            cellX += devisCols[2].w;

            // P.U. HT
            doc.text(formatEuro(pu), cellX + devisCols[3].w - 2, curY + 5, { align: 'right' });
            cellX += devisCols[3].w;

            // Remise
            doc.text(rem > 0 ? `${rem}%` : '-', cellX + devisCols[4].w - 2, curY + 5, { align: 'right' });
            cellX += devisCols[4].w;

            // Total HT
            doc.setFont('helvetica', 'bold');
            doc.text(formatEuro(lineHt), cellX + devisCols[5].w - 2, curY + 5, { align: 'right' });
            cellX += devisCols[5].w;

            // TVA
            doc.setFont('helvetica', 'normal');
            doc.text(`${tvaRate}%`, cellX + devisCols[6].w - 2, curY + 5, { align: 'right' });

            curY += 8;
        });
    });

    // Calcul totaux
    const remiseGlobale = parseFloat(quoteData.remiseGlobale || 0);
    let totalNetHt = Math.max(0, Object.values(tvaBases).reduce((a, b) => a + b, 0) - remiseGlobale);
    
    // Calcul TVA
    let totalTva = 0;
    const tvaLines = [];
    [20, 10, 5.5].forEach(rate => {
        const base = tvaBases[rate] || 0;
        if (base > 0) {
            const montant = base * (rate / 100);
            totalTva += montant;
            tvaLines.push({ rate, base, montant });
        }
    });

    const totalTtc = totalNetHt + totalTva;

    // Bloc récapitulatif financier et ventilation TVA
    curY += 6;
    const recapY = curY;
    const leftWidth = 100;
    const rightWidth = contentWidth - leftWidth - 6;

    // Colonne gauche : Ventilation TVA & Modalités de paiement
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, recapY, leftWidth, 48, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.primary);
    doc.text('VENTILATION DE LA TVA', margin + 4, recapY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.dark);
    let tvaY = recapY + 12;
    tvaLines.forEach(tl => {
        doc.text(`TVA ${tl.rate}% sur Base HT ${formatEuro(tl.base)} :`, margin + 4, tvaY);
        doc.text(formatEuro(tl.montant), margin + leftWidth - 4, tvaY, { align: 'right' });
        tvaY += 5.5;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('ÉCHÉANCIER DE RÈGLEMENT :', margin + 4, recapY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text('• 30% à la signature du bon de commande', margin + 4, recapY + 34);
    doc.text('• 60% à la livraison du matériel sur site', margin + 4, recapY + 39);
    doc.text('• 10% à la mise en service & passage Consuel', margin + 4, recapY + 44);

    // Colonne droite : Totaux HT / TTC
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + leftWidth + 6, recapY, rightWidth, 48, 2, 2, 'FD');

    let totY = recapY + 8;
    const rX = margin + leftWidth + 10;
    const rValX = margin + contentWidth - 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.dark);

    doc.text('Total Brut HT :', rX, totY);
    doc.text(formatEuro(totalHtBrut), rValX, totY, { align: 'right' });
    totY += 6.5;

    if (remiseGlobale > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text('Remise commerciale :', rX, totY);
        doc.text(`- ${formatEuro(remiseGlobale)}`, rValX, totY, { align: 'right' });
        totY += 6.5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Total Net HT :', rX, totY);
    doc.text(formatEuro(totalNetHt), rValX, totY, { align: 'right' });
    totY += 6.5;

    doc.setFont('helvetica', 'normal');
    doc.text('Montant total TVA :', rX, totY);
    doc.text(formatEuro(totalTva), rValX, totY, { align: 'right' });
    totY += 8;

    // Total TTC mis en avant
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin + leftWidth + 8, totY - 4, rightWidth - 4, 12, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL TTC :', rX, totY + 4);
    doc.setFontSize(11);
    doc.text(formatEuro(totalTtc), rValX - 2, totY + 4, { align: 'right' });

    // Cadre "BON POUR ACCORD" & Signature
    curY = recapY + 54;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, curY, contentWidth, 38, 3, 3, 'FD');

    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BON POUR ACCORD & COMMANDE FERME', margin + 6, curY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.dark);
    doc.text('Mention manuscrite obligatoire : « Bon pour accord et acceptation sans réserve du devis »', margin + 6, curY + 13);
    doc.text('Fait à : ................................................................ Le : ...... / ...... / 2026', margin + 6, curY + 19);

    // Emplacement signature
    doc.setDrawColor(...COLORS.border);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(margin + contentWidth - 65, curY + 6, 60, 26);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    doc.text('Cachet et signature du client', margin + contentWidth - 35, curY + 10, { align: 'center' });

    // Mentions légales
    curY += 41;
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.gray);
    doc.text('Conditions : Devis soumis aux conditions générales de vente. Garantie décennale souscrite auprès d\'une compagnie d\'assurance habilitée.', margin, curY);
    doc.text('ENR Courtage Énergie — SAS au capital de 10 000 € — RCS — SIRET 900 000 000 00000 — Code NAF 4321A', margin, curY + 3.5);

    // Bas de page 3
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Page 3 / 3 — Devis Chiffré & Bon pour accord', margin, pageHeight - 8);
    doc.text('ENR COURTAGE ÉNERGIE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });

    // =========================================================================
    // ÉTAPE 2 : FUSION AVEC PDF-LIB & CONCATÉNATION DES FICHES TECHNIQUES PDF
    // =========================================================================
    onProgress({ step: 2, percent: 50, message: "Préparation de la fusion PDF multi-pages..." });

    // Conversion du document jsPDF en ArrayBuffer
    const initialPdfArrayBuffer = doc.output('arraybuffer');
    const mergedPdfDoc = await PDFDocument.load(initialPdfArrayBuffer);

    // Collecte des produits ayant une fiche technique demandée
    const datasheetsToAppend = [];
    sections.forEach(sec => {
        (sec.lines || []).forEach(line => {
            if (line.includeDatasheet && line.ficheTechniqueUrl) {
                // Éviter les doublons de fiches techniques (ex: 2 lignes avec le même module)
                if (!datasheetsToAppend.some(d => d.url === line.ficheTechniqueUrl)) {
                    datasheetsToAppend.push({
                        ref: line.ref,
                        designation: line.designation,
                        url: line.ficheTechniqueUrl,
                        details: line.details
                    });
                }
            }
        });
    });

    const totalDatasheets = datasheetsToAppend.length;
    let appendedCount = 0;

    for (let i = 0; i < totalDatasheets; i++) {
        const ds = datasheetsToAppend[i];
        const progressPercent = 50 + Math.round(((i + 1) / totalDatasheets) * 45);
        onProgress({
            step: 3,
            percent: progressPercent,
            message: `Téléchargement & intégration de la fiche technique : ${ds.ref}...`
        });

        let success = false;
        try {
            // Utilisation du proxy pour contourner les restrictions CORS
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(ds.url)}`;
            const fetchRes = await fetch(proxyUrl);

            if (fetchRes.ok) {
                const pdfBytes = await fetchRes.arrayBuffer();
                const dsDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
                const copiedPages = await mergedPdfDoc.copyPages(dsDoc, dsDoc.getPageIndices());
                copiedPages.forEach(page => mergedPdfDoc.addPage(page));
                success = true;
                appendedCount++;
            }
        } catch (fetchErr) {
            console.warn(`Échec téléchargement direct fiche technique (${ds.ref}):`, fetchErr.message);
        }

        // Si le PDF distant n'a pas pu être téléchargé, on génère une page synthétique élégante
        if (!success) {
            try {
                const fallbackPage = mergedPdfDoc.addPage([595.28, 841.89]); // A4 en points
                const fontBold = await mergedPdfDoc.embedFont(StandardFonts.HelveticaBold);
                const fontRegular = await mergedPdfDoc.embedFont(StandardFonts.Helvetica);

                // En-tête bandeau
                fallbackPage.drawRectangle({
                    x: 0,
                    y: 841.89 - 60,
                    width: 595.28,
                    height: 60,
                    color: rgb(30 / 255, 58 / 255, 138 / 255)
                });

                fallbackPage.drawText("FICHE TECHNIQUE CONSTRUCTEUR (DOCUMENT DE SYNTHÈSE)", {
                    x: 40,
                    y: 841.89 - 36,
                    size: 14,
                    font: fontBold,
                    color: rgb(1, 1, 1)
                });

                fallbackPage.drawText(`RÉFÉRENCE : ${ds.ref}`, {
                    x: 40,
                    y: 841.89 - 100,
                    size: 16,
                    font: fontBold,
                    color: rgb(30 / 255, 58 / 255, 138 / 255)
                });

                fallbackPage.drawText(`Désignation : ${ds.designation}`, {
                    x: 40,
                    y: 841.89 - 125,
                    size: 12,
                    font: fontRegular,
                    color: rgb(30 / 255, 41 / 255, 59 / 255)
                });

                if (ds.details) {
                    fallbackPage.drawText(`Spécifications : ${ds.details}`, {
                        x: 40,
                        y: 841.89 - 150,
                        size: 10,
                        font: fontRegular,
                        color: rgb(100 / 255, 116 / 255, 139 / 255)
                    });
                }

                fallbackPage.drawText(`Consultez la fiche complète en ligne : ${ds.url}`, {
                    x: 40,
                    y: 841.89 - 200,
                    size: 9,
                    font: fontRegular,
                    color: rgb(37 / 255, 99 / 255, 235 / 255)
                });

                appendedCount++;
            } catch (fbErr) {
                console.warn("Échec génération page de repli fiche technique", fbErr);
            }
        }
    }

    onProgress({ step: 4, percent: 98, message: "Finalisation du fichier PDF assemblé..." });

    // Enregistrement du PDF fusionné
    const finalPdfBytes = await mergedPdfDoc.save();
    const pdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Téléchargement automatique
    const fileName = `Proposition_Commerciale_Devis_${quoteNumber}_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onProgress({ step: 5, percent: 100, message: "Dossier PDF complet généré et téléchargé avec succès !" });

    return {
        success: true,
        fileName,
        pdfUrl,
        blob: pdfBlob,
        datasheetsAppended: appendedCount
    };
}
