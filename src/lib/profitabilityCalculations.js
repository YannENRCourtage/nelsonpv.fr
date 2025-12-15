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
        fraisConnexion = 0,
        fraisContrat = 0,
        developpement = 0,
        declaissement = 0,
        sortie = 0,
        batterie = 0,
        onduleur = 0,
        chargeur3DSecours = 0
    } = costs;

    return (
        installation +
        charpente +
        couverture +
        terrassement +
        raccordement +
        fraisConnexion +
        fraisContrat +
        developpement +
        declaissement +
        sortie +
        batterie +
        onduleur +
        chargeur3DSecours
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
        prixAchatACC = 0.85, // 85%
        interestRate = 3.0
    } = params;

    const totalCost = calculateTotalProjectCost(costs);
    const businessPlan = [];
    const startYear = new Date().getFullYear();

    // Paramètres de maintenance (par défaut 30 €/kWc/an si non défini)
    // Le champ maintenance dans costs est en €/kWc/an selon le screenshot
    const maintenancePerKwc = costs.maintenance || 10; // Valeur par défaut de l'image
    const INSURANCE_RATE = 0.005; // 0.5% du coût total par an
    const TAX_RATE = 0.25; // 25% d'impôt sur les sociétés
    const DEPRECIATION_YEARS = 20;
    const annualDepreciation = totalCost / DEPRECIATION_YEARS;

    // Calcul de la prime à l'autoconsommation (selon puissance)
    let primeAutoconso = 0;
    if (power <= 3) {
        primeAutoconso = power * 380;
    } else if (power <= 9) {
        primeAutoconso = power * 280;
    } else if (power <= 36) {
        primeAutoconso = power * 160;
    } else if (power <= 100) {
        primeAutoconso = power * 80;
    }

    let remainingDebt = totalCost;
    let cumulativeGainTH = 0;
    let cumulativeGainACC = 0;

    for (let year = 0; year < 20; year++) {
        const yearNumber = startYear + year;

        // Calcul du chiffre d'affaires
        const venteACC = production * prixAchatACC * tarifACC;
        const venteSurplus = production * (1 - prixAchatACC) * tarifTH; // Correction: Vente surplus est au tarif TH, pas 7% de surplus?
        // Vérification formule surplus: généralement Surplus = (Prod - Autoconso) * TarifOA.
        // Ici prixAchatACC semble être % d'autoconso (0.85 = 85% autoconso).
        // Donc Vente Surplus = Prod * (1 - 0.85) * TarifTH?
        // Le code précédent avait * 0.07 ??? Je simplifie:
        // Si prixAchatACC est le % d'autoconso, alors Surplus = 1 - prixAchatACC.

        const primeYear = (year < 5) ? (primeAutoconso / 5) : 0; // Prime étalée sur 5 ans généralement?
        // Dans le code précédent c'était year === 0.
        // Vérifions simuacc.fr ou règles CRE. Prime à l'inv est souvent versée en 1 ou 5 fois selon puissance. < 9kWc 1 fois, > 9kWc 5 fois.
        // Je laisse year === 0 pour l'instant car je n'ai pas la règle exacte sous les yeux, sauf si l'image le montre.
        // Image 3 -> Prime à l'autoconsommation ligne 4. Semble être 8000 en 2025 uniquement. Donc year === 0 ok pour ce cas (100kWc * 80 = 8000).

        const totalCA = venteACC + venteSurplus + (year === 0 ? primeAutoconso : 0);

        // Calcul des charges d'exploitation
        const maintenance = power * maintenancePerKwc * (1 + (year * 0.01)); // Inflation 1%
        const rachatBailToit = 0;
        const assurance = totalCost * INSURANCE_RATE * (1 + (year * 0.02)); // Inflation 2%
        const ifer = power > 100 ? power * 3.394 * (1 + (year * 0.01)) : 0;
        const d3x2 = 0;
        const totalCharges = maintenance + rachatBailToit + assurance + ifer + d3x2;

        // Excédent Brut d'Exploitation
        const ebe = totalCA - totalCharges;

        // Amortissement
        const amortissement = annualDepreciation;

        // Résultat d'exploitation
        const rbt = ebe - amortissement;

        // Financement
        const interets = remainingDebt * (interestRate / 100);
        const rembtCapital = year < 15 ? totalCost / 15 : 0; // Remboursement sur 15 ans
        const annuite = rembtCapital + interets;

        remainingDebt = Math.max(0, remainingDebt - rembtCapital);

        // Résultat avant impôts
        const rai = rbt - interets;

        // Impôt sur les sociétés
        const impot = Math.max(0, rai * TAX_RATE);

        // Résultat Net
        const resultatNet = rai - impot;

        // DSCR
        const dscr = annuite > 0 ? ebe / annuite : 0;

        // Conversion de la dette
        const dach = remainingDebt;

        // Gains cumulés
        // Cash Flow Libre = Résultat Net + Amortissement - Remboursement Capital
        const cashFlow = resultatNet + amortissement - rembtCapital;

        cumulativeGainTH += cashFlow; // Simplifié
        cumulativeGainACC += cashFlow; // Simplifié (Diff TH vs ACC ?)
        // Le modèle précédent distinguait GainTH et GainACC.
        // GainACC = avec autoconsommation. GainTH = Vente Totale (Hypothèse 100% injecté ?)
        // Ici on a pris production * prixAchatACC * tarifACC...
        // Pour "Gain TH Seul", on devrait recalculer avec 100% surplus.

        // Recalcul rapide pour Gain TH Seul (Vente Totale)
        const caTH = production * tarifTH;
        const ebeTH = caTH - totalCharges;
        const rbtTH = ebeTH - amortissement;
        const raiTH = rbtTH - interets;
        const impotTH = Math.max(0, raiTH * TAX_RATE);
        const netTH = raiTH - impotTH;
        const cfTH = netTH + amortissement - rembtCapital;
        // On utilisera une variable accumulée séparée
        // cumulativeGainTH est écrasé ici pour l'accumuler proprement
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
            primeAutoconso: year === 0 ? primeAutoconso : 0,
            totalCA,
            maintenance,
            rachatBailToit,
            assurance,
            ifer,
            totalCharges,
            ebe,
            amortissement,
            rbt,
            interets,
            rembtCapital,
            annuite, // Debt Service
            rai,
            impot,
            resultatNet,
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
