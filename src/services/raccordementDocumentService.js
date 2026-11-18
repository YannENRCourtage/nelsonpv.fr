import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import fileSaver from 'file-saver';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64';
import { findBessOdreData } from '@/data/bessOdreMatrix';

const saveAs = fileSaver.saveAs || fileSaver;

// ═════════════════════════════════════════════════════════════════════════════
// 1. CONSTANTES OFFICIELLES ENR COURTAGE & RÉFÉRENTIEL ENEDIS 056E / ORA-MP
// ═════════════════════════════════════════════════════════════════════════════

export const ENR_COURTAGE_INFO = {
  type: 'Société',
  raisonSociale: 'ENR COURTAGE',
  formeJuridique: 'SASU (SAS au capital de 5 000 €)',
  siren: '881 890 982',
  siret: '881 890 982 00047',
  adresse: '7 Rue Gutenberg',
  codePostal: '33700',
  ville: 'Mérignac',
  pays: 'France',
  cpVillePays: '33700 Mérignac - France',
  interlocuteurNom: 'BARBERIS',
  interlocuteurPrenom: 'Yann',
  interlocuteurNomPrenom: 'BARBERIS Yann',
  fonction: 'Président',
  telephone: '07 63 87 71 40',
  email: 'y.barberis@enr-courtage.fr',
  emailSecondaire: 'contact@enr-courtage.fr',
};

export const MANDATAIRE_INFO = {
  raisonSociale: 'ENR COURTAGE',
  plateforme: 'NELSON (nelsonpv.fr)',
  capital: '5 000 €',
  siret: '881 890 982 00047',
  siren: '881 890 982',
  rcs: 'R.C.S. BORDEAUX 881 890 982',
  adresse: '7 Rue Gutenberg, 33700 Mérignac - France',
  agenceSudOuest: 'Mérignac (33700)',
  emailRaccordement: 'y.barberis@enr-courtage.fr',
  siteWeb: 'https://nelsonpv.fr',
  telephone: '07 63 87 71 40',
  qualifications: 'Producteur & Mandataire Raccordement Électrique Enedis HTA/BT',
};

// Texte réglementaire exact pour l'encadré « INFORMATIONS COMPLÉMENTAIRES » (Page 9/41 du 056E)
export const DEFAULT_INFO_COMPLEMENTAIRES_056E =
  'Projet BESS standalone 500 kW. Nous sollicitons en priorité l’étude d’une offre de raccordement alternative à modulation de puissance pour stockage, avec un gabarit d’injection interdisant l’injection pendant les heures de congestion photovoltaïque. Voir note annexée “Demande ORA-MP prioritaire”. Si le réseau ne nécessite pas ces restrictions, nous acceptons l’étude d’une solution sans restriction.';

// Corps par défaut de la Note Complémentaire ORA-MP
export const DEFAULT_NOTE_ORAMP_CORPS = `Notre projet consiste en une installation de stockage d’électricité autonome (BESS standalone), composée de quatre unités de 125 kW, soit 500 kW au total en injection et en soutirage, sans nouvelle production photovoltaïque associée.

Nous souhaitons que l’étude de raccordement examine en priorité une offre de raccordement alternative à modulation de puissance (ORA-MP) adaptée au stockage, avec un gabarit d’injection tenant compte des contraintes locales de production photovoltaïque, en application de l’article 11 de la procédure Enedis-NMO-RES_030E et de la variante 2A (article 3.7 – Gabarit en injection) figurant dans le modèle de Proposition Technique et Financière Enedis-MOP-RES_046E (pages 20 à 21/29, prévoyant par exemple une interdiction d'injecter de mars à octobre sur la plage horaire de congestion solaire type 10h–18h, à contractualiser selon le poste source).

Nous sollicitons l’examen de cette solution dès l’instruction initiale du dossier, afin de ne pas écarter le projet ou lui imposer des travaux de renforcement disproportionnés sur le seul constat d’une saturation du poste source en injection photovoltaïque.

Si aucune restriction n’est nécessaire sur le départ HTA ou le poste source concerné, nous souhaitons conserver la possibilité d’un raccordement de référence sans limitation horaire.`;

export const SCHEMAS_COMPTAGE_056E = [
  { id: 'S1', label: 'Schéma S1 — Production / Stockage HTA sans auxiliaires dissociés (Comptage 4 quadrants HTA)' },
  { id: 'S2', label: 'Schéma S2 — Production HTA avec comptage côté BT (transformateur dédié)' },
  { id: 'S3', label: 'Schéma S3 — Production avec auxiliaires sur PDL distinct' },
  { id: 'S4', label: 'Schéma S4 — Autoconsommation / Stockage avec injection du surplus' },
  { id: 'S5', label: 'Schéma S5 — Multi-générateurs HTA avec décompte subordonné' },
  { id: 'S6', label: 'Schéma S6 — Stockage couplé avec installation de production existante' },
  { id: 'S7', label: 'Schéma S7 — Stockage stationnaire autonome bidirectionnel (CARD-IS HTA)' },
  { id: 'S8', label: 'Schéma S8 — Installation hybride PV + Stockage avec comptage dissocié' },
  { id: 'S9', label: 'Schéma S9 — Configuration spécifique multi-points' },
  { id: 'Autre', label: 'Autre schéma de comptage (à préciser)' },
];

export const ENEDIS_056E_CHECKLIST_PIECES = [
  {
    id: 'plan_situation',
    label: 'Plan de situation (1:25000)',
    desc: 'Extrait cartographique IGN / Cadastre situant le terrain à l’échelle 1/25 000',
    required: true,
  },
  {
    id: 'plan_masse',
    label: 'Plan de masse (1:200/1:500) avec point de livraison',
    desc: 'Implantation cotée des 4 armoires BESS et localisation du PDL accessible depuis le domaine public',
    required: true,
  },
  {
    id: 'schema_unifilaire',
    label: 'Schéma unifilaire',
    desc: 'Schéma électrique HTA/BT : 4 × 125 kW, protections, transformateur élévateur 20 kV, comptage et découplage',
    required: true,
  },
  {
    id: 'recepisse_dp',
    label: 'Récépissé / Certificat de non-opposition DP',
    desc: 'Autorisation d’urbanisme délivrée par la mairie (ou certificat de non-opposition tacite)',
    required: true,
  },
  {
    id: 'certificats_50549',
    label: 'Certificats de conformité NF EN 50549-1/2',
    desc: 'Certificats de conformité réseau des convertisseurs (PCS) et protection de découplage',
    required: true,
  },
];

// Constantes historiques conservées pour rétro-compatibilité
export const INSTALLATION_TYPES = [
  { id: 'pv_toiture', label: 'Photovoltaïque — Toiture Bâtiment', isPv: true, isBess: false },
  { id: 'ombriere_vl', label: 'Ombrières de parking Véhicules Légers (VL)', isPv: true, isBess: false },
  { id: 'ombriere_pl', label: 'Ombrières de parking Poids Lourds (PL)', isPv: true, isBess: false },
  { id: 'pv_sol', label: 'Centrale Solaire au Sol', isPv: true, isBess: false },
  { id: 'bess_standalone', label: 'Stockage Stationnaire par Batterie (BESS Stand-Alone)', isPv: false, isBess: true },
  { id: 'bess_standalone_hta', label: 'Stockage Stand-Alone HTA — 4× CESC Mercury 261 (500 kW / 1044 kWh)', isPv: false, isBess: true },
  { id: 'hybride_pv_bess', label: 'Centrale Hybride (Solaire PV + Batterie BESS)', isPv: true, isBess: true },
];

export const INJECTION_TYPES = [
  { id: 'injection_totale', label: 'Injection totale de la production' },
  { id: 'surplus', label: 'Autoconsommation avec injection du surplus' },
  { id: 'card_i', label: 'CARD-I (Contrat d\'Accès au Réseau en Injection pure - HTA)' },
  { id: 'card_is', label: 'CARD-IS (Contrat d\'Accès en Injection et Soutirage - BESS HTA)' },
];

export const VOLTAGE_LEVELS = [
  { id: 'BT', label: 'BT (Basse Tension ≤ 250 kVA / 400 V Triphasé)', maxKva: 250 },
  { id: 'HTA', label: 'HTA (Haute Tension A > 250 kVA jusqu\'à 12 MW / 20 kV)', maxKva: 12000 },
  { id: 'HTB', label: 'HTB (Haute Tension B > 10 MW / Réseau RTE)', maxKva: 100000 },
];

export const ENEDIS_CHECKLIST_DOCS = ENEDIS_056E_CHECKLIST_PIECES;

// ═════════════════════════════════════════════════════════════════════════════
// 2. OUTILS DE FORMATAGE, SANITIZATION PDF & EXTRACTION PROJET
// ═════════════════════════════════════════════════════════════════════════════

export function formatDateFr(dateInput) {
  if (!dateInput) return new Date().toLocaleDateString('fr-FR');
  try {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(dateInput).trim())) {
      return String(dateInput).trim();
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return String(dateInput);
  }
}

export function formatEuro(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '— €';
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
}

/**
 * Normalise une chaîne pour l'encodage WinAnsi de jsPDF (évite les glyphes manquants sur apostrophes courbes, tirets longs, ≥, espaces insécables)
 */
export function sanitizePdfText(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u202F]/g, ' ');
}

export function calculatePtfCountdown(dateReception) {
  if (!dateReception) {
    return { deadlineDate: null, formattedDeadline: 'Non renseignée', daysRemaining: null, status: 'none' };
  }
  const start = new Date(dateReception);
  if (isNaN(start.getTime())) {
    return { deadlineDate: null, formattedDeadline: 'Date invalide', daysRemaining: null, status: 'none' };
  }
  const deadline = new Date(start);
  deadline.setMonth(deadline.getMonth() + 3);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  let status = 'valid';
  if (daysRemaining < 0) status = 'expired';
  else if (daysRemaining <= 15) status = 'critical';
  else if (daysRemaining <= 30) status = 'warning';
  return {
    deadlineDate: deadline,
    formattedDeadline: formatDateFr(deadline),
    daysRemaining,
    status,
  };
}

/**
 * Extrait et normalise toutes les variables du projet actif pour le pré-remplissage Enedis 056E & Note ORA-MP
 */
export function extractProjectEnedisVariables(project, cadastreOverride = null) {
  const p = project || {};
  const odreSite = findBessOdreData(
    p.name || p.projectName || p.client || p.clientName || p.id || '',
    p.city || p.commune || '',
    p.address || p.adresse || p.clientAddress || '',
    p.lat || p.latitude,
    p.lng || p.longitude
  );

  const commune = (
    cadastreOverride?.nom_commune ||
    p.commune ||
    p.city ||
    p.terrain_city ||
    p.cadastre_commune ||
    odreSite?.commune ||
    ''
  ).trim();

  const codePostal = String(
    cadastreOverride?.code_postal ||
    p.codePostal ||
    p.zip ||
    p.zipCode ||
    p.code_postal ||
    p.terrain_zip ||
    odreSite?.codePostal ||
    ''
  ).trim();

  const codeInsee = String(
    p.codeInsee ||
    p.code_insee ||
    p.insee ||
    p.cadastre_code_insee ||
    p.dp_mairie_info?.codeInsee ||
    (cadastreOverride?.code_departement && cadastreOverride?.code_commune
      ? `${cadastreOverride.code_departement}${cadastreOverride.code_commune}`
      : '') ||
    ''
  ).trim();

  const adresse = (
    p.adresse ||
    p.address ||
    p.terrain_address ||
    p.clientAddress ||
    odreSite?.address ||
    (commune ? `Lieu-dit / Rue — ${commune}` : '')
  ).trim();

  // Parcelle cadastrale
  const rawParcelles = Array.isArray(p.parcelles) && p.parcelles.length > 0
    ? p.parcelles
    : Array.isArray(p.cadastre_parcelles) && p.cadastre_parcelles.length > 0
      ? p.cadastre_parcelles
      : [];

  const rawSection = (
    cadastreOverride?.section ||
    odreSite?.section ||
    p.cadastre_section ||
    p.cadastreSection ||
    p.dp_config?.terrain?.section ||
    rawParcelles[0]?.section ||
    (p.cadastre ? String(p.cadastre).split(' ')[0] : '') ||
    p.section ||
    ''
  ).toString().replace(/^Sec\.?\s*/i, '').trim();

  const rawNumero = (
    cadastreOverride?.numero ||
    odreSite?.numero ||
    p.cadastre_numero ||
    p.cadastreNumero ||
    p.dp_config?.terrain?.parcelle ||
    rawParcelles[0]?.numero ||
    p.parcelle ||
    p.parcel ||
    (p.cadastre ? String(p.cadastre).split(' ').slice(1).join(' ') : '') ||
    ''
  ).toString().replace(/^n°?\s*/i, '').trim();

  let parcelle = '';
  if (rawSection && rawNumero) {
    parcelle = `Section ${rawSection} n° ${rawNumero}`;
  } else if (p.parcelle || p.cadastre || p.cadastralReference) {
    parcelle = String(p.parcelle || p.cadastre || p.cadastralReference).trim();
  } else if (rawSection || rawNumero) {
    parcelle = `${rawSection} ${rawNumero}`.trim();
  } else {
    parcelle = 'À préciser';
  }

  // Coordonnées GPS WGS84 Décimal
  let rawLat =
    p.bessLatitude ??
    p.bess_lat ??
    p.implantation?.lat ??
    p.latitude ??
    p.lat ??
    (p.gps ? String(p.gps).split(',')[0]?.trim() : null) ??
    odreSite?.bessLatitude ??
    odreSite?.latitude ??
    '';

  let rawLng =
    p.bessLongitude ??
    p.bess_lng ??
    p.implantation?.lng ??
    p.longitude ??
    p.lng ??
    (p.gps ? String(p.gps).split(',')[1]?.trim() : null) ??
    odreSite?.bessLongitude ??
    odreSite?.longitude ??
    '';

  const latNum = parseFloat(rawLat);
  const lngNum = parseFloat(rawLng);
  const latitude = !isNaN(latNum) ? latNum.toFixed(6) : String(rawLat || '');
  const longitude = !isNaN(lngNum) ? lngNum.toFixed(6) : String(rawLng || '');

  // Nom de l'installation : {{projet.nom}} (ex: BESS Standalone - {{projet.commune}})
  const clientClean = (p.name || p.lastName || p.clientName || odreSite?.siteName || '').trim();
  let nomInstallation = '';
  if (p.nomInstallation) {
    nomInstallation = p.nomInstallation;
  } else if (commune) {
    nomInstallation = clientClean && !commune.toLowerCase().includes(clientClean.toLowerCase())
      ? `BESS Standalone - ${commune} (${clientClean})`
      : `BESS Standalone - ${commune}`;
  } else if (clientClean) {
    nomInstallation = `BESS Standalone - ${clientClean}`;
  } else {
    nomInstallation = 'BESS Standalone - 500 kW';
  }

  const siretSite = (p.siret || ENR_COURTAGE_INFO.siret).trim();
  const posteSource = odreSite?.posteSourceEnedis || p.substation?.name || '';
  const todayStr = new Date().toLocaleDateString('fr-FR');

  // Infos client/SPV du projet (pour le switch "Client/SPV Producteur + ENR COURTAGE Mandataire")
  const spvRaisonSociale = (p.company || p.societe || p.spvName || `${p.name || ''} ${p.firstName || ''}`).trim() || 'SPV / Client Producteur';
  const spvSiret = (p.siret && p.siret !== ENR_COURTAGE_INFO.siret) ? p.siret : '';
  const spvSiren = spvSiret ? spvSiret.replace(/\s+/g, '').slice(0, 9) : '';

  return {
    nom: nomInstallation,
    commune: commune || 'Commune',
    codePostal: codePostal || '',
    codeInsee: codeInsee || '',
    adresse: adresse || '',
    siret: siretSite,
    parcelle,
    latitude,
    longitude,
    posteSource,
    todayStr,
    spvRaisonSociale,
    spvSiret,
    spvSiren,
    clientNom: p.name || p.lastName || 'BARBERIS',
    clientPrenom: p.firstName || 'Yann',
    clientTel: p.phone || p.telephone || ENR_COURTAGE_INFO.telephone,
    clientEmail: p.email || ENR_COURTAGE_INFO.email,
  };
}

/**
 * Construit la ligne "Site :" de la Note Complémentaire ORA-MP à partir des données du formulaire
 */
export function buildNoteOraMpSiteLine(data) {
  const nom = data?.siteNomInstallation || 'BESS Standalone';
  const commune = data?.siteCommune || 'Commune';
  const cp = data?.siteCodePostal || '';
  const parcelle = data?.siteParcelle || 'À préciser';
  const lat = data?.siteLatitude || '—';
  const lng = data?.siteLongitude || '—';
  return `${nom} — Commune : ${commune}${cp ? ` (${cp})` : ''} — Référence parcelle : ${parcelle} (Coordonnées GPS : ${lat}, ${lng})`;
}

/**
 * Génère un cachet officiel ENR COURTAGE + signature vectorielle sous forme d'image PNG Base64
 */
let cachedDefaultStampDataUrl = null;
export function generateDefaultEnrCourtageStampDataUrl() {
  if (cachedDefaultStampDataUrl) return cachedDefaultStampDataUrl;
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 210;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rotation légère effet tampon authentique (-2.2 degrés)
    ctx.save();
    ctx.translate(260, 105);
    ctx.rotate(-0.035);
    ctx.translate(-260, -105);

    const stampBlue = '#153e75';
    ctx.strokeStyle = stampBlue;
    ctx.fillStyle = stampBlue;

    // Cadre externe double du cachet commercial
    ctx.lineWidth = 3.5;
    ctx.strokeRect(18, 18, 340, 132);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(24, 24, 328, 120);

    // Texte du cachet commercial ENR COURTAGE
    ctx.textAlign = 'center';
    ctx.font = '900 22px Arial, Helvetica, sans-serif';
    ctx.fillText('ENR COURTAGE', 188, 52);

    ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
    ctx.fillText('SAS au capital de 5 000 € — Ingénierie & Stockage ENR', 188, 72);

    ctx.font = '600 12.5px Arial, Helvetica, sans-serif';
    ctx.fillText('7 Rue Gutenberg — 33700 MÉRIGNAC', 188, 92);

    ctx.font = 'bold 12px "Courier New", Courier, monospace';
    ctx.fillText('SIREN : 881 890 982 | SIRET : 881 890 982 00047', 188, 112);

    ctx.font = '600 11px Arial, Helvetica, sans-serif';
    ctx.fillText('Tél : 07 63 87 71 40 • y.barberis@enr-courtage.fr', 188, 131);

    ctx.restore();

    // Signature manuscrite vectorielle élégante par-dessus le cachet
    ctx.save();
    ctx.strokeStyle = '#0a2558';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Initiale Y fluide
    ctx.moveTo(235, 118);
    ctx.bezierCurveTo(245, 92, 260, 88, 258, 122);
    ctx.bezierCurveTo(256, 152, 232, 178, 218, 165);
    ctx.bezierCurveTo(210, 156, 250, 130, 278, 124);
    // Corps "Barberis" cursif
    ctx.bezierCurveTo(295, 100, 312, 95, 308, 128);
    ctx.bezierCurveTo(306, 142, 322, 116, 332, 126);
    ctx.bezierCurveTo(342, 134, 352, 114, 364, 125);
    ctx.bezierCurveTo(376, 134, 390, 112, 405, 124);
    ctx.bezierCurveTo(420, 132, 438, 115, 468, 110);
    // Paraphe final souligné
    ctx.bezierCurveTo(485, 108, 495, 122, 450, 136);
    ctx.bezierCurveTo(390, 152, 310, 164, 265, 172);
    ctx.stroke();

    ctx.restore();

    cachedDefaultStampDataUrl = canvas.toDataURL('image/png');
    return cachedDefaultStampDataUrl;
  } catch (e) {
    console.warn('Impossible de générer le cachet par défaut:', e);
    return null;
  }
}

/**
 * Initialise ou restaure l'état complet `enedisData` (Fiches A, C, E4/T1 & Note ORA-MP) d'un projet
 */
export function getInitialEnedis056EData(project, cadastreOverride = null) {
  const p = project || {};
  const vars = extractProjectEnedisVariables(p, cadastreOverride);

  // Vérifier s'il existe déjà des données sauvegardées sur le projet ou dans localStorage
  let saved = p.enedisData || null;
  if (!saved && p.id && typeof window !== 'undefined') {
    try {
      const localRaw = localStorage.getItem(`nelson_enedis_data_${p.id}`);
      if (localRaw) {
        saved = JSON.parse(localRaw);
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage nelson_enedis_data:', e);
    }
  }
  const s = saved || {};

  const defaultSiteNom = s.siteNomInstallation || vars.nom;
  const defaultSiteCommune = s.siteCommune || vars.commune;
  const defaultSiteCp = s.siteCodePostal || vars.codePostal;
  const defaultSiteParcelle = s.siteParcelle || vars.parcelle;
  const defaultSiteLat = s.siteLatitude || vars.latitude;
  const defaultSiteLng = s.siteLongitude || vars.longitude;

  const initialObj = {
    // ── ONGLET 1 : FICHE A – DONNÉES GÉNÉRALES & LOCALISATION (Enedis-MOP-RES_056E) ──
    modeRepresentation: s.modeRepresentation || 'enr_producteur', // 'enr_producteur' | 'client_producteur_enr_mandataire'

    // Bénéficiaire du raccordement (Producteur)
    beneficiaireType: s.beneficiaireType || ENR_COURTAGE_INFO.type, // 'Société' | 'Particulier' | 'Collectivité'
    beneficiaireRaisonSociale: s.beneficiaireRaisonSociale || ENR_COURTAGE_INFO.raisonSociale,
    beneficiaireFormeJuridique: s.beneficiaireFormeJuridique || ENR_COURTAGE_INFO.formeJuridique,
    beneficiaireSiren: s.beneficiaireSiren || ENR_COURTAGE_INFO.siren,
    beneficiaireSiret: s.beneficiaireSiret || ENR_COURTAGE_INFO.siret,
    beneficiaireAdresse: s.beneficiaireAdresse || ENR_COURTAGE_INFO.adresse,
    beneficiaireCodePostal: s.beneficiaireCodePostal || ENR_COURTAGE_INFO.codePostal,
    beneficiaireVille: s.beneficiaireVille || ENR_COURTAGE_INFO.ville,
    beneficiairePays: s.beneficiairePays || ENR_COURTAGE_INFO.pays,
    beneficiaireCpVillePays: s.beneficiaireCpVillePays || ENR_COURTAGE_INFO.cpVillePays,
    interlocuteurNom: s.interlocuteurNom || ENR_COURTAGE_INFO.interlocuteurNom,
    interlocuteurPrenom: s.interlocuteurPrenom || ENR_COURTAGE_INFO.interlocuteurPrenom,
    interlocuteurNomPrenom: s.interlocuteurNomPrenom || ENR_COURTAGE_INFO.interlocuteurNomPrenom,
    interlocuteurFonction: s.interlocuteurFonction || ENR_COURTAGE_INFO.fonction,
    interlocuteurTelephone: s.interlocuteurTelephone || ENR_COURTAGE_INFO.telephone,
    interlocuteurEmail: s.interlocuteurEmail || ENR_COURTAGE_INFO.email,

    // Mandataire (toujours pré-rempli avec ENR COURTAGE, éditable)
    mandataireRaisonSociale: s.mandataireRaisonSociale || ENR_COURTAGE_INFO.raisonSociale,
    mandataireFormeJuridique: s.mandataireFormeJuridique || ENR_COURTAGE_INFO.formeJuridique,
    mandataireSiren: s.mandataireSiren || ENR_COURTAGE_INFO.siren,
    mandataireSiret: s.mandataireSiret || ENR_COURTAGE_INFO.siret,
    mandataireAdresse: s.mandataireAdresse || ENR_COURTAGE_INFO.adresse,
    mandataireCpVillePays: s.mandataireCpVillePays || ENR_COURTAGE_INFO.cpVillePays,
    mandataireInterlocuteur: s.mandataireInterlocuteur || ENR_COURTAGE_INFO.interlocuteurNomPrenom,
    mandataireFonction: s.mandataireFonction || ENR_COURTAGE_INFO.fonction,
    mandataireTelephone: s.mandataireTelephone || ENR_COURTAGE_INFO.telephone,
    mandataireEmail: s.mandataireEmail || ENR_COURTAGE_INFO.email,

    // Localisation du Site (dynamique selon le projet ouvert)
    siteNomInstallation: defaultSiteNom,
    siteSiret: s.siteSiret || vars.siret,
    siteAdresse: s.siteAdresse || vars.adresse,
    siteCodePostal: defaultSiteCp,
    siteCommune: defaultSiteCommune,
    siteCodeInsee: s.siteCodeInsee || vars.codeInsee,
    siteParcelle: defaultSiteParcelle,
    siteLatitude: defaultSiteLat,
    siteLongitude: defaultSiteLng,
    sitePosteSource: s.sitePosteSource || vars.posteSource,

    // Raccordement actuel au réseau
    siteDejaRaccordeRpd: s.siteDejaRaccordeRpd || 'non', // 'non' | 'oui'
    sitePrmExistant: s.sitePrmExistant || p.prm || '',
    souhaitDemandeur: s.souhaitDemandeur || 'cas_1', // 'cas_1' | 'cas_2' | 'cas_3'

    // Valorisation & Comptage
    modaliteValorisation: s.modaliteValorisation || 'Totalité de la production (nette d\'auxiliaires)',
    schemaComptage: s.schemaComptage || 'S1',
    schemaComptageAutre: s.schemaComptageAutre || '',
    attestationAbsenceAutreProjetInsee: s.attestationAbsenceAutreProjetInsee || 'oui', // 'oui' | 'non' (Art. L.336-4)
    projetsGroupesInjection: s.projetsGroupesInjection || 'non', // 'non' | 'oui'

    // Encadré « INFORMATIONS COMPLÉMENTAIRES » (Page 9/41 du 056E)
    informationsComplementaires: s.informationsComplementaires ?? DEFAULT_INFO_COMPLEMENTAIRES_056E,

    // Type de demande
    typeDemande: s.typeDemande || 'offre_raccordement_travaux_enedis', // 'offre_raccordement_travaux_enedis' | 'proposition_avant_completude'

    // ── ONGLET 2 : FICHE C – RACCORDEMENT HTA & OPTIONS DE MODULATION (p. 15-17) ──
    configPosteLivraison: s.configPosteLivraison || 'reference_domaine_public', // 'reference_domaine_public' | 'autre_configuration'
    distanceDomainePublicM: s.distanceDomainePublicM ?? '0',
    puissanceRaccInjectionKw: s.puissanceRaccInjectionKw ?? '500',
    puissanceRaccSoutirageKw: s.puissanceRaccSoutirageKw ?? '500',
    puissanceReactiveConforme: s.puissanceReactiveConforme || 'oui', // 'oui' | 'non' (Arrêté du 9 juin 2020)

    // Options pour recevoir plusieurs solutions de raccordement (Page 16/41)
    devisDivisionParc: s.devisDivisionParc || 'non', // 'oui' | 'non'
    devisPuissanceInjectionFaible: s.devisPuissanceInjectionFaible || 'non', // 'oui' | 'non'
    puissanceInjectionMinKw: s.puissanceInjectionMinKw ?? '350',
    devisOffreModulationPuissance: s.devisOffreModulationPuissance !== undefined ? s.devisOffreModulationPuissance : true, // boolean / checkbox
    puissanceGarantieInjectionKw: s.puissanceGarantieInjectionKw ?? '350',
    capaciteAccueil3DepartsHta: s.capaciteAccueil3DepartsHta || 'oui', // 'oui' | 'non'
    regulationPuissanceActivePf: s.regulationPuissanceActivePf || 'oui', // 'oui' | 'non' (P = f(f))

    // ── ONGLET 3 : FICHES E4 / T1 – CARACTÉRISTIQUES STOCKAGE & BATTERIES ──
    typeInstallationStockage: s.typeInstallationStockage || 'Stockage stationnaire par batteries autonomes (BESS Stand-alone)',
    nombreUnitesTexte: s.nombreUnitesTexte || '4 armoires de 125 kW',
    nombreUnites: s.nombreUnites ?? '4',
    puissanceUnitaireKw: s.puissanceUnitaireKw ?? '125',
    modeleBatterie: s.modeleBatterie || 'CESC Mercury 261 - LFP',
    capaciteUnitaireKwh: s.capaciteUnitaireKwh ?? '261',
    capaciteTotaleKwh: s.capaciteTotaleKwh ?? '1044',
    puissanceActiveTotaleInstalleeKw: s.puissanceActiveTotaleInstalleeKw ?? '500',
    puissanceApparenteMaximaleKva: s.puissanceApparenteMaximaleKva ?? '500',
    modeRaccordement: s.modeRaccordement || 'Triphasé HTA (20 kV) via transformateur élévateur BT/HTA.',
    technologieCellules: s.technologieCellules || 'Lithium-Fer-Phosphate (LiFePO4 / LFP) — Refroidissement liquide IP55',
    onduleursPcsDetail: s.onduleursPcsDetail || '4 × Convertisseurs bidirectionnels (PCS) de 125 kVA / 125 kW (cos φ = 1)',
    protectionDecouplageDetail: s.protectionDecouplageDetail || 'Relais de protection de découplage HTA conforme NF C 13-100 & Enedis-NOI-RES_43E',
    conformiteNormative: s.conformiteNormative || 'NF EN 50549-2 / Arrêté du 9 juin 2020 / NF C 13-100 / NF EN 62619',

    // Fiche T1 : Transformateur élévateur BT / HTA
    transfoPuissanceNominaleKva: s.transfoPuissanceNominaleKva ?? '630',
    transfoTensionPrimaireHta: s.transfoTensionPrimaireHta || '20 kV (HTA Triphasé 50 Hz)',
    transfoTensionSecondaireBt: s.transfoTensionSecondaireBt || '400 V (BT Triphasé)',
    transfoCouplage: s.transfoCouplage || 'Dyn11',
    transfoUccPercent: s.transfoUccPercent ?? '4.0',

    // Certification des données
    signataireNomPrenom: s.signataireNomPrenom || 'Yann BARBERIS',
    signatureLieu: s.signatureLieu || 'Mérignac',
    signatureDate: s.signatureDate || vars.todayStr,

    // ── ONGLET 4 : NOTE COMPLÉMENTAIRE « DEMANDE PRIORITAIRE D'ORA-MP » ──
    noteObjet: s.noteObjet || 'Demande prioritaire d’ORA-MP pour stockage autonome — 500 kW',
    noteSiteLigne: s.noteSiteLigne || buildNoteOraMpSiteLine({
      siteNomInstallation: defaultSiteNom,
      siteCommune: defaultSiteCommune,
      siteCodePostal: defaultSiteCp,
      siteParcelle: defaultSiteParcelle,
      siteLatitude: defaultSiteLat,
      siteLongitude: defaultSiteLng,
    }),
    noteSalutation: s.noteSalutation || 'Madame, Monsieur,',
    noteCorps: s.noteCorps ?? DEFAULT_NOTE_ORAMP_CORPS,
    noteFaitA: s.noteFaitA || 'Mérignac',
    noteDate: s.noteDate || vars.todayStr,
    noteNomQualiteDemandeur: s.noteNomQualiteDemandeur || 'Yann BARBERIS, Président – ENR COURTAGE',
    inclureCachetSignature: s.inclureCachetSignature !== undefined ? s.inclureCachetSignature : true,
    signatureImageBase64: s.signatureImageBase64 || null,

    // ── CHECKLIST DES PIÈCES À JOINDRE SUR LE PORTAIL ENEDIS ──
    checklistPieces: s.checklistPieces || {
      plan_situation: true,
      plan_masse: true,
      schema_unifilaire: true,
      recepisse_dp: true,
      certificats_50549: true,
    },
  };

  return initialObj;
}

export function getInitialRaccordementData(project) {
  return getInitialEnedis056EData(project);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. HELPERS GRAPHIQUES COMMUNS POUR GÉNÉRATION PDF (jsPDF)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Dessine une case à cocher officielle dans un PDF jsPDF
 */
function drawPdfCheckbox(doc, x, y, checked, label, options = {}) {
  const size = options.size || 3.6;
  const fontSize = options.fontSize || 8;
  const boldLabel = options.bold || false;

  doc.setDrawColor(0, 94, 184);
  doc.setLineWidth(0.35);
  if (checked) {
    doc.setFillColor(0, 94, 184);
    doc.roundedRect(x, y - size + 0.6, size, size, 0.5, 0.5, 'FD');
    // Coche blanche
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.55);
    doc.line(x + 0.7, y - size / 2 + 0.6, x + size * 0.42, y - 0.3);
    doc.line(x + size * 0.42, y - 0.3, x + size - 0.6, y - size + 1.3);
  } else {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y - size + 0.6, size, size, 0.5, 0.5, 'FD');
  }

  doc.setTextColor(checked ? 15 : 71, checked ? 23 : 85, checked ? 42 : 105);
  doc.setFont('helvetica', checked || boldLabel ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  doc.text(sanitizePdfText(label), x + size + 2, y);
}

/**
 * Dessine l'en-tête officiel Enedis-MOP-RES_056E (Version 2) sur une page
 */
function drawEnedis056EHeader(doc, ficheCode, ficheTitle, pageRefText) {
  const W = 210;
  const m = 14;

  // Bandeau supérieur Bleu Enedis + Vert Enedis
  doc.setFillColor(0, 94, 184); // Bleu Enedis #005EB8
  doc.rect(0, 0, W, 24, 'F');
  doc.setFillColor(147, 201, 14); // Vert Enedis #93C90E
  doc.rect(0, 24, W, 2.2, 'F');

  // Bloc marque Enedis à gauche
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(m, 4.5, 36, 15, 2, 2, 'F');
  doc.setTextColor(0, 94, 184);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Enedis', m + 4, 12.2);
  doc.setFillColor(147, 201, 14);
  doc.rect(m + 4, 13.5, 28, 1.1, 'F');
  doc.setFontSize(5.3);
  doc.setTextColor(30, 58, 138);
  doc.text("L'ELECTRICITE EN RESEAU", m + 4, 17.2);

  // Titre réglementaire au centre/droite
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('FICHES DE COLLECTE — Enedis-MOP-RES_056E (Version 2)', m + 40, 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(224, 242, 254);
  doc.text(
    sanitizePdfText('Installation de Production hors photovoltaïque ou de Stockage de puissance > 36 kVA raccordée au RPD'),
    m + 40,
    14.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.3);
  doc.setTextColor(190, 242, 100);
  doc.text(sanitizePdfText(pageRefText), m + 40, 19.8);

  // Sous-bandeau de Fiche (Fiche A / Fiche C / Fiche E4 & T1)
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(m, 29, W - 2 * m, 8.5, 1.5, 1.5, 'FD');

  doc.setFillColor(0, 94, 184);
  doc.roundedRect(m, 29, 26, 8.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(sanitizePdfText(ficheCode), m + 13, 34.5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text(sanitizePdfText(ficheTitle), m + 30, 34.5);
}

/**
 * Dessine le pied de page officiel Enedis-MOP-RES_056E (Version 2)
 */
function drawEnedis056EFooter(doc, pageNum, totalPages, siteName) {
  const W = 210;
  const H = 297;
  const m = 14;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(m, H - 13, W - m, H - 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 94, 184);
  doc.text('Enedis-MOP-RES_056E — Version 2', m, H - 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText(`Dossier : ${siteName || 'BESS Standalone 500 kW'} • Demandeur / Mandataire : ENR COURTAGE (SIREN 881 890 982)`),
    W / 2,
    H - 8.5,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Page ${pageNum} / ${totalPages}`, W - m, H - 8.5, { align: 'right' });
}

/**
 * Dessine un cadre de section avec bandeau de titre
 */
function drawSectionFrame(doc, x, y, w, h, title, accentColor = [0, 94, 184]) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, 1.8, 1.8, 'FD');

  doc.setFillColor(...accentColor);
  doc.roundedRect(x, y, w, 6.8, 1.8, 1.8, 'F');
  // Couvrir les coins bas du bandeau
  doc.rect(x, y + 4.5, w, 2.3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text(sanitizePdfText(title), x + 3.5, y + 4.8);
}

/**
 * Dessine une paire Libellé / Valeur dans une grille
 */
function drawFieldRow(doc, x, y, label, value, labelWidth = 46, maxWidth = 120) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(sanitizePdfText(label), x, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  const cleanVal = sanitizePdfText(value || '—');
  const lines = doc.splitTextToSize(cleanVal, maxWidth);
  doc.text(lines[0] || '—', x + labelWidth, y);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. DOCUMENT 1 : GÉNÉRATION DU FORMULAIRE ENEDIS-MOP-RES_056E (VERSION 2) PDF
// ═════════════════════════════════════════════════════════════════════════════

export async function generateEnedis056EPdf(project, enedisDataInput, options = {}) {
  const p = project || {};
  const d = enedisDataInput || getInitialEnedis056EData(p);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const m = 14;
  const usableW = W - 2 * m;
  const totalPages = 4;

  const isEnrProducteur = d.modeRepresentation !== 'client_producteur_enr_mandataire';

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 : FICHE A (1/2) — DONNÉES GÉNÉRALES, PRODUCTEUR, MANDATAIRE & SITE
  // ═══════════════════════════════════════════════════════════════════════════
  drawEnedis056EHeader(
    doc,
    'FICHE A',
    'DONNÉES GÉNÉRALES & LOCALISATION DE L’INSTALLATION (1/2)',
    'Réf. Enedis-MOP-RES_056E — Version 2 — Correspondance Fiche A (Pages 3 à 6/41)'
  );

  let y = 41;

  // ── CADRE A1 : BÉNÉFICIAIRE DU RACCORDEMENT (PRODUCTEUR) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    66,
    'A.1 — BÉNÉFICIAIRE DU RACCORDEMENT (PRODUCTEUR / DEMANDEUR)'
  );

  let cy = y + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Type de Bénéficiaire :', m + 4, cy);

  drawPdfCheckbox(doc, m + 42, cy, d.beneficiaireType === 'Société', 'Société', { bold: true });
  drawPdfCheckbox(doc, m + 75, cy, d.beneficiaireType === 'Particulier', 'Particulier');
  drawPdfCheckbox(doc, m + 112, cy, d.beneficiaireType === 'Collectivité', 'Collectivité / Autre');

  // Badge qualité à droite
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.roundedRect(m + 144, cy - 4, 34, 6, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(29, 78, 216);
  doc.text(isEnrProducteur ? 'PRODUCTEUR : ENR' : 'PRODUCTEUR : SPV', m + 161, cy, { align: 'center' });

  cy += 7.5;
  drawFieldRow(doc, m + 4, cy, 'Nom / Raison sociale :', d.beneficiaireRaisonSociale, 42, 55);
  drawFieldRow(doc, m + 98, cy, 'Forme juridique :', d.beneficiaireFormeJuridique, 32, 50);

  cy += 6.8;
  drawFieldRow(doc, m + 4, cy, 'N° SIREN :', d.beneficiaireSiren, 42, 50);
  drawFieldRow(doc, m + 98, cy, 'N° SIRET :', d.beneficiaireSiret, 32, 50);

  cy += 6.8;
  drawFieldRow(doc, m + 4, cy, 'Adresse du siège social :', d.beneficiaireAdresse, 42, 130);

  cy += 6.8;
  const cpVillePaysStr = d.beneficiaireCpVillePays || `${d.beneficiaireCodePostal || ''} ${d.beneficiaireVille || ''} - ${d.beneficiairePays || 'France'}`;
  drawFieldRow(doc, m + 4, cy, 'Code Postal - Ville - Pays :', cpVillePaysStr, 42, 130);

  // Séparateur interlocuteur
  cy += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(m + 4, cy, m + usableW - 4, cy);

  cy += 6;
  const interlocuteurFull = d.interlocuteurNomPrenom || `${d.interlocuteurNom || ''} ${d.interlocuteurPrenom || ''}`.trim();
  drawFieldRow(doc, m + 4, cy, 'Interlocuteur (Nom, Prénom) :', interlocuteurFull, 44, 52);
  drawFieldRow(doc, m + 98, cy, 'Fonction du représentant :', d.interlocuteurFonction, 38, 44);

  cy += 6.8;
  drawFieldRow(doc, m + 4, cy, 'Téléphone :', d.interlocuteurTelephone, 44, 50);
  drawFieldRow(doc, m + 98, cy, 'E-mail :', d.interlocuteurEmail, 38, 46);

  y += 70;

  // ── CADRE A2 : MANDATAIRE / TIERS HABILITÉ (SI MANDAT OU SUIVI ENR COURTAGE) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    46,
    'A.2 — MANDATAIRE / SOCIÉTÉ EN CHARGE DU DÉPÔT ET DU SUIVI TECHNIQUE',
    [15, 43, 92]
  );

  cy = y + 12;
  drawPdfCheckbox(
    doc,
    m + 4,
    cy,
    isEnrProducteur,
    'ENR COURTAGE agit directement en tant que Producteur / Demandeur',
    { fontSize: 7.5 }
  );
  drawPdfCheckbox(
    doc,
    m + 100,
    cy,
    !isEnrProducteur,
    'Client / SPV Producteur + ENR COURTAGE Mandataire',
    { fontSize: 7.5 }
  );

  cy += 7.5;
  drawFieldRow(doc, m + 4, cy, 'Société / Raison sociale :', d.mandataireRaisonSociale || 'ENR COURTAGE', 42, 52);
  drawFieldRow(doc, m + 98, cy, 'SIREN / SIRET :', `${d.mandataireSiren || '881 890 982'} / ${d.mandataireSiret || '881 890 982 00047'}`, 32, 52);

  cy += 6.8;
  drawFieldRow(doc, m + 4, cy, 'Adresse du siège :', `${d.mandataireAdresse || '7 Rue Gutenberg'}, ${d.mandataireCpVillePays || '33700 Mérignac - France'}`, 42, 132);

  cy += 6.8;
  drawFieldRow(doc, m + 4, cy, 'Représentant & Fonction :', `${d.mandataireInterlocuteur || 'BARBERIS Yann'} (${d.mandataireFonction || 'Président'})`, 42, 52);
  drawFieldRow(doc, m + 98, cy, 'Tél. & E-mail :', `${d.mandataireTelephone || '07 63 87 71 40'} • ${d.mandataireEmail || 'y.barberis@enr-courtage.fr'}`, 32, 52);

  y += 50;

  // ── CADRE A3 : LOCALISATION DU SITE D'IMPLANTATION ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    68,
    'A.3 — LOCALISATION DU SITE DE L’INSTALLATION À RACCORDER (FICHE A)',
    [0, 94, 184]
  );

  cy = y + 12;
  drawFieldRow(doc, m + 4, cy, 'Nom de l’Installation :', d.siteNomInstallation, 44, 130);

  cy += 7.2;
  drawFieldRow(doc, m + 4, cy, 'SIRET du site :', d.siteSiret || '881 890 982 00047', 44, 52);
  drawFieldRow(doc, m + 98, cy, 'Code INSEE Commune :', d.siteCodeInsee || 'À compléter', 38, 44);

  cy += 7.2;
  drawFieldRow(doc, m + 4, cy, 'Adresse de l’installation :', d.siteAdresse, 44, 130);

  cy += 7.2;
  drawFieldRow(doc, m + 4, cy, 'Code Postal - Ville :', `${d.siteCodePostal || ''} ${d.siteCommune || ''}`.trim(), 44, 52);
  drawFieldRow(doc, m + 98, cy, 'Réf. Cadastrale(s) :', d.siteParcelle || 'À préciser', 38, 44);

  cy += 6;
  // Sous-cadre Coordonnées GPS WGS84 Décimal
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(m + 4, cy, usableW - 8, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(3, 105, 161);
  doc.text(
    sanitizePdfText('COORDONNÉES GPS DU POINT DE RACCORDEMENT (Système géodésique WGS84 Décimal) :'),
    m + 8,
    cy + 6.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(`Latitude (WGS84) :  ${d.siteLatitude || '—'}`), m + 8, cy + 15);
  doc.text(sanitizePdfText(`Longitude (WGS84) :  ${d.siteLongitude || '—'}`), m + 96, cy + 15);

  // Encart rappel pièces jointes bas de page 1
  y += 72;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(m, y, usableW, 20, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.3);
  doc.setTextColor(15, 43, 92);
  doc.text('PIÈCES JOINTES OBLIGATOIRES AU DOSSIER ENEDIS-MOP-RES_056E :', m + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(
    sanitizePdfText('1. Note complémentaire « Demande prioritaire d’ORA-MP pour stockage autonome (500 kW) »   •   2. Plan de situation (1:25000)'),
    m + 4,
    y + 11
  );
  doc.text(
    sanitizePdfText('3. Plan de masse (1:200 / 1:500) avec PDL   •   4. Schéma unifilaire HTA/BT   •   5. Récépissé / Non-opposition DP   •   6. Certificats NF EN 50549-1/2'),
    m + 4,
    y + 16
  );

  drawEnedis056EFooter(doc, 1, totalPages, d.siteNomInstallation);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 : FICHE A (2/2) — RACCORDEMENT ACTUEL, VALORISATION, PAGE 9/41 & TYPE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawEnedis056EHeader(
    doc,
    'FICHE A',
    'RACCORDEMENT ACTUEL, VALORISATION & INFORMATIONS COMPLÉMENTAIRES (2/2)',
    'Réf. Enedis-MOP-RES_056E — Version 2 — Correspondance Fiche A (Pages 7 à 10/41)'
  );

  y = 41;

  // ── CADRE A4 : RACCORDEMENT ACTUEL AU RÉSEAU ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    46,
    'A.4 — RACCORDEMENT ACTUEL AU RÉSEAU PUBLIC DE DISTRIBUTION (RPD)'
  );

  cy = y + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Site déjà raccordé au RPD ? :', m + 4, cy);

  const isDejaRacc = d.siteDejaRaccordeRpd === 'oui';
  drawPdfCheckbox(doc, m + 52, cy, !isDejaRacc, 'Non (Nouveau site indépendant)');
  drawPdfCheckbox(doc, m + 108, cy, isDejaRacc, `Oui${d.sitePrmExistant ? ` (PRM/PDL : ${d.sitePrmExistant})` : ''}`);

  cy += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Souhait du Demandeur :', m + 4, cy);

  cy += 6;
  drawPdfCheckbox(
    doc,
    m + 6,
    cy,
    d.souhaitDemandeur === 'cas_1' || !d.souhaitDemandeur,
    'Cas 1 : la création d’un nouveau Point de Raccordement dédié à la présente demande'
  );
  cy += 6;
  drawPdfCheckbox(
    doc,
    m + 6,
    cy,
    d.souhaitDemandeur === 'cas_2',
    'Cas 2 : le raccordement de l’installation sur un Point de Livraison (PDL / PRM) existant'
  );
  cy += 6;
  drawPdfCheckbox(
    doc,
    m + 6,
    cy,
    d.souhaitDemandeur === 'cas_3',
    'Cas 3 : la modification d’une installation de production ou de stockage déjà raccordée'
  );

  y += 50;

  // ── CADRE A5 : VALORISATION & COMPTAGE ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    48,
    'A.5 — VALORISATION, SCHÉMA DE COMPTAGE & ATTESTATION ART. L.336-4'
  );

  cy = y + 12;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Modalité de valorisation :',
    d.modaliteValorisation || "Totalité de la production (nette d'auxiliaires)",
    46,
    126
  );

  cy += 7.5;
  const schemaObj = SCHEMAS_COMPTAGE_056E.find(sc => sc.id === d.schemaComptage);
  const schemaDisplay = d.schemaComptage === 'Autre'
    ? `Autre : ${d.schemaComptageAutre || 'À définir avec Enedis'}`
    : (schemaObj ? schemaObj.label : `Schéma ${d.schemaComptage || 'S1'}`);
  drawFieldRow(doc, m + 4, cy, 'Schéma de comptage :', schemaDisplay, 46, 126);

  cy += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(sanitizePdfText('Attestation d’absence d’autre projet sur le même code INSEE (Art. L.336-4) :'), m + 4, cy);
  const isAbsenceAutre = d.attestationAbsenceAutreProjetInsee !== 'non';
  drawPdfCheckbox(doc, m + 116, cy, isAbsenceAutre, 'Oui (aucun autre projet)');
  drawPdfCheckbox(doc, m + 160, cy, !isAbsenceAutre, 'Non');

  cy += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Projets groupés en injection :', m + 4, cy);
  const isGroupes = d.projetsGroupesInjection === 'oui';
  drawPdfCheckbox(doc, m + 56, cy, !isGroupes, 'Non');
  drawPdfCheckbox(doc, m + 82, cy, isGroupes, 'Oui');

  y += 52;

  // ── CADRE A6 : ENCADRÉ « INFORMATIONS COMPLÉMENTAIRES » (PAGE 9/41 DU 056E) — TRÈS IMPORTANT ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    72,
    'A.6 — ENCADRÉ « INFORMATIONS COMPLÉMENTAIRES » (PAGE 9/41 DU 056E — DEMANDE ORA-MP PRIORITAIRE)',
    [180, 83, 9] // Ambre foncé officiel pour mise en évidence réglementaire
  );

  // Sous-cadre intérieur mis en valeur
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(m + 4, y + 10, usableW - 8, 44, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  const infoText = sanitizePdfText(d.informationsComplementaires || DEFAULT_INFO_COMPLEMENTAIRES_056E);
  const infoLines = doc.splitTextToSize(`« ${infoText} »`, usableW - 16);
  doc.text(infoLines, m + 8, y + 17);

  // Bandeau de références normatives sous l'encadré
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(m + 4, y + 56.5, usableW - 8, 12, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(0, 94, 184);
  doc.text(
    sanitizePdfText('Références réglementaires applicables à l’instruction ORA-MP Stockage :'),
    m + 7,
    y + 61.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    sanitizePdfText('• Procédure Enedis-NMO-RES_030E (Article 11)   • Modèle de PTF Enedis-MOP-RES_046E — Variante 2A (Article 3.7 – Gabarit en injection, p. 20-21/29)'),
    m + 7,
    y + 66.2
  );

  y += 76;

  // ── CADRE A7 : TYPE DE DEMANDE (PAGE 10/41) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    36,
    'A.7 — TYPE DE DEMANDE SOLLICITÉE AUPRÈS D’ENEDIS (PAGE 10/41 DU 056E)'
  );

  cy = y + 13;
  const isOffreComplete = d.typeDemande !== 'proposition_avant_completude';
  drawPdfCheckbox(
    doc,
    m + 6,
    cy,
    isOffreComplete,
    'Offre de Raccordement avec travaux sur les ouvrages dédiés réalisés par Enedis',
    { fontSize: 8.3, bold: true }
  );
  cy += 8;
  drawPdfCheckbox(
    doc,
    m + 6,
    cy,
    !isOffreComplete,
    'Proposition de raccordement avant complétude du dossier',
    { fontSize: 8.3 }
  );

  drawEnedis056EFooter(doc, 2, totalPages, d.siteNomInstallation);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 : FICHE C — CARACTÉRISTIQUES HTA & OPTIONS DE MODULATION (p. 15-17)
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawEnedis056EHeader(
    doc,
    'FICHE C',
    'RACCORDEMENT SUR LE RÉSEAU PUBLIC HTA & OPTIONS DE MODULATION',
    'Réf. Enedis-MOP-RES_056E — Version 2 — Correspondance Fiche C (Pages 15 à 17/41)'
  );

  y = 41;

  // ── CADRE C1 : CONFIGURATION DU POSTE DE LIVRAISON (PAGE 15/41) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    38,
    'C.1 — CONFIGURATION DU POSTE DE LIVRAISON HTA (PAGE 15/41)'
  );

  cy = y + 13;
  const isRefDomainePublic = d.configPosteLivraison !== 'autre_configuration';
  drawPdfCheckbox(
    doc,
    m + 6,
    cy,
    isRefDomainePublic,
    'Raccordement de référence (Poste de livraison HTA accessible directement depuis le domaine public)',
    { fontSize: 8.2, bold: true }
  );
  cy += 8.5;
  drawPdfCheckbox(
    doc,
    m + 6,
    cy,
    !isRefDomainePublic,
    `Autre configuration (Poste situé hors limite du domaine public — Distance d = ${d.distanceDomainePublicM || '0'} mètres)`,
    { fontSize: 8.2 }
  );

  y += 42;

  // ── CADRE C2 : PUISSANCE DE RACCORDEMENT DEMANDÉE & PUISSANCE RÉACTIVE (PAGE 15/41) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    50,
    'C.2 — PUISSANCES DE RACCORDEMENT DEMANDÉES & PUISSANCE RÉACTIVE (PAGE 15/41)'
  );

  cy = y + 12;
  // Deux boîtes visuelles pour Pracc inj et Pracc sout
  const boxW = (usableW - 14) / 2;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.roundedRect(m + 4, cy, boxW, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 58, 138);
  doc.text('PUISSANCE DEMANDÉE EN INJECTION (Pracc inj) :', m + 8, cy + 6.5);
  doc.setFontSize(13);
  doc.setTextColor(0, 94, 184);
  doc.text(`${d.puissanceRaccInjectionKw || '500'} kW`, m + 8, cy + 15.5);

  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(196, 181, 253);
  doc.roundedRect(m + 10 + boxW, cy, boxW, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(88, 28, 135);
  doc.text('PUISSANCE DEMANDÉE EN SOUTIRAGE (Pracc sout) :', m + 14 + boxW, cy + 6.5);
  doc.setFontSize(13);
  doc.setTextColor(109, 40, 217);
  doc.text(`${d.puissanceRaccSoutirageKw || '500'} kW`, m + 14 + boxW, cy + 15.5);

  cy += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(sanitizePdfText('Puissance réactive conforme aux exigences de l’Arrêté du 9 juin 2020 :'), m + 4, cy);
  const isReactifOui = d.puissanceReactiveConforme !== 'non';
  drawPdfCheckbox(doc, m + 112, cy, isReactifOui, 'Oui');
  drawPdfCheckbox(doc, m + 135, cy, !isReactifOui, 'Non');

  y += 54;

  // ── CADRE C3 : OPTIONS POUR RECEVOIR PLUSIEURS SOLUTIONS DE RACCORDEMENT (PAGE 16/41) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    92,
    'C.3 — OPTIONS POUR RECEVOIR PLUSIEURS SOLUTIONS DE RACCORDEMENT (PAGE 16/41)'
  );

  cy = y + 13;
  // Option 1 : Division de parc
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Devis d’étude pour une division de parc :', m + 4, cy);
  const isDivParc = d.devisDivisionParc === 'oui';
  drawPdfCheckbox(doc, m + 105, cy, isDivParc, 'Oui');
  drawPdfCheckbox(doc, m + 128, cy, !isDivParc, 'Non');

  cy += 9;
  // Option 2 : Puissance d'injection plus faible
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Devis d’étude pour une puissance d’injection plus faible :', m + 4, cy);
  const isPInjFaible = d.devisPuissanceInjectionFaible === 'oui';
  drawPdfCheckbox(doc, m + 105, cy, isPInjFaible, 'Oui');
  drawPdfCheckbox(doc, m + 128, cy, !isPInjFaible, 'Non');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`(Pracc inj min = ${d.puissanceInjectionMinKw || '350'} kW)`, m + 148, cy);

  cy += 9;
  // Option 3 : Offre à modulation de puissance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('3. Devis d’étude Offre à modulation de puissance :', m + 4, cy);
  const isOraCheckbox = d.devisOffreModulationPuissance === true || d.devisOffreModulationPuissance === 'oui';
  drawPdfCheckbox(doc, m + 105, cy, isOraCheckbox, 'Oui');
  drawPdfCheckbox(doc, m + 128, cy, !isOraCheckbox, 'Non');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(0, 94, 184);
  doc.text(`(Pgar inj = ${d.puissanceGarantieInjectionKw || '350'} kW, soit >= 70 %)`, m + 146, cy);

  // Encadré d'alerte réglementaire sur la case générale Pgar inj vs Gabarit Horaire Stockage
  cy += 5;
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(m + 4, cy, usableW - 8, 20, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.3);
  doc.setTextColor(146, 64, 14);
  doc.text('NOTE RÉGLEMENTAIRE IMPORTANTE SUR L’OPTION DE MODULATION DE PUISSANCE :', m + 8, cy + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  doc.setTextColor(120, 53, 15);
  const alertLines = doc.splitTextToSize(
    sanitizePdfText(
      'Attention : cette case générale indique une puissance garantie minimale de 70 %. Elle ne remplace pas la demande spécifique de gabarit horaire pour stockage décrite en page 9/41 (Fiche A) et dans la Note complémentaire ORA-MP jointe (Art. 11 Enedis-NMO-RES_030E & Variante 2A Enedis-MOP-RES_046E).'
    ),
    usableW - 16
  );
  doc.text(alertLines, m + 8, cy + 10.5);

  cy += 27;
  // Option 4 : Capacité d'accueil des 3 départs HTA existants les plus proches
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(sanitizePdfText('4. Capacité d’accueil des 3 départs HTA existants les plus proches :'), m + 4, cy);
  const isCap3Departs = d.capaciteAccueil3DepartsHta !== 'non';
  drawPdfCheckbox(doc, m + 105, cy, isCap3Departs, 'Oui');
  drawPdfCheckbox(doc, m + 128, cy, !isCap3Departs, 'Non');

  y += 96;

  // ── CADRE C4 : RÉGULATION DE PUISSANCE ACTIVE P = f(f) (PAGE 17/41) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    30,
    'C.4 — PARTICIPATION AU RÉGLAGE DE LA FRÉQUENCE (PAGE 17/41)'
  );

  cy = y + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  doc.text(sanitizePdfText('Régulation de puissance active en fonction de la fréquence P = f(f) :'), m + 4, cy);
  const isRegulPf = d.regulationPuissanceActivePf !== 'non';
  drawPdfCheckbox(doc, m + 112, cy, isRegulPf, 'Oui (Conforme Arrêté du 9 juin 2020)');
  drawPdfCheckbox(doc, m + 165, cy, !isRegulPf, 'Non');

  drawEnedis056EFooter(doc, 3, totalPages, d.siteNomInstallation);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 : FICHES E4 & T1 — CARACTÉRISTIQUES STOCKAGE BATTERIES & TRANSFO
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawEnedis056EHeader(
    doc,
    'E4 / T1',
    'CARACTÉRISTIQUES TECHNIQUES STOCKAGE BATTERIES & TRANSFORMATEUR HTA/BT',
    'Réf. Enedis-MOP-RES_056E — Version 2 — Fiche E4 (Stockage) & Fiche T1 (Transformateur HTA/BT)'
  );

  y = 41;

  // ── CADRE E4 : CARACTÉRISTIQUES TECHNIQUES BATTERIES (FICHE E4) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    84,
    'FICHE E4 — CARACTÉRISTIQUES TECHNIQUES DE L’INSTALLATION DE STOCKAGE & BATTERIES'
  );

  cy = y + 12;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Type d’installation :',
    d.typeInstallationStockage || 'Stockage stationnaire par batteries autonomes (BESS Stand-alone)',
    48,
    126
  );

  cy += 7.5;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Nombre d’unités & Modèle :',
    `${d.nombreUnitesTexte || '4 armoires de 125 kW'} — Modèle : ${d.modeleBatterie || 'CESC Mercury 261 - LFP'}`,
    48,
    126
  );

  cy += 7.5;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Puissance active totale (Pinstallée) :',
    `${d.puissanceActiveTotaleInstalleeKw || '500'} kW`,
    52,
    40
  );
  drawFieldRow(
    doc,
    m + 98,
    cy,
    'Puissance apparente max :',
    `${d.puissanceApparenteMaximaleKva || '500'} kVA`,
    44,
    38
  );

  cy += 7.5;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Capacité énergétique totale :',
    `${d.capaciteTotaleKwh || '1044'} kWh (${d.nombreUnites || '4'} × ${d.capaciteUnitaireKwh || '261'} kWh)`,
    48,
    126
  );

  cy += 7.5;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Mode de raccordement :',
    d.modeRaccordement || 'Triphasé HTA (20 kV) via transformateur élévateur BT/HTA.',
    48,
    126
  );

  cy += 7.5;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Technologie batteries :',
    d.technologieCellules || 'Lithium-Fer-Phosphate (LiFePO4 / LFP) — Refroidissement liquide IP55',
    48,
    126
  );

  cy += 7.5;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Convertisseurs (PCS) :',
    d.onduleursPcsDetail || '4 × Convertisseurs bidirectionnels (PCS) de 125 kVA / 125 kW (cos phi = 1)',
    48,
    126
  );

  cy += 7.5;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Découplage & Normes :',
    `${d.protectionDecouplageDetail || 'Relais HTA NF C 13-100 / Enedis-NOI-RES_43E'} (${d.conformiteNormative || 'NF EN 50549-2'})`,
    48,
    126
  );

  y += 88;

  // ── CADRE T1 : CARACTÉRISTIQUES DU TRANSFORMATEUR ÉLÉVATEUR BT/HTA (FICHE T1) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    46,
    'FICHE T1 — CARACTÉRISTIQUES DU TRANSFORMATEUR DE PUISSANCE HTA / BT',
    [15, 43, 92]
  );

  cy = y + 13;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Puissance apparente nominale :',
    `${d.transfoPuissanceNominaleKva || '630'} kVA`,
    50,
    42
  );
  drawFieldRow(
    doc,
    m + 98,
    cy,
    'Couplage des enroulements :',
    d.transfoCouplage || 'Dyn11',
    46,
    36
  );

  cy += 8;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Tension primaire (côté Réseau) :',
    d.transfoTensionPrimaireHta || '20 kV (HTA Triphasé 50 Hz)',
    50,
    44
  );
  drawFieldRow(
    doc,
    m + 98,
    cy,
    'Tension secondaire (côté BESS) :',
    d.transfoTensionSecondaireBt || '400 V (BT Triphasé)',
    46,
    36
  );

  cy += 8;
  drawFieldRow(
    doc,
    m + 4,
    cy,
    'Tension de court-circuit (Ucc) :',
    `${d.transfoUccPercent || '4.0'} %`,
    50,
    44
  );
  drawFieldRow(
    doc,
    m + 98,
    cy,
    'Mode d’exploitation :',
    'Élévateur BT/HTA bidirectionnel',
    46,
    36
  );

  y += 50;

  // ── CADRE CERTIFICATION DES DONNÉES & SIGNATURE (BAS DE PAGE 4) ──
  drawSectionFrame(
    doc,
    m,
    y,
    usableW,
    66,
    'CERTIFICATION DES DONNÉES & SIGNATURE DU DEMANDEUR (Enedis-MOP-RES_056E)',
    [0, 94, 184]
  );

  cy = y + 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.6);
  doc.setTextColor(51, 65, 85);
  doc.text(
    sanitizePdfText(
      'Je soussigné(e) certifie sur l’honneur l’exactitude des renseignements techniques et administratifs déclarés dans les présentes Fiches de Collecte Enedis-MOP-RES_056E (Version 2) ainsi que dans la Note complémentaire ORA-MP annexée.'
    ),
    m + 4,
    cy,
    { maxWidth: usableW - 8 }
  );

  cy += 11;
  drawFieldRow(doc, m + 4, cy, 'Nom - Prénom du signataire :', d.signataireNomPrenom || 'Yann BARBERIS', 46, 55);
  cy += 7;
  drawFieldRow(doc, m + 4, cy, 'Qualité / Société :', `${d.interlocuteurFonction || 'Président'} - ${d.beneficiaireRaisonSociale || 'ENR COURTAGE'}`, 46, 55);
  cy += 7;
  drawFieldRow(doc, m + 4, cy, 'Fait à :', d.signatureLieu || 'Mérignac', 46, 55);
  cy += 7;
  drawFieldRow(doc, m + 4, cy, 'Date :', formatDateFr(d.signatureDate), 46, 55);

  // Encadré Cachet & Signature à droite
  const sigBoxX = m + 104;
  const sigBoxY = y + 20;
  const sigBoxW = usableW - 108;
  const sigBoxH = 42;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 43, 92);
  doc.text('CACHET & SIGNATURE DU DEMANDEUR :', sigBoxX + 3, sigBoxY + 5);

  if (d.inclureCachetSignature !== false) {
    const stampImg = d.signatureImageBase64 || generateDefaultEnrCourtageStampDataUrl();
    if (stampImg) {
      try {
        doc.addImage(stampImg, 'PNG', sigBoxX + 4, sigBoxY + 6.5, sigBoxW - 8, 33);
      } catch (err) {
        console.warn('Erreur insertion image cachet 056E:', err);
      }
    }
  }

  drawEnedis056EFooter(doc, 4, totalPages, d.siteNomInstallation);

  const projSlug = (d.siteCommune || p.name || p.lastName || 'Projet').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Enedis-MOP-RES_056E_V2_${projSlug}.pdf`;

  if (options.download !== false) {
    doc.save(filename);
  }

  return {
    doc,
    filename,
    blob: doc.output('blob'),
    arrayBuffer: doc.output('arraybuffer'),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. DOCUMENT 2 : GÉNÉRATION DE LA NOTE COMPLÉMENTAIRE ORA-MP (PDF 1 PAGE A4)
// ═════════════════════════════════════════════════════════════════════════════

export async function generateOraMpNotePdf(project, enedisDataInput, options = {}) {
  const p = project || {};
  const d = enedisDataInput || getInitialEnedis056EData(p);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const m = 18;
  const usableW = W - 2 * m;

  // Bandeau décoratif supérieur ENR COURTAGE
  doc.setFillColor(15, 43, 92); // Bleu nuit corporate
  doc.rect(0, 0, W, 4.5, 'F');
  doc.setFillColor(0, 163, 224); // Liseré cyan
  doc.rect(0, 4.5, W, 1.2, 'F');

  let y = 13;

  // ── 1. EN-TÊTE ENR COURTAGE (LOGO + COORDONNÉES OFFICIELLES) ──
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', m, y, 44, 13);
    } catch (e) {
      console.warn('Erreur insertion logo ENR COURTAGE:', e);
    }
  }

  // Encadré référence réglementaire en haut à droite
  const badgeW = 78;
  const badgeX = W - m - badgeW;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(147, 197, 253);
  doc.setLineWidth(0.35);
  doc.roundedRect(badgeX, y, badgeW, 25, 2, 2, 'FD');

  doc.setFillColor(0, 94, 184);
  doc.roundedRect(badgeX, y, badgeW, 6.2, 2, 2, 'F');
  doc.rect(badgeX, y + 4, badgeW, 2.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ANNEXE OBLIGATOIRE AU FORMULAIRE 056E', badgeX + badgeW / 2, y + 4.3, { align: 'center' });

  doc.setTextColor(15, 43, 92);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('• Fiches de Collecte Enedis-MOP-RES_056E (V2)', badgeX + 3.5, y + 11);
  doc.text('• Procédure Enedis-NMO-RES_030E (Article 11)', badgeX + 3.5, y + 16);
  doc.text('• Modèle PTF Enedis-MOP-RES_046E (Variante 2A)', badgeX + 3.5, y + 21);

  // Coordonnées ENR COURTAGE sous le logo à gauche
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(d.beneficiaireRaisonSociale || 'ENR COURTAGE'), m, y);

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(
    sanitizePdfText(`${d.beneficiaireAdresse || '7 Rue Gutenberg'} — ${d.beneficiaireCpVillePays || '33700 Mérignac - France'}`),
    m,
    y
  );

  y += 4.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 43, 92);
  doc.text(
    sanitizePdfText(`SIREN : ${d.beneficiaireSiren || '881 890 982'}   |   SIRET : ${d.beneficiaireSiret || '881 890 982 00047'}`),
    m,
    y
  );

  y += 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    sanitizePdfText(`Interlocuteur : ${d.interlocuteurNomPrenom || 'BARBERIS Yann'} (${d.interlocuteurFonction || 'Président'}) • Tél : ${d.interlocuteurTelephone || '07 63 87 71 40'} • ${d.interlocuteurEmail || 'y.barberis@enr-courtage.fr'}`),
    m,
    y
  );

  // Ligne de séparation
  y += 6;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(m, y, W - m, y);

  // ── 2. ENCADRÉ OBJET & IDENTIFICATION DU SITE ──
  y += 6;
  const siteLineClean = sanitizePdfText(d.noteSiteLigne || buildNoteOraMpSiteLine(d));
  const siteLinesSplit = doc.splitTextToSize(siteLineClean, usableW - 22);
  const objBoxH = Math.max(24, 16 + siteLinesSplit.length * 4.5);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(0, 94, 184);
  doc.setLineWidth(0.45);
  doc.roundedRect(m, y, usableW, objBoxH, 2, 2, 'FD');

  // Barre verticale bleue à gauche de l'encadré objet
  doc.setFillColor(0, 94, 184);
  doc.roundedRect(m, y, 3, objBoxH, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 94, 184);
  doc.text('Objet :', m + 6, y + 7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText(d.noteObjet || 'Demande prioritaire d’ORA-MP pour stockage autonome — 500 kW'),
    m + 20,
    y + 7.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 94, 184);
  doc.text('Site :', m + 6, y + 14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(siteLinesSplit, m + 20, y + 14.5);

  y += objBoxH + 9;

  // ── 3. CORPS DE LA NOTE COMPLÉMENTAIRE ORA-MP ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(d.noteSalutation || 'Madame, Monsieur,'), m, y);

  y += 7.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const rawBody = sanitizePdfText(d.noteCorps || DEFAULT_NOTE_ORAMP_CORPS);
  const paragraphs = rawBody.split(/\n\s*\n/).map(pStr => pStr.trim()).filter(Boolean);

  paragraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para, usableW);
    doc.text(lines, m, y);
    y += lines.length * 4.8 + 4.5;
  });

  // ── 4. ENCADRÉ SYNTHÉTIQUE DES RÉFÉRENCES RÉGLEMENTAIRES & PARAMÈTRES TECHNIQUES ──
  y += 2;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(0.35);
  doc.roundedRect(m, y, usableW, 27, 1.8, 1.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(3, 105, 161);
  doc.text(
    'SYNTHÈSE DES PARAMÈTRES TECHNIQUES & RÉFÉRENCES RÉGLEMENTAIRES DE LA DEMANDE ORA-MP :',
    m + 4,
    y + 5.8
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText(
      `• Architecture BESS : ${d.nombreUnitesTexte || '4 armoires de 125 kW'} (${d.modeleBatterie || 'CESC Mercury 261 - LFP'}) — Raccordement HTA 20 kV`
    ),
    m + 4,
    y + 11.2
  );
  doc.text(
    sanitizePdfText(
      `• Puissances sollicitées : Pracc inj = ${d.puissanceRaccInjectionKw || '500'} kW en injection  |  Pracc sout = ${d.puissanceRaccSoutirageKw || '500'} kW en soutirage`
    ),
    m + 4,
    y + 16.4
  );
  doc.text(
    sanitizePdfText(
      '• Cadre réglementaire Enedis : Article 11 de la procédure Enedis-NMO-RES_030E & Variante 2A (Article 3.7 – Gabarit en injection,'
    ),
    m + 4,
    y + 21.4
  );
  doc.text(
    sanitizePdfText(
      '  pages 20 à 21/29) du modèle de Proposition Technique et Financière Enedis-MOP-RES_046E.'
    ),
    m + 4,
    y + 25.2
  );

  // ── 5. BLOC DATE, LIEU, QUALITÉ & SIGNATURE EN BAS DE PAGE ──
  y = Math.max(y + 33, 224);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(m, y, usableW, 50, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText(`Fait à : ${d.noteFaitA || 'Mérignac'}   —   Le : ${formatDateFr(d.noteDate)}`),
    m + 6,
    y + 10
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 43, 92);
  doc.text('Nom et qualité du demandeur :', m + 6, y + 18.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText(d.noteNomQualiteDemandeur || 'Yann BARBERIS, Président – ENR COURTAGE'),
    m + 6,
    y + 25
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText('Note annexée aux Fiches de Collecte Enedis-MOP-RES_056E (Version 2)'),
    m + 6,
    y + 34
  );
  doc.text(
    sanitizePdfText('ENR COURTAGE — 7 Rue Gutenberg, 33700 Mérignac — SIREN 881 890 982'),
    m + 6,
    y + 39
  );

  // Zone Signature & Cachet à droite
  const sigX = m + 104;
  const sigY = y + 4;
  const sigW = usableW - 108;
  const sigH = 42;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(sigX, sigY, sigW, sigH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 43, 92);
  doc.text('Signature et cachet de la société :', sigX + 3, sigY + 5);

  if (d.inclureCachetSignature !== false) {
    const stampImg = d.signatureImageBase64 || generateDefaultEnrCourtageStampDataUrl();
    if (stampImg) {
      try {
        doc.addImage(stampImg, 'PNG', sigX + 4, sigY + 6.5, sigW - 8, 33.5);
      } catch (err) {
        console.warn('Erreur insertion image cachet Note ORA-MP:', err);
      }
    }
  }

  // Pied de page officiel 1/1
  doc.setFillColor(15, 43, 92);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    sanitizePdfText('ENR COURTAGE — 7 Rue Gutenberg, 33700 Mérignac — SIREN 881 890 982 | Annexe obligatoire Enedis-MOP-RES_056E (V2)'),
    m,
    H - 3.8
  );
  doc.setFont('helvetica', 'bold');
  doc.text('Page 1 / 1', W - m, H - 3.8, { align: 'right' });

  const projSlug = (d.siteCommune || p.name || p.lastName || 'Projet').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Note_Complementaire_ORA-MP_500kW_${projSlug}.pdf`;

  if (options.download !== false) {
    doc.save(filename);
  }

  return {
    doc,
    filename,
    blob: doc.output('blob'),
    arrayBuffer: doc.output('arraybuffer'),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. PACK COMPLET ENEDIS : PDF FUSIONNÉ (056E + NOTE ORA-MP) & ARCHIVE ZIP
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Génère un PDF unique fusionnant :
 * 1. Les Fiches de Collecte Enedis-MOP-RES_056E (Version 2) (4 pages)
 * 2. La Note complémentaire – Demande prioritaire d'ORA-MP (500 kW) (1 page)
 */
export async function generateEnedisCompletePackPdf(project, enedisDataInput, options = {}) {
  const p = project || {};
  const d = enedisDataInput || getInitialEnedis056EData(p);

  const form056Res = await generateEnedis056EPdf(p, d, { download: false });
  const noteOraRes = await generateOraMpNotePdf(p, d, { download: false });

  const mergedPdf = await PDFDocument.create();

  const doc056 = await PDFDocument.load(form056Res.arrayBuffer);
  const pages056 = await mergedPdf.copyPages(doc056, doc056.getPageIndices());
  pages056.forEach(page => mergedPdf.addPage(page));

  const docOra = await PDFDocument.load(noteOraRes.arrayBuffer);
  const pagesOra = await mergedPdf.copyPages(docOra, docOra.getPageIndices());
  pagesOra.forEach(page => mergedPdf.addPage(page));

  const mergedBytes = await mergedPdf.save();
  const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
  const projSlug = (d.siteCommune || p.name || p.lastName || 'Projet').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Pack_Complet_Enedis_056E_et_Note_ORA-MP_${projSlug}.pdf`;

  if (options.download !== false) {
    saveAs(mergedBlob, filename);
  }

  return {
    filename,
    blob: mergedBlob,
    uint8Array: mergedBytes,
    form056Res,
    noteOraRes,
  };
}

/**
 * Génère une archive ZIP contenant :
 * - Document 1 : Formulaire Enedis-MOP-RES_056E (Version 2) (PDF)
 * - Document 2 : Note complémentaire – Demande prioritaire d'ORA-MP (500 kW) (PDF)
 * - Document 3 : Pack Complet Enedis Fusionné (PDF 5 pages)
 * - Document 4 : Bordereau & Checklist des pièces à déposer sur le portail Enedis (TXT)
 */
export async function generateEnedisCompletePackZip(project, enedisDataInput) {
  const p = project || {};
  const d = enedisDataInput || getInitialEnedis056EData(p);
  const zip = new JSZip();
  const projSlug = (d.siteCommune || p.name || p.lastName || 'Projet').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  const packRes = await generateEnedisCompletePackPdf(p, d, { download: false });

  zip.file(`01_${packRes.form056Res.filename}`, packRes.form056Res.arrayBuffer);
  zip.file(`02_${packRes.noteOraRes.filename}`, packRes.noteOraRes.arrayBuffer);
  zip.file(`03_${packRes.filename}`, packRes.uint8Array);

  const checklistTxt = `═══════════════════════════════════════════════════════════════════════════════
PACK COMPLET DE DEMANDE DE RACCORDEMENT ENEDIS HTA — STOCKAGE BESS 500 kW
═══════════════════════════════════════════════════════════════════════════════

PROJET : ${d.siteNomInstallation}
COMMUNE : ${d.siteCommune} (${d.siteCodePostal}) — Code INSEE : ${d.siteCodeInsee || '—'}
PARCELLE : ${d.siteParcelle}
COORDONNÉES GPS (WGS84) : Latitude ${d.siteLatitude} ; Longitude ${d.siteLongitude}
DEMANDEUR / MANDATAIRE : ${d.beneficiaireRaisonSociale} (SIREN ${d.beneficiaireSiren} | SIRET ${d.beneficiaireSiret})
INTERLOCUTEUR : ${d.interlocuteurNomPrenom} (${d.interlocuteurFonction}) — ${d.interlocuteurTelephone} — ${d.interlocuteurEmail}

───────────────────────────────────────────────────────────────────────────────
DOCUMENTS GÉNÉRÉS INCLUS DANS CE PACK :
───────────────────────────────────────────────────────────────────────────────
[X] 01 - Fiches de Collecte Enedis-MOP-RES_056E (Version 2) (Fiches A, C, E4 et T1)
[X] 02 - Note complémentaire – Demande prioritaire d'ORA-MP pour stockage autonome (500 kW)
         (Réf. Art. 11 Enedis-NMO-RES_030E & Variante 2A Enedis-MOP-RES_046E)
[X] 03 - Pack Complet Enedis Fusionné (056E + Note ORA-MP en un seul PDF)

───────────────────────────────────────────────────────────────────────────────
CHECKLIST DES PIÈCES TECHNIQUES & ADMINISTRATIVES À JOINDRE SUR LE PORTAIL ENEDIS :
───────────────────────────────────────────────────────────────────────────────
[${d.checklistPieces?.plan_situation ? 'X' : ' '}] Plan de situation (1:25000)
[${d.checklistPieces?.plan_masse ? 'X' : ' '}] Plan de masse (1:200/1:500) avec point de livraison
[${d.checklistPieces?.schema_unifilaire ? 'X' : ' '}] Schéma unifilaire
[${d.checklistPieces?.recepisse_dp ? 'X' : ' '}] Récépissé / Certificat de non-opposition DP
[${d.checklistPieces?.certificats_50549 ? 'X' : ' '}] Certificats de conformité NF EN 50549-1/2

Généré le ${new Date().toLocaleDateString('fr-FR')} par l'application NELSON — ENR COURTAGE.
`;

  zip.file(`04_Checklist_Depot_Portail_Enedis_${projSlug}.txt`, checklistTxt);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `Pack_Complet_Enedis_056E_ORA-MP_${projSlug}_${dateStr}.zip`;
  saveAs(zipBlob, zipFilename);

  return {
    success: true,
    filename: zipFilename,
    blob: zipBlob,
  };
}

// Alias rétro-compatibles
export async function generateEnedisMandatPdf(project, racData, options = {}) {
  return generateOraMpNotePdf(project, racData, options);
}

export async function generateConsuelCerfaPdf(project, racData, options = {}) {
  return generateEnedis056EPdf(project, racData, options);
}

export async function generateEnedisGlobalZip(project, racData) {
  return generateEnedisCompletePackZip(project, racData);
}

export default {
  ENR_COURTAGE_INFO,
  MANDATAIRE_INFO,
  DEFAULT_INFO_COMPLEMENTAIRES_056E,
  DEFAULT_NOTE_ORAMP_CORPS,
  SCHEMAS_COMPTAGE_056E,
  ENEDIS_056E_CHECKLIST_PIECES,
  INSTALLATION_TYPES,
  INJECTION_TYPES,
  VOLTAGE_LEVELS,
  ENEDIS_CHECKLIST_DOCS,
  formatDateFr,
  formatEuro,
  sanitizePdfText,
  calculatePtfCountdown,
  extractProjectEnedisVariables,
  buildNoteOraMpSiteLine,
  generateDefaultEnrCourtageStampDataUrl,
  getInitialEnedis056EData,
  getInitialRaccordementData,
  generateEnedis056EPdf,
  generateOraMpNotePdf,
  generateEnedisCompletePackPdf,
  generateEnedisCompletePackZip,
  generateEnedisMandatPdf,
  generateConsuelCerfaPdf,
  generateEnedisGlobalZip,
};
