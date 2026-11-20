import PizZip from 'pizzip';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { findBessOdreData } from '@/data/bessOdreMatrix.js';
import { guessCiviliteFromFirstName, parseSurfaceM2 } from '@/services/promesseBailFaradayService.js';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';

const COURRIER_TEMPLATE_URL = '/templates/COURRIER_DEPOT_DP_BATTERIE.docx';

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
 * Récupère l'adresse postale officielle de la Mairie de la commune via les API publiques Etalab / Service-Public
 */
async function resolveMairieStreetAddress({ insee, codePostal, commune, mairieInfo }) {
  // 1. Si mairieInfo fournit déjà une rue explicite
  if (mairieInfo?.adresseRue) return mairieInfo.adresseRue;
  if (mairieInfo?.adresseLrar && typeof mairieInfo.adresseLrar === 'string') {
    const lines = mairieInfo.adresseLrar
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const streetLine = lines.find(
      (l) =>
        !/^mairie\b/i.test(l) &&
        !/^service\s+urbanisme/i.test(l) &&
        !/^\d{5}\b/.test(l)
    );
    if (streetLine) return streetLine;
  }

  try {
    let codeInsee = insee;
    if (!codeInsee && (codePostal || commune)) {
      const q = codePostal
        ? `codePostal=${encodeURIComponent(codePostal)}`
        : `nom=${encodeURIComponent(commune)}`;
      const resGeo = await fetch(`https://geo.api.gouv.fr/communes?${q}&fields=code,nom&limit=5`);
      if (resGeo.ok) {
        const list = await resGeo.json();
        if (Array.isArray(list) && list.length > 0) {
          const normC = String(commune || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[\s-]+/g, ' ')
            .toLowerCase()
            .trim();
          const match =
            list.find(
              (c) =>
                String(c.nom || '')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[\s-]+/g, ' ')
                  .toLowerCase()
                  .trim() === normC
            ) || list[0];
          codeInsee = match?.code;
        }
      }
    }

    if (codeInsee) {
      const resMairie = await fetch(
        `https://etablissements-publics.api.gouv.fr/v3/communes/${encodeURIComponent(codeInsee)}/mairie`
      );
      if (resMairie.ok) {
        const json = await resMairie.json();
        const adr = json?.features?.[0]?.properties?.adresses?.[0];
        if (adr && Array.isArray(adr.lignes) && adr.lignes.length > 0) {
          return adr.lignes.filter(Boolean).join(' ').trim();
        }
      }
    }
  } catch (e) {
    console.warn('[courrierDepotDpService] Impossible de récupérer la rue de la mairie:', e);
  }
  return '';
}

/**
 * Extrait proprement le Lieu-Dit ou la voie du terrain sans doublon de code postal ni de commune
 */
function extractLieuDitOrStreet(rawAddress, cp, commune) {
  if (!rawAddress) return '';
  let s = String(rawAddress).trim();

  if (cp) {
    const escapedZip = cp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(`\\b${escapedZip}\\b`, 'g'), ' ').trim();
  }

  if (commune) {
    // Supporte les variantes avec/sans accents et avec espaces ou tirets (ex: Néris-les-Bains vs NERIS LES BAINS)
    const words = String(commune)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .split(/[\s-]+/)
      .filter(Boolean);

    if (words.length > 0) {
      const charMap = {
        a: '[aàâä]',
        e: '[eéèêë]',
        i: '[iîï]',
        o: '[oôö]',
        u: '[uùûü]',
        c: '[cç]',
        y: '[yÿ]'
      };
      const pattern = words
        .map((w) =>
          w
            .toLowerCase()
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/[aeiouc y]/g, (ch) => charMap[ch] || ch)
        )
        .join('[\\s-]+');
      s = s.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), ' ').trim();
    }
  }

  s = s.replace(/^[\s,;-]+|[\s,;-]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  if (!s) return '';

  // Si l'adresse contient "2 Lieu Dit Beaulieu" ou "Lieu dit Lannet", normaliser en "Lieu-Dit ..."
  const ldMatch = s.match(/^(?:\d+\s+)?lieu[\s-]*dit\s+(.+)$/i);
  if (ldMatch) {
    return `Lieu-Dit ${ldMatch[1].trim()}`;
  }

  // Si ce n'est pas une rue/route/avenue/chemin/impasse/boulevard/place/allée numérotée, préfixer par "Lieu-Dit "
  const hasStreetKeyword = /\b(rue|route|avenue|av|chemin|impasse|all[eé]e|boulevard|bd|place|voie|hameau|quartier|lotissement|cours|quai)\b/i.test(s);
  if (!hasStreetKeyword && !/^\d+\b/.test(s)) {
    return `Lieu-Dit ${s}`;
  }

  return s;
}

/**
 * Génère le fichier Word (.docx) 100 % modifiable du Courrier d'envoi / dépôt de DP Batterie
 * à la date du jour et avec les coordonnées de Yann BARBERIS.
 */
export async function generateCourrierDepotDpDocx(project = {}, mairieInfo = null, options = {}) {
  const { download = true, docType = 'dp' } = options;

  const response = await fetch(COURRIER_TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(`Impossible de charger le modèle Word Courrier DP (${response.status})`);
  }
  const templateBuffer = await response.arrayBuffer();
  const zip = new PizZip(templateBuffer);

  let docXml = zip.file('word/document.xml').asText();

  // Nettoyage des balises de vérification orthographique Word du modèle (<w:proofErr .../>)
  docXml = docXml.replace(/<w:proofErr[^>]*\/>/g, '');

  // Coordonnées GPS éventuelles pour recherche matrice BESS ODRE
  let lat = project?.lat ? Number(project.lat) : null;
  let lng = project?.lng ? Number(project.lng) : null;
  if ((!lat || !lng) && project?.gps && typeof project.gps === 'string') {
    const parts = project.gps.split(',');
    if (parts.length >= 2) {
      lat = parseFloat(parts[0].trim());
      lng = parseFloat(parts[1].trim());
    }
  }

  const bessData = findBessOdreData(
    project?.name || project?.projectName || project?.client || '',
    project?.city || project?.commune || '',
    project?.address || '',
    lat,
    lng
  );

  // 1. Résolution du Demandeur / Mandant (ex: "Monsieur Dominique DESROUFFET", "Madame Claire NEUVEGLISE")
  const rawLast = (project?.name || project?.lastName || project?.demandeur || bessData?.siteName || 'CLIENT')
    .replace(/\s+\d+$/, '')
    .trim();
  const rawFirst = (project?.firstName || '').trim();
  const companyRegex = /\b(GFA|SCI|EARL|SAS|SASU|SARL|EURL|SCEA|GAEC|SA|GIE|SOCIETE|SOCIÉTÉ|HOLDING)\b/i;

  let demandeurComplet = '';
  if (companyRegex.test(rawLast)) {
    demandeurComplet = /^la\s+soci[eé]t[eé]\b/i.test(rawLast) ? rawLast : `la société ${rawLast.toUpperCase()}`;
  } else {
    const civ = project?.civilite && project.civilite !== 'Monsieur et Madame'
      ? project.civilite
      : guessCiviliteFromFirstName(rawFirst);

    // Éviter de dupliquer le prénom s'il est déjà inclus dans rawLast
    const lastClean = rawFirst
      ? rawLast.replace(new RegExp(`\\b${rawFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '').trim()
      : rawLast;

    demandeurComplet = [civ, rawFirst, (lastClean || rawLast).toUpperCase()]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  // 2. Commune, Code postal & Adresse Mairie
  const communeUpper = (
    project?.dp_config?.terrain?.ville ||
    project?.city ||
    project?.commune ||
    bessData?.commune ||
    'COMMUNE'
  )
    .trim()
    .toUpperCase();

  const cp = String(
    project?.dp_config?.terrain?.code_postal ||
    project?.zip ||
    project?.zipCode ||
    project?.codePostal ||
    bessData?.codePostal ||
    ''
  ).trim();

  const mairieStreet = await resolveMairieStreetAddress({
    insee: project?.insee || project?.code_insee || project?.cadastre_code_insee,
    codePostal: cp,
    commune: communeUpper,
    mairieInfo
  });

  // 3. Références cadastrales, Lieu-Dit et Superficie
  const prefixe = (project?.cadastre_prefixe || '000').trim() || '000';
  const section = (
    project?.dp_config?.terrain?.section ||
    project?.cadastre_section ||
    project?.section ||
    bessData?.section ||
    ''
  )
    .replace(/^Sec\.?\s*/i, '')
    .trim()
    .toUpperCase();

  const rawNumero = (
    project?.dp_config?.terrain?.parcelle ||
    project?.cadastre_numero ||
    project?.numero ||
    bessData?.numero ||
    ''
  )
    .replace(/^n°?\s*/i, '')
    .trim();
  const numero = rawNumero.replace(/^0+(?=\d)/, '') || rawNumero;

  const rawSurface = parseSurfaceM2(
    project?.dp_config?.terrain?.contenance_m2 ||
    project?.cadastre_surface ||
    project?.surface_terrain ||
    project?.surface ||
    bessData?.contenance ||
    0
  );
  const surfaceFormatted = rawSurface > 0
    ? rawSurface.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')
    : '';

  const rawAddr =
    project?.dp_config?.terrain?.adresse ||
    project?.address ||
    project?.adresse ||
    bessData?.address ||
    '';
  const lieuDit = extractLieuDitOrStreet(rawAddr, cp, communeUpper);

  const puissanceKw = project?.dp_config?.technique?.puissance_kw || 500;

  // 4. Date du jour en français (ex: "20 novembre 2026")
  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // ── REMPLACEMENTS XML DANS WORD/DOCUMENT.XML ─────────────────────────────

  // A. Bloc destinataire Mairie en haut à droite (w14:paraId="2155EC3A")
  const mairieStreetRun = mairieStreet
    ? `<w:r><w:t>${escapeXml(mairieStreet)}</w:t></w:r><w:r><w:br/></w:r>`
    : '';
  const mairieParaXml =
    `<w:p w14:paraId="2155EC3A" w14:textId="4BE427A3"><w:pPr><w:spacing w:before="300" w:after="0"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:color w:val="0F1E50"/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">MAIRIE DE ${escapeXml(communeUpper)}</w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:color w:val="0F1E50"/><w:sz w:val="21"/></w:rPr><w:br/></w:r>` +
    `<w:r><w:t>Service Urbanisme</w:t></w:r><w:r><w:br/></w:r>` +
    mairieStreetRun +
    `<w:r><w:t>${escapeXml(`${cp} ${communeUpper}`.trim())}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="2155EC3A"[\s\S]*?<\/w:p>/, mairieParaXml);

  // B. Date du jour (w14:paraId="51A7878B")
  const dateParaXml =
    `<w:p w14:paraId="51A7878B" w14:textId="6768FEBC"><w:pPr><w:spacing w:before="200" w:after="80"/><w:jc w:val="right"/></w:pPr>` +
    `<w:r><w:rPr><w:i/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">Mérignac, le ${escapeXml(todayFormatted)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="51A7878B"[\s\S]*?<\/w:p>/, dateParaXml);

  // C. Dossier suivi par : Mr Yann BARBERIS (w14:paraId="2307C387")
  const suiviParaXml =
    `<w:p w14:paraId="2307C387" w14:textId="1A5D0777"><w:pPr><w:spacing w:after="120"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Dossier suivi par : </w:t></w:r>` +
    `<w:r><w:rPr><w:color w:val="0F1E50"/><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Mr Yann BARBERIS  |  Tél : 07 63 87 71 40  |  E-mail : y.barberis@enr-courtage.fr</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="2307C387"[\s\S]*?<\/w:p>/, suiviParaXml);

  // D. Objet (w14:paraId="7BE4D853")
  const objetParaXml =
    `<w:p w14:paraId="7BE4D853" w14:textId="24FBAC4C"><w:pPr><w:spacing w:after="120"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:i/><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:br/></w:r>` +
    `<w:r><w:rPr><w:b/><w:color w:val="0F1E50"/><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Objet : </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(`Dépôt de Déclaration Préalable (DP) – Unité de stockage par batterie de soutien réseau (${puissanceKw} kW)`)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="7BE4D853"[\s\S]*?<\/w:p>/, objetParaXml);

  // E. Tableau récapitulatif (4 lignes)
  // Ligne 1 : Demandeur / Mandant (w14:paraId="188BA5EF")
  const rowDemandeurXml =
    `<w:p w14:paraId="188BA5EF" w14:textId="7B7D17B5"><w:pPr><w:spacing w:before="30" w:after="30"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(demandeurComplet)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="188BA5EF"[\s\S]*?<\/w:p>/, rowDemandeurXml);

  // Ligne 2 : Commune du projet (w14:paraId="162A66DB")
  const communeWithCp = cp ? `${communeUpper} (${cp})` : communeUpper;
  const rowCommuneXml =
    `<w:p w14:paraId="162A66DB" w14:textId="6B4993DF"><w:pPr><w:spacing w:before="30" w:after="30"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(communeWithCp)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="162A66DB"[\s\S]*?<\/w:p>/, rowCommuneXml);

  // Ligne 3 : Référence cadastrale (w14:paraId="03FA447B")
  const refCadText =
    `Parcelle ${prefixe} ${section} ${numero}`.replace(/\s+/g, ' ').trim() +
    (lieuDit ? ` – ${lieuDit}` : '') +
    (surfaceFormatted ? ` (Superficie : ${surfaceFormatted} m²)` : '');
  const rowCadastreXml =
    `<w:p w14:paraId="03FA447B" w14:textId="771CB00B"><w:pPr><w:spacing w:before="30" w:after="30"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(refCadText)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="03FA447B"[\s\S]*?<\/w:p>/, rowCadastreXml);

  // Ligne 4 : Nature du projet (w14:paraId="1B6F35B0")
  const rowNatureXml =
    `<w:p w14:paraId="1B6F35B0" w14:textId="77777777"><w:pPr><w:spacing w:before="30" w:after="30"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(`Installation de batterie de soutien réseau (BESS) – Puissance : ${puissanceKw} kW`)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="1B6F35B0"[\s\S]*?<\/w:p>/, rowNatureXml);

  // F. Paragraphe 1 du corps (w14:paraId="16E79D1A")
  const bodyP1Xml =
    `<w:p w14:paraId="16E79D1A" w14:textId="669FB456"><w:pPr><w:spacing w:after="80" w:line="269" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(`Agissant pour le compte et sur mandat de ${demandeurComplet}, la société ENR COURTAGE a l’honneur de vous transmettre le présent dossier de Déclaration Préalable (DP) relatif à l'implantation d'une unité autonome de stockage par batterie de soutien au réseau (BESS), d'une puissance de ${puissanceKw} kW.`)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="16E79D1A"[\s\S]*?<\/w:p>/, bodyP1Xml);

  // G. Paragraphe 2 du corps (w14:paraId="4E82A4C5")
  const lieuClause = lieuDit ? `, au ${lieuDit}` : '';
  const bodyP2Xml =
    `<w:p w14:paraId="4E82A4C5" w14:textId="1A13D95D"><w:pPr><w:spacing w:after="80" w:line="269" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(`Le projet se situe sur la parcelle cadastrée section ${prefixe} ${section} n° ${numero}${lieuClause} sur votre commune. Cette installation participe activement à la stabilisation, à l’équilibrage et à la transition énergétique du réseau électrique public.`)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="4E82A4C5"[\s\S]*?<\/w:p>/, bodyP2Xml);

  // H. Puces des pièces jointes (Cerfa 16702*03 + Notice sécurité incendie propre)
  const cerfaNumber = docType === 'pc' ? '13404*' : '16702*03';
  const bulletCerfaXml =
    `<w:p w14:paraId="3578A304" w14:textId="77777777"><w:pPr><w:pStyle w:val="Listepuces"/><w:spacing w:after="20" w:line="252" w:lineRule="auto"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(`Formulaire Cerfa n° ${cerfaNumber} dûment complété et signé ;`)}</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="3578A304"[\s\S]*?<\/w:p>/, bulletCerfaXml);

  const bulletIncendieXml =
    `<w:p w14:paraId="174197E5" w14:textId="0EC97BF6"><w:pPr><w:pStyle w:val="Listepuces"/><w:spacing w:after="20" w:line="252" w:lineRule="auto"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="24"/></w:rPr><w:t>Notice de sécurité incendie, prévention du risque feux de forêt (DFCI) &amp; dispositions SDIS.</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="174197E5"[\s\S]*?<\/w:p>/, bulletIncendieXml);

  // I. Paragraphe contact avec les coordonnées de Yann BARBERIS (et non Véronique Dutard) (w14:paraId="70597B88")
  const contactYannXml =
    `<w:p w14:paraId="70597B88" w14:textId="77777777"><w:pPr><w:spacing w:after="120" w:line="269" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="24"/></w:rPr><w:t>Notre collaborateur en charge du dossier, Monsieur Yann BARBERIS (07 63 87 71 40 – y.barberis@enr-courtage.fr), reste à votre disposition pour toute information complémentaire.</w:t></w:r></w:p>`;
  docXml = docXml.replace(/<w:p w14:paraId="70597B88"[\s\S]*?<\/w:p>/, contactYannXml);

  zip.file('word/document.xml', docXml);

  // Génération du fichier Word (.docx)
  const blob = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  const uint8Array = zip.generate({ type: 'uint8array' });

  const cleanClientForFile = [rawLast.toUpperCase(), rawFirst]
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const filename = `Courrier_Depot_DP_Batterie_${cleanClientForFile || 'Client'}.docx`;

  if (download) {
    saveAs(blob, filename);
  }

  return { blob, uint8Array, filename };
}

/**
 * Génère le fichier PDF officiel du Courrier d'envoi / dépôt de DP Batterie
 * à la date du jour et avec les coordonnées de Yann BARBERIS.
 */
export async function generateCourrierDepotDpPdf(project = {}, mairieInfo = null, options = {}) {
  const { download = true, docType = 'dp' } = options;

  // Coordonnées GPS éventuelles pour recherche matrice BESS ODRE
  let lat = project?.lat ? Number(project.lat) : null;
  let lng = project?.lng ? Number(project.lng) : null;
  if ((!lat || !lng) && project?.gps && typeof project.gps === 'string') {
    const parts = project.gps.split(',');
    if (parts.length >= 2) {
      lat = parseFloat(parts[0].trim());
      lng = parseFloat(parts[1].trim());
    }
  }

  const bessData = findBessOdreData(
    project?.name || project?.projectName || project?.client || '',
    project?.city || project?.commune || '',
    project?.address || '',
    lat,
    lng
  );

  // 1. Résolution du Demandeur / Mandant
  const rawLast = (project?.name || project?.lastName || project?.demandeur || bessData?.siteName || 'CLIENT')
    .replace(/\s+\d+$/, '')
    .trim();
  const rawFirst = (project?.firstName || '').trim();
  const companyRegex = /\b(GFA|SCI|EARL|SAS|SASU|SARL|EURL|SCEA|GAEC|SA|GIE|SOCIETE|SOCIÉTÉ|HOLDING)\b/i;

  let demandeurComplet = '';
  if (companyRegex.test(rawLast)) {
    demandeurComplet = /^la\s+soci[eé]t[eé]\b/i.test(rawLast) ? rawLast : `la société ${rawLast.toUpperCase()}`;
  } else {
    const civ = project?.civilite && project.civilite !== 'Monsieur et Madame'
      ? project.civilite
      : guessCiviliteFromFirstName(rawFirst);

    const lastClean = rawFirst
      ? rawLast.replace(new RegExp(`\\b${rawFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '').trim()
      : rawLast;

    demandeurComplet = [civ, rawFirst, (lastClean || rawLast).toUpperCase()]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  // 2. Commune, Code postal & Adresse Mairie
  const communeUpper = (
    project?.dp_config?.terrain?.ville ||
    project?.city ||
    project?.commune ||
    bessData?.commune ||
    'COMMUNE'
  )
    .trim()
    .toUpperCase();

  const cp = String(
    project?.dp_config?.terrain?.code_postal ||
    project?.zip ||
    project?.zipCode ||
    project?.codePostal ||
    bessData?.codePostal ||
    ''
  ).trim();

  const mairieStreet = await resolveMairieStreetAddress({
    insee: project?.insee || project?.code_insee || project?.cadastre_code_insee,
    codePostal: cp,
    commune: communeUpper,
    mairieInfo
  });

  // 3. Références cadastrales, Lieu-Dit et Superficie
  const prefixe = (project?.cadastre_prefixe || '000').trim() || '000';
  const section = (
    project?.dp_config?.terrain?.section ||
    project?.cadastre_section ||
    project?.section ||
    bessData?.section ||
    ''
  )
    .replace(/^Sec\.?\s*/i, '')
    .trim()
    .toUpperCase();

  const rawNumero = (
    project?.dp_config?.terrain?.parcelle ||
    project?.cadastre_numero ||
    project?.numero ||
    bessData?.numero ||
    ''
  )
    .replace(/^n°?\s*/i, '')
    .trim();
  const numero = rawNumero.replace(/^0+(?=\d)/, '') || rawNumero;

  const rawSurface = parseSurfaceM2(
    project?.dp_config?.terrain?.contenance_m2 ||
    project?.cadastre_surface ||
    project?.surface_terrain ||
    project?.surface ||
    bessData?.contenance ||
    0
  );
  const surfaceFormatted = rawSurface > 0
    ? rawSurface.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')
    : '';

  const rawAddr =
    project?.dp_config?.terrain?.adresse ||
    project?.address ||
    project?.adresse ||
    bessData?.address ||
    '';
  const lieuDit = extractLieuDitOrStreet(rawAddr, cp, communeUpper);

  const puissanceKw = project?.dp_config?.technique?.puissance_kw || 500;
  const cerfaNumber = docType === 'pc' ? '13404*' : '16702*03';

  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // ── CONSTRUCTION DU PDF A4 OFFICIEL ───────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const navy = [15, 30, 80];
  const dark = [30, 41, 59];
  const muted = [100, 100, 100];

  // Logo ENR COURTAGE + bloc émetteur à gauche
  if (ENR_COURTAGE_LOGO_BASE64) {
    try {
      doc.addImage(ENR_COURTAGE_LOGO_BASE64, 'PNG', margin, 14, 42, 12);
    } catch (_) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...navy);
  doc.text('SASU ENR COURTAGE', margin, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...muted);
  doc.text('7 Rue Gutenberg — 33700 MÉRIGNAC', margin, 35.5);
  doc.text('Email : contact@enr-courtage.fr | Web : www.enr-courtage.fr', margin, 39.5);

  // Destinataire Mairie à droite
  const rightColX = 115;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...navy);
  doc.text(`MAIRIE DE ${communeUpper}`, rightColX, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...dark);
  let mairieY = 25;
  doc.text('Service Urbanisme', rightColX, mairieY);
  mairieY += 4.5;
  if (mairieStreet) {
    const streetLines = doc.splitTextToSize(mairieStreet, pageWidth - margin - rightColX);
    doc.text(streetLines, rightColX, mairieY);
    mairieY += streetLines.length * 4.5;
  }
  doc.text(`${cp} ${communeUpper}`.trim(), rightColX, mairieY);

  // Date du jour alignée à droite
  let y = Math.max(48, mairieY + 10);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(...dark);
  doc.text(`Mérignac, le ${todayFormatted}`, pageWidth - margin, y, { align: 'right' });

  // Dossier suivi par Yann BARBERIS
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  const suiviPrefix = 'Dossier suivi par : ';
  doc.text(suiviPrefix, margin, y);
  const suiviPrefixW = doc.getTextWidth(suiviPrefix);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...navy);
  doc.text('Mr Yann BARBERIS  |  Tél : 07 63 87 71 40  |  E-mail : y.barberis@enr-courtage.fr', margin + suiviPrefixW, y);

  // Objet
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  const objPrefix = 'Objet : ';
  doc.text(objPrefix, margin, y);
  const objPrefixW = doc.getTextWidth(objPrefix);
  doc.setTextColor(...dark);
  const objText = `Dépôt de Déclaration Préalable (DP) – Unité de stockage par batterie de soutien réseau (${puissanceKw} kW)`;
  const objLines = doc.splitTextToSize(objText, contentWidth - objPrefixW);
  doc.text(objLines, margin + objPrefixW, y);
  y += objLines.length * 4.8 + 4;

  // Tableau récapitulatif (4 lignes)
  const communeWithCp = cp ? `${communeUpper} (${cp})` : communeUpper;
  const refCadText =
    `Parcelle ${prefixe} ${section} ${numero}`.replace(/\s+/g, ' ').trim() +
    (lieuDit ? ` – ${lieuDit}` : '') +
    (surfaceFormatted ? ` (Superficie : ${surfaceFormatted} m²)` : '');

  const tableRows = [
    ['Demandeur / Mandant :', demandeurComplet],
    ['Commune du projet :', communeWithCp],
    ['Référence cadastrale :', refCadText],
    ['Nature du projet :', `Installation de batterie de soutien réseau (BESS) – Puissance : ${puissanceKw} kW`]
  ];

  const col1W = 48;
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.25);

  tableRows.forEach(([label, val]) => {
    const valLines = doc.splitTextToSize(val, contentWidth - col1W - 4);
    const rowH = Math.max(7, valLines.length * 4.2 + 2.8);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...navy);
    doc.text(label, margin + 1.5, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...dark);
    doc.text(valLines, margin + col1W, y + 4.8);
    y += rowH;
  });
  doc.line(margin, y, pageWidth - margin, y);

  // Corps de la lettre
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text('Monsieur le Maire,', margin, y);
  y += 4.8;
  doc.text('Madame, Monsieur le Responsable de l’Urbanisme,', margin, y);

  y += 7.5;
  const p1 = `Agissant pour le compte et sur mandat de ${demandeurComplet}, la société ENR COURTAGE a l’honneur de vous transmettre le présent dossier de Déclaration Préalable (DP) relatif à l'implantation d'une unité autonome de stockage par batterie de soutien au réseau (BESS), d'une puissance de ${puissanceKw} kW.`;
  const p1Lines = doc.splitTextToSize(p1, contentWidth);
  doc.text(p1Lines, margin, y);
  y += p1Lines.length * 4.6 + 3.5;

  const lieuClause = lieuDit ? `, au ${lieuDit}` : '';
  const p2 = `Le projet se situe sur la parcelle cadastrée section ${prefixe} ${section} n° ${numero}${lieuClause} sur votre commune. Cette installation participe activement à la stabilisation, à l’équilibrage et à la transition énergétique du réseau électrique public.`;
  const p2Lines = doc.splitTextToSize(p2, contentWidth);
  doc.text(p2Lines, margin, y);
  y += p2Lines.length * 4.6 + 5;

  // Pièces jointes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Pièces jointes au dossier :', margin, y);
  y += 5.5;

  const bullets = [
    `Formulaire Cerfa n° ${cerfaNumber} dûment complété et signé ;`,
    'DP1 – Plan de situation du terrain ;',
    'DP2 – Plan de masse coté dans les 3 dimensions ;',
    'DP3 – Plan en coupe du terrain et de la construction ;',
    'DP6 – Document graphique d’insertion paysagère (3D) ;',
    'DP7 & DP8 – Photographies d’environnement proche et lointain ;',
    'Notice technique descriptive de l’équipement et du raccordement ;',
    'Notice de sécurité incendie, prévention du risque feux de forêt (DFCI) & dispositions SDIS.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  bullets.forEach((b) => {
    doc.text('•', margin + 4, y);
    doc.text(b, margin + 9, y);
    y += 4.5;
  });

  y += 3.5;
  doc.setFontSize(10);
  const p3 = 'Nous vous prions de bien vouloir procéder à l’enregistrement de cette déclaration et nous retourner le récépissé de dépôt officiel comportant son numéro d’enregistrement ainsi que la date limite d\'instruction.';
  const p3Lines = doc.splitTextToSize(p3, contentWidth);
  doc.text(p3Lines, margin, y);
  y += p3Lines.length * 4.6 + 3.5;

  const p4 = 'Notre collaborateur en charge du dossier, Monsieur Yann BARBERIS (07 63 87 71 40 – y.barberis@enr-courtage.fr), reste à votre disposition pour toute information complémentaire.';
  const p4Lines = doc.splitTextToSize(p4, contentWidth);
  doc.text(p4Lines, margin, y);
  y += p4Lines.length * 4.6 + 4.5;

  doc.text("Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos respectueuses salutations.", margin, y);

  // Signature alignée à droite
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text('Pour le demandeur,', pageWidth - margin, y, { align: 'right' });
  y += 4.5;
  doc.text('SASU ENR COURTAGE', pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setTextColor(...dark);
  doc.text('Yann BARBERIS', pageWidth - margin, y, { align: 'right' });
  y += 4.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Service Administratif & Urbanisme', pageWidth - margin, y, { align: 'right' });

  const arrayBuffer = doc.output('arraybuffer');
  const uint8Array = new Uint8Array(arrayBuffer);
  const blob = new Blob([uint8Array], { type: 'application/pdf' });

  const cleanClientForFile = [rawLast.toUpperCase(), rawFirst]
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const filename = `Courrier_Depot_DP_Batterie_${cleanClientForFile || 'Client'}.pdf`;

  if (download) {
    saveAs(blob, filename);
  }

  return { blob, uint8Array, filename };
}
