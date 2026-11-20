import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { findBessOdreData } from '@/data/bessOdreMatrix.js';
import { cadastreService } from '@/services/CadastreService.js';

const TEMPLATE_URL = '/templates/PROMESSE_DE_BAIL_EMPHYTEOTIQUE_BATTERIE_FARADAY.docx';

export const DEFAULT_BENEFICIAIRE_TEXT =
  "ENR COURTAGE, société par actions simplifiée à associé unique, au capital de 5 000 euros, dont le siège social est situé 7 Rue Gutenberg 33700 MERIGNAC, immatriculée sous le numéro 881 890 982 au Registre du Commerce et des Sociétés de BORDEAUX Représentée par son Président, la société ENR PV HOLDING, société par actions simplifiée, sise au 7 Rue Gutenberg 33700 MERIGNAC, immatriculée au Registre du Commerce et des Sociétés de BORDEAUX sous le numéro 908565195.";

/**
 * Échappe les caractères spéciaux XML pour insertion sûre dans word/document.xml
 */
function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Normalise une surface en m² (nombre entier)
 */
export function parseSurfaceM2(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const cleaned = String(val).replace(/\s+/g, '').replace(/m²|m2|ha/gi, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Convertit une surface en m² vers des hectares (format "17.49" ou "0.24")
 */
export function m2ToHectaresString(totalM2) {
  const num = Number(totalM2) || 0;
  if (num <= 0) return '0.00';
  return (num / 10000).toFixed(2);
}

/**
 * Extrait et pré-remplit les données de la promesse de bail FARADAY depuis un projet NELSON
 */
export function extractDefaultPromesseFaradayData(project = {}) {
  const saved = project?.faradayPromesseData || {};

  // Recherche éventuelle dans la matrice ODRE BESS
  let lat = project?.lat ? Number(project.lat) : null;
  let lng = project?.lng ? Number(project.lng) : null;
  if ((!lat || !lng) && project?.gps && typeof project.gps === 'string') {
    const parts = project.gps.split(',');
    if (parts.length >= 2) {
      const pLat = parseFloat(parts[0].trim());
      const pLng = parseFloat(parts[1].trim());
      if (!isNaN(pLat) && !isNaN(pLng)) {
        lat = pLat;
        lng = pLng;
      }
    }
  }

  const bessData = findBessOdreData(
    project?.name || project?.projectName || project?.client || '',
    project?.city || project?.commune || '',
    project?.address || '',
    lat,
    lng
  );

  const rawName = (project?.name || project?.client || bessData?.siteName || '').trim();
  const rawFirstName = (project?.firstName || '').trim();
  const rawCompany = (project?.company || project?.clientSociete || '').trim();

  // Détection automatique société vs personne physique
  const companyRegex = /\b(GFA|SCI|EARL|SAS|SASU|SARL|EURL|SCEA|GAEC|SA|GIE|SOCIETE|SOCIÉTÉ|HOLDING|DOMAINE|CHATEAU|CHÂTEAU)\b/i;
  const isLikelyCompany = Boolean(
    saved.bailleurType === 'societe' ||
    (!saved.bailleurType && (companyRegex.test(rawName) || companyRegex.test(rawCompany)))
  );

  const rawCity = (project?.city || project?.commune || bessData?.commune || '').trim();
  const rawZip = (project?.zip || project?.zipCode || bessData?.codePostal || '').trim();
  const rawAddr = (project?.address || bessData?.address || '').trim();

  // Construction de l'adresse complète du bailleur sans doublon CP/Ville (gère espaces et tirets ex: Saint-Savin / SAINT SAVIN)
  let cleanStreet = rawAddr;
  if (rawZip) {
    const escapedZip = rawZip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanStreet = cleanStreet.replace(new RegExp(`\\b${escapedZip}\\b`, 'g'), ' ').trim();
  }
  if (rawCity) {
    const cityPattern = rawCity
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/[\s-]+/g, '[\\s-]+');
    cleanStreet = cleanStreet.replace(new RegExp(`\\b${cityPattern}\\b`, 'gi'), ' ').trim();
  }
  cleanStreet = cleanStreet.replace(/[\s,-]+$/, '').replace(/\s{2,}/g, ' ').trim();

  const fullBailleurAddress = [cleanStreet, rawZip, rawCity.toUpperCase()].filter(Boolean).join(' ').trim();

  // Extraction des références cadastrales
  const rawPrefixe = project?.cadastre_prefixe || '000';
  const rawSection = (
    project?.cadastre_section ||
    project?.cadastreSection ||
    project?.dp_config?.terrain?.section ||
    bessData?.section ||
    (project?.cadastre ? project.cadastre.split(' ')[0] : '') ||
    ''
  ).replace(/^Sec\.?\s*/i, '').trim();

  const rawNumero = (
    project?.cadastre_numero ||
    project?.cadastreNumero ||
    project?.dp_config?.terrain?.parcelle ||
    bessData?.numero ||
    project?.cadastre_parcel ||
    project?.parcelle ||
    (project?.cadastre ? project.cadastre.split(' ').slice(1).join(' ') : '') ||
    ''
  ).replace(/^n°?\s*/i, '').trim();

  const rawSurface = parseSurfaceM2(
    project?.cadastre_surface ||
    project?.dp_config?.terrain?.contenance_m2 ||
    bessData?.contenance ||
    project?.surface_terrain ||
    project?.surface ||
    0
  );

  const defaultParcelAddress = [cleanStreet, rawZip, rawCity].filter(Boolean).join(' ').toUpperCase();

  const defaultParcelles = Array.isArray(saved.parcelles) && saved.parcelles.length > 0
    ? saved.parcelles
    : [
        {
          prefixe: rawPrefixe || '000',
          section: rawSection || '',
          numero: rawNumero || '',
          adresse: defaultParcelAddress || `${rawZip} ${rawCity.toUpperCase()}`.trim(),
          surfaceM2: rawSurface > 0 ? String(rawSurface) : ''
        }
      ];

  const totalM2 = defaultParcelles.reduce((acc, p) => acc + parseSurfaceM2(p.surfaceM2), 0);
  const autoHa = totalM2 > 0 ? m2ToHectaresString(totalM2) : (saved.superficieTotaleHa || '0.00');

  // Signataires personnes physiques
  const defaultSignataires = Array.isArray(saved.signataires) && saved.signataires.length > 0
    ? saved.signataires
    : [
        {
          civilite: saved.civilite || 'Monsieur',
          prenom: rawFirstName,
          nom: rawName.replace(/\s+\d+$/, ''), // retire un éventuel index de projet ex: "LINDMANN 1" -> "LINDMANN"
          nomCompletOrdre: 'nom_prenom', // 'prenom_nom' ou 'nom_prenom'
          adresse: fullBailleurAddress,
          lieuNaissance: saved.lieuNaissance || project?.lieuNaissance || project?.birthPlace || '',
          dateNaissance: saved.dateNaissance || project?.dateNaissance || project?.birthDate || '',
          nationalite: saved.nationalite || 'française'
        }
      ];

  // Données société
  const defaultSociete = {
    denomination: saved.societe?.denomination || rawCompany || rawName || '',
    capital: saved.societe?.capital || '',
    rcsVille: saved.societe?.rcsVille || rawCity || '',
    siren: saved.societe?.siren || project?.siren || '',
    siegeSocial: saved.societe?.siegeSocial || fullBailleurAddress,
    repCivilite: saved.societe?.repCivilite || 'Monsieur',
    repPrenom: saved.societe?.repPrenom || rawFirstName || '',
    repNom: saved.societe?.repNom || (!companyRegex.test(rawName) ? rawName.replace(/\s+\d+$/, '') : '') || '',
    repAdresse: saved.societe?.repAdresse || fullBailleurAddress,
    repLieuNaissance: saved.societe?.repLieuNaissance || '',
    repDateNaissance: saved.societe?.repDateNaissance || '',
    repNationalite: saved.societe?.repNationalite || 'française'
  };

  // Capture carte pour Annexe 2
  const availableCaptures = [];
  if (Array.isArray(project?.captures)) {
    project.captures.forEach((c, idx) => {
      if (c && typeof c === 'string') {
        availableCaptures.push({ id: `capture_${idx}`, label: `Capture carte #${idx + 1}`, url: c });
      }
    });
  }
  if (project?.urbanisme_captures && typeof project.urbanisme_captures === 'object') {
    Object.entries(project.urbanisme_captures).forEach(([k, v]) => {
      if (v && typeof v === 'string') {
        availableCaptures.push({ id: `urb_${k}`, label: `Capture urbanisme (${k})`, url: v });
      }
    });
  }

  return {
    bailleurType: saved.bailleurType || (isLikelyCompany ? 'societe' : 'personne_physique'),
    signataires: defaultSignataires,
    societe: defaultSociete,
    beneficiaireText: saved.beneficiaireText || DEFAULT_BENEFICIAIRE_TEXT,
    descriptionSite: saved.descriptionSite && saved.descriptionSite !== 'un site agricole dédié à la culture céréalière notamment'
      ? saved.descriptionSite
      : 'un terrain',
    commune: (saved.commune || rawCity || '').toUpperCase(),
    codePostal: saved.codePostal || rawZip || '',
    superficieTotaleHa: saved.superficieTotaleHa && totalM2 === 0 ? saved.superficieTotaleHa : autoHa,
    parcelles: defaultParcelles,
    loyerAnnuelHT: saved.loyerAnnuelHT || '2 000',
    soulteUniqueHT: saved.soulteUniqueHT || '20 000',
    choixRemuneration: saved.choixRemuneration || 'none', // 'none' | 'loyer' | 'soulte'
    puissanceReferenceKwc: saved.puissanceReferenceKwc || '500',
    puissanceReduiteKwc: saved.puissanceReduiteKwc || '250',
    faitA: saved.faitA || '',
    faitLe: saved.faitLe || '',
    mentionSignataireBailleur: saved.mentionSignataireBailleur || '',
    planImageUrl: saved.planImageUrl || (availableCaptures[0]?.url || ''),
    stampCartoucheSurface: false,
    cartoucheAltitude: saved.cartoucheAltitude || '125.0 m',
    cartoucheZonage: saved.cartoucheZonage || 'N / PLUi',
    lat,
    lng,
    availableCaptures
  };
}

/**
 * Interroge l'API Cadastre IGN à partir des coordonnées GPS du projet
 * pour récupérer automatiquement Préfixe, Section, Numéro et Surface Cadastrale (m²)
 */
export async function fetchParcelFromGps(lat, lng) {
  if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) return null;
  try {
    const data = await cadastreService.getParcelle(Number(lat), Number(lng));
    if (!data) return null;
    return {
      prefixe: data.prefixe || '000',
      section: data.section || '',
      numero: data.numero || '',
      surfaceM2: data.contenance ? String(data.contenance) : '',
      commune: (data.nom_commune || '').toUpperCase(),
      geometry: data.geometry || null
    };
  } catch (err) {
    console.warn('[PromesseBailFaraday] Erreur récupération cadastre IGN:', err);
    return null;
  }
}

/**
 * Recherche la surface cadastrale d'une parcelle via son code INSEE/commune + section + numéro
 */
export async function fetchParcelSurfaceByReference({ codeInsee, codePostal, commune, section, numero }) {
  try {
    let insee = codeInsee;
    if (!insee && (codePostal || commune)) {
      const q = codePostal ? `codePostal=${encodeURIComponent(codePostal)}` : `nom=${encodeURIComponent(commune)}`;
      const geoRes = await fetch(`https://geo.api.gouv.fr/communes?${q}&fields=code,nom,codesPostaux&limit=5`);
      if (geoRes.ok) {
        const communes = await geoRes.json();
        if (Array.isArray(communes) && communes.length > 0) {
          const match = commune
            ? communes.find(c => c.nom.toLowerCase() === commune.toLowerCase()) || communes[0]
            : communes[0];
          insee = match?.code;
        }
      }
    }
    if (!insee || !section || !numero) return null;

    const cleanSection = String(section).trim().toUpperCase().padStart(2, '0');
    const cleanNumero = String(numero).trim().padStart(4, '0');
    const url = `https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=${encodeURIComponent(insee)}&section=${encodeURIComponent(cleanSection)}&numero=${encodeURIComponent(cleanNumero)}&source_ign=PCI`;
    let res = await fetch(url);
    let json = res.ok ? await res.json() : null;

    // Fallback sans padStart(2, '0') sur la section si 0 résultat
    if (!json?.features?.length && String(section).trim().length === 1) {
      const url2 = `https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=${encodeURIComponent(insee)}&section=${encodeURIComponent(String(section).trim().toUpperCase())}&numero=${encodeURIComponent(cleanNumero)}&source_ign=PCI`;
      res = await fetch(url2);
      json = res.ok ? await res.json() : null;
    }

    if (json?.features?.length > 0) {
      const props = json.features[0].properties || {};
      return {
        prefixe: props.com_abs && props.com_abs !== '000' ? props.com_abs : '000',
        section: props.section || section,
        numero: props.numero || numero,
        surfaceM2: props.contenance ? String(props.contenance) : '',
        commune: (props.nom_com || commune || '').toUpperCase()
      };
    }
    return null;
  } catch (e) {
    console.warn('[PromesseBailFaraday] Erreur recherche parcelle par référence:', e);
    return null;
  }
}

/**
 * Charge une image (URL ou dataURL) dans un élément HTMLImageElement
 */
async function loadImageElement(src) {
  if (!src) return null;
  let finalSrc = src;
  let objectUrlToRevoke = null;

  if (!src.startsWith('data:')) {
    try {
      const resp = await fetch(src);
      if (resp.ok) {
        const blob = await resp.blob();
        objectUrlToRevoke = URL.createObjectURL(blob);
        finalSrc = objectUrlToRevoke;
      }
    } catch (_) {}
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve(null);
    };
    img.src = finalSrc;
  });
}

/**
 * Dessine ou met à jour le cartouche en bas à gauche de l'image du plan (Annexe 2)
 * afin que la surface de la parcelle (ex: "19 491 m²") apparaisse dans le cadre en bas à gauche,
 * positionnée À GAUCHE du numéro de parcelle (ex: "ZP 0210" ou "0B 0604").
 */
export async function prepareAnnexe2PlanImageWithCartouche(imageSource, cartoucheInfo = {}) {
  const {
    lat,
    lng,
    addressLine1 = '',
    addressLine2 = '',
    altitude = '125.0 m',
    surfaceM2 = '',
    section = '',
    numero = '',
    zoning = 'N / PLUi',
    stampCartouche = true
  } = cartoucheInfo;

  let baseImg = await loadImageElement(imageSource);

  // Si aucune capture n'existe sur le projet mais qu'on a les coordonnées GPS, on génère une vue satellite Esri
  if (!baseImg && lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    try {
      const numLat = Number(lat);
      const numLng = Number(lng);
      const dLat = 0.0014;
      const dLng = 0.0018;
      const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${numLng - dLng},${numLat - dLat},${numLng + dLng},${numLat + dLat}&bboxSR=4326&imageSR=4326&size=900,950&format=png&f=image`;
      baseImg = await loadImageElement(esriUrl);
    } catch (_) {}
  }

  if (!baseImg) return null;

  const canvas = document.createElement('canvas');
  const w = baseImg.naturalWidth || baseImg.width || 900;
  const h = baseImg.naturalHeight || baseImg.height || 950;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(baseImg, 0, 0, w, h);

  if (stampCartouche) {
    // Échelle proportionnelle à la largeur de la capture (référence ~850px de large comme dans les captures NELSON)
    const scale = Math.max(0.75, Math.min(1.45, w / 850));

    const surfNum = parseSurfaceM2(surfaceM2);
    const formattedSurface = surfNum > 0 ? `${surfNum.toLocaleString('fr-FR')} m²` : (surfaceM2 ? `${surfaceM2} m²` : '');
    const formattedSection = section ? (section.length === 1 ? `0${section.toUpperCase()}` : section.toUpperCase()) : '';
    const formattedNumero = numero ? String(numero).padStart(4, '0') : '';
    const parcelLabel = `${formattedSection} ${formattedNumero}`.trim() || 'Parcelle';

    // Positionnement du cadre en bas à gauche (exactement à l'emplacement du cartouche blanc de la carte NELSON, au-dessus de la mini-carte)
    const cardX = Math.round(12 * scale);
    const cardW = Math.round(255 * scale);
    const cardH = Math.round(125 * scale);
    // Sur les captures NELSON, la mini-carte en bas à gauche mesure ~145px de haut + 20px de barre d'échelle
    const cardY = Math.max(Math.round(12 * scale), h - Math.round(288 * scale));

    ctx.save();

    // Ombre et fond blanc arrondi du cartouche
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 10 * scale;
    ctx.shadowOffsetY = 2 * scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2 * scale;

    const r = 8 * scale;
    ctx.beginPath();
    ctx.moveTo(cardX + r, cardY);
    ctx.lineTo(cardX + cardW - r, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
    ctx.lineTo(cardX + cardW, cardY + cardH - r);
    ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH);
    ctx.lineTo(cardX + r, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
    ctx.lineTo(cardX, cardY + r);
    ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    const padX = Math.round(10 * scale);
    let curY = cardY + Math.round(18 * scale);

    // Ligne 1 : Coordonnées GPS + bouton fermeture ×
    const gpsText = (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng)))
      ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
      : 'Coordonnées GPS';
    ctx.font = `bold ${Math.round(11.5 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = '#2563eb';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(gpsText, cardX + padX, curY);

    ctx.font = `bold ${Math.round(12 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText('×', cardX + cardW - padX, curY);

    // Ligne 2 : Adresse (2 lignes)
    curY += Math.round(20 * scale);
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(11 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = '#0f172a';
    const l1 = (addressLine1 || 'Adresse du site').slice(0, 32);
    ctx.fillText(`📍 ${l1}`, cardX + padX, curY);

    curY += Math.round(15 * scale);
    ctx.font = `${Math.round(10.5 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = '#475569';
    const l2 = (addressLine2 || '').slice(0, 34);
    if (l2) {
      ctx.fillText(`     ${l2}`, cardX + padX, curY);
    }

    // Séparateur 1
    curY += Math.round(13 * scale);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(cardX + padX, curY);
    ctx.lineTo(cardX + cardW - padX, curY);
    ctx.stroke();

    // Ligne 3 : Altitude à gauche | SURFACE DE LA PARCELLE À GAUCHE DU NUMÉRO DE PARCELLE à droite
    curY += Math.round(14 * scale);
    ctx.font = `${Math.round(10.5 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(`⛰️ ${altitude || '125.0 m'}`, cardX + padX, curY);

    // Numéro de parcelle tout à droite
    ctx.textAlign = 'right';
    ctx.font = `bold ${Math.round(10.8 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = '#334155';
    const parcelText = `🏷️ ${parcelLabel}`;
    ctx.fillText(parcelText, cardX + cardW - padX, curY);

    // Surface positionnée À GAUCHE du numéro de parcelle dans ce même cadre en bas à gauche
    if (formattedSurface) {
      const parcelTextWidth = ctx.measureText(parcelText).width;
      ctx.font = `bold ${Math.round(10.8 * scale)}px Arial, sans-serif`;
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'right';
      ctx.fillText(`📐 ${formattedSurface}`, cardX + cardW - padX - parcelTextWidth - Math.round(8 * scale), curY);
    }

    // Séparateur 2
    curY += Math.round(12 * scale);
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(cardX + padX, curY);
    ctx.lineTo(cardX + cardW - padX, curY);
    ctx.stroke();

    // Ligne 4 : Zonage urbanistique
    curY += Math.round(14 * scale);
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(10.5 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = '#334155';
    ctx.fillText(`🏛️ Zonage: ${zoning || 'N / PLUi'}`, cardX + padX, curY);

    ctx.restore();
  }

  const dataUrl = canvas.toDataURL('image/png');
  return {
    dataUrl,
    width: w,
    height: h
  };
}

/**
 * Construit un paragraphe Word (<w:p>) au style CorpsA (police 11pt, sans surlignage jaune)
 */
function buildBailleurParagraphXml(text, options = {}) {
  const { bold = false, spacingAfter = 0 } = options;
  const bTag = bold ? '<w:b/><w:bCs/>' : '';
  return `<w:p><w:pPr><w:pStyle w:val="CorpsA"/><w:spacing w:before="0" w:after="${spacingAfter}" w:line="340" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/>${bTag}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/>${bTag}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

/**
 * Construit le bloc XML complet du/des Promettant(s) (Page 1 : ENTRE : ...)
 */
function buildPromettantBlockXml(formData) {
  const paras = [];

  if (formData.bailleurType === 'societe') {
    const soc = formData.societe || {};
    const denom = (soc.denomination || 'SOCIETE').trim();
    const prefixSoc = /^la\s+soci[eé]t[eé]\b/i.test(denom) ? denom : `La société ${denom}`;
    paras.push(buildBailleurParagraphXml(prefixSoc));

    if (soc.capital) {
      const capClean = String(soc.capital).replace(/€|euros?/gi, '').trim();
      paras.push(buildBailleurParagraphXml(`Au capital de ${capClean}€`));
    }
    if (soc.rcsVille || soc.siren) {
      paras.push(
        buildBailleurParagraphXml(
          `Immatriculée au RCS de ${soc.rcsVille || '..........'} sous le numéro ${soc.siren || '..........'}`
        )
      );
    }
    if (soc.siegeSocial) {
      paras.push(buildBailleurParagraphXml(`Dont le siège social est situé ${soc.siegeSocial}`));
    }

    const repCiv = soc.repCivilite || 'Monsieur';
    const repFullName = [repCiv, soc.repPrenom, soc.repNom].filter(Boolean).join(' ').trim();
    if (repFullName) {
      paras.push(buildBailleurParagraphXml(`Représentée par ${repFullName}`));
    }
    if (soc.repAdresse) {
      const addrLine = /^adresse\b/i.test(soc.repAdresse.trim())
        ? soc.repAdresse.trim()
        : `Adresse ${soc.repAdresse.trim()}`;
      paras.push(buildBailleurParagraphXml(addrLine));
    }
    if (soc.repLieuNaissance || soc.repDateNaissance) {
      const neLabel = repCiv === 'Madame' ? 'Née' : 'Né';
      paras.push(
        buildBailleurParagraphXml(
          `${neLabel} à ${soc.repLieuNaissance || '....................'} le ${soc.repDateNaissance || '..../..../........'}`
        )
      );
    }
    paras.push(buildBailleurParagraphXml(`De nationalité ${soc.repNationalite || 'française'},`));
  } else {
    const signataires = Array.isArray(formData.signataires) && formData.signataires.length > 0
      ? formData.signataires
      : [{ civilite: 'Monsieur', prenom: '', nom: '', adresse: '', lieuNaissance: '', dateNaissance: '', nationalite: 'française' }];

    signataires.forEach((sig, idx) => {
      if (idx > 0) {
        paras.push(buildBailleurParagraphXml('Et', { spacingAfter: 60 }));
      }
      const civ = sig.civilite || 'Monsieur';
      const nomStr = (sig.nom || '').trim();
      const prenomStr = (sig.prenom || '').trim();
      const fullPerson = sig.nomCompletOrdre === 'prenom_nom'
        ? [civ, prenomStr, nomStr].filter(Boolean).join(' ').trim()
        : [civ, nomStr, prenomStr].filter(Boolean).join(' ').trim();

      paras.push(buildBailleurParagraphXml(fullPerson || `${civ} ....................`));

      const rawAddr = (sig.adresse || '').trim();
      const addrLine = rawAddr
        ? (/^adresse\b/i.test(rawAddr) ? rawAddr : `Adresse ${rawAddr}`)
        : 'Adresse ............................................................';
      paras.push(buildBailleurParagraphXml(addrLine));

      const neLabel = civ === 'Madame' ? 'Née' : 'Né';
      const lieu = (sig.lieuNaissance || '').trim() || '....................';
      const dateN = (sig.dateNaissance || '').trim() || '..../..../........';
      paras.push(buildBailleurParagraphXml(`${neLabel} à ${lieu} le ${dateN}`));
      paras.push(buildBailleurParagraphXml(`De nationalité ${(sig.nationalite || 'française').trim()},`));
    });
  }

  return paras.join('');
}

/**
 * Construit le tableau XML de l'Article 4 (Désignation du Site et de l'Emplacement)
 * en préservant le style exact du modèle FARADAY et sans surlignage jaune.
 */
function buildArticle4TableXml(parcelles = []) {
  const validParcelles = Array.isArray(parcelles) && parcelles.length > 0
    ? parcelles
    : [{ prefixe: '000', section: '', numero: '', adresse: '', surfaceM2: '' }];

  const buildCell = (width, text, isHeader = false) => {
    const shd = isHeader
      ? '<w:shd w:val="clear" w:color="auto" w:fill="D9D9D9" w:themeFill="background1" w:themeFillShade="D9"/>'
      : '';
    const rPr = isHeader
      ? '<w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:eastAsiaTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:color w:val="000000"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>'
      : '<w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:eastAsiaTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:color w:val="000000"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>';
    const run = text !== ''
      ? `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
      : '';

    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shd}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:line="224" w:lineRule="auto"/><w:ind w:right="76"/><w:jc w:val="center"/>${rPr}</w:pPr>${run}</w:p></w:tc>`;
  };

  const headerRow = `<w:tr><w:trPr><w:trHeight w:val="552"/><w:jc w:val="center"/></w:trPr>${
    buildCell(1148, 'PREFIXE', true) +
    buildCell(1181, 'SECTION', true) +
    buildCell(1210, 'NUMERO', true) +
    buildCell(3744, 'ADRESSE', true) +
    buildCell(1795, 'SURFACE CADASTRALE', true)
  }</w:tr>`;

  const dataRows = validParcelles.map((p) => {
    const surfClean = parseSurfaceM2(p.surfaceM2);
    const surfLabel = surfClean > 0
      ? `${surfClean}m²`
      : (p.surfaceM2 ? (String(p.surfaceM2).includes('m') ? String(p.surfaceM2) : `${p.surfaceM2}m²`) : '');
    return `<w:tr><w:trPr><w:trHeight w:val="413"/><w:jc w:val="center"/></w:trPr>${
      buildCell(1148, (p.prefixe || '000').trim()) +
      buildCell(1181, (p.section || '').trim().toUpperCase()) +
      buildCell(1210, (p.numero || '').trim()) +
      buildCell(3744, (p.adresse || '').trim().toUpperCase()) +
      buildCell(1795, surfLabel)
    }</w:tr>`;
  });

  // 2 lignes supplémentaires vides comme dans le modèle officiel
  const emptyRow1 = `<w:tr><w:trPr><w:trHeight w:val="448"/><w:jc w:val="center"/></w:trPr>${
    buildCell(1148, '') + buildCell(1181, '') + buildCell(1210, '') + buildCell(3744, '') + buildCell(1795, '')
  }</w:tr>`;
  const emptyRow2 = `<w:tr><w:trPr><w:trHeight w:val="426"/><w:jc w:val="center"/></w:trPr>${
    buildCell(1148, '') + buildCell(1181, '') + buildCell(1210, '') + buildCell(3744, '') + buildCell(1795, '')
  }</w:tr>`;

  return `<w:tbl><w:tblPr><w:tblStyle w:val="Grilledutableau2"/><w:tblW w:w="9078" w:type="dxa"/><w:jc w:val="center"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="1148"/><w:gridCol w:w="1181"/><w:gridCol w:w="1210"/><w:gridCol w:w="3744"/><w:gridCol w:w="1795"/></w:tblGrid>${headerRow}${dataRows.join('')}${emptyRow1}${emptyRow2}</w:tbl>`;
}

/**
 * Construit le paragraphe XML contenant l'image du plan d'implantation en Annexe 2
 */
function buildAnnexe2ImageParagraphXml(rId, widthPx, heightPx) {
  // Largeur cible sur la page A4 Word : ~15.8 cm = 5 688 000 EMUs (1 cm = 360 000 EMUs)
  // Hauteur max pour rester sur la page 23 : ~19.5 cm = 7 020 000 EMUs
  const maxCx = 5688000;
  const maxCy = 7020000;
  const ratio = (heightPx && widthPx) ? (heightPx / widthPx) : 1.05;
  let cx = maxCx;
  let cy = Math.round(cx * ratio);
  if (cy > maxCy) {
    cy = maxCy;
    cx = Math.round(cy / ratio);
  }

  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="2026" name="Plan Implantation Annexe 2"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="2026" name="annexe2_plan.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

/**
 * Génère et télécharge le fichier Word (.docx) 100 % modifiable de la Promesse de Bail Emphytéotique Batterie FARADAY
 */
export async function generatePromesseBailFaradayDocx(formData, options = {}) {
  const { download = true } = options;

  // 1. Chargement du modèle Word officiel FARADAY
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(`Impossible de charger le modèle Word FARADAY (${response.status})`);
  }
  const templateBuffer = await response.arrayBuffer();
  const zip = new PizZip(templateBuffer);

  let docXml = zip.file('word/document.xml').asText();

  // 2. Remplacement du bloc Promettant / Bailleur (Page 1 : paragraphes 5, 6, 7)
  const promettantXml = buildPromettantBlockXml(formData);
  const bailleurRegex = /<w:p w14:paraId="553F3417"[\s\S]*?<w:p w14:paraId="3FF83814"[\s\S]*?<\/w:p>/;
  if (bailleurRegex.test(docXml)) {
    docXml = docXml.replace(bailleurRegex, promettantXml);
  }

  // 3. Remplacement éventuel du Bénéficiaire / Preneur si personnalisé
  if (
    formData.beneficiaireText &&
    formData.beneficiaireText.trim() &&
    formData.beneficiaireText.trim() !== DEFAULT_BENEFICIAIRE_TEXT
  ) {
    const customBenefXml = `<w:p w14:paraId="3147F858" w14:textId="40322C48"><w:pPr><w:pStyle w:val="Paragraphedeliste"/><w:ind w:left="0"/><w:jc w:val="both"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(formData.beneficiaireText.trim())}</w:t></w:r></w:p>`;
    docXml = docXml.replace(/<w:p w14:paraId="3147F858"[\s\S]*?<\/w:p>/, customBenefXml);
  }

  // 4. Remplacement du Préambule Point 2 (Page 2 : terrain, superficie en hectares, commune et code postal)
  const rawSiteDesc = (formData.descriptionSite || '').trim();
  const siteDesc = (!rawSiteDesc || rawSiteDesc === 'un site agricole dédié à la culture céréalière notamment' || rawSiteDesc.toLowerCase() === 'terrain')
    ? 'un terrain'
    : rawSiteDesc;
  const totalHa = (formData.superficieTotaleHa || '0.00').toString().replace(',', '.').trim();
  const communeUpper = (formData.commune || '..........').trim().toUpperCase();
  const cp = (formData.codePostal || '.....').trim();

  const preambuleP2Xml =
    `<w:p w14:paraId="716EF908" w14:textId="518F434A"><w:pPr><w:pStyle w:val="Paragraphedeliste"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:line="276" w:lineRule="auto"/><w:ind w:left="0"/><w:jc w:val="both"/></w:pPr>` +
    `<w:r><w:t xml:space="preserve">Le Promettant est quant à lui propriétaire d’${escapeXml(siteDesc)}, tel que matérialisé en Annexe 2, d’une superficie totale de ${escapeXml(totalHa)} hectares, situé sur le territoire de la commune de ${escapeXml(communeUpper)} (${escapeXml(cp)}).</w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p w14:paraId="716EF908"[\s\S]*?<\/w:p>/, preambuleP2Xml);

  // 5. Remplacement du Tableau de l'Article 4 (Désignation du Site et de l'Emplacement - Page 6)
  const article4TableXml = buildArticle4TableXml(formData.parcelles);
  const table1Regex = /<w:tbl><w:tblPr><w:tblStyle w:val="Grilledutableau2"\/>[\s\S]*?<\/w:tbl>/;
  if (table1Regex.test(docXml)) {
    docXml = docXml.replace(table1Regex, article4TableXml);
  }

  // 6. Remplacement de l'Article 9.6 (Loyer ou Soulte & Puissance - Page 15)
  const loyerBox = formData.choixRemuneration === 'loyer' ? '☑' : '☐';
  const soulteBox = formData.choixRemuneration === 'soulte' ? '☑' : '☐';
  const loyerVal = (formData.loyerAnnuelHT || '2 000').toString().trim();
  const soulteVal = (formData.soulteUniqueHT || '20 000').toString().trim();
  const pRef = (formData.puissanceReferenceKwc || '500').toString().replace(/kWc/i, '').trim();
  const pRed = (formData.puissanceReduiteKwc || '250').toString().replace(/kWc/i, '').trim();

  const loyerParaXml =
    `<w:p w14:paraId="20CA9211" w14:textId="645CA1BF"><w:pPr><w:pStyle w:val="Paragraphedeliste"/><w:jc w:val="both"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol" w:cs="Segoe UI Symbol"/></w:rPr><w:t>${loyerBox}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> un loyer annuel d’un montant de ${escapeXml(loyerVal)} euros hors taxes (le « </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Loyer</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> ») ;</w:t></w:r></w:p>`;

  const soulteParaXml =
    `<w:p w14:paraId="165247B5" w14:textId="30F91FA1"><w:pPr><w:pStyle w:val="Paragraphedeliste"/><w:jc w:val="both"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol" w:cs="Segoe UI Symbol"/></w:rPr><w:t>${soulteBox}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> une somme forfaitaire unique d’un montant de ${escapeXml(soulteVal)} euros hors taxes (la « </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Soulte</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> »).</w:t></w:r></w:p>`;

  const puissanceParaXml =
    `<w:p w14:paraId="6A49201F" w14:textId="61333675"><w:pPr><w:pStyle w:val="Paragraphedeliste"/><w:ind w:left="0"/><w:jc w:val="both"/></w:pPr>` +
    `<w:r><w:t xml:space="preserve">Cette rémunération est liée à l’installation d’une puissance de ${escapeXml(pRef)}kWc, elle sera à diviser par 2 si celle-ci devait être de ${escapeXml(pRed)}kWc.</w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p w14:paraId="20CA9211"[\s\S]*?<\/w:p>/, loyerParaXml);
  docXml = docXml.replace(/<w:p w14:paraId="165247B5"[\s\S]*?<\/w:p>/, soulteParaXml);
  docXml = docXml.replace(/<w:p w14:paraId="6A49201F"[\s\S]*?<\/w:p>/, puissanceParaXml);

  // 7. Remplacement optionnel de "Fait à ... le ..." et du nom sous "Pour le Bailleur" (Page 21)
  if ((formData.faitA && formData.faitA.trim()) || (formData.faitLe && formData.faitLe.trim())) {
    const lieuFait = (formData.faitA || '').trim() || '....................................................................................';
    const dateFait = (formData.faitLe || '').trim() || '.......................................';
    const faitParaXml =
      `<w:p w14:paraId="3D3EB8C5" w14:textId="730073D4"><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>` +
      `<w:r><w:t xml:space="preserve">Fait à ${escapeXml(lieuFait)} le ${escapeXml(dateFait)}</w:t></w:r></w:p>`;
    docXml = docXml.replace(/<w:p w14:paraId="3D3EB8C5"[\s\S]*?<\/w:p>/, faitParaXml);
  }

  if (formData.mentionSignataireBailleur && formData.mentionSignataireBailleur.trim()) {
    const sigMentionXml =
      `<w:p w14:paraId="5071C2E0" w14:textId="68B306AF"><w:pPr><w:jc w:val="center"/></w:pPr>` +
      `<w:r><w:t xml:space="preserve">${escapeXml(formData.mentionSignataireBailleur.trim())}</w:t></w:r></w:p>`;
    docXml = docXml.replace(/<w:p w14:paraId="5071C2E0"[\s\S]*?<\/w:p>/, sigMentionXml);
  }

  // 8. Injection de l'image du plan d'implantation centrée en Annexe 2 (Page 23) sans ajout du cadre flottant
  const firstParcel = (Array.isArray(formData.parcelles) && formData.parcelles[0]) || {};
  const preparedPlan = await prepareAnnexe2PlanImageWithCartouche(formData.planImageUrl, {
    lat: formData.lat,
    lng: formData.lng,
    addressLine1: firstParcel.adresse || formData.commune || '',
    addressLine2: `${formData.codePostal || ''} ${formData.commune || ''}`.trim(),
    altitude: formData.cartoucheAltitude || '125.0 m',
    surfaceM2: firstParcel.surfaceM2 || '',
    section: firstParcel.section || '',
    numero: firstParcel.numero || '',
    zoning: formData.cartoucheZonage || 'N / PLUi',
    stampCartouche: false
  });

  if (preparedPlan && preparedPlan.dataUrl) {
    const base64Data = preparedPlan.dataUrl.split(',')[1];
    const rIdPlan = 'rIdAnnexe2Plan';

    // Ajouter le fichier image dans word/media/annexe2_plan.png
    zip.file('word/media/annexe2_plan.png', base64Data, { base64: true });

    // Mettre à jour [Content_Types].xml pour déclarer l'extension png si absente
    let contentTypesXml = zip.file('[Content_Types].xml').asText();
    if (!contentTypesXml.includes('Extension="png"')) {
      contentTypesXml = contentTypesXml.replace(
        '<Types ',
        '<Types '
      ).replace(
        '</Types>',
        '<Default Extension="png" ContentType="image/png"/></Types>'
      );
      zip.file('[Content_Types].xml', contentTypesXml);
    }

    // Mettre à jour word/_rels/document.xml.rels
    let relsXml = zip.file('word/_rels/document.xml.rels').asText();
    if (!relsXml.includes(rIdPlan)) {
      relsXml = relsXml.replace(
        '</Relationships>',
        `<Relationship Id="${rIdPlan}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/annexe2_plan.png"/></Relationships>`
      );
      zip.file('word/_rels/document.xml.rels', relsXml);
    }

    // Remplacer le paragraphe 606 (sous Annexe 2 : Implantation du projet Batterie) par l'image centrée
    const imgParaXml = buildAnnexe2ImageParagraphXml(rIdPlan, preparedPlan.width, preparedPlan.height);
    docXml = docXml.replace(/<w:p w14:paraId="3A194989"[\s\S]*?<\/w:p>/, imgParaXml);
  }

  // 9. Nettoyage de tout surlignage jaune résiduel (<w:highlight w:val="yellow"/>) du modèle
  docXml = docXml.replace(/<w:highlight w:val="yellow"\/>/g, '');

  // 10. Mise à jour du footer pour afficher "Page X sur 23" (valeur mise en cache avant ouverture dans Word)
  if ( zip.file('word/footer1.xml') ) {
    let footerXml = zip.file('word/footer1.xml').asText();
    footerXml = footerXml.replace(/(<w:instrText>NUMPAGES<\/w:instrText>[\s\S]*?<w:t>)24(<\/w:t>)/, '$123$2');
    zip.file('word/footer1.xml', footerXml);
  }

  zip.file('word/document.xml', docXml);

  // 11. Génération du Blob .docx final
  const blob = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  // Nommage du fichier selon la convention : PROMESSE DE BAIL [NOM] [CP] [VILLE].docx
  const mainName = formData.bailleurType === 'societe'
    ? (formData.societe?.repNom || formData.societe?.denomination || 'CLIENT')
    : (formData.signataires?.[0]?.nom || 'CLIENT');
  const cleanFileParts = [
    'PROMESSE DE BAIL',
    mainName.toUpperCase(),
    formData.codePostal || '',
    (formData.commune || '').toUpperCase()
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .trim();

  const filename = `${cleanFileParts}.docx`;

  if (download) {
    saveAs(blob, filename);
  }

  return { blob, filename };
}
