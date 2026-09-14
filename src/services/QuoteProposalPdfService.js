// Service de génération de la proposition commerciale & devis solaire avec fusion PDF des fiches techniques fabricants
import jsPDF from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Couleurs officielles charte ENR COURTAGE
const COLORS = {
    primary: [30, 58, 138],      // #1e3a8a (Bleu nuit institutionnel)
    primaryLight: [230, 238, 248],
    secondary: [245, 158, 11],   // #f59e0b (Ambre / Solaire)
    secondaryLight: [254, 243, 199],
    accent: [16, 185, 129],      // #10b981 (Émeraude / Vert énergie)
    accentLight: [240, 253, 244],
    dark: [30, 41, 59],          // #1e293b (Slate sombre lisible)
    gray: [100, 116, 139],       // #64748b (Slate moyen)
    lightGray: [248, 250, 252],  // #f8fafc (Fond doux)
    border: [226, 232, 240],     // #e2e8f0
    white: [255, 255, 255]
};

/**
 * Nettoie les chaînes pour éviter tout caractère Unicode non pris en charge par Helvetica WinAnsi
 * (ex: espaces insécables fins \u202F qui se transforment en '/' ou provoquent des espacements anormaux)
 */
function sanitizePdfText(val) {
    if (val === null || val === undefined) return '';
    return String(val)
        .replace(/\u202F/g, ' ')
        .replace(/\u00A0/g, ' ')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2013|\u2014/g, '-')
        .trim();
}

/**
 * Formatage monétaire en euros avec espace standard ASCII (0x20) pour les milliers
 * et virgule pour les centimes (évite absolument les slashes '/' et bugs d'espacement)
 */
function formatEuro(val) {
    const num = Number(val) || 0;
    const parts = num.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart},${parts[1]} €`;
}

/**
 * Formatage de nombres sans unité monétaire
 */
function formatNumber(val, decimals = 0) {
    const num = Number(val) || 0;
    if (decimals === 0) {
        const rounded = Math.round(num);
        return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    const parts = num.toFixed(decimals).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart},${parts[1]}`;
}

/**
 * Génère le document PDF :
 * - Si onlyQuote = true : génère uniquement le Devis officiel chiffré (avec entête, coordonnées, lignes, récap, échéancier, bon pour accord, signature)
 * - Si onlyQuote = false : génère la Proposition Commerciale complète 3 pages + fiches techniques constructeurs intégrées
 */
export async function generateQuoteProposalPdf({
    project = {},
    quoteData = {},
    energyTarifs = {},
    onlyQuote = false,
    onProgress = () => {}
}) {
    onProgress({ 
        step: 1, 
        percent: 15, 
        message: onlyQuote 
            ? "Génération du Devis officiel au format PDF..." 
            : "Génération de l'offre commerciale et de l'étude technico-économique..." 
    });

    // Initialisation jsPDF A4 Portrait
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    // Données client et devis
    const rawClientName = quoteData.clientName || `${project.firstName || ''} ${project.name || 'Client'}`.trim() || 'Client';
    const clientName = sanitizePdfText(rawClientName);
    const clientAddress = sanitizePdfText(quoteData.clientAddress || project.address || '');
    const clientZipCity = sanitizePdfText(`${quoteData.clientZip || project.zip || ''} ${quoteData.clientCity || project.city || ''}`.trim());
    const clientPhone = sanitizePdfText(quoteData.clientPhone || project.phone || '');
    const clientEmail = sanitizePdfText(quoteData.clientEmail || project.email || '');
    const prm = sanitizePdfText(project.enedisPrm || project.pdl || '');
    const quoteNumber = sanitizePdfText(quoteData.quoteNumber || `DEV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const validityDays = quoteData.validityDays || 30;

    // Données techniques
    const rawPower = quoteData.powerKwc || project.projectSize || project.kwc || project.puissanceKwc || project.puissance || 9.0;
    const powerKwc = parseFloat(String(rawPower).replace(',', '.').replace(/[^0-9.]/g, '')) || 9.0;
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
    const gain20Ans = Math.round((gainTotalAn1 * 20 * 1.02) + primeAuto);
    const co2Tonnes20Ans = ((annualProductionKwh * 20 * 0.21) / 1000).toFixed(1);

    // =========================================================================
    // CALCUL DES TOTAUX DU DEVIS
    // =========================================================================
    const sections = quoteData.sections || [];
    let totalHtBrut = 0;
    const tvaBases = { 20: 0, 10: 0, 5.5: 0, 0: 0 };

    sections.forEach(sec => {
        (sec.lines || []).forEach(line => {
            const qty = parseFloat(line.quantite || 1);
            const pu = parseFloat(line.prixUnitaireHt || 0);
            const rem = parseFloat(line.remisePourcent || 0);
            const lineHt = qty * pu * (1 - rem / 100);
            const tvaRate = parseFloat(line.tauxTva !== undefined ? line.tauxTva : (powerKwc <= 3 ? 10 : 20));

            totalHtBrut += qty * pu;
            if (tvaBases[tvaRate] !== undefined) {
                tvaBases[tvaRate] += lineHt;
            } else {
                tvaBases[20] = (tvaBases[20] || 0) + lineHt;
            }
        });
    });

    const remiseGlobale = parseFloat(quoteData.remiseGlobale || 0);
    const sumGrossLines = Object.values(tvaBases).reduce((a, b) => a + b, 0);
    const totalNetHt = Math.max(0, sumGrossLines - remiseGlobale);

    // Ventilation exacte de la TVA
    let totalTva = 0;
    const tvaLines = [];
    const discountRatio = sumGrossLines > 0 ? (totalNetHt / sumGrossLines) : 1;

    [20, 10, 5.5].forEach(rate => {
        const grossBase = tvaBases[rate] || 0;
        if (grossBase > 0) {
            const netBase = grossBase * discountRatio;
            const montant = netBase * (rate / 100);
            totalTva += montant;
            tvaLines.push({ rate, base: netBase, montant });
        }
    });

    const totalTtc = totalNetHt + totalTva;
    const resteACharge = Math.max(0, totalTtc - primeAuto);

    // Colonnes du tableau de devis
    const devisCols = [
        { label: 'Réf.', w: 25 },
        { label: 'Désignation & Spécifications techniques', w: 85 },
        { label: 'Qté', w: 14, align: 'right' },
        { label: 'P.U. HT', w: 18, align: 'right' },
        { label: 'Rem.', w: 11, align: 'right' },
        { label: 'Total HT', w: 19, align: 'right' },
        { label: 'TVA', w: 10, align: 'right' }
    ];

    // =========================================================================
    // CAS 1 : EXPORT OFFRE COMPLÈTE (PROPOSITION 3 PAGES + FICHES)
    // =========================================================================
    if (!onlyQuote) {
        // ---------------------------------------------------------------------
        // PAGE 1 : PAGE DE GARDE & PRÉSENTATION
        // ---------------------------------------------------------------------
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 38, 'F');

        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('ENR COURTAGE', margin, 17);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text("Bureau d'Études & Solutions Solaires Clé en Main", margin, 24);
        doc.setFontSize(8.5);
        doc.text('contact@enr-courtage.fr | www.enr-courtage.fr', margin, 30);

        // Tag Devis
        doc.setFillColor(...COLORS.secondary);
        doc.roundedRect(pageWidth - margin - 56, 10, 56, 18, 2, 2, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('OFFRE & ÉTUDE SOLAIRE', pageWidth - margin - 28, 17.5, { align: 'center' });
        doc.setFontSize(8.5);
        doc.text(quoteNumber, pageWidth - margin - 28, 23.5, { align: 'center' });

        // Titre
        let curY = 48;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('PROPOSITION COMMERCIALE & TECHNIQUE', margin, curY);

        curY += 6.5;
        doc.setTextColor(...COLORS.secondary);
        doc.setFontSize(11);
        doc.text(`Centrale Solaire Photovoltaïque ${formatNumber(powerKwc, 1)} kWc en Autoconsommation`, margin, curY);

        // Encadrés Émetteur & Destinataire
        curY += 9;
        const boxWidth = (contentWidth - 6) / 2;
        const boxHeight = 36;

        // Émetteur
        doc.setFillColor(...COLORS.lightGray);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(margin, curY, boxWidth, boxHeight, 2.5, 2.5, 'FD');

        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('ÉMETTEUR / EXPERT SOLAIRE', margin + 5, curY + 7.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.dark);
        doc.text('ENR COURTAGE', margin + 5, curY + 14);
        doc.text('Conseil & Ingénierie Photovoltaïque', margin + 5, curY + 19.5);
        doc.text('Garantie Décennale & Certification RGE QualiPV', margin + 5, curY + 25);
        doc.text(`Conseiller : ${sanitizePdfText(quoteData.commercialName || 'Pôle Ingénierie Solaire')}`, margin + 5, curY + 30.5);

        // Destinataire
        doc.roundedRect(margin + boxWidth + 6, curY, boxWidth, boxHeight, 2.5, 2.5, 'FD');
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('DESTINATAIRE / CLIENT', margin + boxWidth + 11, curY + 7.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.dark);
        doc.text(clientName, margin + boxWidth + 11, curY + 14);
        if (clientAddress) doc.text(clientAddress, margin + boxWidth + 11, curY + 19.5);
        if (clientZipCity) doc.text(clientZipCity, margin + boxWidth + 11, curY + 25);
        const contactLine = [clientPhone, clientEmail].filter(Boolean).join(' • ');
        if (contactLine) doc.text(contactLine, margin + boxWidth + 11, curY + 30.5);

        // Métadonnées
        curY += boxHeight + 6;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, curY, contentWidth, 9, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.gray);
        doc.text(`Date d'émission : ${dateStr}`, margin + 5, curY + 6);
        doc.text(`Durée de validité : ${validityDays} jours`, margin + 65, curY + 6);
        if (prm) doc.text(`Point Livraison (PRM Enedis) : ${prm}`, margin + 120, curY + 6);

        // Cartes KPIs
        curY += 15;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('SYNTHÈSE CLÉ EN MAIN DE VOTRE INSTALLATION', margin, curY);

        curY += 5;
        const kpiWidth = (contentWidth - 9) / 4;
        const kpiHeight = 21;

        const kpis = [
            { label: 'Puissance Crête', val: `${formatNumber(powerKwc, 1)} kWc`, sub: `${quoteData.nbPanels || Math.round(powerKwc * 2.3)} modules bi-verre` },
            { label: 'Production Annuelle', val: `${formatNumber(annualProductionKwh)} kWh/an`, sub: `Productible ~${Math.round(annualProductionKwh / powerKwc)} kWh/kWc` },
            { label: 'Autoconsommation', val: `${autoConsomPercent}%`, sub: `Surplus racheté EDF OA` },
            { label: 'Gain Estimé 20 ans', val: formatEuro(gain20Ans), sub: `Économies & primes` }
        ];

        kpis.forEach((kpi, idx) => {
            const kX = margin + idx * (kpiWidth + 3);
            doc.setFillColor(idx === 3 ? 240 : 248, idx === 3 ? 253 : 250, idx === 3 ? 244 : 252);
            doc.setDrawColor(...(idx === 3 ? COLORS.accent : COLORS.border));
            doc.roundedRect(kX, curY, kpiWidth, kpiHeight, 2, 2, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.gray);
            doc.text(kpi.label.toUpperCase(), kX + kpiWidth / 2, curY + 5.5, { align: 'center' });

            doc.setFontSize(10.5);
            doc.setTextColor(...(idx === 3 ? COLORS.accent : COLORS.primary));
            doc.text(kpi.val, kX + kpiWidth / 2, curY + 12.5, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(...COLORS.gray);
            doc.text(kpi.sub, kX + kpiWidth / 2, curY + 17.5, { align: 'center' });
        });

        // Engagements
        curY += kpiHeight + 11;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('NOTRE ENGAGEMENT DE QUALITÉ & SERVICE', margin, curY);

        curY += 5;
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(margin, curY, contentWidth, 58, 2.5, 2.5, 'F');

        const points = [
            { title: 'Matériel Haute Performance Certifié', desc: 'Modules biverre dernière génération (rendement > 22%), garantis 25 à 30 ans avec dégradation minimale.' },
            { title: 'Sécurité et Conformité Normative', desc: 'Conformité stricte au guide UTE C15-712-1, parafoudres Type 2, protection différentielle et coupure pompier.' },
            { title: 'Démarches Administratives 100% Incluses', desc: 'Prise en charge intégrale : Déclaration Préalable en Mairie, Raccordement Enedis et conformité Consuel.' },
            { title: 'Valorisation Énergétique Optimisée', desc: `Vente du surplus garantie 20 ans au tarif réglementé EDF OA (${formatNumber(tarifRachatKwh, 4)} €/kWh) et prime versée.` },
            { title: 'Supervision Digitale en Temps Réel', desc: 'Application smartphone gratuite pour suivre en direct votre production solaire, autoconsommation et gains.' }
        ];

        let pY = curY + 7;
        points.forEach((pt) => {
            doc.setFillColor(...COLORS.secondary);
            doc.circle(margin + 5, pY - 1.2, 1.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...COLORS.dark);
            doc.text(pt.title, margin + 10, pY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...COLORS.gray);
            doc.text(pt.desc, margin + 10, pY + 4);
            pY += 10;
        });

        // Footer Page 1
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.gray);
        doc.text('Page 1 / 3 — Proposition Commerciale & Présentation', margin, pageHeight - 8);
        doc.text('ENR COURTAGE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });

        // ---------------------------------------------------------------------
        // PAGE 2 : ÉTUDE TECHNICO-ÉCONOMIQUE & BILAN DE RENTABILITÉ
        // ---------------------------------------------------------------------
        doc.addPage();

        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 18, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('ÉTUDE TECHNICO-ÉCONOMIQUE & RENTABILITÉ FINANCIÈRE', margin, 11.5);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Projet : ${clientName} — ${formatNumber(powerKwc, 1)} kWc`, pageWidth - margin, 11.5, { align: 'right' });

        curY = 27;

        // Section 1 : Répartition
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text("1. PRODUCTION ET VALORISATION DE L'ÉNERGIE (ANNÉE 1)", margin, curY);

        curY += 5;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, curY, contentWidth, 34, 2.5, 2.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.dark);
        doc.text('Énergie solaire produite par an :', margin + 5, curY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatNumber(annualProductionKwh)} kWh/an`, margin + 75, curY + 8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.accent);
        doc.text('Part autoconsommée directement :', margin + 5, curY + 15);
        doc.setFont('helvetica', 'normal');
        doc.text(`${autoConsomPercent}% soit ${formatNumber(autoConsomKwh)} kWh/an valorisés au TRV (${formatNumber(trvKwh, 4)} €/kWh)`, margin + 75, curY + 15);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.secondary);
        doc.text('Surplus réinjecté sur le réseau :', margin + 5, curY + 22);
        doc.setFont('helvetica', 'normal');
        doc.text(`${100 - autoConsomPercent}% soit ${formatNumber(surplusKwh)} kWh/an rachetés par EDF OA (${formatNumber(tarifRachatKwh, 4)} €/kWh)`, margin + 75, curY + 22);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('Gains énergétiques annuels (Année 1) :', margin + 5, curY + 29);
        doc.text(`${formatEuro(gainTotalAn1)} / an`, margin + 75, curY + 29);

        // Section 2 : Tableau prévisionnel
        curY += 42;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('2. PLAN FINANCIER & RETOUR SUR INVESTISSEMENT SUR 25 ANS', margin, curY);

        curY += 5;
        const thCols = [
            { label: 'Horizon', w: 25 },
            { label: 'Économies Facture', w: 36 },
            { label: 'Revenus EDF OA', w: 36 },
            { label: "Prime d'État", w: 32 },
            { label: 'Gains Cumulés', w: contentWidth - 129 }
        ];

        doc.setFillColor(...COLORS.primary);
        doc.rect(margin, curY, contentWidth, 7, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);

        let colX = margin;
        thCols.forEach(col => {
            doc.text(col.label, colX + 3, curY + 4.8);
            colX += col.w;
        });

        curY += 7;
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
            doc.rect(margin, curY, contentWidth, 6.5, 'F');

            const factor = h.mult * 1.02;
            const ecoFact = Math.round(econoFactureAn * factor);
            const revOa = Math.round(revenuVenteAn * h.mult);
            const gainsCumules = ecoFact + revOa + h.prime;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...COLORS.dark);

            let cellX = margin;
            doc.setFont('helvetica', 'bold');
            doc.text(h.an, cellX + 3, curY + 4.5);
            cellX += thCols[0].w;

            doc.setFont('helvetica', 'normal');
            doc.text(formatEuro(ecoFact), cellX + 3, curY + 4.5);
            cellX += thCols[1].w;

            doc.text(formatEuro(revOa), cellX + 3, curY + 4.5);
            cellX += thCols[2].w;

            doc.text(formatEuro(h.prime), cellX + 3, curY + 4.5);
            cellX += thCols[3].w;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.accent);
            doc.text(formatEuro(gainsCumules), cellX + 3, curY + 4.5);

            curY += 6.5;
        });

        // Section 3 : Bilan Carbone
        curY += 12;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('3. IMPACT ENVIRONNEMENTAL & DÉCARBONATION', margin, curY);

        curY += 5;
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(...COLORS.accent);
        doc.roundedRect(margin, curY, contentWidth, 21, 2.5, 2.5, 'FD');

        doc.setTextColor(22, 101, 52);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Centrale Éco-Responsable & Énergie 100% Verte', margin + 5, curY + 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.text(`En produisant votre électricité photovoltaïque, vous évitez le rejet d'environ ${co2Tonnes20Ans} tonnes de CO2`, margin + 5, curY + 12.5);
        doc.text(`sur 20 ans, soit l'équivalent de ${(annualProductionKwh * 0.15).toFixed(0)} arbres plantés ou ${(annualProductionKwh * 0.8).toFixed(0)} km parcourus en véhicule électrique.`, margin + 5, curY + 17);

        // Section 4 : Aides d'État
        curY += 28;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text("4. TARIFS D'ACHAT EDF OA & SUBVENTIONS D'ÉTAT", margin, curY);

        curY += 5;
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(margin, curY, contentWidth, 30, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(...COLORS.dark);

        const aideLines = [
            `• Arrêté Tarifaire S21 : Contrat d'achat garanti par l'État sur 20 ans, indexé annuellement sur l'inflation.`,
            `• Tarif d'achat du surplus : ${formatNumber(tarifRachatKwh, 4)} €/kWh injecté sur le réseau de distribution Enedis.`,
            primeAuto > 0 
                ? `• Prime à l'autoconsommation : ${formatEuro(primeAuto)} allouée par l'État et versée par EDF OA.`
                : `• Installations tertiaires > 100 kWc : Valorisation optimisée en vente totale ou contrat de gré à gré (PPA).`,
            `• Économies sur la facture : Chaque kWh autoconsommé remplace un kWh acheté au tarif TRV (${formatNumber(trvKwh, 4)} €/kWh).`
        ];

        let aideY = curY + 7;
        aideLines.forEach(al => {
            doc.text(al, margin + 5, aideY);
            aideY += 5.5;
        });

        // Footer Page 2
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.gray);
        doc.text('Page 2 / 3 — Étude Technico-Économique & Rentabilité', margin, pageHeight - 8);
        doc.text('ENR COURTAGE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });

        // Passer à la page 3 pour le Devis chiffré
        doc.addPage();
    }

    // =========================================================================
    // PAGE DE DEVIS OFFICIEL (PAGE 1 si onlyQuote, ou PAGE 3 si offre complète)
    // =========================================================================
    const devisPageTitle = onlyQuote 
        ? `DEVIS CHIFFRÉ OFFICIEL N° ${quoteNumber}` 
        : `DEVIS CHIFFRÉ DÉTAILLÉ N° ${quoteNumber}`;

    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(devisPageTitle, margin, 11.5);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${dateStr} — Validité ${validityDays} jours`, pageWidth - margin, 11.5, { align: 'right' });

    let curY = 24;

    // Si on exporte UNIQUEMENT le devis, on insère un cartouche émetteur / client compact en haut
    if (onlyQuote) {
        const boxWidth = (contentWidth - 6) / 2;
        const boxH = 30;

        // Émetteur
        doc.setFillColor(...COLORS.lightGray);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(margin, curY, boxWidth, boxH, 2, 2, 'FD');
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('ÉMETTEUR / EXPERT SOLAIRE', margin + 4, curY + 6.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.dark);
        doc.text('ENR COURTAGE', margin + 4, curY + 12);
        doc.text('Conseil & Ingénierie Photovoltaïque • RGE QualiPV', margin + 4, curY + 17);
        doc.text('contact@enr-courtage.fr • www.enr-courtage.fr', margin + 4, curY + 22);
        doc.text(`Conseiller : ${sanitizePdfText(quoteData.commercialName || 'Pôle Ingénierie Solaire')}`, margin + 4, curY + 26.5);

        // Client
        doc.roundedRect(margin + boxWidth + 6, curY, boxWidth, boxH, 2, 2, 'FD');
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('CLIENT / DESTINATAIRE', margin + boxWidth + 10, curY + 6.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.dark);
        doc.text(clientName, margin + boxWidth + 10, curY + 12);
        if (clientAddress) doc.text(clientAddress, margin + boxWidth + 10, curY + 17);
        if (clientZipCity) doc.text(clientZipCity, margin + boxWidth + 10, curY + 22);
        const cliInfo = [clientPhone, prm ? `PRM: ${prm}` : ''].filter(Boolean).join(' • ');
        if (cliInfo) doc.text(cliInfo, margin + boxWidth + 10, curY + 26.5);

        curY += boxH + 6;
    }

    // Entête du tableau de devis
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, curY, contentWidth, 6.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);

    let headerX = margin;
    devisCols.forEach(col => {
        const textX = col.align === 'right' ? headerX + col.w - 2 : headerX + 2;
        doc.text(col.label, textX, curY + 4.5, { align: col.align || 'left' });
        headerX += col.w;
    });

    curY += 6.5;

    // Lignes de devis
    const lineHeight = 6.2;
    const sectionHeaderHeight = 4.8;

    sections.forEach(sec => {
        // Vérification saut de page
        if (curY > 260) {
            doc.addPage();
            doc.setFillColor(...COLORS.primary);
            doc.rect(0, 0, pageWidth, 14, 'F');
            doc.setTextColor(...COLORS.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(`DEVIS N° ${quoteNumber} (SUITE)`, margin, 9.5);
            curY = 20;

            // Répétition entête colonnes
            doc.setFillColor(...COLORS.primary);
            doc.rect(margin, curY, contentWidth, 6.5, 'F');
            doc.setTextColor(...COLORS.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            headerX = margin;
            devisCols.forEach(col => {
                const textX = col.align === 'right' ? headerX + col.w - 2 : headerX + 2;
                doc.text(col.label, textX, curY + 4.5, { align: col.align || 'left' });
                headerX += col.w;
            });
            curY += 6.5;
        }

        // Ligne de titre de section
        doc.setFillColor(...COLORS.primaryLight);
        doc.rect(margin, curY, contentWidth, sectionHeaderHeight, 'F');
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(sanitizePdfText(sec.title || 'Prestations'), margin + 2, curY + 3.5);
        curY += sectionHeaderHeight;

        (sec.lines || []).forEach((line, lIdx) => {
            // Vérification saut de page avant impression de ligne
            if (curY > 260) {
                doc.addPage();
                doc.setFillColor(...COLORS.primary);
                doc.rect(0, 0, pageWidth, 14, 'F');
                doc.setTextColor(...COLORS.white);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.text(`DEVIS N° ${quoteNumber} (SUITE)`, margin, 9.5);
                curY = 20;

                doc.setFillColor(...COLORS.primary);
                doc.rect(margin, curY, contentWidth, 6.5, 'F');
                doc.setTextColor(...COLORS.white);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.2);
                headerX = margin;
                devisCols.forEach(col => {
                    const textX = col.align === 'right' ? headerX + col.w - 2 : headerX + 2;
                    doc.text(col.label, textX, curY + 4.5, { align: col.align || 'left' });
                    headerX += col.w;
                });
                curY += 6.5;
            }

            const qty = parseFloat(line.quantite || 1);
            const pu = parseFloat(line.prixUnitaireHt || 0);
            const rem = parseFloat(line.remisePourcent || 0);
            const lineHt = qty * pu * (1 - rem / 100);
            const tvaRate = parseFloat(line.tauxTva !== undefined ? line.tauxTva : (powerKwc <= 3 ? 10 : 20));

            const isAlt = lIdx % 2 === 1;
            doc.setFillColor(isAlt ? 250 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
            doc.rect(margin, curY, contentWidth, lineHeight, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(...COLORS.dark);

            let cellX = margin;
            // Réf
            doc.setFont('helvetica', 'bold');
            doc.text(sanitizePdfText(line.ref || '').slice(0, 16), cellX + 2, curY + 4.2);
            cellX += devisCols[0].w;

            // Désignation
            doc.setFont('helvetica', 'normal');
            const desig = sanitizePdfText(line.designation || '').slice(0, 56);
            doc.text(desig, cellX + 2, curY + 4.2);
            cellX += devisCols[1].w;

            // Qté
            doc.text(`${formatNumber(qty)} ${sanitizePdfText(line.unite || 'U')}`, cellX + devisCols[2].w - 2, curY + 4.2, { align: 'right' });
            cellX += devisCols[2].w;

            // P.U. HT
            doc.text(formatEuro(pu), cellX + devisCols[3].w - 2, curY + 4.2, { align: 'right' });
            cellX += devisCols[3].w;

            // Remise
            doc.text(rem > 0 ? `${rem}%` : '-', cellX + devisCols[4].w - 2, curY + 4.2, { align: 'right' });
            cellX += devisCols[4].w;

            // Total HT
            doc.setFont('helvetica', 'bold');
            doc.text(formatEuro(lineHt), cellX + devisCols[5].w - 2, curY + 4.2, { align: 'right' });
            cellX += devisCols[5].w;

            // TVA
            doc.setFont('helvetica', 'normal');
            doc.text(`${tvaRate}%`, cellX + devisCols[6].w - 2, curY + 4.2, { align: 'right' });

            curY += lineHeight;
        });
    });

    // =========================================================================
    // RÉCAPITULATIF FINANCIER & BON POUR ACCORD
    // =========================================================================
    const requiredBottomSpace = 84;
    if (curY + requiredBottomSpace > (pageHeight - 12)) {
        doc.addPage();
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 14, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(`DEVIS N° ${quoteNumber} — RÉCAPITULATIF & SIGNATURE`, margin, 9.5);
        curY = 22;
    } else {
        curY += 5;
    }

    const recapY = curY;
    const leftWidth = 98;
    const rightWidth = contentWidth - leftWidth - 5;
    const recapBoxHeight = 44;

    // Colonne gauche : Ventilation TVA & Modalités de règlement
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, recapY, leftWidth, recapBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primary);
    doc.text('VENTILATION DE LA TVA', margin + 4, recapY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.dark);
    let tvaY = recapY + 11;
    tvaLines.forEach(tl => {
        doc.text(`TVA ${tl.rate}% sur base ${formatEuro(tl.base)} :`, margin + 4, tvaY);
        doc.text(formatEuro(tl.montant), margin + leftWidth - 4, tvaY, { align: 'right' });
        tvaY += 5;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('ÉCHÉANCIER DE RÈGLEMENT :', margin + 4, recapY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text('• 30% à la signature du bon de commande', margin + 4, recapY + 30.5);
    doc.text('• 60% à la livraison du matériel sur site', margin + 4, recapY + 35.5);
    doc.text('• 10% à la mise en service & passage Consuel', margin + 4, recapY + 40.5);

    // Colonne droite : Totaux financiers
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + leftWidth + 5, recapY, rightWidth, recapBoxHeight, 2, 2, 'FD');

    let totY = recapY + 7;
    const rX = margin + leftWidth + 9;
    const rValX = margin + contentWidth - 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dark);

    doc.text('Total Brut HT :', rX, totY);
    doc.text(formatEuro(totalHtBrut), rValX, totY, { align: 'right' });
    totY += 5.5;

    if (remiseGlobale > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text('Remise commerciale :', rX, totY);
        doc.text(`- ${formatEuro(remiseGlobale)}`, rValX, totY, { align: 'right' });
        totY += 5.5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Total Net HT :', rX, totY);
    doc.text(formatEuro(totalNetHt), rValX, totY, { align: 'right' });
    totY += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.text('Montant total TVA :', rX, totY);
    doc.text(formatEuro(totalTva), rValX, totY, { align: 'right' });
    totY += 7;

    // Total TTC mis en valeur
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin + leftWidth + 7, totY - 4, rightWidth - 4, 11, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL TTC :', rX, totY + 3.5);
    doc.setFontSize(10.5);
    doc.text(formatEuro(totalTtc), rValX - 2, totY + 3.5, { align: 'right' });

    // Prime et reste à charge (si prime applicable)
    if (primeAuto > 0) {
        totY += 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(22, 101, 52);
        doc.text(`Prime EDF OA déductible : - ${formatEuro(primeAuto)}`, rX, totY);
        doc.text(`Reste à charge réel : ${formatEuro(resteACharge)}`, rValX, totY, { align: 'right' });
    }

    // Cadre Bon pour Accord & Signature
    curY = recapY + recapBoxHeight + 5;
    const signBoxH = 31;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, curY, contentWidth, signBoxH, 2.5, 2.5, 'FD');

    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('BON POUR ACCORD & COMMANDE FERME', margin + 5, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.dark);
    doc.text('Mention manuscrite obligatoire : « Bon pour accord et acceptation sans réserve du devis »', margin + 5, curY + 11.5);
    doc.text('Fait à : ................................................................ Le : ...... / ...... / 2026', margin + 5, curY + 17);
    doc.text('Nom et qualité du signataire : ................................................................', margin + 5, curY + 22.5);

    // Boîte de signature
    doc.setDrawColor(...COLORS.border);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(margin + contentWidth - 62, curY + 5, 58, 22);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Cachet & Signature du client', margin + contentWidth - 33, curY + 9, { align: 'center' });

    // Mentions légales
    curY += signBoxH + 3.5;
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.gray);
    doc.text("Conditions : Devis soumis aux conditions générales de vente ENR COURTAGE. Garantie décennale souscrite auprès d'une compagnie habilitée.", margin, curY);
    doc.text("ENR COURTAGE — Bureau d'Études & Solutions Solaires Photovoltaïques — RGE QualiPV", margin, curY + 3.2);

    // Footer
    const totalPagesCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPagesCount; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.gray);
        const footerLabel = onlyQuote 
            ? `Page ${p} / ${totalPagesCount} — Devis Officiel Chiffré` 
            : (p === 1 ? 'Page 1 / 3 — Proposition Commerciale & Présentation' 
               : (p === 2 ? 'Page 2 / 3 — Étude Technico-Économique & Rentabilité' 
                  : `Page ${p} / ${totalPagesCount} — Devis Chiffré & Bon pour accord`));
        doc.text(footerLabel, margin, pageHeight - 8);
        doc.text('ENR COURTAGE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    // =========================================================================
    // ÉTAPE 2 : FUSION MULTI-PAGES & FICHES TECHNIQUES FABRICANTS (SI NON ONLY QUOTE)
    // =========================================================================
    onProgress({ step: 2, percent: 50, message: "Assemblage final du fichier PDF..." });

    const initialPdfArrayBuffer = doc.output('arraybuffer');
    const mergedPdfDoc = await PDFDocument.load(initialPdfArrayBuffer);

    let appendedCount = 0;

    // Si on exporte l'offre complète avec fiches techniques constructeurs
    if (!onlyQuote) {
        const datasheetsToAppend = [];
        sections.forEach(sec => {
            (sec.lines || []).forEach(line => {
                if (line.includeDatasheet && line.ficheTechniqueUrl) {
                    if (!datasheetsToAppend.some(d => d.url === line.ficheTechniqueUrl)) {
                        datasheetsToAppend.push({
                            ref: sanitizePdfText(line.ref),
                            designation: sanitizePdfText(line.designation),
                            url: line.ficheTechniqueUrl,
                            details: sanitizePdfText(line.details)
                        });
                    }
                }
            });
        });

        const totalDatasheets = datasheetsToAppend.length;

        for (let i = 0; i < totalDatasheets; i++) {
            const ds = datasheetsToAppend[i];
            const progressPercent = 50 + Math.round(((i + 1) / totalDatasheets) * 45);
            onProgress({
                step: 3,
                percent: progressPercent,
                message: `Intégration fiche technique fabricant : ${ds.ref}...`
            });

            let success = false;
            try {
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
                console.warn(`Échec téléchargement fiche technique (${ds.ref}):`, fetchErr.message);
            }

            // Page de synthèse en cas d'impossibilité de téléchargement direct
            if (!success) {
                try {
                    const fallbackPage = mergedPdfDoc.addPage([595.28, 841.89]);
                    const fontBold = await mergedPdfDoc.embedFont(StandardFonts.HelveticaBold);
                    const fontRegular = await mergedPdfDoc.embedFont(StandardFonts.Helvetica);

                    fallbackPage.drawRectangle({
                        x: 0,
                        y: 841.89 - 50,
                        width: 595.28,
                        height: 50,
                        color: rgb(30 / 255, 58 / 255, 138 / 255)
                    });

                    fallbackPage.drawText("FICHE TECHNIQUE FABRICANT — CERTIFICATION", {
                        x: 35,
                        y: 841.89 - 30,
                        size: 13,
                        font: fontBold,
                        color: rgb(1, 1, 1)
                    });

                    fallbackPage.drawText(`RÉFÉRENCE CONSTRUCTEUR : ${ds.ref}`, {
                        x: 35,
                        y: 841.89 - 80,
                        size: 14,
                        font: fontBold,
                        color: rgb(30 / 255, 58 / 255, 138 / 255)
                    });

                    fallbackPage.drawText(`Désignation : ${ds.designation}`, {
                        x: 35,
                        y: 841.89 - 105,
                        size: 11,
                        font: fontRegular,
                        color: rgb(30 / 255, 41 / 255, 59 / 255)
                    });

                    if (ds.details) {
                        fallbackPage.drawText(`Spécifications : ${ds.details}`, {
                            x: 35,
                            y: 841.89 - 130,
                            size: 9.5,
                            font: fontRegular,
                            color: rgb(100 / 255, 116 / 255, 139 / 255)
                        });
                    }

                    fallbackPage.drawText(`Documentation officielle en ligne : ${ds.url}`, {
                        x: 35,
                        y: 841.89 - 170,
                        size: 8.5,
                        font: fontRegular,
                        color: rgb(37 / 255, 99 / 255, 235 / 255)
                    });

                    appendedCount++;
                } catch (fbErr) {
                    console.warn("Échec page de repli fiche", fbErr);
                }
            }
        }
    }

    onProgress({ step: 4, percent: 98, message: "Finalisation du document PDF..." });

    const finalPdfBytes = await mergedPdfDoc.save();
    const pdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Nom de fichier adapté
    const clientSlug = clientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const fileName = onlyQuote 
        ? `Devis_${quoteNumber}_${clientSlug}.pdf`
        : `Proposition_Commerciale_Devis_${quoteNumber}_${clientSlug}.pdf`;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onProgress({ step: 5, percent: 100, message: "Document PDF généré et téléchargé avec succès !" });

    return {
        success: true,
        fileName,
        pdfUrl,
        blob: pdfBlob,
        datasheetsAppended: appendedCount
    };
}
