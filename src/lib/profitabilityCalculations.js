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
        fondations = 0,
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
        fondations +
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
    const maintenancePerKwc = costs.maintenance !== undefined ? costs.maintenance : 10;
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
    let cumulativeCashFlow = 0;

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
        const venteACC = production * prixAchatACC * tarifACC * inflationCAACC;

        // Vente Surplus = Production * (1 - Part ACC) * Tarif TH * Inflation
        const venteSurplus = production * (1 - prixAchatACC) * tarifTH * inflationCATb;

        // Prime: Versée entièrement la première année (Hypothèse Simuacc)
        let primeYear = 0;
        if (primeAutoconsoTotal > 0) {
            primeYear = (year === 0) ? primeAutoconsoTotal : 0;
        }

        const totalCA = venteACC + venteSurplus + primeYear;

        // Calcul du CA TH Seul (Base pour Gain TB Seul) - Hypothèse 100% Surplus
        const venteTHSeul = production * tarifTH * inflationCATb;
        const totalCATHSeul = venteTHSeul + primeYear;

        // Calcul des charges d'exploitation
        const maintenance = power * maintenancePerKwc * inflationMaintenance;
        const rachatBailToit = 0;
        // Assurance: 11.5€ * Power (Year 1) then Inflation (Simuacc: 1150 for 100kWc -> 11.5)
        const assurance = (11.5 * power) * inflationAssurance;
        // IFER: 8.36€ * Power (if > 100) then Inflation
        const ifer = power > 100 ? (8.36 * power) * inflationIFER : 0;
        // Divers: 12€ * Power (Year 1) then Inflation (Simuacc: 1200 for 100kWc -> 12)
        const divers = (12 * power) * inflationDivers;

        const totalCharges = maintenance + rachatBailToit + assurance + ifer + divers;

        // Excédent Brut d'Exploitation
        const ebe = totalCA - totalCharges;

        // Amortissement Comptable (Linéaire sur 20 ans)
        const amortissement = annualDepreciation;

        // Résultat d'exploitation
        const rbt = ebe - amortissement;

        // Financement (Emprunt à Annuités Constantes)
        // Annuity = Debt * r / (1 - (1+r)^-n)
        const annualRate = interestRate / 100;
        let annuite = 0;
        let interets = 0;
        let rembtCapital = 0;

        if (annualRate > 0 && totalCost > 0) {
            // Calcul de l'annuité constante (si année 0, on la calcule)
            // On recalcul pas à chaque boucle, c'est constant.
            const term = 20;
            const calculatedAnnuity = totalCost * (annualRate / (1 - Math.pow(1 + annualRate, -term)));

            if (year < term) {
                annuite = calculatedAnnuity;
                interets = remainingDebt * annualRate;
                rembtCapital = annuite - interets;
            } else {
                annuite = 0;
                interets = 0;
                rembtCapital = 0;
            }
        } else if (totalCost > 0) {
            // Taux 0%
            annuite = totalCost / 20;
            rembtCapital = totalCost / 20;
            interets = 0;
        }

        remainingDebt = Math.max(0, remainingDebt - rembtCapital);

        // Résultat avant impôts
        const rai = rbt - interets;

        // Impôt sur les sociétés
        const impot = Math.max(0, rai * TAX_RATE);

        // Résultat Net
        const resultatNet = rai - impot;

        // DSCR (Couverture de la dette : (EBE - Impôt) / Annuité)
        // Simuacc seems to use EBE / Annuity or similar. User screenshot says (EBE-Impot) logic is standard.
        // Let's stick to standard: (EBE - Tax) / Debt Service.
        const dscr = annuite > 0 ? (ebe - impot) / annuite : 0;

        // Conversion de la dette
        const dach = remainingDebt;

        // Gains cumulés (Basés sur le CA selon demande utilisateur)
        // Gain TB + ACC = Cumul CA Total
        // Gain TB Seul = Cumul CA TH Seul
        if (year === 0) {
            cumulativeGainTH = totalCATHSeul;
            cumulativeGainACC = totalCA;
        } else {
            cumulativeGainTH += totalCATHSeul;
            cumulativeGainACC += totalCA;
        }

        // --- CALCUL DES FLUX POUR TRI/PAYBACK ---

        // 1. Flux Actionnaire (Net Cash Flow to Equity)
        // = Resultat Net + Amort - Remboursement Capital
        const cashFlowShareholder = resultatNet + amortissement - rembtCapital;

        // 2. Flux Projet (Unlevered Free Cash Flow)
        // Pour TRI Projet, on doit exclure l'impact de la dette (intérêts et capital).
        // On recalcule l'impôt théorique sans dette.
        const impotTheorique = Math.max(0, rbt * TAX_RATE);
        // Flux = EBIT * (1 - t) + Amortissement
        //      = (rbt - impotTheorique) + amortissement
        //      = ebe - impotTheorique
        const cashFlowProject = ebe - impotTheorique;

        cumulativeCashFlow += cashFlowProject; // On utilise le Flux Projet pour le Payback Projet

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
            divers,
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
            cumulativeGainACC,
            cashFlow: cashFlowShareholder, // Pour compatibilité si utilisé ailleurs (tableau)
            cashFlowProject,
            cumulativeCashFlow
        });
    }

    return businessPlan;
}

export function calculateCumulativeGains(businessPlan) {
    return businessPlan.map((year, index) => ({
        annee: 2025 + index,
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
    // TRI PROJET: utilise les flux de trésorerie du projet (avant financement)
    const cashFlows = [-initialInvestment, ...businessPlan.map(y => y.cashFlowProject)];

    const sumPositive = cashFlows.reduce((acc, val) => val > 0 ? acc + val : acc, 0);
    if (sumPositive < initialInvestment) {
        return -100;
    }

    let tri = 0.05;
    for (let i = 0; i < 1000; i++) {
        let npv = 0;
        let dnpv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            const disc = Math.pow(1 + tri, t);
            npv += cashFlows[t] / disc;
            dnpv -= t * cashFlows[t] / (disc * (1 + tri));
        }

        if (Math.abs(dnpv) < 0.000001) break;

        let newTri = tri - npv / dnpv;

        // Clamp
        if (newTri > 50) newTri = 50;
        if (newTri < -0.99) newTri = -0.99;

        if (Math.abs(newTri - tri) < 0.00001) return newTri * 100;
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
            const previousCumulative = cumulativeCashFlow - (businessPlan[i].resultatNet + businessPlan[i].amortissement);
            const yearFraction = (initialInvestment - previousCumulative) / (businessPlan[i].resultatNet + businessPlan[i].amortissement);
            return i + yearFraction;
        }
    }

    return 20;
}

/**
 * Calcule le retour sur investissement (payback period)
 * @param {Array} businessPlan - Business plan généré
 * @param {number} initialInvestment - Investissement initial
 * @returns {number} Années pour retour sur investissement
 */
export function calculatePaybackPeriod(businessPlan, initialInvestment) {
    // Updated ROI Logic: Sum(CashFlow) >= CAPEX
    // CashFlow = Net Result + Amort - Capital Repayment.

    for (let i = 0; i < businessPlan.length; i++) {
        if (businessPlan[i].cumulativeCashFlow >= initialInvestment) {
            // Interpolation
            const previousCumulative = i > 0 ? businessPlan[i - 1].cumulativeCashFlow : 0;
            const yearFlow = businessPlan[i].cashFlow;
            const fraction = yearFlow !== 0 ? (initialInvestment - previousCumulative) / yearFlow : 0;
            return i + fraction;
        }
    }

    return 20.0;
}

export function calculateAllMetrics(params, costs) {
    const totalCost = calculateTotalProjectCost(costs);

    // 1. Calculate Standard Business Plan (with User Params)
    const businessPlan = generateBusinessPlan(params, costs);

    // 2. Calculate "No ACC" Business Plan (Hypothetical: 100% Surplus)
    const paramsNoACC = { ...params, prixAchatACC: 0 };
    const businessPlanNoACC = generateBusinessPlan(paramsNoACC, costs);

    const cumulativeGains = calculateCumulativeGains(businessPlan);

    const tri = calculateTRI(businessPlan, totalCost);
    const averageDSCR = calculateAverageDSCR(businessPlan);

    // Payback with ACC uses standard BP
    const paybackWithACC = calculatePaybackPeriod(businessPlan, totalCost);

    // Payback without ACC uses "No ACC" BP
    const paybackWithoutACC = calculatePaybackPeriod(businessPlanNoACC, totalCost);

    return {
        totalCost,
        businessPlan,
        cumulativeGains,
        tri,
        drci: calculateDRCI(businessPlan, totalCost),
        paybackWithoutACC,
        paybackWithACC,
        averageDSCR
    };
}
