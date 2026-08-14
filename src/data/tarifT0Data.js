/**
 * Tarifs d'achat photovoltaïque CRE / EDF OA (Mise à jour 2026)
 * Réforme de l'arrêté tarifaire (Arrêté S21 / Juin 2026)
 */
export const TARIF_TRANCHES = [
  { minKwc: 0, maxKwc: 3, label: '≤ 3 kWc', tarifVenteTotale: 0.1735, tarifSurplus: 0.1301, tarifSurplus2026: 0.0110 },
  { minKwc: 3, maxKwc: 9, label: '3 - 9 kWc', tarifVenteTotale: 0.1474, tarifSurplus: 0.1301, tarifSurplus2026: 0.0110 },
  { minKwc: 9, maxKwc: 36, label: '9 - 36 kWc', tarifVenteTotale: 0.1123, tarifSurplus: 0.0781, tarifSurplus2026: 0.0110 },
  { minKwc: 36, maxKwc: 100, label: '36 - 100 kWc', tarifVenteTotale: 0.1123, tarifSurplus: 0.0781, tarifSurplus2026: 0.0110 },
  { minKwc: 100, maxKwc: 500, label: '100 - 500 kWc', tarifVenteTotale: 0.1192, tarifSurplus: 0.0110, tarifSurplus2026: 0.0110 },
  { minKwc: 500, maxKwc: Infinity, label: '> 500 kWc', tarifVenteTotale: 'Appel d\'offres CRE', tarifSurplus: 'AO CRE', tarifSurplus2026: 'AO CRE' }
];

export const getTarifForPuissance = (kwc, type = 'vente_totale') => {
  if (kwc == null || isNaN(kwc)) return null;
  const puissance = parseFloat(kwc);
  
  const tranche = TARIF_TRANCHES.find(t => puissance > t.minKwc && puissance <= t.maxKwc);
  if (!tranche) return null;
  
  return type === 'vente_totale' ? tranche.tarifVenteTotale : tranche.tarifSurplus;
};

export const TARIF_TRIMESTRES = [
  { trimestre: 'Q1 2026', label: 'Trimestre 1 2026', validite: '01/01/2026 - 31/03/2026' },
  { trimestre: 'Q2 2026', label: 'Trimestre 2 2026', validite: '01/04/2026 - 30/06/2026' },
  { trimestre: 'Q3 2026', label: 'Trimestre 3 2026', validite: '01/07/2026 - 30/09/2026' }
];
