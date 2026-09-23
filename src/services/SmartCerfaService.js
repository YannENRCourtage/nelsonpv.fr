import { PDFDocument, rgb, StandardFonts, PDFName, PDFString, PDFBool } from 'pdf-lib';

/**
 * SmartCerfaService — Moteur de mapping intelligent des CERFA PDF
 * Cible EXCLUSIVEMENT les champs AcroForm officiels du CERFA (DP 13404, PC 13409, CU 16702)
 * Page 2 = Identité & Coordonnées du demandeur principal
 * Page 3 = Coordonnées email & Références cadastrales
 * Page 5 = Description projet & Nature des travaux
 * Page 9 = Engagement (Lieu, Date) — Signature laissée vide pour signature manuscrite
 */

// ─── Mapping des champs AcroForm par type de CERFA ──────────────────────────

export const CERFA_FIELDS = {
  cu: {
    // CERFA 16702 — Certificat d'Urbanisme
    nom:          ['topmostSubform[0].Page2[0].D1N_nom[0]', 'D1N_nom', 'V1N_nom'],
    prenom:       ['topmostSubform[0].Page2[0].D1P_prenom[0]', 'D1P_prenom', 'V1P_prenom'],
    naissance:    ['topmostSubform[0].Page2[0].D1A_naissance[0]', 'D1A_naissance'],
    commune_naiss:['topmostSubform[0].Page2[0].D1C_commune[0]', 'D1C_commune'],
    dept_naiss:   ['topmostSubform[0].Page2[0].D1D_dept[0]', 'D1D_dept'],
    pays_naiss:   ['topmostSubform[0].Page2[0].D1E_pays[0]', 'D1E_pays'],
    siret:        ['topmostSubform[0].Page2[0].D2S_SIRET[0]', 'D2S_SIRET', 'D2S_siret'],
    denomination: ['topmostSubform[0].Page2[0].D2D_denomination[0]', 'D2D_denomination'],
    adresse_num:  ['topmostSubform[0].Page2[0].D3N_numero[0]', 'D3N_numero'],
    adresse_voie: ['topmostSubform[0].Page2[0].D3V_voie[0]', 'D3V_voie'],
    commune:      ['topmostSubform[0].Page2[0].D3L_localite[0]', 'D3L_localite', 'D1C_commune'],
    cp:           ['topmostSubform[0].Page2[0].D3C_code[0]', 'D3C_code'],
    pays:         ['topmostSubform[0].Page2[0].D3P_pays[0]', 'D3P_pays'],
    email_left:   ['topmostSubform[0].Page3[0].D5GE1_email[0]', 'D5GE1_email'],
    email_right:  ['topmostSubform[0].Page3[0].D5GE2_email[0]', 'D5GE2_email'],
    tel:          ['topmostSubform[0].Page2[0].D3T_telephone[0]', 'D3T_telephone'],
    prefixe:      ['topmostSubform[0].Page3[0].T2F_prefixe[0]', 'T2F_prefixe'],
    section:      ['topmostSubform[0].Page3[0].T2S_section[0]', 'T2S_section'],
    parcelle:     ['topmostSubform[0].Page3[0].T2N_numero[0]', 'T2N_numero'],
    surface:      ['topmostSubform[0].Page3[0].T2T_superficie[0]', 'T2T_superficie'],
    sig_lieu:     ['topmostSubform[0].Page9[0].E1L_lieu[0]', 'E1L_lieu'],
    sig_date:     ['topmostSubform[0].Page9[0].E1D_date[0]', 'E1D_date'],
  },
  dp: {
    // CERFA 16702*03 / 13404 — Déclaration Préalable
    nom:          ['D1N_nom', 'topmostSubform[0].Page2[0].D1N_nom[0]', 'topmostSubform[0].Page8[0].V1N_nom[0]', 'V1N_nom'],
    prenom:       ['D1P_prenom', 'topmostSubform[0].Page2[0].D1P_prenom[0]', 'topmostSubform[0].Page8[0].V1P_prenom[0]', 'V1P_prenom'],
    naissance:    ['D1A_naissance', 'topmostSubform[0].Page2[0].D1A_naissance[0]'],
    commune_naiss:['D1C_commune', 'topmostSubform[0].Page2[0].D1C_commune[0]'],
    dept_naiss:   ['D1D_dept', 'topmostSubform[0].Page2[0].D1D_dept[0]'],
    pays_naiss:   ['D1E_pays', 'topmostSubform[0].Page2[0].D1E_pays[0]'],
    siret:        ['D2S_siret', 'D2S_SIRET', 'topmostSubform[0].Page2[0].D2S_SIRET[0]', 'topmostSubform[0].Page8[0].V1MS1_siret[0]'],
    denomination: ['D2D_denomination', 'topmostSubform[0].Page2[0].D2D_denomination[0]', 'topmostSubform[0].Page8[0].V1MD1_denomination[0]'],
    raison:       ['D2R_raison', 'topmostSubform[0].Page2[0].D2R_raison[0]', 'topmostSubform[0].Page8[0].V1R_raison[0]'],
    type_societe: ['D2J_type', 'topmostSubform[0].Page2[0].D2J_type[0]'],
    rep_nom:      ['D2N_nom'],
    rep_prenom:   ['D2P_prenom'],
    adresse_num:  ['D3N_numero', 'topmostSubform[0].Page2[0].D3N_numero[0]', 'topmostSubform[0].Page8[0].V1Z_numero[0]'],
    adresse_voie: ['D3V_voie', 'topmostSubform[0].Page2[0].D3V_voie[0]', 'topmostSubform[0].Page8[0].V1V_voie[0]'],
    adresse_lieudit:['D3W_lieudit', 'topmostSubform[0].Page2[0].D3W_lieudit[0]'],
    commune:      ['D3L_localite', 'topmostSubform[0].Page2[0].D3L_localite[0]', 'topmostSubform[0].Page8[0].V1L_localite[0]'],
    cp:           ['D3C_code', 'topmostSubform[0].Page2[0].D3C_code[0]', 'topmostSubform[0].Page8[0].V1C_code[0]'],
    tel:          ['D3T_telephone', 'topmostSubform[0].Page2[0].D3T_telephone[0]', 'topmostSubform[0].Page8[0].V1T_telephone[0]'],
    pays:         ['D3P_pays', 'topmostSubform[0].Page2[0].D3P_pays[0]', 'topmostSubform[0].Page8[0].V1E_pays[0]'],
    email_left:   ['D5GE1_email', 'topmostSubform[0].Page3[0].D5GE1_email[0]'],
    email_right:  ['D5GE2_email', 'topmostSubform[0].Page3[0].D5GE2_email[0]'],
    prefixe:      ['T2F_prefixe', 'topmostSubform[0].Page3[0].T2F_prefixe[0]'],
    section:      ['T2S_section', 'topmostSubform[0].Page3[0].T2S_section[0]'],
    parcelle:     ['T2N_numero', 'topmostSubform[0].Page3[0].T2N_numero[0]'],
    surface:      ['T2T_superficie', 'topmostSubform[0].Page3[0].T2T_superficie[0]'],
    description:  ['C2ZD1_description', 'topmostSubform[0].Page5[0].C2ZD1_description[0]'],
    puissance:    ['C2ZP1_crete', 'C2ZE1_puissance', 'topmostSubform[0].Page5[0].C2ZE1_puissance[0]'],
    sig_lieu:     ['E1L_lieu', 'topmostSubform[0].Page9[0].E1L_lieu[0]'],
    sig_date:     ['E1D_date', 'topmostSubform[0].Page9[0].E1D_date[0]'],
  },
  pc: {
    // CERFA 13409 / 13404 — Permis de Construire
    nom:          ['topmostSubform[0].Page2[0].D1N_nom[0]', 'D1N_nom', 'topmostSubform[0].Page8[0].V1N_nom[0]', 'V1N_nom'],
    prenom:       ['topmostSubform[0].Page2[0].D1P_prenom[0]', 'D1P_prenom', 'topmostSubform[0].Page8[0].V1P_prenom[0]', 'V1P_prenom'],
    naissance:    ['topmostSubform[0].Page2[0].D1A_naissance[0]', 'D1A_naissance'],
    commune_naiss:['topmostSubform[0].Page2[0].D1C_commune[0]', 'D1C_commune'],
    dept_naiss:   ['topmostSubform[0].Page2[0].D1D_dept[0]', 'D1D_dept'],
    pays_naiss:   ['topmostSubform[0].Page2[0].D1E_pays[0]', 'D1E_pays'],
    siret:        ['topmostSubform[0].Page2[0].D2S_SIRET[0]', 'D2S_SIRET', 'D2S_siret', 'topmostSubform[0].Page8[0].V1MS1_siret[0]'],
    denomination: ['topmostSubform[0].Page2[0].D2D_denomination[0]', 'D2D_denomination', 'topmostSubform[0].Page8[0].V1MD1_denomination[0]'],
    raison:       ['topmostSubform[0].Page2[0].D2R_raison[0]', 'D2R_raison', 'topmostSubform[0].Page8[0].V1R_raison[0]'],
    type_societe: ['topmostSubform[0].Page2[0].D2J_type[0]', 'D2J_type'],
    rep_nom:      ['D2N_nom'],
    rep_prenom:   ['D2P_prenom'],
    adresse_num:  ['topmostSubform[0].Page2[0].D3N_numero[0]', 'D3N_numero', 'topmostSubform[0].Page8[0].V1Z_numero[0]'],
    adresse_voie: ['topmostSubform[0].Page2[0].D3V_voie[0]', 'D3V_voie', 'topmostSubform[0].Page8[0].V1V_voie[0]'],
    adresse_lieudit:['topmostSubform[0].Page2[0].D3W_lieudit[0]', 'D3W_lieudit'],
    commune:      ['topmostSubform[0].Page2[0].D3L_localite[0]', 'D3L_localite', 'topmostSubform[0].Page8[0].V1L_localite[0]'],
    cp:           ['topmostSubform[0].Page2[0].D3C_code[0]', 'D3C_code', 'topmostSubform[0].Page8[0].V1C_code[0]'],
    tel:          ['topmostSubform[0].Page2[0].D3T_telephone[0]', 'D3T_telephone', 'topmostSubform[0].Page8[0].V1T_telephone[0]'],
    pays:         ['topmostSubform[0].Page2[0].D3P_pays[0]', 'D3P_pays', 'topmostSubform[0].Page8[0].V1E_pays[0]'],
    email_left:   ['topmostSubform[0].Page3[0].D5GE1_email[0]', 'D5GE1_email'],
    email_right:  ['topmostSubform[0].Page3[0].D5GE2_email[0]', 'D5GE2_email'],
    prefixe:      ['topmostSubform[0].Page3[0].T2F_prefixe[0]', 'T2F_prefixe'],
    section:      ['topmostSubform[0].Page3[0].T2S_section[0]', 'T2S_section'],
    parcelle:     ['topmostSubform[0].Page3[0].T2N_numero[0]', 'T2N_numero'],
    surface:      ['topmostSubform[0].Page3[0].T2T_superficie[0]', 'T2T_superficie'],
    description:  ['topmostSubform[0].Page5[0].C2ZD1_description[0]', 'C2ZD1_description'],
    puissance:    ['topmostSubform[0].Page5[0].C2ZE1_puissance[0]', 'C2ZE1_puissance'],
    sig_lieu:     ['topmostSubform[0].Page9[0].E1L_lieu[0]', 'E1L_lieu'],
    sig_date:     ['topmostSubform[0].Page9[0].E1D_date[0]', 'E1D_date'],
  },
};

// Mapping des pièces graphiques aux cases à cocher du Bordereau (DP1 à DP11) pour formulaires classiques
const PLATE_CHECKBOX_MAP = {
  dpc1: ['topmostSubform[0].Page13[0].P1FP1[0]', 'P1FP1'],
  dpc2: ['topmostSubform[0].Page11[0].P3GD1[0]', 'topmostSubform[0].Page11[0].P3GE1[0]', 'topmostSubform[0].Page11[0].P5PA1[0]', 'P3GD1', 'P3GE1', 'P5PA1'],
  dpc3: ['topmostSubform[0].Page11[0].P3GF1[0]', 'P3GF1'],
  dpc4: ['topmostSubform[0].Page11[0].P4LC1[0]', 'topmostSubform[0].Page12[0].P4CE1[0]', 'P4LC1', 'P4CE1', 'P4CF1'],
  dpc6: ['topmostSubform[0].Page12[0].P6PG1[0]', 'topmostSubform[0].Page12[0].P6PH1[0]', 'topmostSubform[0].Page13[0].P6PF1[0]', 'P6PG1', 'P6PH1', 'P6PF1'],
  dpc7: ['topmostSubform[0].Page12[0].P7LP1[0]', 'P7LP1'],
  dpc8: ['topmostSubform[0].Page13[0].P4EG1[0]', 'P4EG1', 'P7LF1', 'P8EA1'],
  dpc11: ['topmostSubform[0].Page12[0].P4EC1[0]', 'topmostSubform[0].Page12[0].P4EH1[0]', 'P4EC1', 'P4EH1'],
};

const ALL_BORDEREAU_CHECKBOXES = Object.values(PLATE_CHECKBOX_MAP).flat();

// Mapping des pièces pour le CERFA 16702*03 (Bordereau pages 13-16)
const CERFA_16702_03_ALL_BORDEREAU = [
  'P5PA2', 'P5PB1', 'P3GE1', 'P3GD1', 'P5PC1', 'P3GF1', 'P3GG1', 'P3GH1',
  'P4LC1', 'P4CD1', 'P4CF1', 'P4EA1', 'P4EB1', 'P4EC1', 'P4EH1', 'P4GE1',
  'P4GF1', 'P4LA1', 'P4LG1', 'P4LD1', 'P4LE1', 'P5PD1', 'P5PE1', 'P6PF1',
  'P1FP1', 'P4HG1', 'P4EG1', 'P8EA1', 'P9ZA1'
];

export function resolveDemandeurNames(project) {
  if (!project) return { lastName: '', firstName: '' };

  const directLastName = project.lastName || project.client_name || project.clientName || project.nom || project.client_nom || '';
  const directFirstName = project.firstName || project.client_firstname || project.clientFirstName || project.prenom || project.client_prenom || '';

  if (directLastName && directFirstName) {
    return { lastName: directLastName.trim(), firstName: directFirstName.trim() };
  }

  let rawName = directLastName || project.demandeur || project.fullName || project.name || '';
  let cleanName = String(rawName).trim();
  if (!cleanName) return { lastName: '', firstName: (directFirstName || '').trim() };

  // Retirer les préfixes de numéro de site éventuels (ex: "29- ", "1- ", "SPV A - ")
  cleanName = cleanName.replace(/^\d+\s*[-_]\s*/, '').replace(/^SPV\s+[A-Z0-9]+\s*[-_]\s*/i, '').trim();

  // Si cleanName contient le code postal et la ville à la fin (ex: "DAVID 19350 CONCEZE")
  const postCodeCityMatch = cleanName.match(/^(.*?)\s+\d{5}\s+.*$/);
  if (postCodeCityMatch && postCodeCityMatch[1].trim()) {
    cleanName = postCodeCityMatch[1].trim();
  }

  if (directFirstName) {
    return { lastName: cleanName, firstName: directFirstName.trim() };
  }

  const parts = cleanName.split(/\s+/);
  if (parts.length === 1) {
    return { lastName: parts[0], firstName: '' };
  } else if (parts.length === 2) {
    return { lastName: parts[0], firstName: parts[1] };
  } else {
    return { lastName: parts.slice(0, -1).join(' '), firstName: parts[parts.length - 1] };
  }
}

/**
 * Décompose une adresse française complète en numéro, voie, code postal et commune
 */
export function parseFrenchAddress(addressStr, defaultZip = '', defaultCity = '') {
  const str = (addressStr || '').trim();
  if (!str) {
    return {
      numero: '',
      voie: '',
      codePostal: defaultZip || '',
      commune: defaultCity || ''
    };
  }

  // 1. Détection du code postal (5 chiffres consécutifs)
  const cpMatch = str.match(/\b(\d{5})\b/);
  let codePostal = defaultZip || '';
  let commune = defaultCity || '';
  let streetPart = str;

  if (cpMatch) {
    codePostal = cpMatch[1];
    const cpIndex = cpMatch.index;
    streetPart = str.substring(0, cpIndex).trim().replace(/,\s*$/, '');
    const afterCp = str.substring(cpIndex + 5).trim().replace(/^,\s*/, '');
    if (afterCp) {
      commune = afterCp;
    }
  }

  // 2. Détection du numéro de voie au début
  let numero = '';
  let voie = streetPart;
  const numMatch = streetPart.match(/^(\d+(?:\s*(?:bis|ter|quater|[a-zA-Z]))?)\s*,?\s+(.*)$/i);
  if (numMatch) {
    numero = numMatch[1].trim();
    voie = numMatch[2].trim();
  } else if (/^\d+$/.test(streetPart)) {
    numero = streetPart;
    voie = '';
  }

  return {
    numero: numero || '',
    voie: voie || streetPart || '',
    codePostal: codePostal || defaultZip || '',
    commune: (commune || defaultCity || '').trim()
  };
}

export function getMissingFields(project, type = 'dp') {
  const required = {
    cu: ['lastName', 'address', 'city', 'zip', 'cadastre_section', 'cadastre_numero', 'email'],
    dp: ['lastName', 'address', 'city', 'zip', 'cadastre_section', 'cadastre_numero', 'cadastre_surface', 'email'],
    pc: ['lastName', 'address', 'city', 'zip', 'cadastre_section', 'cadastre_numero', 'cadastre_surface', 'email'],
  };

  const labels = {
    lastName: 'Nom & Prénom du demandeur',
    firstName: 'Prénom',
    address: 'Adresse du terrain',
    city: 'Commune',
    zip: 'Code postal',
    email: 'Adresse email',
    phone: 'Téléphone',
    cadastre_section: 'Section cadastrale',
    cadastre_numero: 'Numéro de parcelle',
    cadastre_surface: 'Surface de la parcelle (m²)',
    description: 'Courte description de votre projet ou de vos travaux',
    kwc: 'Puissance (kWc)',
    siret: 'SIRET',
  };

  const missing = [];
  for (const field of (required[type] || [])) {
    const val = project?.[field];
    if (!val || String(val).trim() === '') {
      missing.push({ field, label: labels[field] || field });
    }
  }
  return missing;
}

/**
 * Remplissage intelligent du CERFA PDF par AcroForm avec taille de police optimisée et sans signature automatique
 */
export async function smartFillCerfa(pdfUrl, project, type = 'dp', installationType = 'batiment_solaire', plateIds = []) {
  try {
    let cerfaBuffer = null;
    const urlsToTry = [
      pdfUrl,
      pdfUrl.startsWith('/templates/') ? pdfUrl.replace('/templates/', '/') : `/templates${pdfUrl}`,
      pdfUrl.startsWith('/') ? pdfUrl.substring(1) : `/${pdfUrl}`
    ];
    for (const u of urlsToTry) {
      try {
        const res = await fetch(u);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const header = new Uint8Array(buf.slice(0, 5));
          const headerStr = String.fromCharCode(...header);
          if (headerStr.startsWith('%PDF')) {
            cerfaBuffer = buf;
            break;
          }
        }
      } catch (_) {}
    }

    if (!cerfaBuffer) {
      throw new Error(`Impossible de charger le template PDF valide depuis ${pdfUrl}`);
    }

    const pdfDoc = await PDFDocument.load(cerfaBuffer, { ignoreEncryption: true });

    // ── Préparer les données ───────────────────────────────────────
    const names = resolveDemandeurNames(project);
    const lastName  = names.lastName || project?.lastName || project?.client_name || project?.clientName || project?.name || '';
    const firstName = names.firstName || project?.firstName || project?.client_firstname || project?.clientFirstName || '';
    const birthDate = (project?.birthDate || '').replace(/\D/g, '').slice(0, 8);
    const birthCity = project?.birthCity || ''; // Strict: uniquement lieu de naissance. Si vide, reste vide.
    let birthDept = project?.birthDepartment || project?.birthDept || '';
    if (!birthDept && birthCity) {
      const match = birthCity.match(/\((\d{2,3})\)/) || birthCity.match(/\b(\d{2,3})\b/);
      if (match) birthDept = match[1];
    }
    const birthCountry = project?.birthCountry || 'FRANCE';

    const rawAddress = project?.address || project?.clientAddress || project?.client_address || project?.siteAddress || project?.street || project?.adresse || '';
    const defaultZip = project?.zip || project?.postalCode || project?.code_postal || project?.clientZip || project?.client_zip || '';
    const defaultCity = project?.commune || project?.city || project?.cadastre_commune || project?.clientCity || project?.client_city || '';

    const parsedAddr = parseFrenchAddress(rawAddress, defaultZip, defaultCity);
    const addrNum    = project?.adresse_num || project?.street_number || project?.terrain_voie_num || parsedAddr.numero || '';
    const addrVoie   = project?.adresse_voie || project?.terrain_voie_nom || project?.terrain_voie || parsedAddr.voie || rawAddress;
    const zip        = project?.terrain_zip || project?.terrain_code_postal || project?.zip || parsedAddr.codePostal || defaultZip || '';
    const city       = project?.terrain_city || project?.terrain_commune || project?.city || project?.commune || parsedAddr.commune || defaultCity || '';

    // Liste des parcelles (mono ou multi-parcelles)
    const parcellesList = (Array.isArray(project?.parcelles) && project.parcelles.length > 0)
      ? project.parcelles
      : (Array.isArray(project?.cadastre_parcelles) && project.cadastre_parcelles.length > 0)
        ? project.cadastre_parcelles
        : [{
            prefixe: project?.cadastre_prefixe || '',
            section: (project?.cadastre_section || project?.terrain_section || '').toUpperCase().trim(),
            numero: (project?.cadastre_numero || project?.terrain_numero || project?.parcelle || '').trim(),
            surface: project?.cadastre_surface ? String(project.cadastre_surface).replace(/\D/g, '') : '',
          }];

    const p0 = parcellesList[0] || {};
    const section   = (p0.section || project?.cadastre_section || project?.terrain_section || '').toUpperCase().trim();
    const parcelle  = (p0.numero || project?.cadastre_numero || project?.terrain_numero || project?.parcelle || '').trim();
    const rawSurface = p0.surface ? String(p0.surface).replace(/\D/g, '') : (project?.cadastre_surface ? String(project.cadastre_surface).replace(/\D/g, '') : '');
    const surface   = rawSurface ? `${rawSurface}` : '';

    const totalSurfaceVal = parcellesList.reduce((acc, p) => {
      const s = Number(String(p?.surface || '').replace(/\D/g, ''));
      return acc + (isNaN(s) ? 0 : s);
    }, 0);
    const totalSurface = totalSurfaceVal > 0 ? String(totalSurfaceVal) : (surface || '');

    const rawKwc    = project?.kwc || project?.projectSize || project?.puissance || project?.power || (project?.solarStats?.power ? Math.round(project.solarStats.power) : '');
    const kwcStr    = rawKwc ? (String(rawKwc).includes('kWc') ? String(rawKwc).trim() : `${rawKwc} kWc`) : '';
    const cleanKwcVal = rawKwc ? String(rawKwc).replace(/kWc/gi, '').trim() : '';
    const cerfaChoice = project?.cerfaEmailChoice || 'email2';
    const email     = (cerfaChoice === 'email1')
      ? (project?.email || project?.clientEmail || project?.client_email || 'contact@enr-courtage.fr')
      : (project?.email2 || 'contact@enr-courtage.fr');
    const tel       = project?.phone || project?.clientPhone || project?.client_phone || '';
    const now       = new Date();
    const dayStr    = String(now.getDate()).padStart(2, '0');
    const monthStr  = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr   = String(now.getFullYear());
    const dateStr   = `${dayStr}${monthStr}${yearStr}`;
    const lieuStr   = city || 'FRANCE';

    let emailLeft = email;
    let emailRight = '';
    if (email.includes('@')) {
      const parts = email.split('@');
      emailLeft = parts[0];
      emailRight = parts[1] || '';
    }

    const isDP = (type === 'dp' || installationType === 'dp' || project?.type === 'dp' || project?.docType === 'dp');

    const typeLabels = {
      batiment_solaire: isDP
        ? `Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire${kwcStr ? ` d'une puissance de ${kwcStr}` : ''}.`
        : `Construction d'un bâtiment agricole à charpente métallique avec centrale solaire photovoltaïque intégrée en toiture${kwcStr ? ` d'une puissance de ${kwcStr}` : ''}.`,
      batiment: isDP
        ? `Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire${kwcStr ? ` d'une puissance de ${kwcStr}` : ''}.`
        : `Construction d'un bâtiment agricole à charpente métallique avec centrale solaire photovoltaïque intégrée en toiture${kwcStr ? ` d'une puissance de ${kwcStr}` : ''}.`,
      construction: isDP
        ? `Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire${kwcStr ? ` d'une puissance de ${kwcStr}` : ''}.`
        : `Construction d'un bâtiment agricole à charpente métallique avec centrale solaire photovoltaïque intégrée en toiture${kwcStr ? ` d'une puissance de ${kwcStr}` : ''}.`,
      ombriere:         `Installation d'une structure ombrière photovoltaïque${kwcStr ? ` d'une puissance de ${kwcStr}` : ''}.`,
      toiture:          `Installation de modules solaires photovoltaïques en toiture${kwcStr ? ` d'une puissance de ${kwcStr}` : ''}.`,
      batterie_standalone: `Installation d'une station de stockage d'énergie par batteries Stand-Alone composée de 4 armoires CESC Mercury 261 (500 kW / 1044 kWh) sur dalle béton (emprise 19.80 m² < 20 m²) ceinturée par un grillage métallique rigide (H 2.00m).`,
      batterie:         `Installation d'une station de stockage d'énergie par batteries Stand-Alone composée de 4 armoires CESC Mercury 261 (500 kW / 1044 kWh) sur dalle béton (emprise 19.80 m² < 20 m²) ceinturée par un grillage métallique rigide (H 2.00m).`,
    };

    const isBat = Boolean(
      project?.isBattery ||
      project?.isBatteryStandAlone ||
      project?.solutionType === 'battery' ||
      project?.urbanisme_solutionType === 'battery' ||
      installationType === 'battery' ||
      installationType === 'batterie' ||
      installationType === 'batterie_standalone' ||
      installationType === 'Station Batteries Stand-Alone' ||
      (typeof installationType === 'string' && /batterie|bess/i.test(installationType)) ||
      (typeof project?.installationType === 'string' && /batterie|bess/i.test(project.installationType))
    ) && project?.solutionType !== 'building' && project?.solutionType !== 'ombriere';
    let objet = project?.objet_travaux || project?.objetTravaux;
    if (!objet || (!isBat && /batterie|bess|stockage d'énergie/i.test(objet))) {
      if (isBat) {
        objet = "Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV.";
      } else {
        const solType = project?.solutionType || (isDP ? 'ombriere' : 'batiment_solaire');
        objet = (project?.description && !/batterie|bess/i.test(project.description) ? project.description : null) || typeLabels[solType] || typeLabels[installationType] || typeLabels[isDP ? 'ombriere' : 'batiment_solaire'];
        if (isDP && objet && typeof objet === 'string') {
          objet = objet.replace(/bâtiment\s+agricole/gi, 'ombrière photovoltaïque').replace(/bâtiments/gi, 'ombrières').replace(/bâtiment/gi, 'ombrière').replace(/Bâtiment/g, 'Ombrière');
        }
      }
    }
    if (rawKwc && kwcStr && !objet.includes(kwcStr) && !isBat) {
      objet = objet.replace(/\d+\s*kWc/gi, kwcStr);
    }
    const isNewConstruction = !['toiture'].includes(installationType);

    const terrainNum = addrNum;
    const terrainVoie = addrVoie;
    const terrainLieudit = project?.terrain_lieudit || project?.lieudit || '';
    const terrainCity = city;
    const terrainZip = zip;

    // ── Remplissage des champs AcroForm ────────────────────────────
    const fieldMap = CERFA_FIELDS[type] || CERFA_FIELDS.dp;
    try {
      const form = pdfDoc.getForm();

      const setField = (candidates, value, fixedFontSize = null) => {
        if (!value && value !== 0) return false;
        const nameList = Array.isArray(candidates) ? candidates : [candidates];
        for (const name of nameList) {
          try {
            const f = form.getTextField(name);
            if (f) {
              let strVal = String(value).trim();
              const max = f.getMaxLength();
              if (max && strVal.length > max) {
                strVal = strVal.substring(0, max);
              }
              if (fixedFontSize !== null) {
                try {
                  f.acroField.dict.set(PDFName.of('DA'), PDFString.of(`/Helv ${fixedFontSize} Tf 0 g`));
                  f.setFontSize(fixedFontSize);
                } catch (fontErr) {
                  try {
                    f.acroField.dict.set(PDFName.of('DA'), PDFString.of(`/Helv ${fixedFontSize} Tf 0 g`));
                  } catch (_) {}
                }
              }
              f.setText(strVal);
              return true;
            }
          } catch (_) {}
        }
        return false;
      };

      const setCheck = (candidates, checked = true) => {
        const nameList = Array.isArray(candidates) ? candidates : [candidates];
        for (const name of nameList) {
          try {
            const cb = form.getCheckBox(name);
            if (cb) {
              checked ? cb.check() : cb.uncheck();
              return true;
            }
          } catch (_) {}
        }
        return false;
      };

      let isCerfa16702_03 = false;
      try {
        isCerfa16702_03 = Boolean(form.getCheckBox('P5PA2') || form.getTextField('R2N_deposant'));
      } catch (_) {}

      const fullDeclarantName = `${firstName} ${lastName}`.trim() || lastName || project?.demandeur || '';

      // 0. Le cadre réservé à la mairie (et récépissé de dépôt) ne doit JAMAIS être rempli automatiquement
      const MAIRIE_RESERVED_FIELDS = [
        'M2C_dept', 'M2K_commune', 'M2S_annee', 'M2D_dossier', 'M2E_date', 'M2M_cachet',
        'M2B_ABF', 'M2J_PN',
        'R2A_numero', 'R2M_date', 'R3A_cachet',
        'R2N_deposant', 'R3D_denomination', 'R3N_numero', 'R3V_voie', 'R3W_lieudit',
        'R3L_localite', 'R3C_code', 'R3B_boite', 'R3X_cedex', 'R3T_telephone', 'R3GE1_email', 'R3GE2_email',
        'N1D_date', 'N1C_reception', 'N1T_recepteur',
        'topmostSubform[0].Page1[0].N1C_reception[0]',
        'topmostSubform[0].Page1[0].N1T_recepteur[0]',
        'topmostSubform[0].Page1[0].N1D_date[0]',
      ];
      for (const mField of MAIRIE_RESERVED_FIELDS) {
        try {
          const tf = form.getTextField(mField);
          if (tf) tf.setText('');
        } catch (_) {}
        try {
          const cb = form.getCheckBox(mField);
          if (cb) cb.uncheck();
        } catch (_) {}
      }

      // 1. Identité du déclarant (Page 2 ou 4 du CERFA)
      setCheck(['topmostSubform[0].Page2[0].D1H_homme[0]', 'D1H_homme'], true);
      setField(fieldMap.nom,            lastName, 9.5);
      setField(fieldMap.prenom,         firstName, 9.5);
      setField(fieldMap.naissance,      birthDate, 9);
      if (birthCity) {
        setField(fieldMap.commune_naiss, birthCity, 9);
      }
      setField(fieldMap.dept_naiss,     birthDept, 9);
      setField(fieldMap.pays_naiss,     birthCountry, 9);
      setField(fieldMap.siret,          project?.siret || '', 9);
      setField(fieldMap.denomination,   project?.company || project?.denomination || '', 9);
      setField(fieldMap.raison,         project?.raison || '', 9);
      setField(fieldMap.type_societe,   project?.companyType || '', 9);
      setField(fieldMap.rep_nom,        lastName, 9);
      setField(fieldMap.rep_prenom,     firstName, 9);

      // 2. Coordonnées du déclarant (Page 2 ou 4 du CERFA)
      setField(fieldMap.adresse_num,    addrNum, 9.5);
      setField(fieldMap.adresse_voie,   addrVoie, 9.5);
      setField(fieldMap.adresse_lieudit,project?.lieudit || '', 9);
      setField(fieldMap.commune,        city, 9.5);
      setField(fieldMap.cp,             zip, 9.5);
      setField(fieldMap.tel,            tel, 9.5);
      setField(fieldMap.pays,           'FRANCE', 9.5);
      setField(fieldMap.email_left,     emailLeft, 8.5);
      setField(fieldMap.email_right,    emailRight, 8.5);

      // Case d'acceptation par voie électronique (Page 2 ou 4 du CERFA)
      setCheck(['topmostSubform[0].Page2[0].D5A_acceptation[0]', 'D5A_acceptation'], true);

      // 3. Le terrain & Cadastre (Page 3 ou 5 du CERFA)
      // Adresse du terrain (Section 2.1)
      setField(['topmostSubform[0].Page3[0].T2Q_numero[0]', 'T2Q_numero'], terrainNum, 9.5);
      setField(['topmostSubform[0].Page3[0].T2V_voie[0]', 'T2V_voie'], terrainVoie, 9.5);
      setField(['topmostSubform[0].Page3[0].T2W_lieudit[0]', 'T2W_lieudit'], terrainLieudit, 9.5);
      setField(['topmostSubform[0].Page3[0].T2L_localite[0]', 'T2L_localite'], terrainCity, 9.5);
      setField(['topmostSubform[0].Page3[0].T2C_code[0]', 'T2C_code'], terrainZip, 9.5);

      // Références cadastrales (Section 2.2)
      // Ligne 1
      setField(fieldMap.prefixe,        p0.prefixe || project?.cadastre_prefixe || '', 9);
      setField(fieldMap.section,        section, 9.5);
      setField(fieldMap.parcelle,       parcelle, 9.5);
      setField(fieldMap.surface,        surface, 9.5);

      // Ligne 2 (si 2ème parcelle présente)
      if (parcellesList.length > 1 && parcellesList[1]) {
        const p1 = parcellesList[1];
        setField(['topmostSubform[0].Page3[0].T2FP2_prefixe[0]', 'T2FP2_prefixe'], p1.prefixe || '', 9);
        setField(['topmostSubform[0].Page3[0].T2SP2_section[0]', 'T2SP2_section'], (p1.section || '').toUpperCase().trim(), 9.5);
        setField(['topmostSubform[0].Page3[0].T2NP2_numero[0]', 'T2NP2_numero'], (p1.numero || '').trim(), 9.5);
        const p1Surf = p1.surface ? String(p1.surface).replace(/\D/g, '') : '';
        setField(['topmostSubform[0].Page3[0].T2TP2_superficie[0]', 'T2TP2_superficie'], p1Surf, 9.5);
      }

      // Ligne 3 (si 3ème parcelle ou cumul des suivantes)
      if (parcellesList.length > 2 && parcellesList[2]) {
        const p2 = parcellesList[2];
        setField(['topmostSubform[0].Page3[0].T2FP3_prefixe[0]', 'T2FP3_prefixe'], p2.prefixe || '', 9);
        const p2Sec = (parcellesList.length > 3)
          ? parcellesList.slice(2).map(p => (p.section || '').toUpperCase().trim()).filter(Boolean).join(', ')
          : (p2.section || '').toUpperCase().trim();
        const p2Num = (parcellesList.length > 3)
          ? parcellesList.slice(2).map(p => (p.numero || '').trim()).filter(Boolean).join(', ')
          : (p2.numero || '').trim();
        const p2SurfSum = parcellesList.slice(2).reduce((acc, p) => acc + (Number(String(p.surface || '').replace(/\D/g, '')) || 0), 0);
        setField(['topmostSubform[0].Page3[0].T2SP3_section[0]', 'T2SP3_section'], p2Sec, 9.5);
        setField(['topmostSubform[0].Page3[0].T2NP3_numero[0]', 'T2NP3_numero'], p2Num, 9.5);
        setField(['topmostSubform[0].Page3[0].T2TP3_superficie[0]', 'T2TP3_superficie'], p2SurfSum > 0 ? String(p2SurfSum) : '', 9.5);
      }

      // Si formulaire à ligne unique (ex: 13404 ou 13703) et parcelles multiples, concaténer les numéros
      if (parcellesList.length > 1) {
        try {
          if (!form.getTextField('T2SP2_section') && !form.getTextField('topmostSubform[0].Page3[0].T2SP2_section[0]')) {
            const allSec = [...new Set(parcellesList.map(p => (p.section || '').toUpperCase().trim()).filter(Boolean))].join(', ');
            const allNum = parcellesList.map(p => (p.numero || '').trim()).filter(Boolean).join(', ');
            if (allSec) setField(fieldMap.section, allSec, 9);
            if (allNum) setField(fieldMap.parcelle, allNum, 9);
          }
        } catch (_) {}
      }

      // Superficie totale du terrain (en m²)
      setField(['topmostSubform[0].Page3[0].D5T_total[0]', 'D5T_total', 'topmostSubform[0].Page10[0].D5T_total[0]', 'F1TS1_totale'], totalSurface, 9.5);

      // Section 3.2 : Situation juridique du terrain — Non pour CU, Je ne sais pas pour le reste (conforme image dossier)
      setCheck(['topmostSubform[0].Page3[0].T3H_CUnon[0]', 'T3H_CUnon'], true);
      setCheck(['topmostSubform[0].Page3[0].T3S_lotnc[0]', 'T3S_lotnc'], true);
      setCheck(['topmostSubform[0].Page3[0].T3T_ZACnc[0]', 'T3T_ZACnc'], true);
      setCheck(['topmostSubform[0].Page3[0].T3E_AFUnc[0]', 'T3E_AFUnc'], true);
      setCheck(['topmostSubform[0].Page3[0].T3F_PUPnc[0]', 'T3F_PUPnc'], true);

      // 4. Nature des travaux & Description (Page 4 ou 6 du CERFA)
      // Cocher "Nouvelle construction" par défaut
      if (isNewConstruction) {
        setCheck(['topmostSubform[0].Page4[0].C2ZA1_nouvelle[0]', 'topmostSubform[0].Page5[0].C2ZA1_nouvelle[0]', 'C2ZA1_nouvelle'], true);
      } else {
        setCheck(['topmostSubform[0].Page4[0].C2ZB1_existante[0]', 'topmostSubform[0].Page5[0].C2ZB1_existante[0]', 'C2ZB1_existante'], true);
      }
      if (isBat) {
        setCheck(['C2ZC3_cloture', 'topmostSubform[0].Page4[0].C2ZC3_cloture[0]'], true);
        setField(['C2ZA7_autres'], 'Station technique de stockage batteries', 9);
      }
      setField(fieldMap.description,    objet, 9.5);

      // 5. Puissance crête (ex: 499 kW), Destination, Matériaux, Fondations, Emprise au sol
      const kwcValue = cleanKwcVal || (isBat ? '500' : '499');
      if (isBat) {
        setField(['topmostSubform[0].Page5[0].C2ZE1_puissance[0]', 'C2ZE1_puissance'], '500', 9.5);
        setField(['topmostSubform[0].Page5[0].C2ZP1_crete[0]', 'C2ZP1_crete'], '500', 9.5);
        setField(['topmostSubform[0].Page5[0].C2ZR1_destination[0]', 'C2ZR1_destination'], 'Injection réseau', 9.5);
        setCheck(['C6ZL2_metal', 'topmostSubform[0].Page7[0].C6ZL2_metal[0]'], true);
        setCheck(['C6ZL5_beton', 'topmostSubform[0].Page7[0].C6ZL5_beton[0]'], true);
        setCheck(['C6ZM1_classique', 'topmostSubform[0].Page7[0].C6ZM1_classique[0]'], true);
      } else {
        setField(['topmostSubform[0].Page5[0].C2ZP1_crete[0]', 'C2ZP1_crete'], kwcValue, 9.5);
        setField(['topmostSubform[0].Page5[0].C2ZE1_puissance[0]', 'C2ZE1_puissance'], kwcValue, 9.5);
        setField(['topmostSubform[0].Page5[0].C2ZR1_destination[0]', 'C2ZR1_destination'], project?.destination_energie || 'Revente totale', 9.5);
        setCheck(['C6ZL2_metal', 'topmostSubform[0].Page7[0].C6ZL2_metal[0]'], true);
        setCheck(['C6ZM1_classique', 'topmostSubform[0].Page7[0].C6ZM1_classique[0]'], true);
      }

      // Emprise au sol créée (Section 4.3)
      let empriseCreee = project?.emprise || project?.emprise_creee || project?.surface_emprise || '';
      if (!empriseCreee) {
        const b0 = (Array.isArray(project?.buildings) && project.buildings[0]) || {};
        const bL = Number(b0.length || project?.longueur || 75);
        const bW = Number(b0.totalWidth || b0.width || project?.largeur || 31.6);
        empriseCreee = String(Math.round(bL * bW) || 2370);
      }
      setField(['W3ES2_creee', 'S1I_emprise', 'topmostSubform[0].Page7[0].W3ES2_creee[0]'], String(empriseCreee), 9.5);

      // 6. Engagement & Signature (page 9/18 du CERFA : Ville, Date JJMMAAAA, Prénom & Nom)
      // Priorité : ville du terrain (commune du projet) > adresse parsée > ville du demandeur
      const sigLieu = project?.dp_config?.terrain?.ville || project?.terrain_city || project?.terrain_commune || project?.commune || terrainCity || city || project?.city || 'FRANCE';
      setField(fieldMap.sig_lieu, sigLieu, 9.5);
      setField([
        'E1L_lieu',
        'topmostSubform[0].Page9[0].E1L_lieu[0]',
        'topmostSubform[0].Page8[0].E1L_lieu[0]',
        'topmostSubform[0].Page10[0].E1L_lieu[0]',
        'topmostSubform[0].Page11[0].E1L_lieu[0]'
      ], sigLieu, 9.5);

      setField([
        'E1D_date',
        'topmostSubform[0].Page9[0].E1D_date[0]',
        'topmostSubform[0].Page8[0].E1D_date[0]',
        'topmostSubform[0].Page10[0].E1D_date[0]',
        'topmostSubform[0].Page11[0].E1D_date[0]',
        'topmostSubform[0].Page16[0].F9D_date[0]',
        'topmostSubform[0].Page19[0].E1D_date[0]',
        'topmostSubform[0].Page19[0].F9D_date[0]',
        'F9D_date',
        'V1D_date'
      ], dateStr, 9.5);

      const clientSignatureName = (firstName && lastName)
        ? `${firstName} ${lastName}`
        : (fullDeclarantName || `${lastName} ${firstName}`.trim() || 'Le déclarant');

      setField([
        'E1S_signature',
        'topmostSubform[0].Page9[0].E1S_signature[0]',
        'topmostSubform[0].Page11[0].E1S_signature[0]',
        'topmostSubform[0].Page8[0].E1S_signature[0]'
      ], clientSignatureName, 9.5);

      // 7. Bordereau des pièces jointes (pages 11/18, 12/18 et 13/18)
      // Par défaut : DPC1, DPC2, DPC3, DPC4, DPC6, DPC7 et DPC8
      const plateList = Array.isArray(plateIds) ? plateIds : [];

      let isCerfa13703 = false;
      try {
        isCerfa13703 = Boolean(form.getCheckBox('P5PA1') && (form.getCheckBox('P4GF1') || form.getCheckBox('P4MA1')));
      } catch (_) {}

      if (isCerfa16702_03) {
        CERFA_16702_03_ALL_BORDEREAU.forEach(name => setCheck(name, false));

        // DPC1 : Plan de situation (Page 11/18)
        setCheck('P5PA2', true);
        // DPC2 : Plan de masse (Page 11/18)
        setCheck('P5PB1', true);
        // DPC3 : Plan en coupe (Page 11/18)
        setCheck('P3GE1', true);
        // DPC4 : Plan des façades et des toitures (Page 12/18)
        setCheck('P3GD1', true);
        // DPC5 : Représentation de l'aspect extérieur (si demandé)
        if (plateList.some(id => id.includes('aspect') || id.includes('materiaux'))) {
          setCheck('P5PC1', true);
        }
        // DPC6 : Insertion paysagère dans son environnement (Page 12/18)
        setCheck('P3GF1', true);
        // DPC7 : Environnement proche (Page 12/18)
        setCheck('P3GG1', true);
        // DPC8 : Paysage lointain (Page 12/18)
        setCheck('P3GH1', true);
        // DPC11 : Notice descriptive (Page 12/18)
        if (plateList.some(id => id.includes('notice') || id.includes('dp11') || id.includes('pc11')) || plateList.length === 0) {
          setCheck('P4CD1', true);
        }
      } else if (isCerfa13703) {
        ['P5PA1', 'P5PB1', 'P4GE1', 'P4GF1', 'P5PC1', 'P4EG1', 'P4HG1', 'P4MA1', 'P8EA1', 'P4CD1'].forEach(name => setCheck(name, false));

        // DP1 : Plan de situation
        if (plateList.some(id => id.includes('situation')) || plateList.length > 0) setCheck('P5PA1', true);
        // DP2 : Plan de masse
        if (plateList.some(id => id.includes('masse')) || plateList.length > 0) setCheck('P5PB1', true);
        // DP3 : Plan en coupe
        if (plateList.some(id => id.includes('section') || id.includes('coupe'))) setCheck('P4GE1', true);
        // DP4 : Plan des façades et des toitures
        if (plateList.some(id => id.includes('facades') || id.includes('toiture'))) setCheck('P4GF1', true);
        // DP5 : Aspect extérieur
        if (plateList.some(id => id.includes('aspect') || id.includes('materiaux'))) setCheck('P5PC1', true);
        // DP6 : Insertion paysagère
        if (plateList.some(id => id.includes('insertion') || id.includes('dp6') || id.includes('pc6'))) setCheck('P4EG1', true);
        // DP7 : Environnement proche
        if (plateList.some(id => id.includes('env-proche') || id.includes('dp7') || id.includes('pc7') || (id.includes('env') && !id.includes('env-lointain')))) setCheck('P4HG1', true);
        // DP8 : Environnement lointain
        if (plateList.some(id => id.includes('env-lointain') || id.includes('dp8') || id.includes('pc8') || (id.includes('env') && !id.includes('env-proche')))) setCheck('P4MA1', true);
        // DP11 : Notice descriptive
        if (plateList.some(id => id.includes('notice') || id.includes('dp11') || id.includes('pc11'))) setCheck('P4CD1', true);
      } else {
        ALL_BORDEREAU_CHECKBOXES.forEach(name => setCheck(name, false));

        if (plateList.some(id => id.includes('situation')) || plateList.length > 0) {
          PLATE_CHECKBOX_MAP.dpc1.forEach(name => setCheck(name, true));
        }
        if (plateList.some(id => id.includes('masse')) || plateList.length > 0) {
          PLATE_CHECKBOX_MAP.dpc2.forEach(name => setCheck(name, true));
        }
        if (plateList.some(id => id.includes('section'))) {
          PLATE_CHECKBOX_MAP.dpc3.forEach(name => setCheck(name, true));
        }
        if (plateList.some(id => id.includes('facades'))) {
          PLATE_CHECKBOX_MAP.dpc4.forEach(name => setCheck(name, true));
        }
        if (plateList.some(id => id.includes('insertion'))) {
          PLATE_CHECKBOX_MAP.dpc6.forEach(name => setCheck(name, true));
        }
        if (plateList.some(id => id.includes('env-proche') || (id.includes('env') && !id.includes('env-lointain')))) {
          PLATE_CHECKBOX_MAP.dpc7.forEach(name => setCheck(name, true));
        }
        if (plateList.some(id => id.includes('env-lointain') || (id.includes('env') && !id.includes('env-proche')))) {
          PLATE_CHECKBOX_MAP.dpc8.forEach(name => setCheck(name, true));
        }
        if (plateList.some(id => id.includes('notice'))) {
          PLATE_CHECKBOX_MAP.dpc11.forEach(name => setCheck(name, true));
        }
      }
    } catch (e) {
      console.error('[SmartCerfa] Erreur remplissage AcroForm — le CERFA ne sera pas pré-rempli:', e.message, e);
    }

    try {
      const form = pdfDoc.getForm();
      const formFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      form.updateFieldAppearances(formFont);
    } catch (fontErr) {
      console.warn('[SmartCerfa] updateFieldAppearances notice:', fontErr?.message);
    }

    try {
      const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'));
      if (acroForm) {
        acroForm.set(PDFName.of('NeedAppearances'), PDFBool.True);
      }
    } catch (_) {}

    return await pdfDoc.save();
  } catch (err) {
    console.error('[SmartCerfa] smartFillCerfa error:', err);
    return null;
  }
}

export function buildCerfaDataSummary(project, installationType) {
  const names = resolveDemandeurNames(project);
  const fullName = project?.demandeur || `${names.firstName} ${names.lastName}`.trim() || names.lastName || project?.name || '—';
  const email = (project?.cerfaEmailChoice === 'email2' && project?.email2)
    ? project.email2
    : (project?.email || project?.clientEmail || '—');

  const rawAddress = project?.address || project?.clientAddress || project?.adresse || '';
  const rawZip = project?.zip || project?.postalCode || project?.code_postal || '';
  const rawCity = project?.commune || project?.city || project?.cadastre_commune || '';

  const parsed = parseFrenchAddress(rawAddress, rawZip, rawCity);
  const fullAddress = parsed.voie
    ? `${parsed.numero ? parsed.numero + ' ' : ''}${parsed.voie}${parsed.codePostal ? ' ' + parsed.codePostal : ''}${parsed.commune ? ' ' + parsed.commune : ''}`.trim()
    : (rawAddress || '—');

  // Détermination du type
  const isBatProject = (project?.solutionType === 'battery' || installationType === 'battery' || installationType === 'batterie' || installationType === 'batterie_standalone') && project?.solutionType !== 'building' && project?.solutionType !== 'ombriere';
  const isDP = (installationType === 'dp' || project?.type === 'dp' || project?.docType === 'dp' || project?.typeLabel === 'dp' || (project?.type || '').includes('Ombrière') || project?.solutionType === 'ombriere');
  let typeLabel = isBatProject ? 'Station Batteries Stand-Alone' : (project?.urbanismeType || project?.typeLabel || (isDP ? 'Ombrière photovoltaïque' : 'Bâtiment et Ombrière'));
  if (!isBatProject && !project?.urbanismeType && !project?.typeLabel) {
    const bList = project?.buildings || [];
    if (isDP) {
      typeLabel = bList.length > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque';
    } else if (bList.length > 1) {
      typeLabel = 'Bâtiment et Ombrière';
    } else if (installationType === 'ombriere' || (project?.type || '').includes('ombriere')) {
      typeLabel = 'Ombrière photovoltaïque';
    } else if (installationType === 'toiture' || (project?.type || '').includes('toiture')) {
      typeLabel = 'Panneaux en toiture existante';
    } else {
      typeLabel = 'Bâtiment et Ombrière';
    }
  }

  const rawKwc = project?.puissance || project?.kwc || project?.projectSize || '';
  const displayKwc = rawKwc ? (String(rawKwc).includes('kWc') ? String(rawKwc) : `${rawKwc} kWc`) : '—';

  const pList = (Array.isArray(project?.parcelles) && project.parcelles.length > 0)
    ? project.parcelles
    : (Array.isArray(project?.cadastre_parcelles) && project.cadastre_parcelles.length > 0)
      ? project.cadastre_parcelles
      : [{
          section: project?.cadastre_section || '',
          numero: project?.cadastre_numero || '',
          surface: project?.cadastre_surface || '',
        }];

  let cadastreDisplay = '';
  if (pList.length > 1) {
    const totalSurf = pList.reduce((acc, p) => acc + (Number(String(p.surface || '').replace(/\D/g, '')) || 0), 0);
    cadastreDisplay = `Parcelles : ${pList.map(p => `${p.section ? `${p.section} ` : ''}n° ${p.numero || '—'}${p.surface ? ` (${p.surface} m²)` : ''}`).join(', ')}${totalSurf > 0 ? ` (Total : ${totalSurf} m²)` : ''}`;
  } else {
    cadastreDisplay = `Section ${project?.cadastre_section || pList[0]?.section || '—'} n° ${project?.cadastre_numero || pList[0]?.numero || '—'} (${project?.cadastre_surface ? project.cadastre_surface + ' m²' : (pList[0]?.surface ? pList[0].surface + ' m²' : '—')})`;
  }

  return {
    demandeur: fullName,
    email: email,
    adresse: fullAddress,
    cadastre: cadastreDisplay,
    commune: parsed.commune || rawCity || '—',
    puissance: displayKwc,
    type: typeLabel,
    siret: project?.siret || '—',
    date: new Date().toLocaleDateString('fr-FR'),
  };
}
