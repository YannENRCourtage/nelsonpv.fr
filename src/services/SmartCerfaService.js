import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
    // CERFA 13404 — Déclaration Préalable
    nom:          ['topmostSubform[0].Page2[0].D1N_nom[0]', 'D1N_nom', 'topmostSubform[0].Page8[0].V1N_nom[0]', 'V1N_nom'],
    prenom:       ['topmostSubform[0].Page2[0].D1P_prenom[0]', 'D1P_prenom', 'topmostSubform[0].Page8[0].V1P_prenom[0]', 'V1P_prenom'],
    naissance:    ['topmostSubform[0].Page2[0].D1A_naissance[0]', 'D1A_naissance'],
    commune_naiss:['topmostSubform[0].Page2[0].D1C_commune[0]', 'D1C_commune'],
    dept_naiss:   ['topmostSubform[0].Page2[0].D1D_dept[0]', 'D1D_dept'],
    pays_naiss:   ['topmostSubform[0].Page2[0].D1E_pays[0]', 'D1E_pays'],
    siret:        ['topmostSubform[0].Page2[0].D2S_SIRET[0]', 'D2S_SIRET', 'topmostSubform[0].Page8[0].V1MS1_siret[0]'],
    denomination: ['topmostSubform[0].Page2[0].D2D_denomination[0]', 'D2D_denomination', 'topmostSubform[0].Page8[0].V1MD1_denomination[0]'],
    raison:       ['topmostSubform[0].Page2[0].D2R_raison[0]', 'D2R_raison', 'topmostSubform[0].Page8[0].V1R_raison[0]'],
    type_societe: ['topmostSubform[0].Page2[0].D2J_type[0]', 'D2J_type'],
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
  pc: {
    // CERFA 13409 / 13404 — Permis de Construire
    nom:          ['topmostSubform[0].Page2[0].D1N_nom[0]', 'D1N_nom', 'topmostSubform[0].Page8[0].V1N_nom[0]', 'V1N_nom'],
    prenom:       ['topmostSubform[0].Page2[0].D1P_prenom[0]', 'D1P_prenom', 'topmostSubform[0].Page8[0].V1P_prenom[0]', 'V1P_prenom'],
    naissance:    ['topmostSubform[0].Page2[0].D1A_naissance[0]', 'D1A_naissance'],
    commune_naiss:['topmostSubform[0].Page2[0].D1C_commune[0]', 'D1C_commune'],
    dept_naiss:   ['topmostSubform[0].Page2[0].D1D_dept[0]', 'D1D_dept'],
    pays_naiss:   ['topmostSubform[0].Page2[0].D1E_pays[0]', 'D1E_pays'],
    siret:        ['topmostSubform[0].Page2[0].D2S_SIRET[0]', 'D2S_SIRET', 'topmostSubform[0].Page8[0].V1MS1_siret[0]'],
    denomination: ['topmostSubform[0].Page2[0].D2D_denomination[0]', 'D2D_denomination', 'topmostSubform[0].Page8[0].V1MD1_denomination[0]'],
    raison:       ['topmostSubform[0].Page2[0].D2R_raison[0]', 'D2R_raison', 'topmostSubform[0].Page8[0].V1R_raison[0]'],
    type_societe: ['topmostSubform[0].Page2[0].D2J_type[0]', 'D2J_type'],
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

// Mapping des pièces graphiques aux cases à cocher du Bordereau (DP1 à DP11)
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
    return { lastName: parts[0], firstName: parts[1] };
  } else {
    return { lastName: parts.slice(0, -1).join(' '), firstName: parts[parts.length - 1] };
  }
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
    const cerfaBuffer = await fetch(pdfUrl).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pdfUrl}`);
      return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(cerfaBuffer, { ignoreEncryption: true });

    // ── Préparer les données ───────────────────────────────────────
    const names = resolveDemandeurNames(project);
    const lastName  = names.lastName || project?.lastName || project?.name || '';
    const firstName = names.firstName || project?.firstName || '';
    const birthDate = project?.birthDate || '14/02/1970';
    const birthCity = project?.birthCity || project?.city || 'AUCH';
    const birthDept = project?.birthDept || (project?.zip ? project.zip.substring(0, 2) : '32');
    const birthCountry = project?.birthCountry || 'FRANCE';

    const address   = project?.address || project?.clientAddress || '';
    const zip       = project?.zip || project?.postalCode || '';
    const city      = project?.city || project?.commune || project?.cadastre_commune || '';
    const section   = project?.cadastre_section || '';
    const parcelle  = project?.cadastre_numero || '';
    const surface   = project?.cadastre_surface ? `${project.cadastre_surface} m²` : '';
    const kwc       = project?.kwc || project?.projectSize || project?.power || '';
    const email     = project?.email || project?.clientEmail || 'isabelle.dupond@gmail.com';
    const tel       = project?.phone || project?.clientPhone || '06 47 92 34 24';
    const dateStr   = new Date().toLocaleDateString('fr-FR');
    const lieuStr   = city || 'Mairie';

    let emailLeft = email;
    let emailRight = '';
    if (email.includes('@')) {
      const parts = email.split('@');
      emailLeft = parts[0];
      emailRight = parts[1] || '';
    }

    const typeLabels = {
      batiment_solaire: `Construction d'un bâtiment agricole à charpente métallique avec centrale solaire photovoltaïque intégrée en toiture d'une puissance de ${kwc || 100} kWc.`,
      batiment:         `Construction d'un bâtiment agricole à charpente métallique avec centrale solaire photovoltaïque intégrée en toiture d'une puissance de ${kwc || 100} kWc.`,
      construction:     `Construction d'un bâtiment agricole à charpente métallique avec centrale solaire photovoltaïque intégrée en toiture d'une puissance de ${kwc || 100} kWc.`,
      ombriere:         `Construction d'une structure ombrière photovoltaïque d'une puissance de ${kwc || 100} kWc.`,
      toiture:          `Installation de modules solaires photovoltaïques en toiture d'une puissance de ${kwc || 100} kWc.`,
      batterie:         `Installation d'un système de stockage d'énergie par batterie.`,
    };

    const objet = project?.description || project?.projectDescription || typeLabels[installationType] || typeLabels['batiment_solaire'];
    const isNewConstruction = !['toiture'].includes(installationType);

    const addrParts = address.trim().split(' ');
    const addrNum   = /^\d+/.test(addrParts[0]) ? addrParts[0] : '';
    const addrVoie  = addrNum ? addrParts.slice(1).join(' ') : address;

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
              f.setText(String(value));
              if (fixedFontSize !== null) {
                f.setFontSize(fixedFontSize);
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

      // 1. Identité du déclarant (Page 2 du CERFA) — Directive 4
      setCheck(['topmostSubform[0].Page2[0].D1H_homme[0]', 'D1H_homme'], true);
      setField(fieldMap.nom,            lastName, 9.5);
      setField(fieldMap.prenom,         firstName, 9.5);
      setField(fieldMap.naissance,      birthDate, 9);
      setField(fieldMap.commune_naiss,  birthCity, 9);
      setField(fieldMap.dept_naiss,     birthDept, 9);
      setField(fieldMap.pays_naiss,     birthCountry, 9);
      setField(fieldMap.siret,          project?.siret || '', 9);
      setField(fieldMap.denomination,   project?.company || project?.denomination || '', 9);
      setField(fieldMap.raison,         project?.raison || '', 9);
      setField(fieldMap.type_societe,   project?.companyType || '', 9);

      // 2. Coordonnées du déclarant (Page 2 du CERFA) — Directive 4
      setField(fieldMap.adresse_num,    addrNum, 9.5);
      setField(fieldMap.adresse_voie,   addrVoie, 9.5);
      setField(fieldMap.adresse_lieudit,project?.lieudit || '', 9);
      setField(fieldMap.commune,        city, 9.5);
      setField(fieldMap.cp,             zip, 9.5);
      setField(fieldMap.tel,            tel, 9.5);
      setField(fieldMap.pays,           'FRANCE', 9.5);

      // 3. Email & Terrain (Page 3 du CERFA)
      setField(fieldMap.email_left,     emailLeft, 8.5);
      setField(fieldMap.email_right,    emailRight, 8.5);
      setField(fieldMap.prefixe,        project?.cadastre_prefixe || '', 9);
      setField(fieldMap.section,        section, 9.5);
      setField(fieldMap.parcelle,       parcelle, 9.5);
      setField(fieldMap.surface,        surface, 9.5);

      // 4. Projet & Description — Directive 5 : Police réduite et bien proportionnée
      setField(fieldMap.description,    objet, 7.5);
      setField(fieldMap.puissance,      kwc ? `${kwc} kWc` : '', 8.5);

      if (isNewConstruction) {
        setCheck(['topmostSubform[0].Page5[0].C2ZA1_nouvelle[0]', 'C2ZA1_nouvelle'], true);
      } else {
        setCheck(['topmostSubform[0].Page5[0].C2ZB1_existante[0]', 'C2ZB1_existante'], true);
      }

      // 5. Engagement & Signature — Directive 6 : Laisser la signature vide pour signature manuscrite
      setField(fieldMap.sig_lieu,       lieuStr, 9.5);
      setField(fieldMap.sig_date,       dateStr, 9.5);
      // Signature volontairement laissée vide pour signature manuscrite

      // 6. Bordereau des pièces jointes
      ALL_BORDEREAU_CHECKBOXES.forEach(name => setCheck(name, false));
      const plateList = Array.isArray(plateIds) ? plateIds : [];

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
      if (plateList.some(id => id.includes('env-proche'))) {
        PLATE_CHECKBOX_MAP.dpc7.forEach(name => setCheck(name, true));
      }
      if (plateList.some(id => id.includes('env') && !id.includes('env-proche'))) {
        PLATE_CHECKBOX_MAP.dpc8.forEach(name => setCheck(name, true));
      }
      if (plateList.some(id => id.includes('notice'))) {
        PLATE_CHECKBOX_MAP.dpc11.forEach(name => setCheck(name, true));
      }

    } catch (e) {
      console.warn('[SmartCerfa] AcroForm fill notice:', e.message);
    }

    return await pdfDoc.save();
  } catch (err) {
    console.error('[SmartCerfa] smartFillCerfa error:', err);
    return null;
  }
}

export function buildCerfaDataSummary(project, installationType) {
  const names = resolveDemandeurNames(project);
  const fullName = `${names.firstName} ${names.lastName}`.trim() || names.lastName || project?.demandeur || project?.name || '—';
  const kwc = project?.kwc || project?.projectSize || project?.power || '';
  const email = project?.email || project?.clientEmail || '—';

  const rawAddress = project?.address || project?.clientAddress || '';
  const rawZip = project?.zip || project?.postalCode || '';
  const rawCity = project?.city || project?.commune || '';

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
