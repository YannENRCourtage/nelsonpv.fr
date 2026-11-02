/**
 * dpInstructionService.js
 * 
 * Moteur juridique et technique pour le suivi temps réel des Déclarations Préalables (DP)
 * Articles R.423-23, R.423-24, R.423-38, R.423-39, R.423-42, L.424-2, L.424-5 et R.424-13 du Code de l'urbanisme.
 * 
 * - Décodage automatique du numéro officiel de DP et extraction du code INSEE
 * - Résolution automatique des coordonnées de la Mairie (Adresse LRAR, Téléphone, Email officiel)
 * - Moteur de calcul des délais d'instruction de quantième à quantième avec prorogation légale
 * - Génération du courrier PDF A4 officiel de Demande de certificat de non-opposition tacite
 * - Générateur d'email pré-rempli (mailto & presse-papier) pour la Mairie
 */

import jsPDF from 'jspdf';
import { ENR_COURTAGE_LOGO_BASE64 } from '../assets/logoBase64.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. EXTRACTION & NORMALISATION DU NUMÉRO DE DP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse universel et robuste de n'importe quel format de date (français DD/MM/YYYY, ISO, timestamp)
 * Ne renvoie JAMAIS "Invalid Date".
 */
export function parseFrenchOrIsoDate(rawDate) {
  if (!rawDate) return null;
  if (rawDate instanceof Date) {
    return isNaN(rawDate.getTime()) ? null : rawDate;
  }
  // Support Timestamp Firestore ({ seconds, nanoseconds } ou méthode .toDate())
  if (typeof rawDate === 'object') {
    if (typeof rawDate.toDate === 'function') {
      const d = rawDate.toDate();
      return isNaN(d?.getTime()) ? null : d;
    }
    if (typeof rawDate.seconds === 'number') {
      const d = new Date(rawDate.seconds * 1000);
      return isNaN(d?.getTime()) ? null : d;
    }
  }

  const str = String(rawDate).trim();
  if (!str || str.toLowerCase() === 'invalid date' || str === '—' || str === '-' || str === 'jj/mm/aaaa') {
    return null;
  }

  // 1. Format français DD/MM/YYYY ou DD-MM-YYYY (ex: "14/08/2026", "05/10/2026")
  const frMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})/);
  if (frMatch) {
    const day = parseInt(frMatch[1], 10);
    const month = parseInt(frMatch[2], 10) - 1; // 0-based
    let year = parseInt(frMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Format ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Timestamp numérique
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    const d = new Date(num < 1e11 ? num * 1000 : num);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Date standard ISO / UTC
  const standardDate = new Date(str);
  if (!isNaN(standardDate.getTime())) {
    return standardDate;
  }

  return null;
}

/**
 * Formate une date en format ISO standard 'YYYY-MM-DD' (idéal pour <input type="date" />)
 */
export function formatToIsoDate(rawDate) {
  const d = parseFrenchOrIsoDate(rawDate);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formate une date en format français lisible 'DD/MM/YYYY'
 */
export function formatToFrenchDate(rawDate) {
  const d = parseFrenchOrIsoDate(rawDate);
  if (!d) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${m}/${y}`;
}

/**
 * Récupère par ordre de priorité la date de dépôt existante d'un dossier
 * en inspectant toutes les clés existantes en base, workflow et jalons.
 */
export function resolveProjectDepositDate(project, stepState = null) {
  if (!project && !stepState) return null;
  const p = project || {};
  const s = stepState || p.devWorkflow?.dp || {};

  const candidates = [
    // Clés prioritaires explicites
    p.dpDepositDate,
    p.dateDepotDP,
    p.dp_deposit_date,
    p.date_depot_dp,
    p.depositDate,
    p.deposit_date,
    s?.depositDate,
    s?.dp_deposit_date,
    p.stepsState?.dp?.depositDate,
    p.devWorkflow?.dp?.depositDate,
    p.urbanisme?.dp?.dateDepot,
    p.urbanisme?.dp?.date_depot,
    p.urbanisme?.dp?.derniereIntervention,
    p.steps?.dp?.date,
    // Jalons d'intervention saisis précédemment
    s?.lastIntervention,
    p.lastIntervention,
    p.last_intervention,
    p.devWorkflow?.dp?.lastIntervention,
    p.stepsState?.dp?.lastIntervention,
    p.derniereIntervention,
    p.derniere_intervention,
    p.devWorkflow?.cu?.lastIntervention,
    p.stepsState?.cu?.lastIntervention,
    // Dates du dossier
    p.createdAt,
    p.created_at,
    p.date,
    p.updatedAt,
    p.updated_at,
  ];

  for (const c of candidates) {
    if (c) {
      const parsed = parseFrenchOrIsoDate(c);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Normalisation stricte d'un numéro de DP (avec ou sans espaces)
 * Ex: 'DP0871262600074' ou 'DP 087 126 26 00074' -> 'DP 087 126 26 00074'
 */
export function normalizeDpNumber(rawInput) {
  if (!rawInput) return null;
  const raw = String(rawInput).trim().toUpperCase();
  const digits = raw.replace(/[^A-Z0-9]/g, '');
  if (!digits || digits.length < 5) return null;

  let type = 'DP';
  let rest = digits;
  if (digits.startsWith('DP')) {
    type = 'DP';
    rest = digits.slice(2);
  } else if (digits.startsWith('PC')) {
    type = 'PC';
    rest = digits.slice(2);
  }

  // 1. Cas Corse (2A ou 2B)
  const corseMatch = rest.match(/^(?:0)?(2[AB])(\d{3})(\d{2})([A-Z0-9]+)$/);
  if (corseMatch) {
    const [, dept, comm, an, dossier] = corseMatch;
    return {
      type,
      dpt2: dept,
      dpt3: '0' + dept,
      comm3: comm,
      codeInsee: dept + comm,
      year: an,
      fullYear: 2000 + parseInt(an, 10),
      dossierNum: dossier,
      normalized: `${type} ${dept} ${comm} ${an} ${dossier}`,
      formatted: `${type} ${dept} ${comm} ${an} ${dossier}`,
      cleanNoSpace: `${type}${dept}${comm}${an}${dossier}`,
      numDau: `${dept}${comm}${an}${dossier}`,
    };
  }

  // 2. Cas Métropole standard à 3 chiffres dept (ex: 087 126 26 00074 -> 13 chars)
  const stdMatch = rest.match(/^(\d{3})(\d{3})(\d{2})([A-Z0-9]{4,5})$/);
  if (stdMatch) {
    const [, dpt3, comm3, an, dossier] = stdMatch;
    const dpt2 = dpt3.startsWith('0') ? dpt3.slice(1) : dpt3;
    const codeInsee = dpt2 + comm3;
    return {
      type,
      dpt2,
      dpt3,
      comm3,
      codeInsee,
      year: an,
      fullYear: 2000 + parseInt(an, 10),
      dossierNum: dossier,
      normalized: `${type} ${dpt3} ${comm3} ${an} ${dossier}`,
      formatted: `${type} ${dpt3} ${comm3} ${an} ${dossier}`,
      cleanNoSpace: `${type}${dpt3}${comm3}${an}${dossier}`,
      numDau: `${dpt3}${comm3}${an}${dossier}`,
    };
  }

  // 3. Cas Métropole avec 2 chiffres dept (ex: 87 126 26 00074 -> 12 chars)
  const dpt2Match = rest.match(/^([0-9]{2})(\d{3})(\d{2})([A-Z0-9]{4,5})$/);
  if (dpt2Match) {
    const [, dpt2, comm3, an, dossier] = dpt2Match;
    const dpt3 = '0' + dpt2;
    const codeInsee = dpt2 + comm3;
    return {
      type,
      dpt2,
      dpt3,
      comm3,
      codeInsee,
      year: an,
      fullYear: 2000 + parseInt(an, 10),
      dossierNum: dossier,
      normalized: `${type} ${dpt3} ${comm3} ${an} ${dossier}`,
      formatted: `${type} ${dpt3} ${comm3} ${an} ${dossier}`,
      cleanNoSpace: `${type}${dpt3}${comm3}${an}${dossier}`,
      numDau: `${dpt3}${comm3}${an}${dossier}`,
    };
  }

  // 4. Cas spécial à longueur variable (ex: 'DP 087 09 526 M0036' -> Insee 87095)
  const flexibleMatch = rest.match(/^(\d{3})(\d{3})(\d{2})([A-Z0-9]+)$/);
  if (flexibleMatch) {
    const [, dpt3, comm3, an, dossier] = flexibleMatch;
    const dpt2 = dpt3.startsWith('0') ? dpt3.slice(1) : dpt3;
    const codeInsee = dpt2 + comm3;
    return {
      type,
      dpt2,
      dpt3,
      comm3,
      codeInsee,
      year: an,
      fullYear: 2000 + parseInt(an, 10),
      dossierNum: dossier,
      normalized: `${type} ${dpt3} ${comm3} ${an} ${dossier}`,
      formatted: `${type} ${dpt3} ${comm3} ${an} ${dossier}`,
      cleanNoSpace: `${type}${dpt3}${comm3}${an}${dossier}`,
      numDau: `${dpt3}${comm3}${an}${dossier}`,
    };
  }

  // Fallback direct
  const fallbackInsee = extractInseeFromDpNumber(rawInput);
  return {
    type,
    dpt2: fallbackInsee ? fallbackInsee.slice(0, 2) : '',
    dpt3: fallbackInsee ? '0' + fallbackInsee.slice(0, 2) : '',
    comm3: fallbackInsee ? fallbackInsee.slice(2) : '',
    codeInsee: fallbackInsee,
    year: '26',
    fullYear: 2026,
    dossierNum: rest.slice(-5) || '',
    normalized: rawInput,
    formatted: rawInput,
    cleanNoSpace: digits,
    numDau: rest,
  };
}

/**
 * Extrait le code INSEE à 5 caractères depuis un numéro de DP français.
 */
export function extractInseeFromDpNumber(dpNumber) {
  if (!dpNumber) return null;
  const normalized = normalizeDpNumber(dpNumber);
  if (normalized?.codeInsee) return normalized.codeInsee;

  const raw = String(dpNumber).trim().toUpperCase();
  const clean = raw.replace(/^D\.?P\.?\s*/i, '').replace(/[\s\-_.]/g, '');
  if (!clean || clean.length < 5) return null;

  if (/^97[1-6]\d{2}/.test(clean)) return clean.slice(0, 5);
  const corseMatch = clean.match(/^(?:0)?(2[AB])(\d{3})/i);
  if (corseMatch) return `${corseMatch[1].toUpperCase()}${corseMatch[2]}`;
  const metro00Match = clean.match(/^00([1-9])(\d{3})/);
  if (metro00Match) return `0${metro00Match[1]}${metro00Match[2]}`;
  const metro3Match = clean.match(/^0([1-9]\d)(\d{3})/);
  if (metro3Match) return `${metro3Match[1]}${metro3Match[2]}`;
  const metro2Match = clean.match(/^([0-9]{2})(\d{3})/);
  if (metro2Match) return `${metro2Match[1]}${metro2Match[2]}`;

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. RÉSOLUTION DES COORDONNÉES DE LA MAIRIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interroge l'API geo.api.gouv.fr et l'API de l'Annuaire de l'Administration
 * pour récupérer les coordonnées officielles de la Mairie.
 */
export async function fetchMairieByInsee(codeInsee) {
  if (!codeInsee) return null;
  const insee = String(codeInsee).trim();

  let communeInfo = null;
  let annuaireData = null;

  // 1. geo.api.gouv.fr
  try {
    const geoUrl = `https://geo.api.gouv.fr/communes/${insee}?fields=nom,code,codesPostaux,departement,region`;
    const res = await fetch(geoUrl);
    if (res.ok) {
      communeInfo = await res.json();
    }
  } catch (err) {
    console.warn('[dpInstructionService] Erreur geo.api.gouv.fr:', err);
  }

  // 2. api-lannuaire.service-public.gouv.fr
  try {
    const annuaireUrl = `https://api-lannuaire.service-public.gouv.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records?where=code_insee_commune%3D%22${encodeURIComponent(insee)}%22%20and%20pivot%20like%20%22mairie%22&limit=1`;
    const res = await fetch(annuaireUrl);
    if (res.ok) {
      const json = await res.json();
      annuaireData = json.results?.[0] || null;
    }
  } catch (err) {
    console.warn('[dpInstructionService] Erreur api-lannuaire:', err);
  }

  const communeName = communeInfo?.nom || annuaireData?.nom_commune || 'la Commune';
  const defaultCp = (communeInfo?.codesPostaux && communeInfo.codesPostaux[0]) || '';

  // Parsing adresse annuaire
  let parsedAddress = '';
  let codePostal = defaultCp;
  let voie = '';
  let bp = '';

  if (annuaireData?.adresse) {
    try {
      const addrs = typeof annuaireData.adresse === 'string' ? JSON.parse(annuaireData.adresse) : annuaireData.adresse;
      if (Array.isArray(addrs) && addrs.length > 0) {
        const primary = addrs[0];
        voie = primary.numero_voie || '';
        bp = primary.service_distribution || '';
        codePostal = primary.code_postal || defaultCp;
        const comp1 = primary.complement1 || '';
        const comp2 = primary.complement2 || '';
        const lines = [comp1, comp2, voie, bp].filter(Boolean);
        parsedAddress = lines.join(' - ');
      }
    } catch {
      // fallback
    }
  }

  // Parsing téléphone
  let telephone = null;
  if (annuaireData?.telephone) {
    try {
      const phones = typeof annuaireData.telephone === 'string' ? JSON.parse(annuaireData.telephone) : annuaireData.telephone;
      if (Array.isArray(phones) && phones.length > 0) {
        telephone = phones[0].valeur || phones[0];
      } else if (typeof annuaireData.telephone === 'string') {
        telephone = annuaireData.telephone;
      }
    } catch {
      telephone = String(annuaireData.telephone);
    }
  }

  // Email officiel
  const email = annuaireData?.adresse_courriel || null;

  // Formatage nom mairie
  const rawNom = annuaireData?.nom || `Mairie de ${communeName}`;
  const nomMairie = rawNom.replace(/^Mairie\s*-\s*/i, 'Mairie de ');

  // Adresse complète formatée pour lettre officielle
  const adresseDestinataire = [
    `Monsieur ou Madame le Maire`,
    nomMairie,
    voie,
    bp,
    `${codePostal} ${communeName}`
  ].filter(Boolean).join('\n');

  return {
    insee,
    commune: communeName,
    nomMairie,
    codePostal,
    voie: voie || parsedAddress,
    adresseLigne: parsedAddress ? `${parsedAddress}, ${codePostal} ${communeName}` : `${codePostal} ${communeName}`,
    adresseDestinataire,
    telephone: telephone || '',
    email: email || '',
    departement: communeInfo?.departement?.nom || communeInfo?.departement?.code || insee.slice(0, 2),
    region: communeInfo?.region?.nom || '',
    sveUrl: annuaireData?.sve || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2BIS. INTERROGATION SITADEL / DIDO SDES & SYNCHRONISATION MULTI-SOURCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interroge la base nationale SITADEL (via API DiDo SDES du Ministère de la Transition Écologique)
 * sur le NUM_DAU complet et renvoie les données officielles d'urbanisme si trouvées.
 */
export async function querySitadelDau(numDau, codeInsee = null) {
  if (!numDau) return null;
  const cleanDau = String(numDau).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Table SDES DiDo : Locaux non-résidentiels (BESS, photovoltaïque, hangars)
  const nonResRid = 'f8f0700f-806c-40a7-83b1-f21cf507e7c4';

  const dauVariants = new Set([cleanDau]);
  if (cleanDau.startsWith('DP') || cleanDau.startsWith('PC')) {
    dauVariants.add(cleanDau.slice(2));
  }
  if (!cleanDau.startsWith('0') && cleanDau.length === 12) {
    dauVariants.add(`0${cleanDau}`);
  }

  for (const v of dauVariants) {
    try {
      const url = `https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/${nonResRid}/rows?pageSize=10&NUM_DAU=eq:${encodeURIComponent(v)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          return json.data[0];
        }
      }
    } catch {
      // Ignorer timeout ou indisponibilité réseau
    }
  }

  return null;
}

/**
 * Recherche et synchronisation multi-sources d'une DP (SITADEL + Annuaire Mairie + Géo API)
 * Accepte les saisies avec ou sans espaces (ex: 'DP0871262600074' ou 'DP 087 126 26 00074')
 */
export async function searchAndSyncDp(rawInput, existingProjectData = {}) {
  const norm = normalizeDpNumber(rawInput);
  if (!norm) {
    throw new Error('Numéro de DP invalide ou incomplet.');
  }

  const { normalized, numDau, codeInsee } = norm;

  // 1. Interrogation parallèle Mairie & SITADEL
  const [mairieInfo, sitadelData] = await Promise.all([
    fetchMairieByInsee(codeInsee),
    querySitadelDau(numDau, codeInsee),
  ]);

  // 2. Résolution de la date de dépôt
  let resolvedDepositDate = null;
  if (sitadelData?.DR_DEPOT || sitadelData?.DATE_REELLE_DEPOT) {
    resolvedDepositDate = parseFrenchOrIsoDate(sitadelData.DR_DEPOT || sitadelData.DATE_REELLE_DEPOT);
  } else {
    // Si trop récent pour SITADEL, conserver la date existante du dossier (NE JAMAIS L'ÉCRASER PAR DU VIDE !)
    resolvedDepositDate = resolveProjectDepositDate(existingProjectData);
  }

  const depositDateIso = formatToIsoDate(resolvedDepositDate);
  const depositDateFormatted = formatToFrenchDate(resolvedDepositDate);

  // 3. Résolution de la décision / statut officiel
  let decisionStatus = 'En attente de réponse';
  let decisionDate = null;

  if (sitadelData) {
    if (sitadelData.DATE_REELLE_AUTORISATION) {
      decisionDate = sitadelData.DATE_REELLE_AUTORISATION;
    }
    if (sitadelData.ETAT_DAU === 2) {
      decisionStatus = 'Accord explicite obtenu';
    } else if (sitadelData.ETAT_DAU === 3) {
      decisionStatus = 'Opposition notifiée';
    } else {
      decisionStatus = 'En cours d\'instruction';
    }
  }

  // 4. Calcul de la timeline
  const timeline = calculateDpTimeline({
    depositDate: resolvedDepositDate,
    regime: existingProjectData?.dp_regime || '1_mois',
    hasComplement: Boolean(existingProjectData?.dp_has_complement),
    complementDate: existingProjectData?.dp_complement_date || null,
    hasRefusal: decisionStatus === 'Opposition notifiée',
    certificateObtained: decisionStatus === 'Accord explicite obtenu' || Boolean(existingProjectData?.dp_certificate_obtained),
    displayDate: existingProjectData?.dp_display_date || existingProjectData?.date_constat_huissier,
  });

  if (!sitadelData && timeline.isOverdue) {
    decisionStatus = 'Accord tacite acquis (délai dépassé)';
  }

  return {
    success: true,
    normalizedDp: normalized,
    numDau,
    codeInsee,
    communeName: mairieInfo?.commune || norm.comm3,
    mairieInfo,
    sitadelFound: Boolean(sitadelData),
    sitadelData: sitadelData || null,
    depositDateIso,
    depositDateFormatted,
    legalDueDateIso: timeline.legalDueDateIso,
    legalDueDateFormatted: timeline.legalDueDateFormatted,
    decisionStatus,
    decisionDate,
    timeline,
    cadastre: {
      section: sitadelData?.SEC_CADASTRE1 || existingProjectData?.cadastre_section,
      numero: sitadelData?.NUM_CADASTRE1 || existingProjectData?.cadastre_numero,
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MOTEUR DE CALCUL JURIDIQUE DES DÉLAIS (ART. R.423-23 & SUIVANTS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Algorithme de Butcher pour le calcul du jour de Pâques (UTC)
 */
function getEasterUtc(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Liste des jours fériés légaux français pour une année donnée (format 'YYYY-MM-DD')
 */
export function getFrenchPublicHolidays(year) {
  const easter = getEasterUtc(year);
  const easterTime = easter.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

  const holidays = new Set([
    `${year}-01-01`, // Jour de l'An
    `${year}-05-01`, // Fête du Travail
    `${year}-05-08`, // Victoire 1945
    `${year}-07-14`, // Fête Nationale
    `${year}-08-15`, // Assomption
    `${year}-11-01`, // Toussaint
    `${year}-11-11`, // Armistice
    `${year}-12-25`, // Noël
    fmtDate(new Date(easterTime + 1 * dayMs)),  // Lundi de Pâques
    fmtDate(new Date(easterTime + 39 * dayMs)), // Jeudi de l'Ascension
    fmtDate(new Date(easterTime + 50 * dayMs))  // Lundi de Pentecôte
  ]);

  return holidays;
}

/**
 * Ajout de mois de quantième à quantième (règle standard du Code civil & R.423-19)
 */
export function addMonthsQuantieme(dateInput, months = 1) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const targetDay = d.getDate();
  d.setMonth(d.getMonth() + months);

  // Si le jour a débordé (ex: 31 janvier + 1 mois -> mars car fév n'a que 28j)
  if (d.getDate() !== targetDay) {
    d.setDate(0); // Dernier jour du mois visé
  }
  return d;
}

/**
 * Prorogation au premier jour ouvrable suivant si l'échéance tombe un samedi, dimanche ou jour férié
 * Article R. 423-42 du Code de l'urbanisme.
 */
export function applyProrogationR42342(date) {
  if (!date || isNaN(date.getTime())) return null;
  const result = new Date(date);

  const pad = (n) => String(n).padStart(2, '0');
  const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let holidays = getFrenchPublicHolidays(result.getFullYear());
  let currentYear = result.getFullYear();

  while (true) {
    if (result.getFullYear() !== currentYear) {
      currentYear = result.getFullYear();
      holidays = getFrenchPublicHolidays(currentYear);
    }

    const dayOfWeek = result.getDay(); // 0 = Dimanche, 6 = Samedi
    const dateKey = toKey(result);

    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = holidays.has(dateKey);

    if (isWeekend || isHoliday) {
      result.setDate(result.getDate() + 1);
    } else {
      break;
    }
  }

  return result;
}

/**
 * Moteur complet de calcul de la chronologie d'instruction DP
 */
export function calculateDpTimeline({
  depositDate,
  regime = '1_mois', // '1_mois' | '2_mois' | 'pieces_complementaires'
  hasComplement = false,
  complementDate = null,
  hasRefusal = false,
  refusalDate = null,
  certificateObtained = false,
  certificateDate = null,
  displayDate = null, // Date constat huissier affichage
  referenceDate = null,
}) {
  const parsedDepDate = parseFrenchOrIsoDate(depositDate);
  if (!parsedDepDate) {
    return {
      isValid: false,
      depositDate: null,
      depositDateFormatted: '—',
      depositDateIso: '',
      legalDueDate: null,
      legalDueDateFormatted: '—',
      legalDueDateIso: '',
      status: 'en_attente_depot',
      statusLabel: 'En attente de date de dépôt',
      counterBadge: '—',
      badgeClass: 'bg-slate-200 text-slate-700',
      totalDays: 30,
      daysRemaining: 0,
      daysElapsed: 0,
      daysOverdue: 0,
      progressPercent: 0,
      isOverdue: false,
    };
  }

  const today = parseFrenchOrIsoDate(referenceDate) || new Date();
  today.setHours(0, 0, 0, 0);

  const depDate = new Date(parsedDepDate);
  depDate.setHours(0, 0, 0, 0);

  // Point de départ effectif de l'instruction :
  // Si des pièces complémentaires ont été déposées, le délai repart à compter de leur réception (R.423-39)
  const isComplementActive = Boolean(hasComplement || regime === 'pieces_complementaires');
  const compDate = (isComplementActive && complementDate) ? parseFrenchOrIsoDate(complementDate) : null;
  if (compDate) compDate.setHours(0, 0, 0, 0);

  const effectiveStartDate = compDate || depDate;

  // Durée de l'instruction en mois : 2 mois si ABF/Monument historique, 1 mois sinon
  const instructionMonths = regime === '2_mois' ? 2 : 1;

  // 1. Date d'échéance légale initiale
  const rawDueDate = addMonthsQuantieme(effectiveStartDate, instructionMonths);
  // 2. Prorogation week-ends et jours fériés (Art. R.423-42)
  const legalDueDate = applyProrogationR42342(rawDueDate);
  if (legalDueDate) legalDueDate.setHours(23, 59, 59, 999);

  // 3. Date de fin du 1er mois de dépôt initial (période de notification des pièces manquantes ou majoration ABF)
  const firstMonthEnd = applyProrogationR42342(addMonthsQuantieme(depDate, 1));

  // 4. Date de naissance de l'accord tacite (le lendemain de l'échéance à 00h00)
  const tacitApprovalDate = legalDueDate ? new Date(legalDueDate.getTime() + 1000) : null;
  if (tacitApprovalDate) tacitApprovalDate.setHours(0, 0, 0, 0);

  // 5. Post-accord : Fin du délai de retrait administratif (3 mois, Art. L.424-5)
  const retraitAdminDeadline = tacitApprovalDate ? applyProrogationR42342(addMonthsQuantieme(tacitApprovalDate, 3)) : null;

  // 6. Post-accord : Fin de purge du recours des tiers (2 mois après affichage terrain constaté par huissier, Art. R.600-2)
  let recoursTiersDeadline = null;
  const dispD = parseFrenchOrIsoDate(displayDate);
  if (dispD) {
    dispD.setHours(0, 0, 0, 0);
    recoursTiersDeadline = applyProrogationR42342(addMonthsQuantieme(dispD, 2));
  }

  // Calcul des jours restants et progression
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = legalDueDate ? Math.max(1, Math.round((legalDueDate.getTime() - effectiveStartDate.getTime()) / dayMs)) : 30;
  const diffDays = legalDueDate ? Math.round((legalDueDate.getTime() - today.getTime()) / dayMs) : 0;
  
  const isOverdue = legalDueDate ? (today.getTime() > legalDueDate.getTime()) : false;
  const isFirstMonthActive = firstMonthEnd ? (today.getTime() <= firstMonthEnd.getTime() && !hasComplement) : false;

  const daysOverdue = isOverdue ? Math.max(1, Math.round((today.getTime() - legalDueDate.getTime()) / dayMs)) : 0;
  const daysRemaining = isOverdue ? 0 : Math.max(0, diffDays);
  const daysElapsed = isOverdue ? totalDays : Math.max(0, totalDays - daysRemaining);
  const progressPercent = isOverdue ? 100 : Math.min(99, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  // Détermination du statut
  let status = 'en_cours';
  let statusLabel = `En cours d'instruction (J-${daysRemaining} avant accord tacite)`;
  let counterBadge = `J-${daysRemaining}`;
  let badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';

  if (certificateObtained) {
    status = 'certificat_obtenu';
    statusLabel = 'Certificat officiel obtenu ✓';
    counterBadge = 'Certifié';
    badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
  } else if (hasRefusal) {
    status = 'refus';
    statusLabel = 'Opposition notifiée par la Mairie';
    counterBadge = 'Refusé';
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
  } else if (isOverdue) {
    status = 'accord_tacite';
    statusLabel = `ACCORD TACITE ACQUIS (Art. R.424-13) — Dépassé de ${daysOverdue} j`;
    counterBadge = `J+${daysOverdue} (Tacite)`;
    badgeClass = 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200 animate-pulse font-black';
  }

  const fmt = (d) => d ? formatToFrenchDate(d) : '—';
  const fmtIso = (d) => d ? formatToIsoDate(d) : '';

  return {
    isValid: true,
    effectiveStartDate,
    effectiveStartDateFormatted: fmt(effectiveStartDate),
    depositDate: depDate,
    depositDateFormatted: fmt(depDate),
    depositDateIso: fmtIso(depDate),
    complementDateFormatted: compDate ? fmt(compDate) : null,
    instructionMonths,
    legalDueDate,
    legalDueDateFormatted: fmt(legalDueDate),
    legalDueDateIso: fmtIso(legalDueDate),
    firstMonthEnd,
    firstMonthEndFormatted: fmt(firstMonthEnd),
    isFirstMonthActive,
    firstMonthAlertText: isFirstMonthActive
      ? `Période critique : La mairie peut notifier une majoration ABF (+1 mois) ou des pièces manquantes jusqu'au ${fmt(firstMonthEnd)}.`
      : null,
    tacitApprovalDate,
    tacitApprovalDateFormatted: fmt(tacitApprovalDate),
    retraitAdminDeadline,
    retraitAdminDeadlineFormatted: fmt(retraitAdminDeadline),
    recoursTiersDeadline,
    recoursTiersDeadlineFormatted: fmt(recoursTiersDeadline),
    displayDateFormatted: dispD ? fmt(dispD) : null,
    totalDays,
    daysRemaining,
    daysElapsed,
    daysOverdue,
    progressPercent,
    isOverdue,
    hasRefusal,
    certificateObtained,
    status,
    statusLabel,
    counterBadge,
    badgeClass,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. GÉNÉRATEUR DU COURRIER PDF OFFICIEL A4 (ART. R.424-13)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Génère le courrier PDF officiel A4 de demande de certificat de non-opposition tacite
 * Conforme à l'article R. 424-13 du Code de l'urbanisme.
 */
export async function generateCertificatTaciteLetterPDF({
  dpNumber,
  depositDate,
  complementDate = null,
  legalDueDate,
  demandeurName = 'ENR COURTAGE ENERGIE',
  demandeurAddress = '12 Avenue de l’Énergie, 33127 Saint-Jean-d’Illac',
  demandeurEmail = 'contact@enr-courtage.fr',
  demandeurTel = '05 56 00 00 00',
  demandeurSignataire = 'Yann BARBERIS — Direction du Développement',
  projectTitle = 'Installation d’une station de stockage d’énergie par batteries BESS sur dalle béton < 20 m²',
  natureTravaux = 'Installation d’une station de stockage d’énergie stationnaire par batteries (BESS) sur dalle béton avec clôture grillagée rigide et armoires techniques.',
  terrainAddress = '',
  communeName = '',
  codePostal = '',
  cadastreSection = '',
  cadastreNumero = '',
  cadastreSurface = '',
  mairieNom = '',
  mairieAddress = '',
  todayFormatted = new Date().toLocaleDateString('fr-FR'),
  returnBlobOnly = false,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // 1. Logo émetteur (Haut Gauche)
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', margin, 14, 42, 12);
    } catch (e) {
      console.warn('Erreur ajout logo:', e);
    }
  }

  // 2. Bloc Émetteur (Haut Gauche, sous le logo)
  let y = 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(demandeurName.toUpperCase(), margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  y += 4.5;
  if (demandeurAddress) {
    doc.text(demandeurAddress, margin, y);
    y += 4;
  }
  doc.text(`Tél : ${demandeurTel}  •  Email : ${demandeurEmail}`, margin, y);

  // 3. Date et lieu (Haut Droite)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const dateLocationText = `Fait le ${todayFormatted}`;
  doc.text(dateLocationText, pageWidth - margin, 32, { align: 'right' });

  // 4. Cadre Destinataire (Mairie, Droite)
  const destX = pageWidth / 2 + 5;
  const destY = 46;
  const destW = pageWidth - margin - destX;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(destX, destY, destW, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Monsieur ou Madame le Maire`, destX + 5, destY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(13, 54, 96); // ENR blue
  doc.text(mairieNom || `Mairie de ${communeName}`, destX + 5, destY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  doc.text('Service Urbanisme & Autorisations du Sol', destX + 5, destY + 18);
  if (mairieAddress) {
    const addressLines = doc.splitTextToSize(mairieAddress, destW - 10);
    doc.text(addressLines, destX + 5, destY + 23);
  } else {
    doc.text(`${codePostal} ${communeName.toUpperCase()}`, destX + 5, destY + 23);
  }

  // 5. Mention d'acheminement (LRAR / SVE)
  y = 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38); // red-600
  doc.text(`LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION OU DÉPÔT SVE`, margin, y);

  // 6. Objet & Références juridiques
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Objet :`, margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 54, 96);
  const objectTitle = `Demande de certificat de non-opposition tacite à Déclaration Préalable — Dossier n° ${dpNumber}`;
  doc.text(objectTitle, margin + 14, y);

  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Application stricte de l'article R. 424-13 du Code de l'urbanisme`, margin + 14, y);

  // Trait de séparation
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);

  // 7. Corps du courrier officiel
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(30, 41, 59);

  doc.text(`Madame, Monsieur le Maire,`, margin, y);

  y += 6;
  const depotContext = complementDate
    ? `En date du ${depositDate}, puis suite au dépôt régulier des pièces complémentaires réceptionnées par vos services le ${complementDate}, la société / le pétitionnaire ${demandeurName} a déposé auprès de votre mairie une Déclaration Préalable enregistrée sous le numéro ${dpNumber}, portant sur le projet suivant :`
    : `En date du ${depositDate}, la société / le pétitionnaire ${demandeurName} a déposé auprès de vos services une Déclaration Préalable enregistrée sous le numéro ${dpNumber}, portant sur le projet suivant :`;

  const splitDepotContext = doc.splitTextToSize(depotContext, contentWidth);
  doc.text(splitDepotContext, margin, y);
  y += splitDepotContext.length * 4.6 + 2;

  // Puces descriptives du projet
  const bulletIndent = margin + 5;
  const bulletTextWidth = contentWidth - 10;

  doc.setFillColor(13, 54, 96);
  doc.circle(margin + 2, y - 1, 1, 'F');
  const travauxLine = doc.splitTextToSize(`Nature des travaux : ${natureTravaux || projectTitle}`, bulletTextWidth);
  doc.text(travauxLine, bulletIndent, y);
  y += travauxLine.length * 4.4 + 1.5;

  doc.circle(margin + 2, y - 1, 1, 'F');
  const terrainLine = doc.splitTextToSize(`Adresse du terrain d’assiette : ${terrainAddress || 'Adresse du projet'}, ${codePostal} ${communeName}`, bulletTextWidth);
  doc.text(terrainLine, bulletIndent, y);
  y += terrainLine.length * 4.4 + 1.5;

  doc.circle(margin + 2, y - 1, 1, 'F');
  const cadastreStr = `Références cadastrales : Section ${cadastreSection || '—'} n° ${cadastreNumero || '—'}${cadastreSurface ? ` (Superficie : ${cadastreSurface} m²)` : ''}`;
  const cadastreLine = doc.splitTextToSize(cadastreStr, bulletTextWidth);
  doc.text(cadastreLine, bulletIndent, y);
  y += cadastreLine.length * 4.4 + 4;

  // Paragraphe 2 : Constat juridique du délai d'instruction
  const para2 = `Conformément aux dispositions des articles R. 423-23 et L. 424-2 du Code de l'urbanisme ainsi qu'aux mentions légales impératives figurant sur le récépissé de dépôt officiel, et en l'absence de notification d'une décision expresse d'opposition dans le délai légal d'instruction arrivé à échéance le ${legalDueDate}, nous bénéficions de plein droit depuis cette date d'une décision de non-opposition tacite pour la réalisation des travaux déclarés.`;
  const splitPara2 = doc.splitTextToSize(para2, contentWidth);
  doc.text(splitPara2, margin, y);
  y += splitPara2.length * 4.6 + 4;

  // Paragraphe 3 : Fondement juridique R.424-13 et délivrance obligatoire
  const para3 = `Aussi, afin de nous permettre de justifier de la parfaite régularité de cette autorisation d'urbanisme auprès du gestionnaire du réseau public de distribution d'électricité (Enedis), de notre étude notariale et de nos partenaires bancaires, nous vous prions de bien vouloir nous délivrer, en application stricte de l'article R. 424-13 du Code de l'urbanisme (« Un certificat est délivré sur simple demande du demandeur »), un certificat attestant de l'existence de cette décision de non-opposition tacite et mentionnant la date de transmission du dossier au représentant de l'État dans le département.`;
  const splitPara3 = doc.splitTextToSize(para3, contentWidth);
  doc.text(splitPara3, margin, y);
  y += splitPara3.length * 4.6 + 4;

  // Paragraphe 4 : Formule de politesse
  const para4 = `Vous remerciant par avance pour votre diligence et l'envoi de ce certificat officiel par retour de courrier ou par voie électronique à l'adresse ${demandeurEmail}, nous vous prions d'agréer, Madame, Monsieur le Maire, l'expression de notre considération distinguée.`;
  const splitPara4 = doc.splitTextToSize(para4, contentWidth);
  doc.text(splitPara4, margin, y);
  y += splitPara4.length * 4.6 + 8;

  // 8. Bloc Signature (Bas Droite)
  const signX = pageWidth / 2 + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Pour le demandeur,`, signX, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(demandeurSignataire, signX, y);
  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`« Pour faire valoir ce que de droit »`, signX, y);

  // 9. Pied de page officiel
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const footerText = `${demandeurName}  •  Dossier ${dpNumber}  •  Demande officielle de certificat R.424-13`;
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

  const filename = `Demande_Certificat_Non_Opposition_Tacite_${dpNumber.replace(/\s+/g, '_')}.pdf`;

  if (returnBlobOnly) {
    const blob = doc.output('blob');
    return { blob, filename, doc };
  }

  doc.save(filename);
  return { filename, doc };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. GÉNÉRATEUR D'EMAIL PRÉ-REMPLI POUR LA MAIRIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Construit l'objet, le corps de message et le lien mailto:
 * pour adresser la demande officielle directement par courriel au service urbanisme de la mairie.
 */
export function buildMairieCertificatEmail({
  mairieEmail,
  mairieNom,
  dpNumber,
  depositDate,
  complementDate,
  legalDueDate,
  clientName = '',
  demandeurName = 'ENR COURTAGE ENERGIE',
  demandeurEmail = 'contact@enr-courtage.fr',
  demandeurTel = '05 56 00 00 00',
  projectTitle = "Installation d'une station de stockage d'énergie par batteries (BESS) sur dalle béton < 20 m²",
  terrainAddress = '',
  communeName = '',
  codePostal = '',
  cadastreSection = '',
  cadastreNumero = '',
  cadastreSurface = '',
}) {
  const clientPart = clientName || demandeurName || 'Projet';
  const communePart = communeName || '';
  const clientCommuneStr = (clientPart || communePart) ? ` (${clientPart}${communePart ? ` - ${communePart}` : ''})` : '';

  const subject = `Demande de certificat de non-opposition tacite — Déclaration Préalable n° ${dpNumber}${clientCommuneStr}`;

  const body = `Madame, Monsieur le Maire,
Service Urbanisme de ${mairieNom || `la Mairie de ${communeName}`},

En date du ${depositDate}${complementDate ? ` (puis suite au dépôt des pièces complémentaires réceptionnées le ${complementDate})` : ''}, la société / le pétitionnaire ${demandeurName} a déposé auprès de vos services une Déclaration Préalable enregistrée sous le numéro ${dpNumber}, portant sur le projet suivant :
• Nature des travaux : ${projectTitle}
• Adresse du terrain : ${terrainAddress || 'Adresse du projet'}${communeName ? `, ${codePostal} ${communeName}` : ''}
• Références cadastrales : Section ${cadastreSection || '—'} n° ${cadastreNumero || '—'}${cadastreSurface ? ` (Superficie : ${cadastreSurface} m²)` : ''}

Conformément aux dispositions des articles R. 423-23 et L. 424-2 du Code de l'urbanisme ainsi qu'aux mentions légales figurant sur le récépissé de dépôt officiel, et en l'absence de notification d'une décision expresse d'opposition dans le délai légal d'instruction arrivé à échéance le ${legalDueDate}, nous bénéficions de plein droit depuis cette date d'une décision de non-opposition tacite pour la réalisation de ces travaux.

Aussi, afin de nous permettre de justifier de la parfaite régularité de cette autorisation d'urbanisme auprès du gestionnaire du réseau public de distribution d'électricité (Enedis), de notre étude notariale et de nos partenaires bancaires, nous vous prions de bien vouloir nous délivrer, en application stricte de l'article R. 424-13 du Code de l'urbanisme (« Un certificat est délivré sur simple demande du demandeur »), un certificat attestant de l'existence de cette décision de non-opposition tacite et mentionnant la date de transmission du dossier au représentant de l'État dans le département.

Vous trouverez également en pièce jointe notre courrier officiel formel au format PDF.

Vous remerciant par avance pour votre diligence et l'envoi de ce certificat par retour de courriel à l'adresse ${demandeurEmail}, nous vous prions d'agréer, Madame, Monsieur le Maire, l'expression de notre considération distinguée.

Pour le demandeur,
${demandeurName}
Tél : ${demandeurTel}
Email : ${demandeurEmail}`;

  const fullEmailText = `Destinataire : ${mairieEmail || '(non renseigné)'}\nObjet : ${subject}\n\n${body}`;

  const mailtoUrl = `mailto:${encodeURIComponent(mairieEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    to: mairieEmail || '',
    subject,
    body,
    fullEmailText,
    mailtoUrl,
  };
}
