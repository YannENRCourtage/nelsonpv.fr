/**
 * Bibliothèque de calculs pour le simulateur de rentabilité photovoltaïque
 * Basée sur les standards financiers et les captures d'écran de simuacc.fr
 */

/**
 * Calcule la production annuelle estimée en kWh
 * @param {number} power - Puissance en kWc
 * @returns {number} Production estimée en kWh
 */
export function calculateEstimatedProduction(power) {
    // Formule standard : 1 kWc produit environ 1200 kWh/an en France
    const PRODUCTION_FACTOR = 1200;
    return power * PRODUCTION_FACTOR;
}

/**
 * Calcule le coût total du projet
 * @param {Object} costs - Objet contenant tous les coûts
 * @returns {number} Coût total en €
 */
export function calculateTotalProjectCost(costs) {
    const {
        installation = 0,
        charpente = 0,
        couverture = 0,
        terrassement = 0,
        raccordement = 0,
        fraisCommerciaux = 0,
        developpement = 0,
        soulte = 0,
        batterie = 0,
        bardage = 0,
        cheneaux = 0
    } = costs;

    return (
        installation +
        charpente +
        couverture +
        terrassement +
        raccordement +
        fraisCommerciaux +
        developpement +
        soulte +
        batterie +
        bardage +
        cheneaux
    );
}

/**
 * Génère le business plan complet sur 20 ans
 * @param {Object} params - Paramètres du projet
 * @param {Object} costs - Coûts du projet
 * @returns {Array} Tableau de 20 objets représentant chaque année
 */
export function generateBusinessPlan(params, costs) {
    const {
        power = 0,
        production = 0,
        tarifTH = 0.12,
        tarifACC = 0.12,
        turpe = 0.012,
        prixAchatACC = 0.40, // Represents Part ACC (40%)
        interestRate = 3.0,
        withPrime = true // Default to true
    } = params;

    const totalCost = calculateTotalProjectCost(costs);
    const businessPlan = [];
    const startYear = new Date().getFullYear();

    // Paramètres de maintenance (par défaut 30 €/kWc/an si non défini, user image says 10 in previous step)
    const maintenancePerKwc = costs.maintenance || 10;
    const INSURANCE_RATE = 0.005; // 0.5% du coût total par an
    const TAX_RATE = 0.25; // 25% d'impôt sur les sociétés
    const DEPRECIATION_YEARS = 20;
    const annualDepreciation = totalCost / DEPRECIATION_YEARS;

    // Calcul de la prime à l'autoconsommation (selon puissance)
    let primeAutoconsoTotal = 0;
    // Condition: Power <= 100 AND Prime Switch is ON
    if (power <= 100 && withPrime !== false) {
        if (power <= 3) {
            primeAutoconsoTotal = power * 380;
        } else if (power <= 9) {
            primeAutoconsoTotal = power * 280;
        } else if (power <= 36) {
            primeAutoconsoTotal = power * 160;
        } else if (power <= 100) {
            primeAutoconsoTotal = power * 80;
        }
    }

    let remainingDebt = totalCost;
    let cumulativeGainTH = 0;
    let cumulativeGainACC = 0;

    for (let year = 0; year < 20; year++) {
        const yearNumber = startYear + year;

        // Inflation Rates
        const inflationMaintenance = Math.pow(1.01, year); // 1%/an
        const inflationCATb = Math.pow(1.01, year); // 1%/an (Surplus)
        const inflationCAACC = Math.pow(1.02, year); // 2%/an (ACC)
        const inflationAssurance = Math.pow(1.02, year); // 2%/an
        const inflationDivers = Math.pow(1.02, year); // 2%/an
        const inflationIFER = Math.pow(1.01, year); // 1%/an

        // Calcul du chiffre d'affaires
        // Vente ACC = Production * Part ACC * Tarif ACC * Inflation
        // prixAchatACC is fraction (0.40 for 40%).
        const venteACC = production * prixAchatACC * tarifACC * inflationCAACC;

        // Vente Surplus = Production * (1 - Part ACC) * Tarif TH * Inflation
        const venteSurplus = production * (1 - prixAchatACC) * tarifTH * inflationCATb;

        // Prime: Distribuée sur 5 ans pour > 9kWc? Or 1 shot?
        // Simuacc image usually 5 years.
        // User didn't specify, but standard is 5 years if > 9kWc, 1 year if <= 9kWc.
        // Provided code had year === 0 checks previously.
        // Let's implement standard rule properly if possible, or stick to user requirements.
        // User only said "La prime doit pouvoir être ajoutée...".
        // Taking a cue from previous image "Prime à l'autoconsommation" line has value in 2025.
        // If it's distributed, it would appear in 2026 too.
        // I will assume 5 years distribution if > 9kWc.
        let primeYear = 0;
        if (primeAutoconsoTotal > 0) {
            if (power <= 9) {
                primeYear = (year === 0) ? primeAutoconsoTotal : 0;
            } else {
                primeYear = (year < 5) ? (primeAutoconsoTotal / 5) : 0;
            }
        }
        // Actually, user image 0 shows "Prime à l'autoconsommation" line? No, I don't see it in Image 0 (Business Plan).
        // Wait, Image 0 is Business Plan rows.
        // I see "Chiffre d'affaires" -> "Vente ACC", "Vente Surplus (Tb)", "Total CA".
        // "Prime" is NOT in CA lines in Image 0?
        // Image 2 shows "Gains Cumulés".
        // Image 1 shows inputs.
        // Image 3 (Simulateur_Rentabilite...pdf) shows "Prime à l'autoconsommation" in CA.
        // I will include Prime row in BP.

        const totalCA = venteACC + venteSurplus + primeYear;

        // Calcul des charges d'exploitation
        const maintenance = power * maintenancePerKwc * inflationMaintenance;
        const rachatBailToit = 0;
        const assurance = totalCost * INSURANCE_RATE * inflationAssurance;
        const ifer = power > 100 ? power * 3.394 * inflationIFER : 0;
        const divers = (costs.divers || 0) * inflationDivers; // Replaces d3x2. Default 0.
        const totalCharges = maintenance + rachatBailToit + assurance + ifer + divers;

        // Excédent Brut d'Exploitation
        const ebe = totalCA - totalCharges;

        // Amortissement
        const amortissement = annualDepreciation;

        // Résultat d'exploitation
        const rbt = ebe - amortissement;

        // Financement
        const interets = remainingDebt * (interestRate / 100);
        const rembtCapital = year < 20 ? totalCost / 20 : 0; // Remboursement sur 20 ans
        const annuite = rembtCapital + interets;

        remainingDebt = Math.max(0, remainingDebt - rembtCapital);

        // Résultat avant impôts
        const rai = rbt - interets;

        // Impôt sur les sociétés
        const impot = Math.max(0, rai * TAX_RATE);

        // Résultat Net
        const resultatNet = rai - impot;

        // DSCR (Couverture de la dette : (EBE - Impôt) / Annuité)
        // CFADS approx = EBE - Impôt (tax cash out)
        const dscr = annuite > 0 ? (ebe - impot) / annuite : 0;

        // Conversion de la dette
        const dach = remainingDebt;

        // Gains cumulés
        // Cash Flow Libre = Résultat Net + Amortissement - Remboursement Capital
        const cashFlow = resultatNet + amortissement - rembtCapital;

        // Recalcul Gain TH Seul (Hypothèse 100% injecté)
        // Vente Totale (Surplus method 100%)
        // Vente Totale = Production * Tarif TH * Inflation CATb?
        // Usually Vente Totale Tariff is Tarif TH.
        const caTH = production * tarifTH * inflationCATb; // Use Inflation like Surplus
        const ebeTH = caTH - totalCharges; // Assume same charges
        const rbtTH = ebeTH - amortissement;
        const interetsTH = interets; // Same debt
        const raiTH = rbtTH - interetsTH;
        const impotTH = Math.max(0, raiTH * TAX_RATE);
        const netTH = raiTH - impotTH;
        const cfTH = netTH + amortissement - rembtCapital;

        if (year === 0) {
            cumulativeGainTH = cfTH;
            cumulativeGainACC = cashFlow;
        } else {
            cumulativeGainTH += cfTH;
            cumulativeGainACC += cashFlow;
        }

        businessPlan.push({
            annee: yearNumber,
            venteACC,
            venteSurplus,
            primeAutoconso: primeYear,
            totalCA,
            maintenance,
            rachatBailToit,
            assurance,
            ifer,
            divers, // Renamed from d3x2
            totalCharges,
            ebe,
            amortissement,
            rbt,
            interets,
            rembtCapital,
            annuite,
            rai,
            impot,
            resultatNet,
            dach,
            dscr,
            cumulativeGainTH,
            cumulativeGainACC
        });
    }

    return businessPlan;
}

export function calculateCumulativeGains(businessPlan) {
    return businessPlan.map((year, index) => ({
        annee: 2025 + index, // Correct year display
        gainTH: year.cumulativeGainTH / 1000,
        gainACC: year.cumulativeGainACC / 1000
    }));
}

export function calculateAverageDSCR(businessPlan) {
    // Moyenne sur la période de la dette (ex: 15 ans)
    const debtYears = businessPlan.filter(y => y.annuite > 0);
    if (debtYears.length === 0) return 0;
    const sumDSCR = debtYears.reduce((acc, curr) => acc + curr.dscr, 0);
    return sumDSCR / debtYears.length;
}

export function calculateTRI(businessPlan, initialInvestment) {
    // Cash Flow pour TRI = EBE - Impôt ? Ou Cash Flow aux actionnaires ?
    // TRI Projet = Free Cash Flow to Firm (FCFF) => EBE - Impôt (sans impact dette) ?
    // TRI Actionnaire = Free Cash Flow to Equity (FCFE) => Résultat Net + Amort - Rembt Capital
    // Ici on calcule TRI Projet sur 20 ans
    // Flux = EBE - Impot (sur EBE) - Investissement Initial
    // Ou simplement Flux de trésorerie net ?
    const cashFlows = [-initialInvestment, ...businessPlan.map(y => y.resultatNet + y.amortissement - y.rembtCapital)];

    // ... (rest of TRI calc same)
    let tri = 0.1;
    for (let i = 0; i < 100; i++) {
        let npv = 0;
        let dnpv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + tri, t);
            dnpv -= t * cashFlows[t] / Math.pow(1 + tri, t + 1);
        }
        if (dnpv === 0) break;
        let newTri = tri - npv / dnpv;
        if (Math.abs(newTri - tri) < 0.0001) return newTri * 100;
        tri = newTri;
    }
    return tri * 100;
}

/**
 * Calcule le DRCI (Délai de Récupération du Capital Investi)
 * @param {Array} businessPlan - Business plan généré
 * @param {number} initialInvestment - Investissement initial
 * @returns {number} DRCI en années
 */
export function calculateDRCI(businessPlan, initialInvestment) {
    let cumulativeCashFlow = 0;

    for (let i = 0; i < businessPlan.length; i++) {
        cumulativeCashFlow += businessPlan[i].resultatNet + businessPlan[i].amortissement;

        if (cumulativeCashFlow >= initialInvestment) {
            // Interpolation pour obtenir une valeur plus précise
            const previousCumulative = cumulativeCashFlow - (businessPlan[i].resultatNet + businessPlan[i].amortissement);
            const yearFraction = (initialInvestment - previousCumulative) / (businessPlan[i].resultatNet + businessPlan[i].amortissement);
            return i + yearFraction;
        }
    }

    return 20; // Si pas récupéré en 20 ans
}

/**
 * Calcule le retour sur investissement (payback period)
 * @param {Array} businessPlan - Business plan généré
 * @param {number} initialInvestment - Investissement initial
 * @param {boolean} withACC - Avec ou sans ACC
 * @returns {number} Années pour retour sur investissement
 */
export function calculatePaybackPeriod(businessPlan, initialInvestment, withACC = true) {
    let cumulative = 0;

    for (let i = 0; i < businessPlan.length; i++) {
        const yearGain = withACC ? businessPlan[i].cumulativeGainACC : businessPlan[i].cumulativeGainTH;

        if (yearGain >= initialInvestment) {
            // Interpolation
            const previousGain = i > 0 ? (withACC ? businessPlan[i - 1].cumulativeGainACC : businessPlan[i - 1].cumulativeGainTH) : 0;
            const yearFraction = (initialInvestment - previousGain) / (yearGain - previousGain);
            return i + yearFraction;
        }
    }

    return 20; // Si pas récupéré en 20 ans
}

export function calculateAllMetrics(params, costs) {
    const totalCost = calculateTotalProjectCost(costs);
    const businessPlan = generateBusinessPlan(params, costs);
    const cumulativeGains = calculateCumulativeGains(businessPlan);

    const tri = calculateTRI(businessPlan, totalCost);
    // Use calculateDRCI defined previously (assumed unchanged as not in replacement block, wait I must include it if I replace the block or ensure it's there)
    // Actually I'm replacing generateBusinessPlan, calculateCumulativeGains, and calculateAllMetrics.
    // I need to make sure calculateDRCI and calculatePaybackPeriod are accessible or included.
    // Since I am doing a partial replacement, I should allow calculateDRCI/Payback to remain if `ReplacementContent` doesn't overwrite them.
    // But `calculateAllMetrics` uses them.

    // Let's redefine calculateAverageDSCR inside or export it.
    const averageDSCR = calculateAverageDSCR(businessPlan);

    // Reuse existing functions for DRCI/Payback if they are outside the replacement scope.
    // My replacement starts at line 73 and ends at 301.
    // Lines 228-273 contain calculateDRCI and calculatePaybackPeriod.
    // I MUST include them in the ReplacementContent or NOT replace them.
    // To be safe, I will include the logic for calculateAverageDSCR and update calculateAllMetrics.

    // I will replace `generateBusinessPlan` (lines 62-178) first.
    // Then add `calculateAverageDSCR`.
    // Then update `calculateAllMetrics`.

    return {
        totalCost,
        businessPlan,
        cumulativeGains,
        tri,
        drci: calculateDRCI(businessPlan, totalCost),
        paybackWithoutACC: calculatePaybackPeriod(businessPlan, totalCost, false),
        paybackWithACC: calculatePaybackPeriod(businessPlan, totalCost, true),
        averageDSCR // Added
    };
}
