import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * SmartCerfaService — Moteur de mapping intelligent des CERFA PDF
 * Cible EXCLUSIVEMENT les champs AcroForm officiels du CERFA (DP 13404, PC 13409, CU 16702)
 * sans aucun texte flottant sur les pages réservées à la Mairie ou au Récépissé.
 */

// ─── Mapping des champs AcroForm par type de CERFA ──────────────────────────

export const CERFA_FIELDS = {
  cu: {
    // CERFA 16702 — Certificat d'Urbanisme
    nom:          ['D1N_nom', 'topmostSubform[0].Page2[0].D1N_nom[0]', 'V1N_nom'],
    prenom:       ['D1P_prenom', 'topmostSubform[0].Page2[0].D1P_prenom[0]', 'V1P_prenom'],
    siret:        ['D2S_siret', 'topmostSubform[0].Page2[0].D2S_siret[0]'],
    denomination: ['D2D_denomination', 'topmostSubform[0].Page2[0].D2D_denomination[0]'],
    adresse_num:  ['D3N_numero', 'topmostSubform[0].Page2[0].D3N_numero[0]'],
    adresse_voie: ['D3V_voie', 'topmostSubform[0].Page2[0].D3V_voie[0]'],
    commune:      ['D3L_localite', 'topmostSubform[0].Page2[0].D3L_localite[0]', 'D1C_commune'],
    cp:           ['D3C_code', 'topmostSubform[0].Page2[0].D3C_code[0]'],
    email_left:   ['D5GE1_email'],
    email_right:  ['D5GE2_email'],
    tel:          ['D3T_telephone'],
    prefixe:      ['T2F_prefixe'],
    section:      ['T2S_section', 'topmostSubform[0].Page3[0].T2S_section[0]'],
    parcelle:     ['T2N_numero', 'topmostSubform[0].Page3[0].T2N_numero[0]'],
    surface:      ['T2T_superficie', 'topmostSubform[0].Page3[0].T2T_superficie[0]'],
    sig_lieu:     ['E1L_lieu'],
    sig_date:     ['E1D_date'],
    sig_nom:      ['E1S_signature', 'D1N_nom'],
  },
  dp: {
    // CERFA 13404 — Déclaration Préalable
    nom:          ['topmostSubform[0].Page8[0].V1N_nom[0]', 'V1N_nom', 'topmostSubform[0].Page2[0].D1N_nom[0]', 'D1N_nom'],
    prenom:       ['topmostSubform[0].Page8[0].V1P_prenom[0]', 'V1P_prenom', 'topmostSubform[0].Page2[0].D1P_prenom[0]', 'D1P_prenom'],
    siret:        ['topmostSubform[0].Page8[0].V1MS1_siret[0]', 'V1MS1_siret', 'D2S_siret'],
    denomination: ['topmostSubform[0].Page8[0].V1MD1_denomination[0]', 'V1MD1_denomination', 'D2D_denomination'],
    adresse_num:  ['topmostSubform[0].Page8[0].V1Z_numero[0]', 'V1Z_numero', 'D3N_numero'],
    adresse_voie: ['topmostSubform[0].Page8[0].V1V_voie[0]', 'V1V_voie', 'D3V_voie'],
    commune:      ['topmostSubform[0].Page8[0].V1L_localite[0]', 'V1L_localite', 'S1LA1_localite', 'D3L_localite'],
    cp:           ['topmostSubform[0].Page8[0].V1C_code[0]', 'V1C_code', 'S1PA1_codepostal', 'D3C_code'],
    email_left:   ['topmostSubform[0].Page8[0].V1EM1_email[0]', 'V1EM1_email', 'D5GE1_email'],
    email_right:  ['topmostSubform[0].Page8[0].V1EM2_email[0]', 'V1EM2_email', 'D5GE2_email'],
    tel:          ['topmostSubform[0].Page8[0].V1T_telephone[0]', 'V1T_telephone', 'D3T_telephone'],
    prefixe:      ['topmostSubform[0].Page9[0].T2FP1_prefixe[0]', 'T2FP1_prefixe', 'T2F_prefixe'],
    section:      ['topmostSubform[0].Page9[0].T2SP1_section[0]', 'T2SP1_section', 'T2S_section'],
    parcelle:     ['topmostSubform[0].Page9[0].T2NP1_numero[0]', 'T2NP1_numero', 'T2N_numero'],
    surface:      ['topmostSubform[0].Page9[0].T2TP1_superficie[0]', 'T2TP1_superficie', 'T2T_superficie'],
    description:  ['topmostSubform[0].Page5[0].C2ZD1_description[0]', 'C2ZD1_description'],
    puissance:    ['topmostSubform[0].Page5[0].C2ZE1_puissance[0]', 'C2ZE1_puissance'],
    sig_lieu:     ['topmostSubform[0].Page9[0].E1L_lieu[0]', 'E1L_lieu'],
    sig_date:     ['topmostSubform[0].Page9[0].E1D_date[0]', 'E1D_date', 'R2M_date'],
    sig_nom:      ['topmostSubform[0].Page9[0].E1S_signature[0]', 'E1S_signature', 'V1N_nom'],
  },
  pc: {
    // CERFA 13409 / 13404 — Permis de Construire
    nom:          ['topmostSubform[0].Page8[0].V1N_nom[0]', 'V1N_nom', 'D1N_nom'],
    prenom:       ['topmostSubform[0].Page8[0].V1P_prenom[0]', 'V1P_prenom', 'D1P_prenom'],
    siret:        ['topmostSubform[0].Page8[0].V1MS1_siret[0]', 'V1MS1_siret'],
    denomination: ['topmostSubform[0].Page8[0].V1MD1_denomination[0]', 'V1MD1_denomination'],
    adresse_num:  ['topmostSubform[0].Page8[0].V1Z_numero[0]', 'V1Z_numero'],
    adresse_voie: ['topmostSubform[0].Page8[0].V1V_voie[0]', 'V1V_voie'],
    commune:      ['topmostSubform[0].Page8[0].V1L_localite[0]', 'V1L_localite', 'S1LA1_localite'],
    cp:           ['topmostSubform[0].Page8[0].V1C_code[0]', 'V1C_code', 'S1PA1_codepostal'],
    email_left:   ['topmostSubform[0].Page8[0].V1EM1_email[0]', 'V1EM1_email'],
    email_right:  ['topmostSubform[0].Page8[0].V1EM2_email[0]', 'V1EM2_email'],
    tel:          ['topmostSubform[0].Page8[0].V1T_telephone[0]', 'V1T_telephone'],
    prefixe:      ['topmostSubform[0].Page9[0].T2FP1_prefixe[0]', 'T2FP1_prefixe'],
    section:      ['topmostSubform[0].Page9[0].T2SP1_section[0]', 'T2SP1_section'],
    parcelle:     ['topmostSubform[0].Page9[0].T2NP1_numero[0]', 'T2NP1_numero'],
    surface:      ['topmostSubform[0].Page9[0].T2TP1_superficie[0]', 'T2TP1_superficie'],
    description:  ['topmostSubform[0].Page5[0].C2ZD1_description[0]', 'C2ZD1_description'],
    puissance:    ['topmostSubform[0].Page5[0].C2ZE1_puissance[0]', 'C2ZE1_puissance'],
    sig_lieu:     ['topmostSubform[0].Page9[0].E1L_lieu[0]', 'E1L_lieu'],
    sig_date:     ['topmostSubform[0].Page9[0].E1D_date[0]', 'E1D_date'],
    sig_nom:      ['topmostSubform[0].Page9[0].E1S_signature[0]', 'E1S_signature'],
  },
};

// Mapping des pièces graphiques aux cases à cocher du Bordereau (DP1 à DP11)
const PLATE_CHECKBOX_MAP = {
  // DP1 / PC1 : Plan de situation
  dpc1: ['topmostSubform[0].Page13[0].P1FP1[0]', 'P1FP1'],
  // DP2 / PC2 : Plan de masse
  dpc2: ['topmostSubform[0].Page11[0].P3GD1[0]', 'topmostSubform[0].Page11[0].P3GE1[0]', 'topmostSubform[0].Page11[0].P5PA1[0]', 'P3GD1', 'P3GE1', 'P5PA1'],
  // DP3 / PC3 : Plan en coupe
  dpc3: ['topmostSubform[0].Page11[0].P3GF1[0]', 'P3GF1'],
  // DP4 / PC4 : Plan façades et toitures
  dpc4: ['topmostSubform[0].Page11[0].P4LC1[0]', 'topmostSubform[0].Page12[0].P4CE1[0]', 'P4LC1', 'P4CE1', 'P4CF1'],
  // DP6 / PC6 : Document graphique insertion
  dpc6: ['topmostSubform[0].Page12[0].P6PG1[0]', 'topmostSubform[0].Page12[0].P6PH1[0]', 'topmostSubform[0].Page13[0].P6PF1[0]', 'P6PG1', 'P6PH1', 'P6PF1'],
  // DP7 / PC7 : Environnement proche
  dpc7: ['topmostSubform[0].Page12[0].P7LP1[0]', 'P7LP1'],
  // DP8 / PC8 : Environnement lointain
  dpc8: ['topmostSubform[0].Page13[0].P4EG1[0]', 'P4EG1', 'P7LF1', 'P8EA1'],
  // DP11 / PC11 : Notice descriptive
  dpc11: ['topmostSubform[0].Page12[0].P4EC1[0]', 'topmostSubform[0].Page12[0].P4EH1[0]', 'P4EC1', 'P4EH1'],
};

// Liste de toutes les cases du bordereau à décocher par défaut
const ALL_BORDEREAU_CHECKBOXES = Object.values(PLATE_CHECKBOX_MAP).flat();

/**
 * Inspecte les champs AcroForm d'un PDF et retourne leurs noms
 */
export async function inspectCerfaFields(pdfUrl) {
  try {
    const buf = await fetch(pdfUrl).then(r => r.arrayBuffer());
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const form = doc.getForm();
    const fields = form.getFields();
    return fields.map(f => ({ name: f.getName(), type: f.constructor.name }));
  } catch (e) {
    console.error('[SmartCerfa] inspectCerfaFields error:', e);
    return [];
  }
}

/**
 * Extrait le nom et prénom proprement d'une chaîne demandeur unique sans duplication.
 */
export function resolveDemandeurNames(project) {
  const rawName = project?.demandeur || project?.clientName || project?.fullName || project?.lastName || project?.name || '';
  const cleanName = rawName.trim();
  
  if (!cleanName) return { lastName: '', firstName: '' };

  if (project?.firstName && !cleanName.toLowerCase().includes(project.firstName.toLowerCase())) {
    return { lastName: cleanName, firstName: project.firstName };
  }

  const parts = cleanName.split(/\s+/);
  if (parts.length === 1) {
    return { lastName: parts[0], firstName: '' };
  } else if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  } else {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
}

/**
 * Analyse le projet et retourne les champs manquants pour un type de CERFA donné
 */
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
 * Remplissage intelligent du CERFA PDF par AcroForm uniquement.
 */
export async function smartFillCerfa(pdfUrl, project, type = 'dp', installationType = 'batiment_solaire', plateIds = []) {
  try {
    const cerfaBuffer = await fetch(pdfUrl).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pdfUrl}`);
      return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(cerfaBuffer, { ignoreEncryption: true });

    // ── Préparer les données ───────────────────────────────────────
    const names = resolveDemandeurNames(project);
    const lastName  = names.lastName || project?.lastName || project?.name || '';
    const firstName = names.firstName || project?.firstName || '';
    const fullName  = `${firstName} ${lastName}`.trim() || lastName;

    const address   = project?.address || '';
    const zip       = project?.zip || '';
    const city      = project?.city || project?.cadastre_commune || '';
    const section   = project?.cadastre_section || '';
    const parcelle  = project?.cadastre_numero || '';
    const surface   = project?.cadastre_surface ? `${project.cadastre_surface} m²` : '';
    const kwc       = project?.kwc || project?.projectSize || project?.power || '';
    const email     = project?.email || project?.clientEmail || '';
    const tel       = project?.phone || project?.clientPhone || '';
    const dateStr   = new Date().toLocaleDateString('fr-FR');
    const lieuStr   = city || 'Mairie';

    // Séparation de l'email à l'arobase (@ est déjà imprimé sur le formulaire CERFA)
    let emailLeft = email;
    let emailRight = '';
    if (email.includes('@')) {
      const parts = email.split('@');
      emailLeft = parts[0];
      emailRight = parts[1] || '';
    }

    const typeLabels = {
      batiment_solaire: `Construction d'un bâtiment agricole à charpente métallique avec centrale photovoltaïque${kwc ? ` de ${kwc} kWc` : ''}`,
      batiment:         `Construction d'un bâtiment agricole à charpente métallique avec centrale photovoltaïque${kwc ? ` de ${kwc} kWc` : ''}`,
      construction:     `Construction d'un bâtiment agricole à charpente métallique avec centrale photovoltaïque${kwc ? ` de ${kwc} kWc` : ''}`,
      ombriere:         `Construction d'une ombrière de parking photovoltaïque${kwc ? ` de ${kwc} kWc` : ''}`,
      toiture:          `Installation de panneaux photovoltaïques en toiture sur bâtiment existant${kwc ? ` — ${kwc} kWc` : ''}`,
      batterie:         `Installation d'un système de stockage d'énergie par batterie${kwc ? ` — ${kwc} kWc` : ''}`,
    };

    // Description du projet (priorité à la description saisie par l'utilisateur)
    const objet = project?.description || project?.projectDescription || typeLabels[installationType] || typeLabels['batiment_solaire'];
    const isNewConstruction = !['toiture'].includes(installationType);

    const addrNum  = address.split(' ')[0] || '';
    const addrVoie = address.split(' ').slice(1).join(' ') || address;

    // ── Remplissage des champs AcroForm ────────────────────────────
    const fieldMap = CERFA_FIELDS[type] || CERFA_FIELDS.dp;
    try {
      const form = pdfDoc.getForm();

      const setField = (candidates, value, fixedFontSize = null) => {
        if (!value) return false;
        const nameList = Array.isArray(candidates) ? candidates : [candidates];
        for (const name of nameList) {
          try {
            const f = form.getTextField(name);
            if (f) {
              f.setText(String(value));
              if (fixedFontSize !== null) {
                f.setFontSize(fixedFontSize);
              } else {
                f.setFontSize(0); // auto-fit font size
              }
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

      // 1. Demandeur & Coordonnées
      setField(fieldMap.nom,          lastName);
      setField(fieldMap.prenom,        firstName);
      setField(fieldMap.siret,         project?.siret || '');
      setField(fieldMap.denomination,  project?.company || project?.denomination || '');
      setField(fieldMap.adresse_num,   addrNum);
      setField(fieldMap.adresse_voie,  addrVoie);
      setField(fieldMap.commune,       city);
      
      // Ajustement des tailles de police (pour correspondre à la taille de la localité ~ 9-9.5pt)
      setField(fieldMap.cp,            zip, 9);
      setField(fieldMap.tel,           tel, 9);
      setField(fieldMap.email_left,    emailLeft, 8.5);
      setField(fieldMap.email_right,   emailRight, 8.5);

      // 2. Terrain (Réduction taille police section et parcelle pour matcher la localité)
      setField(fieldMap.section,       section, 9);
      setField(fieldMap.parcelle,      parcelle, 9);
      setField(fieldMap.surface,       surface, 9);

      // 3. Projet
      setField(fieldMap.description,   objet);
      setField(fieldMap.puissance,     kwc ? `${kwc} kWc` : '');

      // 4. Nature des travaux (cases à cocher)
      if (isNewConstruction) {
        setCheck(['topmostSubform[0].Page5[0].C2ZA1_nouvelle[0]', 'C2ZA1_nouvelle', 'nouvelle_construction']);
      } else {
        setCheck(['topmostSubform[0].Page5[0].C2ZB1_existante[0]', 'C2ZB1_existante', 'travaux_existants']);
      }

      // 5. Engagement & Signature
      setField(fieldMap.sig_lieu,      lieuStr);
      setField(fieldMap.sig_date,      dateStr);
      setField(fieldMap.sig_nom,       fullName);

      // 6. Gestion ultra-précise du Bordereau des pièces jointes (Pages 17, 18, 19, 20)
      // Décocher d'abord TOUTES les cases du bordereau
      ALL_BORDEREAU_CHECKBOXES.forEach(name => {
        setCheck(name, false);
      });

      // Cocher EXCLUSIVEMENT les pièces présentes dans les planches graphiques générées
      const plateList = Array.isArray(plateIds) ? plateIds : [];
      
      // DPC1 (Plan de situation) : présent si 'situation' dans plateIds ou dossier CU/DP/PC standard
      if (plateList.some(id => id.includes('situation')) || plateList.length > 0) {
        PLATE_CHECKBOX_MAP.dpc1.forEach(name => setCheck(name, true));
      }

      // DPC2 (Plan de masse) : présent si 'masse' dans plateIds ou dossier CU/DP/PC standard
      if (plateList.some(id => id.includes('masse')) || plateList.length > 0) {
        PLATE_CHECKBOX_MAP.dpc2.forEach(name => setCheck(name, true));
      }

      // DPC3 (Plan en coupe) : uniquement si 'section' présent
      if (plateList.some(id => id.includes('section'))) {
        PLATE_CHECKBOX_MAP.dpc3.forEach(name => setCheck(name, true));
      }

      // DPC4 (Plan façades/toitures) : uniquement si 'facades' présent
      if (plateList.some(id => id.includes('facades'))) {
        PLATE_CHECKBOX_MAP.dpc4.forEach(name => setCheck(name, true));
      }

      // DPC6 (Insertion graphique) : uniquement si 'insertion' présent
      if (plateList.some(id => id.includes('insertion'))) {
        PLATE_CHECKBOX_MAP.dpc6.forEach(name => setCheck(name, true));
      }

      // DPC7 (Environnement proche) : uniquement si 'env-proche' ou 'env' présent
      if (plateList.some(id => id.includes('env-proche'))) {
        PLATE_CHECKBOX_MAP.dpc7.forEach(name => setCheck(name, true));
      }

      // DPC8 (Environnement lointain) : uniquement si 'env' (sans proche) ou 'lointain' présent
      if (plateList.some(id => id.includes('env') && !id.includes('env-proche'))) {
        PLATE_CHECKBOX_MAP.dpc8.forEach(name => setCheck(name, true));
      }

      // DPC11 (Notice descriptive) : uniquement si 'notice' présent
      if (plateList.some(id => id.includes('notice'))) {
        PLATE_CHECKBOX_MAP.dpc11.forEach(name => setCheck(name, true));
      }

      // NE PAS aplatir (form.flatten()) : Les champs de formulaire restent interactifs pour l'utilisateur
    } catch (e) {
      console.warn('[SmartCerfa] AcroForm fill notice:', e.message);
    }

    return await pdfDoc.save();
  } catch (err) {
    console.error('[SmartCerfa] smartFillCerfa error:', err);
    return null;
  }
}

/**
 * Génère un mapping data → résumé lisible pour l'étape de confirmation du wizard
 */
export function buildCerfaDataSummary(project, installationType) {
  const names = resolveDemandeurNames(project);
  const fullName = `${names.firstName} ${names.lastName}`.trim() || names.lastName || project?.demandeur || project?.name || '—';
  const kwc = project?.kwc || project?.projectSize || project?.power || '';
  const email = project?.email || project?.clientEmail || project?.contactEmail || project?.client_email || '—';

  const rawAddress = project?.address || project?.clientAddress || project?.projectAddress || project?.siteAddress || project?.street || project?.adresse || '';
  const rawZip = project?.zip || project?.postalCode || project?.code_postal || project?.clientZip || '';
  const rawCity = project?.city || project?.commune || project?.clientCity || project?.cadastre_commune || '';

  const addressParts = [rawAddress, rawZip, rawCity].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(' ') : '—';

  return {
    demandeur: fullName,
    email: email,
    adresse: fullAddress,
    cadastre: `Section ${project?.cadastre_section || '—'} n° ${project?.cadastre_numero || '—'} (${project?.cadastre_surface ? project.cadastre_surface + ' m²' : '—'})`,
    commune: rawCity || '—',
    puissance: kwc ? `${kwc} kWc` : '—',
    type: {
      batiment_solaire: 'Bâtiment solaire (nouvelle construction)',
      batiment: 'Bâtiment solaire (nouvelle construction)',
      ombriere: 'Ombrière photovoltaïque',
      toiture: 'Panneaux en toiture existante',
      batterie: 'Système de stockage batterie',
    }[installationType] || installationType,
    siret: project?.siret || '—',
    date: new Date().toLocaleDateString('fr-FR'),
  };
}
