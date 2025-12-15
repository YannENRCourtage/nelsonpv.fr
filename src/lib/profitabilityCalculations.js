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

    // Constantes pour les calculs
    const MAINTENANCE_RATE = 0.01; // 1% du coût total par an
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
        const venteSurplus = production * (1 - prixAchatACC) * tarifTH * 0.07; // 7% de surplus
        const primeYear = year === 0 ? primeAutoconso : 0; // Prime la première année seulement
        const totalCA = venteACC + venteSurplus + primeYear;

        // Calcul des charges d'exploitation
        const maintenance = totalCost * MAINTENANCE_RATE;
        const rachatBailToit = 0; // À définir si nécessaire
        const assurance = totalCost * INSURANCE_RATE;
        const ifer = power > 100 ? power * 3.394 : 0; // IFER uniquement > 100kWc
        const d3x2 = 0; // À définir
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
        remainingDebt = Math.max(0, remainingDebt - rembtCapital);

        // Résultat avant impôts
        const rai = rbt - interets;

        // Impôt sur les sociétés
        const impot = Math.max(0, rai * TAX_RATE);

        // Résultat Net
        const resultatNet = rai - impot;

        // Conversion de la dette
        const dach = remainingDebt;

        // Gains cumulés
        cumulativeGainTH += (production * tarifTH) - totalCharges - interets - impot;
        cumulativeGainACC += totalCA - totalCharges - interets - impot;

        businessPlan.push({
            annee: yearNumber,
            // Chiffre d'affaires
            venteACC,
            venteSurplus,
            primeAutoconso: primeYear,
            totalCA,
            // Charges
            maintenance,
            rachatBailToit,
            assurance,
            ifer,
            d3x2,
            totalCharges,
            // Résultats
            ebe,
            amortissement,
            rbt,
            interets,
            rembtCapital,
            rai,
            impot,
            resultatNet,
            dach,
            // Gains cumulés
            cumulativeGainTH,
            cumulativeGainACC
        });
    }

    return businessPlan;
}

/**
 * Calcule les gains cumulés pour le graphique
 * @param {Array} businessPlan - Business plan généré
 * @returns {Array} Données pour le graphique
 */
export function calculateCumulativeGains(businessPlan) {
    return businessPlan.map((year, index) => ({
        annee: index,
        gainTH: year.cumulativeGainTH / 1000, // Conversion en k€
        gainACC: year.cumulativeGainACC / 1000 // Conversion en k€
    }));
}

/**
 * Calcule le TRI (Taux de Rentabilité Interne)
 * @param {Array} businessPlan - Business plan généré
 * @param {number} initialInvestment - Investissement initial
 * @returns {number} TRI en %
 */
export function calculateTRI(businessPlan, initialInvestment) {
    // Méthode de Newton-Raphson pour trouver le TRI
    const cashFlows = [-initialInvestment, ...businessPlan.map(y => y.resultatNet + y.amortissement)];

    let tri = 0.1; // Estimation initiale à 10%
    const maxIterations = 100;
    const precision = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let dnpv = 0;

        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + tri, t);
            dnpv -= t * cashFlows[t] / Math.pow(1 + tri, t + 1);
        }

        const newTri = tri - npv / dnpv;

        if (Math.abs(newTri - tri) < precision) {
            return newTri * 100; // Retourne en %
        }

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

/**
 * Calcule toutes les métriques de rentabilité
 * @param {Object} params - Paramètres du projet
 * @param {Object} costs - Coûts du projet
 * @returns {Object} Toutes les métriques calculées
 */
export function calculateAllMetrics(params, costs) {
    const totalCost = calculateTotalProjectCost(costs);
    const businessPlan = generateBusinessPlan(params, costs);
    const cumulativeGains = calculateCumulativeGains(businessPlan);

    const tri = calculateTRI(businessPlan, totalCost);
    const drci = calculateDRCI(businessPlan, totalCost);
    const paybackWithoutACC = calculatePaybackPeriod(businessPlan, totalCost, false);
    const paybackWithACC = calculatePaybackPeriod(businessPlan, totalCost, true);

    return {
        totalCost,
        businessPlan,
        cumulativeGains,
        tri,
        drci,
        paybackWithoutACC,
        paybackWithACC
    };
}
