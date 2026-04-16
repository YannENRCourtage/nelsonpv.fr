function PMT(ir, np, pv) {
  if (ir === 0) return -(pv / np);
  const pvif = Math.pow(1 + ir, np);
  return -(ir * pv * pvif) / (pvif - 1);
}

function IRR(values, guess = 0.1) {
  if (!values || values.length < 2) return 0;
  let min = -1.0;
  let max = 1.0;
  let guessVal = guess;
  for (let i = 0; i < 1000; i++) {
    let npv = 0;
    for (let j = 0; j < values.length; j++) {
      npv += values[j] / Math.pow(1 + guessVal, j);
    }
    if (Math.abs(npv) < 0.0001) return guessVal;
    if (npv > 0) { min = guessVal; } else { max = guessVal; }
    guessVal = (min + max) / 2;
  }
  return guessVal;
}

function test(config) {
    const {
        inflationAnnuelle, degradationAnnuelle, capexTotal, revenusBrutsAn1,
        disponibilite, rendementRoundTrip, maintenanceAn, revenuBailleurAn,
        gestionChargeAn, assuranceAn, retributionCommAn, commissionAgregateur,
        turpeAn, iferAn, tauxIS, dureeEtude
    } = config;

    const cashFlows = [-capexTotal];
    const rows = [];
    let cumulative = -capexTotal;
    let simplePaybackY = null;

    for (let y = 1; y <= dureeEtude; y++) {
        const infl = Math.pow(1 + inflationAnnuelle / 100, y - 1);
        const deg = Math.pow(1 - degradationAnnuelle / 100, y - 1);

        // NEW LOGIC: only availability
        const revNet = revenusBrutsAn1 * deg * infl * (disponibilite / 100);
        const chargesFixes = (maintenanceAn + assuranceAn + turpeAn + iferAn + revenuBailleurAn + gestionChargeAn + retributionCommAn) * infl;
        const chargesCom = revNet * (commissionAgregateur / 100);
        const ebe = revNet - (chargesFixes + chargesCom);

        const amortissement = capexTotal / dureeEtude;
        const interest = 0; // Unlevered for TRI Projet
        const ebit = ebe - amortissement;
        const is = ebit > 0 ? ebit * (tauxIS / 100) : 0;
        const ncf = ebe - is;
        
        cashFlows.push(ncf);

        if (simplePaybackY === null && (cumulative + ncf) >= 0) {
            simplePaybackY = (y-1) + (Math.abs(cumulative) / ncf);
        }
        cumulative += ncf;
    }

    const tri = IRR(cashFlows, 0.1);
    console.log("--- RESULTS ---");
    console.log("REVENU AN 1:", revenusBrutsAn1 * (disponibilite / 100));
    console.log("EBE AN 1:", revenusBrutsAn1 * (disponibilite / 100) - (maintenanceAn + assuranceAn + turpeAn + iferAn + revenuBailleurAn + gestionChargeAn + retributionCommAn + (revenusBrutsAn1 * (disponibilite/100) * commissionAgregateur/100)));
    console.log("TRI PROJET:", (tri * 100).toFixed(1) + "%");
    console.log("RETOUR:", simplePaybackY ? simplePaybackY.toFixed(1) + " ans" : ">" + dureeEtude + " ans");
}

const userConfig = {
    inflationAnnuelle: 2,
    degradationAnnuelle: 2,
    capexTotal: 59875,
    revenusBrutsAn1: 27500,
    disponibilite: 98,
    rendementRoundTrip: 88,
    maintenanceAn: 750,
    revenuBailleurAn: 2500,
    gestionChargeAn: 4562.5,
    retributionCommAn: 550,
    assuranceAn: 240,
    commissionAgregateur: 20,
    turpeAn: 5000,
    iferAn: 1250,
    tauxIS: 25,
    dureeEtude: 12
};

test(userConfig);
