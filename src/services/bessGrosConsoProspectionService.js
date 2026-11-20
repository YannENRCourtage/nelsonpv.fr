import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { recommendSafraModel, SAFRA_CATALOG } from '@/data/safraCatalog.js';
import { BATTERY_MODELS } from '@/data/batteryModels.js';

/**
 * Typologies / Secteurs "Gros Consommateurs" avec codes NAF et profils énergétiques réalistes
 */
export const GROS_CONSO_SECTORS = [
  {
    id: 'all',
    label: 'Tous secteurs Gros Consommateurs',
    nafPrefixes: ['10', '11', '16', '20', '22', '23', '24', '25', '01', '47', '52', '55', '86'],
    baseAnnualKwh: 280000,
    basePeakKw: 110,
    loadFactorHours: 2550,
    defaultUseCase: 'Écrêtage de pointes (TURPE) & Arbitrage HP/HC',
    pvProbability: 0.65
  },
  {
    id: 'agroalimentaire',
    label: 'Agroalimentaire (Abattoirs, Laiteries, Caves, Conserveries)',
    nafPrefixes: ['10', '11'],
    baseAnnualKwh: 420000,
    basePeakKw: 165,
    loadFactorHours: 2550,
    defaultUseCase: 'Écrêtage de pointes froid/process & Réduction TURPE',
    pvProbability: 0.70
  },
  {
    id: 'froid_logistique',
    label: 'Froid industriel, Entrepôts & Logistique frigorifique',
    nafPrefixes: ['52', '46.3'],
    baseAnnualKwh: 520000,
    basePeakKw: 195,
    loadFactorHours: 2660,
    defaultUseCase: 'Écrêtage groupes froids & Couplage toiture PV',
    pvProbability: 0.80
  },
  {
    id: 'industrie',
    label: 'Industrie, Scieries, Plasturgie & Métallurgie',
    nafPrefixes: ['16', '20', '22', '23', '24', '25', '28'],
    baseAnnualKwh: 650000,
    basePeakKw: 240,
    loadFactorHours: 2700,
    defaultUseCase: 'Effacement pointes machines & Continuité de service',
    pvProbability: 0.60
  },
  {
    id: 'agricole',
    label: 'Exploitations Agricoles, Élevage, Serres & Séchoirs',
    nafPrefixes: ['01'],
    baseAnnualKwh: 215000,
    basePeakKw: 90,
    loadFactorHours: 2380,
    defaultUseCase: 'Lissage / Couplage PV toiture & Arbitrage HP/HC',
    pvProbability: 0.85
  },
  {
    id: 'commerce_tertiaire',
    label: 'Grande Distribution, Commerce, Hôtellerie & Santé',
    nafPrefixes: ['47', '55', '86'],
    baseAnnualKwh: 340000,
    basePeakKw: 135,
    loadFactorHours: 2500,
    defaultUseCase: 'Écrêtage climatisation/CVC & Autoconsommation ombrières',
    pvProbability: 0.75
  },
  {
    id: 'collectivites',
    label: 'Collectivités, Stations d’épuration & Équipements publics',
    nafPrefixes: ['36', '37', '84', '93'],
    baseAnnualKwh: 260000,
    basePeakKw: 95,
    loadFactorHours: 2730,
    defaultUseCase: 'Arbitrage HP/HC & Sécurisation continuité de service',
    pvProbability: 0.55
  }
];

export const DEPARTEMENTS_LIST = [
  { code: '24', name: 'Dordogne (24)' },
  { code: '33', name: 'Gironde (33)' },
  { code: '40', name: 'Landes (40)' },
  { code: '47', name: 'Lot-et-Garonne (47)' },
  { code: '82', name: 'Tarn-et-Garonne (82)' },
  { code: '16', name: 'Charente (16)' },
  { code: '17', name: 'Charente-Maritime (17)' },
  { code: '19', name: 'Corrèze (19)' },
  { code: '23', name: 'Creuse (23)' },
  { code: '31', name: 'Haute-Garonne (31)' },
  { code: '32', name: 'Gers (32)' },
  { code: '64', name: 'Pyrénées-Atlantiques (64)' },
  { code: '65', name: 'Hautes-Pyrénées (65)' },
  { code: '81', name: 'Tarn (81)' },
  { code: '87', name: 'Haute-Vienne (87)' },
  { code: '03', name: 'Allier (03)' },
  { code: '63', name: 'Puy-de-Dôme (63)' },
];

/**
 * Autocomplétion de communes françaises via geo.api.gouv.fr
 */
export async function searchCommunesFrance(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const isPostal = /^\d{2,5}$/.test(q);
  const url = isPostal
    ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(q)}&fields=nom,code,codesPostaux,codeDepartement,population&limit=10`
    : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codesPostaux,codeDepartement,population&boost=population&limit=10`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data)
    ? data.map((c) => ({
        nom: c.nom,
        codeInsee: c.code,
        codePostal: c.codesPostaux?.[0] || '',
        departement: c.codeDepartement || (c.code ? c.code.slice(0, 2) : ''),
        label: `${c.nom} (${c.codesPostaux?.[0] || c.codeDepartement || ''})`
      }))
    : [];
}

/**
 * Détecte le secteur énergétique correspondant à un code NAF
 */
function inferSectorFromNaf(nafCode, fallbackSectorId = 'all') {
  const clean = String(nafCode || '').trim();
  for (const sec of GROS_CONSO_SECTORS) {
    if (sec.id === 'all') continue;
    if (sec.nafPrefixes.some((p) => clean.startsWith(p))) {
      return sec;
    }
  }
  return GROS_CONSO_SECTORS.find((s) => s.id === fallbackSectorId) || GROS_CONSO_SECTORS[0];
}

/**
 * Multiplicateur d'effectifs INSEE -> consommation réaliste
 */
function getHeadcountMultiplier(trancheEffectif) {
  const t = String(trancheEffectif || '');
  if (t === '00' || t === '01' || t === '02') return 0.55; // 0-5 sal.
  if (t === '03' || t === '11') return 0.85; // 6-19 sal.
  if (t === '12') return 1.25; // 20-49 sal.
  if (t === '21') return 1.85; // 50-99 sal.
  if (t === '22' || t === '31') return 2.8; // 100-249 sal.
  if (t === '32' || t === '41' || t === '42' || t === '51' || t === '52' || t === '53') return 4.5; // 250+ sal.
  return 1.0;
}

/**
 * Calcule la recommandation batterie complète (SAFRA + alternative batteryModels) pour un site
 */
export function evaluateSiteBatteryRecommendation(site) {
  const annualKwh = Math.max(10000, Number(site.annualKwh) || 215000);
  const dailyKwh = annualKwh / 365;
  const peakKw = Math.max(5, Number(site.peakKw) || Math.round(annualKwh / 2450));
  const hasPv = Boolean(site.hasPv);

  const safraRec = recommendSafraModel(dailyKwh, peakKw);
  const primary = safraRec.primaryModel || SAFRA_CATALOG[10];
  const qty = safraRec.quantity || 1;

  const totalPowerKw = Math.round(primary.powerKw * qty);
  const totalCapacityKwh = Math.round(primary.capacityKwh * qty);
  const capexHT = Math.round((primary.turnkeyInstalledPriceHT || (primary.defaultPriceHt + primary.defaultInstallHt)) * qty);

  // Estimation réaliste des économies annuelles (arbitrage HP/HC + écrêtage pointe TURPE + bonus couplage PV)
  const cycledKwhPerYear = Math.min(annualKwh * 0.42, totalCapacityKwh * 0.85 * 300);
  const arbitrageGain = cycledKwhPerYear * (hasPv ? 0.135 : 0.085);
  const peakShavingGain = Math.min(peakKw * 0.45, totalPowerKw) * 42; // €/kW/an TURPE + dépassements
  const estimatedAnnualSavings = Math.round(arbitrageGain + peakShavingGain);
  const paybackYears = estimatedAnnualSavings > 0 ? Number((capexHT / estimatedAnnualSavings).toFixed(1)) : 0;

  // Alternative dans batteryModels.js (CESC Mercury 261 / Socomec / Sungrow)
  const cescAlt =
    totalPowerKw >= 200
      ? BATTERY_MODELS.find((b) => b.id === 'socomec') || BATTERY_MODELS[0]
      : BATTERY_MODELS.find((b) => b.id === 'cesc_mercury_261') || BATTERY_MODELS[0];

  const useCase = hasPv
    ? `Lissage & Couplage PV + ${site.defaultUseCase || 'Écrêtage de pointes'}`
    : (site.useCase || site.defaultUseCase || 'Écrêtage de pointes (TURPE) & Arbitrage HP/HC');

  return {
    ...site,
    annualKwh: Math.round(annualKwh),
    dailyKwh: Math.round(dailyKwh * 10) / 10,
    peakKw: Math.round(peakKw * 10) / 10,
    useCase,
    recommendation: {
      primaryModel: primary,
      quantity: qty,
      totalPowerKw,
      totalCapacityKwh,
      capexHT,
      estimatedAnnualSavings,
      paybackYears,
      reason: safraRec.reason,
      alternateSafra: safraRec.alternateModel
        ? {
            model: safraRec.alternateModel,
            quantity: safraRec.alternateQuantity || 1
          }
        : null,
      alternatePartner: cescAlt
    }
  };
}

/**
 * Recherche des établissements "Gros Consommateurs" via l'API officielle Recherche d'Entreprises (data.gouv.fr)
 * avec enrichissement énergétique et fallback de simulation locale si l'API est indisponible.
 */
export async function searchGrosConsommateurs({
  geoMode = 'city', // 'city' | 'department'
  cityInfo = null,  // { nom, codeInsee, codePostal, departement }
  departmentCode = '24',
  sectorId = 'all',
  minAnnualKwh = 100000,
  minPeakKw = 36,
  pvOnly = false,
  perPage = 20
}) {
  const sector = GROS_CONSO_SECTORS.find((s) => s.id === sectorId) || GROS_CONSO_SECTORS[0];

  // Construction des paramètres API Recherche d'Entreprises
  const params = new URLSearchParams();
  params.set('per_page', String(perPage));
  params.set('etat_administratif', 'A');

  if (geoMode === 'city' && cityInfo) {
    if (cityInfo.codeInsee) {
      params.set('code_commune', cityInfo.codeInsee);
    } else if (cityInfo.codePostal) {
      params.set('code_postal', cityInfo.codePostal);
    } else if (cityInfo.nom) {
      params.set('q', cityInfo.nom);
    }
  } else if (departmentCode) {
    params.set('departement', departmentCode);
  }

  // Ciblage NAF si un secteur précis est choisi
  if (sectorId !== 'all' && sector.nafPrefixes?.length > 0) {
    // Filtrage sur les sections / divisions actives
    const sectionMap = {
      agroalimentaire: 'C',
      froid_logistique: 'H',
      industrie: 'C',
      agricole: 'A',
      commerce_tertiaire: 'G',
      collectivites: 'O'
    };
    if (sectionMap[sectorId]) {
      params.set('section_activite_principale', sectionMap[sectorId]);
    }
  }

  // Privilégier les entreprises avec effectifs (>= 10 salariés si département, élargi si commune)
  if (geoMode === 'department') {
    params.set('tranche_effectif_salarie', '11,12,21,22,31,32,41,42,51,52,53');
  }

  let rawResults = [];
  let source = 'api_recherche_entreprises';

  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json?.results) ? json.results : [];
      rawResults = list.map((ent, idx) => {
        const siege = ent.siege || {};
        const naf = ent.activite_principale || siege.activite_principale || '';
        const matchedSector = inferSectorFromNaf(naf, sectorId);
        const mult = getHeadcountMultiplier(ent.tranche_effectif_salarie);
        // Légère variation déterministe basée sur le SIREN pour refléter la dispersion réelle
        const sirenNum = parseInt(String(ent.siren || '12345').slice(-3), 10) || (idx * 37);
        const variance = 0.82 + ((sirenNum % 35) / 100);

        const annualKwh = Math.round(matchedSector.baseAnnualKwh * mult * variance);
        const peakKw = Math.round(annualKwh / (matchedSector.loadFactorHours || 2500));
        const hasPv = ((sirenNum % 100) / 100) < matchedSector.pvProbability;

        return evaluateSiteBatteryRecommendation({
          id: ent.siren || `ent_${idx}`,
          siren: ent.siren || '',
          siret: siege.siret || '',
          name: ent.nom_complet || ent.nom_raison_sociale || 'Entreprise',
          naf,
          sectorId: matchedSector.id,
          sectorLabel: matchedSector.label,
          address: siege.adresse || siege.libelle_voie || '',
          codePostal: siege.code_postal || cityInfo?.codePostal || '',
          commune: (siege.libelle_commune || cityInfo?.nom || '').toUpperCase(),
          departement: siege.departement || departmentCode || '',
          lat: siege.latitude ? Number(siege.latitude) : null,
          lng: siege.longitude ? Number(siege.longitude) : null,
          annualKwh,
          peakKw,
          hasPv,
          defaultUseCase: matchedSector.defaultUseCase,
          source: 'API Entreprises (data.gouv.fr)'
        });
      });
    }
  } catch (err) {
    console.warn('[bessGrosConsoProspectionService] Erreur API Recherche Entreprises:', err);
  }

  // Fallback de simulation locale si l'API renvoie 0 résultat ou est indisponible
  if (rawResults.length === 0) {
    source = 'simulation_locale';
    const cityUpper = (cityInfo?.nom || `SECTEUR ${departmentCode}`).toUpperCase();
    const cp = cityInfo?.codePostal || `${departmentCode}000`;
    const templates = [
      { name: `SAS AGRO-ALIMENTAIRE DE ${cityUpper}`, sec: 'agroalimentaire', mult: 1.35, hasPv: true },
      { name: `ENTREPÔT FRIGORIFIQUE ${cityUpper} LOGISTIQUE`, sec: 'froid_logistique', mult: 1.6, hasPv: true },
      { name: `SCEA / EARL AGRICOLE DU VAL (${cityUpper})`, sec: 'agricole', mult: 1.0, hasPv: true },
      { name: `SCIERIE & INDUSTRIE DU BOIS ${departmentCode}`, sec: 'industrie', mult: 1.9, hasPv: false },
      { name: `SUPERMARCHÉ & GALERIE ${cityUpper}`, sec: 'commerce_tertiaire', mult: 1.15, hasPv: true },
    ];

    rawResults = templates.map((tpl, idx) => {
      const secObj = GROS_CONSO_SECTORS.find((s) => s.id === tpl.sec) || sector;
      const annualKwh = Math.round(secObj.baseAnnualKwh * tpl.mult);
      const peakKw = Math.round(annualKwh / secObj.loadFactorHours);
      return evaluateSiteBatteryRecommendation({
        id: `sim_${departmentCode}_${idx}`,
        siren: '',
        siret: '',
        name: tpl.name,
        naf: secObj.nafPrefixes[0] || '',
        sectorId: secObj.id,
        sectorLabel: secObj.label,
        address: `Zone Industrielle / Artisanale`,
        codePostal: cp,
        commune: cityUpper,
        departement: departmentCode || cityInfo?.departement || '',
        annualKwh,
        peakKw,
        hasPv: tpl.hasPv,
        defaultUseCase: secObj.defaultUseCase,
        source: 'Estimation sectorielle NELSON'
      });
    });
  }

  // Application des filtres utilisateur (seuil kWh/an, seuil pointe kW, filtre PV)
  const filtered = rawResults.filter((item) => {
    if (minAnnualKwh > 0 && item.annualKwh < minAnnualKwh) return false;
    if (minPeakKw > 0 && item.peakKw < minPeakKw) return false;
    if (pvOnly && !item.hasPv) return false;
    if (sectorId !== 'all' && item.sectorId !== sectorId && source === 'simulation_locale') return false;
    return true;
  });

  // Si les filtres étaient trop restrictifs sur une petite commune, renvoyer au moins les résultats triés avec un flag
  const finalResults = (filtered.length > 0 ? filtered : rawResults)
    .sort((a, b) => b.annualKwh - a.annualKwh);

  return {
    results: finalResults,
    source,
    totalFound: finalResults.length,
    filtersRelaxed: filtered.length === 0 && rawResults.length > 0
  };
}

/**
 * Exporte la liste des prospects dimensionnés au format CSV (compatible Excel)
 */
export function exportProspectionCsv(sites = [], label = 'prospection_bess') {
  const headers = [
    'Entreprise / Site',
    'SIREN',
    'Adresse',
    'Code Postal',
    'Commune',
    'Secteur',
    'Conso Annuelle (kWh/an)',
    'Conso Jour Moy (kWh/j)',
    'Pointe (kW)',
    'PV Présent',
    'Cas d usage',
    'Batterie Recommandée',
    'Quantité',
    'Puissance Totale (kW)',
    'Capacité Totale (kWh)',
    'CAPEX Indicatif HT (€)',
    'Économies Estimées (€/an)',
    'TRI Indicatif (ans)'
  ];

  const rows = sites.map((s) => {
    const rec = s.recommendation || {};
    const m = rec.primaryModel || {};
    return [
      s.name || '',
      s.siren || '',
      s.address || '',
      s.codePostal || '',
      s.commune || '',
      s.sectorLabel || '',
      s.annualKwh || 0,
      s.dailyKwh || 0,
      s.peakKw || 0,
      s.hasPv ? 'Oui' : 'Non',
      s.useCase || '',
      m.name || m.reference || '',
      rec.quantity || 1,
      rec.totalPowerKw || 0,
      rec.totalCapacityKwh || 0,
      rec.capexHT || 0,
      rec.estimatedAnnualSavings || 0,
      rec.paybackYears || 0
    ]
      .map((val) => `"${String(val).replace(/"/g, '""')}"`)
      .join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Prospection_BESS_Gros_Conso_${label.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Exporte un récapitulatif PDF commercial de prospection BESS Gros Consommateurs
 */
export function exportProspectionPdf(sites = [], zoneLabel = 'France') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NELSON — PROSPECTION & DIMENSIONNEMENT BESS « GROS CONSOMMATEURS »', 12, 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Zone ciblée : ${zoneLabel}  •  ${sites.length} site(s) analysé(s)  •  Généré le ${new Date().toLocaleDateString('fr-FR')}`, 12, 18);

  const body = sites.map((s) => {
    const rec = s.recommendation || {};
    const m = rec.primaryModel || {};
    return [
      s.name || '—',
      `${s.codePostal || ''} ${s.commune || ''}`.trim(),
      `${(s.annualKwh || 0).toLocaleString('fr-FR')} kWh\n(${s.peakKw || 0} kW)`,
      s.hasPv ? 'Oui (PV)' : 'Non',
      `${rec.quantity || 1}× ${m.reference || m.name || '—'}\n(${rec.totalPowerKw || 0} kW / ${rec.totalCapacityKwh || 0} kWh)`,
      `${(rec.capexHT || 0).toLocaleString('fr-FR')} €`,
      `${(rec.estimatedAnnualSavings || 0).toLocaleString('fr-FR')} €/an\n(${rec.paybackYears || 0} ans)`
    ];
  });

  doc.autoTable({
    startY: 30,
    head: [['Entreprise / Site', 'Localisation', 'Conso / Pointe', 'PV', 'Batterie Recommandée', 'CAPEX HT', 'Gain / Retour']],
    body,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(`Prospection_BESS_${zoneLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
