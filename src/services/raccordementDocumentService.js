import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTES & CONFIGURATION MÉTIER (ENEDIS / RTE / CONSUEL)
// ═════════════════════════════════════════════════════════════════════════════

export const MANDATAIRE_INFO = {
  raisonSociale: 'SAS ENR COURTAGE',
  plateforme: 'NELSON (nelsonpv.fr)',
  capital: '10 000 €',
  siret: '918 368 530 00015',
  siren: '918 368 530',
  rcs: 'R.C.S. BORDEAUX B 918 368 530',
  adresse: '10 Rue de Penthièvre, 75008 Paris',
  agenceSudOuest: 'Bordeaux (33000)',
  emailRaccordement: 'raccordement@enr-courtage.fr',
  siteWeb: 'https://nelsonpv.fr',
  telephone: '05 56 00 00 00',
  qualifications: 'Bureau d\'études Énergies Renouvelables & AMO Raccordement Électrique',
};

// Types de raccordements et natures d'installation
export const INSTALLATION_TYPES = [
  { id: 'pv_toiture', label: 'Photovoltaïque — Toiture Bâtiment', isPv: true, isBess: false },
  { id: 'ombriere_vl', label: 'Ombrières de parking Véhicules Légers (VL)', isPv: true, isBess: false },
  { id: 'ombriere_pl', label: 'Ombrières de parking Poids Lourds (PL)', isPv: true, isBess: false },
  { id: 'pv_sol', label: 'Centrale Solaire au Sol', isPv: true, isBess: false },
  { id: 'bess_standalone', label: 'Stockage Stationnaire par Batterie (BESS Stand-Alone)', isPv: false, isBess: true },
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

// Checklist standard des pièces jointes Enedis Connect
export const ENEDIS_CHECKLIST_DOCS = [
  { id: 'mandat_signe', label: 'Mandat spécial de représentation signé', required: true, desc: 'Délégation légale au mandataire SAS ENR COURTAGE' },
  { id: 'plan_situation', label: 'Plan de situation du terrain (Extrait IGN ou Cadastre)', required: true, desc: 'Localisation de la parcelle à l\'échelle de la commune' },
  { id: 'plan_masse', label: 'Plan de masse côté et orienté (Emprise des panneaux/ombrières)', required: true, desc: 'Positionnement de la centrale et du futur poste de livraison' },
  { id: 'schema_unifilaire', label: 'Schéma unifilaire de principe de l\'installation électrique', required: true, desc: 'Tracé du générateur, onduleurs, protections et point de raccordement' },
  { id: 'autorisation_urba', label: 'Autorisation d\'urbanisme (Récépissé ou Arrêté DP / PC / CU)', required: true, desc: 'Justificatif des droits d\'urbanisme délivré par la mairie' },
  { id: 'titre_propriete', label: 'Titre de propriété ou Accord du propriétaire / Bail emphytéotique', required: true, desc: 'Preuve de droit réel sur le foncier d\'implantation' },
  { id: 'fiches_onduleurs', label: 'Fiches techniques & Certificats de découplage des onduleurs', required: false, desc: 'Certificat DIN VDE 0126-1-1 / VFR 2019 ou Relais HTA C13-100' },
  { id: 'kbis_demandeur', label: 'Extrait Kbis (< 3 mois) et RIB du producteur', required: true, desc: 'Identité juridique et bancaire de la société porteuse' },
  { id: 'notice_bess', label: 'Notice descriptive du système de batteries (si BESS)', required: false, desc: 'Spécification cellules, BMS, extinction et gestion thermique' },
];

// ═════════════════════════════════════════════════════════════════════════════
// OUTILS DE CALCUL & HELPERS DATE / FORMATAGE
// ═════════════════════════════════════════════════════════════════════════════

export function formatDateFr(dateInput) {
  if (!dateInput) return '—';
  try {
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
 * Calcule l'échéance légale de validité de la PTF Enedis (strictement 3 mois selon art. L. 342-1 Code Énergie)
 * @param {string|Date} dateReception 
 * @returns {{ deadlineDate: Date|null, formattedDeadline: string, daysRemaining: number|null, status: 'valid'|'warning'|'critical'|'expired'|'none' }}
 */
export function calculatePtfCountdown(dateReception) {
  if (!dateReception) {
    return { deadlineDate: null, formattedDeadline: 'Non renseignée', daysRemaining: null, status: 'none' };
  }

  const start = new Date(dateReception);
  if (isNaN(start.getTime())) {
    return { deadlineDate: null, formattedDeadline: 'Date invalide', daysRemaining: null, status: 'none' };
  }

  // La validité légale Enedis d'une PTF est de 3 mois calendaires
  const deadline = new Date(start);
  deadline.setMonth(deadline.getMonth() + 3);

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status = 'valid';
  if (daysRemaining < 0) {
    status = 'expired';
  } else if (daysRemaining <= 15) {
    status = 'critical';
  } else if (daysRemaining <= 30) {
    status = 'warning';
  }

  return {
    deadlineDate: deadline,
    formattedDeadline: formatDateFr(deadline),
    daysRemaining,
    status,
  };
}

/**
 * Initialise ou normalise l'objet raccordement d'un projet
 */
export function getInitialRaccordementData(project = {}) {
  const existing = project.raccordement || {};
  const powerKwc = parseFloat(project.kwc || project.projectSize || 0) || 0;
  const isHTA = powerKwc >= 250;
  const isBess = Boolean(project.isBattery || existing.natureInstallation === 'bess_standalone' || existing.natureInstallation === 'hybride_pv_bess');

  return {
    // 1. Général & Identifiants
    natureInstallation: existing.natureInstallation || (isBess ? 'hybride_pv_bess' : (project.type === 'ombriere' || project.type === 'ombriere_parking' ? 'ombriere_vl' : 'pv_toiture')),
    puissanceInjectionKva: existing.puissanceInjectionKva ?? (powerKwc || 100),
    puissanceSoutirageKva: existing.puissanceSoutirageKva ?? (isBess ? Math.round(powerKwc * 0.8) || 100 : 0),
    tension: existing.tension || (isHTA ? 'HTA' : 'BT'),
    typeInjection: existing.typeInjection || (isBess ? 'card_is' : 'injection_totale'),
    prmPdr: existing.prmPdr || project.prm || '',
    siretProducteur: existing.siretProducteur || project.siret || '',
    cadastreParcelles: existing.cadastreParcelles || project.cadastre || project.cadastralReference || 'Section A - Parcelle(s) à confirmer',
    
    // Étape 1 : Demande Initiale Connect
    demandeStatus: existing.demandeStatus || 'a_preparer', // 'a_preparer' | 'deposee' | 'recevable' | 'rejetee'
    enedisAffaireId: existing.enedisAffaireId || existing.numeroDossierEnedis || '',
    dateDepotDemande: existing.dateDepotDemande || '',
    piecesJointes: existing.piecesJointes || {
      mandat_signe: true,
      plan_situation: true,
      plan_masse: true,
      schema_unifilaire: true,
      autorisation_urba: false,
      titre_propriete: false,
      kbis_demandeur: true,
      fiches_onduleurs: true,
    },

    // Étape 2 : PTF
    ptfStatus: existing.ptfStatus || 'en_attente', // 'en_attente' | 'recue' | 'acceptee' | 'refusee' | 'perimee'
    dateReceptionPtf: existing.dateReceptionPtf || '',
    coutTravauxEnedisTtc: existing.coutTravauxEnedisTtc ?? '',
    quotePartS3renr: existing.quotePartS3renr ?? '',
    solutionTechniquePtf: existing.solutionTechniquePtf || '',
    delaiTravauxEnedisMois: existing.delaiTravauxEnedisMois ?? (isHTA ? 9 : 4),

    // Étape 3 : CRD (Convention de Raccordement Définitive)
    crdStatus: existing.crdStatus || 'a_signer', // 'a_signer' | 'signee' | 'acompte_regle'
    crdReference: existing.crdReference || '',
    dateSignatureCrd: existing.dateSignatureCrd || '',
    montantAcompteTtc: existing.montantAcompteTtc ?? '',
    datePaiementAcompte: existing.datePaiementAcompte || '',
    refVirementAcompte: existing.refVirementAcompte || '',

    // Étape 4 : Travaux & Consuel
    travauxEnedisStatus: existing.travauxEnedisStatus || 'non_demarres',
    travauxClientStatus: existing.travauxClientStatus || 'non_demarres',
    consuelType: existing.consuelType || (isBess ? 'dossier_violet_bess' : 'sc144b_pv'),
    consuelNumero: existing.consuelNumero || project.consuel_number || '',
    consuelStatus: existing.consuelStatus || 'non_depose', // 'non_depose' | 'depose' | 'en_cours' | 'vise' | 'non_conforme'
    consuelDateDepot: existing.consuelDateDepot || '',
    consuelDateVisite: existing.consuelDateVisite || '',
    consuelDateVisa: existing.consuelDateVisa || '',
    onduleurMarque: existing.onduleurMarque || 'Sungrow / Huawei',
    onduleurModele: existing.onduleurModele || 'SG125HX / SUN2000',
    onduleurProtectionDecouplage: existing.onduleurProtectionDecouplage || (isHTA ? 'Relais HTA NF C 13-100 / Enedis-NOI-RES_43E' : 'Conforme DIN VDE 0126-1-1 / VFR 2019'),

    // Étape 5 : CARD & MES
    cardType: existing.cardType || (isBess ? 'card_is' : (isHTA ? 'card_i' : 'cae')),
    cardNumber: existing.cardNumber || '',
    dateSignatureCard: existing.dateSignatureCard || '',
    datePrevueMes: existing.datePrevueMes || '',
    dateEffectiveMes: existing.dateEffectiveMes || '',
    mesStatus: existing.mesStatus || 'en_attente', // 'en_attente' | 'planifiee' | 'effectuee'
    notes: existing.notes || '',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. GÉNÉRATION DU MANDAT DE REPRÉSENTATION ENEDIS (PDF)
// ═════════════════════════════════════════════════════════════════════════════

export async function generateEnedisMandatPdf(project, racData, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const m = 18;
  const usableWidth = W - (2 * m);

  const clientName = (project.clientName || project.company || `${project.firstName || ''} ${project.lastName || project.name || ''}`).trim() || 'Porteur de Projet';
  const clientSiret = racData.siretProducteur || project.siret || 'En cours d\'immatriculation';
  const siteAddress = (project.address || 'Adresse à préciser') + (project.city ? `, ${project.zip || ''} ${project.city}` : '');
  const pInj = racData.puissanceInjectionKva || project.kwc || 0;
  const pSout = racData.puissanceSoutirageKva || 0;
  const isBess = racData.natureInstallation === 'bess_standalone' || racData.natureInstallation === 'hybride_pv_bess';

  // ─── PAGE 1 : MANDAT OFFICIEL DE REPRÉSENTATION ────────────────────────────
  
  // Bandeau supérieur Corporate
  doc.setFillColor(15, 43, 92); // Bleu Nuit
  doc.rect(0, 0, W, 34, 'F');
  doc.setFillColor(0, 163, 224); // Cyan Accent
  doc.rect(0, 34, W, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MANDAT SPÉCIAL DE REPRÉSENTATION', m, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(215, 235, 255);
  doc.text('Procédures de Raccordement au Réseau Public de Distribution d\'Électricité (ENEDIS / RTE)', m, 22);
  doc.setFontSize(7.5);
  doc.text('Articles 1984 et suivants du Code Civil — Code de l\'Énergie & Référentiel Technique Enedis-NOI-RES_43E', m, 29);

  let y = 45;

  // Helper pour cadre de section
  const renderSectionBox = (title, height) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(m, y, usableWidth, height, 2, 2, 'FD');

    doc.setFillColor(15, 43, 92);
    doc.roundedRect(m, y, usableWidth, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(title.toUpperCase(), m + 4, y + 5);

    y += 10;
  };

  // ── SECTION 1 : DÉSIGNATION DES PARTIES ──
  renderSectionBox('1. DÉSIGNATION DES PARTIES CONTRACTANTES', 46);

  // Colonne Gauche : LE MANDANT
  doc.setTextColor(15, 43, 92);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('LE MANDANT (Le Producteur / Demandeur) :', m + 4, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Raison Sociale / Identité : ${clientName}`, m + 4, y + 8);
  doc.text(`N° SIRET : ${clientSiret}`, m + 4, y + 14);
  doc.text(`Adresse du siège : ${siteAddress}`, m + 4, y + 20, { maxWidth: 80 });
  doc.text(`Représenté par : Le Représentant Légal en exercice`, m + 4, y + 30);

  // Colonne Droite : LE MANDATAIRE
  const colRightX = m + 90;
  doc.setTextColor(15, 43, 92);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('LE MANDATAIRE (La Société Mandatée) :', colRightX, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Dénomination : ${MANDATAIRE_INFO.raisonSociale}`, colRightX, y + 8);
  doc.text(`Plateforme : ${MANDATAIRE_INFO.plateforme}`, colRightX, y + 14);
  doc.text(`RCS : ${MANDATAIRE_INFO.rcs}`, colRightX, y + 20);
  doc.text(`Siège : ${MANDATAIRE_INFO.adresse}`, colRightX, y + 26);
  doc.text(`Contact Réseau : ${MANDATAIRE_INFO.emailRaccordement}`, colRightX, y + 32);

  y += 40;

  // ── SECTION 2 : CARACTÉRISTIQUES DU SITE ET DE L'INSTALLATION ──
  renderSectionBox('2. CARACTÉRISTIQUES DE L\'INSTALLATION ET DU SITE', 42);

  const gridLeft = m + 4;
  const gridRight = m + 90;

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  doc.text('Adresse du site :', gridLeft, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(siteAddress, gridLeft + 35, y + 2, { maxWidth: 50 });

  doc.setFont('helvetica', 'bold');
  doc.text('Parcelle(s) Cadastre :', gridLeft, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(String(racData.cadastreParcelles || 'À renseigner'), gridLeft + 35, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Technologie :', gridLeft, y + 18);
  doc.setFont('helvetica', 'normal');
  const typeObj = INSTALLATION_TYPES.find(t => t.id === racData.natureInstallation);
  doc.text(typeObj ? typeObj.label : 'Photovoltaïque', gridLeft + 35, y + 18, { maxWidth: 50 });

  doc.setFont('helvetica', 'bold');
  doc.text('Tension Raccordement :', gridRight, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(`${racData.tension} (${racData.tension === 'HTA' ? '20 000 V' : '400 V'})`, gridRight + 40, y + 2);

  doc.setFont('helvetica', 'bold');
  doc.text('Puissance Injection Pinj :', gridRight, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${pInj} kVA / kWc`, gridRight + 40, y + 10);

  if (isBess || pSout > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Puissance Soutirage Psout :', gridRight, y + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pSout} kVA (Charge BESS)`, gridRight + 40, y + 18);
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Point Référence (PRM/PDR) :', gridRight, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(racData.prmPdr ? `${racData.prmPdr} (Existant)` : 'Création nouveau point de livraison', gridRight + 40, y + 26);

  y += 36;

  // ── SECTION 3 : OBJET ET ÉTENDUE DES POUVOIRS DU MANDAT ──
  renderSectionBox('3. ÉTENDUE DES POUVOIRS ET OBJET DU MANDAT', 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 41, 59);

  const clauses = [
    "Le Mandant donne par les présentes pouvoir exprès, spécial et irrévocable au Mandataire (SAS ENR COURTAGE) d'effectuer en son nom et pour son compte auprès du Gestionnaire du Réseau Public de Distribution d'Électricité (ENEDIS) et/ou du Réseau de Transport (RTE), l'ensemble des démarches nécessaires au raccordement du site susmentionné, notamment :",
    "1. Constitution, signature et transmission du dossier complet de demande de raccordement sur le portail officiel Enedis Connect / RTE.",
    "2. Relations techniques avec l'ingénieur d'affaires Enedis : suivi de l'instruction, transmission des pièces et fiches techniques requises.",
    "3. Réception, étude technique et financière de la Proposition Technique et Financière (PTF) et de la Convention de Raccordement (CRD).",
    "4. Signature et validation des conventions d'exploitation (CRA/CAE) et contrats d'accès au réseau de distribution (CARD-I / CARD-IS).",
    "5. Coordination des démarches de conformité auprès du CONSUEL (visas et contrôles) et assistance jusqu'à la Mise En Service (MES) complète.",
  ];

  clauses.forEach((c, idx) => {
    doc.text(c, m + 4, y + 2 + (idx * 7.5), { maxWidth: usableWidth - 8 });
  });

  y += 52;

  // ── SECTION 4 : SIGNATURES ET MENTIONS LÉGALES ──
  renderSectionBox('4. SIGNATURES & VALIDITÉ', 40);

  const todayStr = new Date().toLocaleDateString('fr-FR');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fait à ${project.city || 'Bordeaux'}, le ${todayStr}, en deux (2) exemplaires originaux faisant foi.`, m + 4, y + 2);
  doc.text('Le présent mandat prend effet à compter de sa signature et demeure valable jusqu\'à la mise en service industrielle définitive.', m + 4, y + 6);

  // Boîtes de signature
  const boxW = (usableWidth - 12) / 2;
  const boxY = y + 10;
  const boxH = 22;

  // Mandant
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(m + 4, boxY, boxW, boxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 43, 92);
  doc.text('POUR LE MANDANT :', m + 6, boxY + 5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Mention manuscrite "Bon pour mandat"', m + 6, boxY + 10);
  doc.text('Nom, Qualité et Signature du représentant légal', m + 6, boxY + 18);

  // Mandataire
  doc.roundedRect(m + 8 + boxW, boxY, boxW, boxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 43, 92);
  doc.text('POUR LE MANDATAIRE (SAS ENR COURTAGE) :', m + 10 + boxW, boxY + 5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Mention manuscrite "Bon pour acceptation du mandat"', m + 10 + boxW, boxY + 10);
  doc.text('Direction Opérations Réseau — Nelson PV', m + 10 + boxW, boxY + 18);

  // Pied de page
  doc.setFillColor(15, 43, 92);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Document officiel généré par Nelson PV (nelsonpv.fr) — Plateforme d\'ingénierie SAS ENR COURTAGE — Raccordement Enedis & RTE', m, H - 5);
  doc.text('Page 1 / 1', W - m - 12, H - 5);

  const filename = `Mandat_Representation_Enedis_${(project.name || project.lastName || 'Projet').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

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
// 2. GÉNÉRATION DU DOSSIER TECHNIQUE CONSUEL PRÉ-REMPLI (PDF)
// ═════════════════════════════════════════════════════════════════════════════

export async function generateConsuelCerfaPdf(project, racData, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const m = 16;
  const usableWidth = W - (2 * m);

  const clientName = (project.clientName || project.company || `${project.firstName || ''} ${project.lastName || project.name || ''}`).trim() || 'Porteur de Projet';
  const siteAddress = (project.address || 'Adresse à préciser') + (project.city ? `, ${project.zip || ''} ${project.city}` : '');
  const pInj = racData.puissanceInjectionKva || project.kwc || 0;
  const pSout = racData.puissanceSoutirageKva || 0;
  const isBess = racData.natureInstallation === 'bess_standalone' || racData.natureInstallation === 'hybride_pv_bess';
  const isHTA = racData.tension === 'HTA';

  const themeColor = isBess ? [109, 40, 217] : [2, 132, 199]; // Violet si BESS, Bleu Ciel si PV
  const headerSub = isBess
    ? 'DOSSIER TECHNIQUE CONSUEL VIOLET — SYSTÈME DE STOCKAGE STATIONNAIRE (BESS)'
    : 'DOSSIER TECHNIQUE CONSUEL SC 144B — PRODUCTION PHOTOVOLTAÏQUE RACCORDÉE';

  // ── HEADER CONSUEL ──
  doc.setFillColor(...themeColor);
  doc.rect(0, 0, W, 32, 'F');
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 32, W, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CONSUEL — DOSSIER TECHNIQUE DE CONFORMITÉ', m, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(headerSub, m, 21);
  doc.setFontSize(7);
  doc.text('Normes NF C 15-100, NF C 15-712-1 / NF C 15-712-3 & Spécifications Enedis-NOI-RES_43E', m, 27);

  let y = 42;

  const renderConsuelSection = (title, height) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(m, y, usableWidth, height, 1.5, 1.5, 'FD');

    doc.setFillColor(...themeColor);
    doc.roundedRect(m, y, usableWidth, 6, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(title.toUpperCase(), m + 3, y + 4.5);

    y += 9;
  };

  // ── 1. IDENTIFICATION DU SITE ET DES INTERVENANTS ──
  renderConsuelSection('1. IDENTIFICATION DE L\'INSTALLATION ET DES INTERVENANTS', 38);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7.5);

  doc.setFont('helvetica', 'bold'); doc.text('Titulaire / Demandeur :', m + 4, y);
  doc.setFont('helvetica', 'normal'); doc.text(clientName, m + 40, y);
  doc.setFont('helvetica', 'bold'); doc.text('SIRET :', m + 110, y);
  doc.setFont('helvetica', 'normal'); doc.text(String(racData.siretProducteur || 'En cours'), m + 130, y);
  y += 6;

  doc.setFont('helvetica', 'bold'); doc.text('Adresse du site :', m + 4, y);
  doc.setFont('helvetica', 'normal'); doc.text(siteAddress, m + 40, y, { maxWidth: 65 });
  doc.setFont('helvetica', 'bold'); doc.text('PRM / PDR Enedis :', m + 110, y);
  doc.setFont('helvetica', 'normal'); doc.text(racData.prmPdr || 'Nouveau raccordement', m + 145, y);
  y += 7;

  doc.setFont('helvetica', 'bold'); doc.text('Installateur / Concepteur :', m + 4, y);
  doc.setFont('helvetica', 'normal'); doc.text(`${MANDATAIRE_INFO.raisonSociale} — SIRET ${MANDATAIRE_INFO.siret}`, m + 40, y);
  y += 6;

  doc.setFont('helvetica', 'bold'); doc.text('Dossier Consuel N° :', m + 4, y);
  doc.setFont('helvetica', 'normal'); doc.text(racData.consuelNumero || 'Demande en cours d\'attribution', m + 40, y);
  doc.setFont('helvetica', 'bold'); doc.text('Régime de raccordement :', m + 110, y);
  doc.setFont('helvetica', 'normal'); doc.text(`${racData.tension} (${isHTA ? '20 kV' : '400 V'})`, m + 145, y);

  y += 14;

  // ── 2. CARACTÉRISTIQUES TECHNIQUES DE LA SOURCE DE PRODUCTION & STOCKAGE ──
  renderConsuelSection('2. CARACTÉRISTIQUES DE PRODUCTION ET DE STOCKAGE (BESS)', 44);

  doc.setFont('helvetica', 'bold'); doc.text('Puissance Crête PV (Pcrête) :', m + 4, y);
  doc.setFont('helvetica', 'normal'); doc.text(`${project.kwc || pInj} kWc`, m + 48, y);
  doc.setFont('helvetica', 'bold'); doc.text('Puissance Maximale d\'Injection (Pinj) :', m + 105, y);
  doc.setFont('helvetica', 'normal'); doc.text(`${pInj} kVA`, m + 160, y);
  y += 6;

  if (isBess || pSout > 0) {
    doc.setFont('helvetica', 'bold'); doc.text('Puissance Soutirage Batterie (Psout) :', m + 4, y);
    doc.setFont('helvetica', 'normal'); doc.text(`${pSout} kVA (Recharge)`, m + 55, y);
    doc.setFont('helvetica', 'bold'); doc.text('Capacité Stockage Batterie :', m + 105, y);
    doc.setFont('helvetica', 'normal'); doc.text(`${Math.round(pSout * 2)} kWh (Technologie LFP certifiée NF EN 62619)`, m + 150, y);
    y += 6;
  }

  doc.setFont('helvetica', 'bold'); doc.text('Type d\'injection :', m + 4, y);
  doc.setFont('helvetica', 'normal'); doc.text(racData.typeInjection, m + 48, y);
  doc.setFont('helvetica', 'bold'); doc.text('Régime de Neutre :', m + 105, y);
  doc.setFont('helvetica', 'normal'); doc.text(isHTA ? 'IT / TN-S côté BT poste HTA' : 'TT (Réseau public BT)', m + 140, y);
  y += 6;

  doc.setFont('helvetica', 'bold'); doc.text('Parcelles Cadastrales :', m + 4, y);
  doc.setFont('helvetica', 'normal'); doc.text(String(racData.cadastreParcelles || 'A renseigner'), m + 48, y);

  y += 18;

  // ── 3. SYSTÈME DE CONVERSION ET PROTECTION DE DÉCOUPLAGE ──
  renderConsuelSection('3. MATÉRIEL DE CONVERSION & DISPOSITIF DE DÉCOUPLAGE RÉSEAU', 44);

  doc.setFont('helvetica', 'bold'); doc.text('Onduleur(s) Réseau :', m + 4, y);
  doc.setFont('helvetica', 'normal'); doc.text(`Marque / Modèle : ${racData.onduleurMarque} ${racData.onduleurModele}`, m + 40, y);
  y += 6;

  doc.setFont('helvetica', 'bold'); doc.text('Système de Découplage :', m + 4, y);
  doc.setFont('helvetica', 'normal');
  const decouplageText = isHTA
    ? 'Relais de protection de découplage externe HTA homologué selon spécification Enedis-NOI-RES_43E et norme NF C 13-100 (Contrôle U<, U>, F<, F>, Dérivée de Fréquence df/dt asservi au déclencheur du disjoncteur général HTA).'
    : 'Protection de découplage intégrée homologuée conforme DIN VDE 0126-1-1 / VFR 2019 avec attestation de conformité constructeur en cours de validité.';
  doc.text(decouplageText, m + 40, y, { maxWidth: usableWidth - 44 });
  y += 14;

  doc.setFont('helvetica', 'bold'); doc.text('Comptage de l\'énergie :', m + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.text(isBess ? 'Comptage 4 quadrants P+, P-, Q+, Q- (Injection et Soutirage simultanés)' : 'Comptage électronique Enedis P+ injection', m + 40, y);

  y += 16;

  // ── 4. SÉCURITÉ ÉLECTRIQUE, TERRE ET PROTECTION DES PERSONNES ──
  renderConsuelSection('4. SÉCURITÉ ÉLECTRIQUE, PROTECTION INCENDIE ET TERRE (NF C 15-100)', 48);

  const securityItems = [
    { label: 'Coupure d\'urgence Pompiers :', val: 'Présence d\'une commande d\'arrêt d\'urgence accessible aux services de secours avec étiquetage réglementaire "ATTENTION PRÉSENCE DE DEUX SOURCES DE TENSION".' },
    { label: 'Parafoudres DC et AC :', val: 'Parafoudres DC Type 2 dimensionnés selon la tension maximale à vide Uoc, et Parafoudres AC Type 2 en tête de tableau TGBT.' },
    { label: 'Disjoncteur Différentiel Général :', val: isHTA ? 'Poste de livraison HTA avec disjoncteur général sous enveloppe métallique NF C 13-100.' : 'Disjoncteur différentiel 300 mA sélectif conforme NF C 15-100.' },
    { label: 'Circuit de Terre et Équipotentialité :', val: 'Valeur de prise de terre mesurée ≤ 100 Ω (BT) ou ≤ 10 Ω (HTA). Liaison équipotentielle principale de l\'ensemble des masses métalliques (ombrières/châssis) en câble cuivre ≥ 16 mm².' },
  ];

  securityItems.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, m + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.text(item.val, m + 50, y, { maxWidth: usableWidth - 54 });
    y += 9.5;
  });

  y += 8;

  // ── 5. ATTESTATION ET VISA DE L'INSTALLATEUR ──
  renderConsuelSection('5. ENGAGEMENT DE CONFORMITÉ DE L\'INSTALLATEUR / CONSTRUCTEUR', 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('Je soussigné, représentant légal de l\'entreprise installatrice, certifie sur l\'honneur que la présente installation a été conçue et réalisée en totale conformité avec les normes en vigueur (NF C 15-100, NF C 15-712, NF C 13-100) et les prescriptions Enedis.', m + 4, y, { maxWidth: usableWidth - 8 });
  y += 7;

  // Signature box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(m + 4, y, usableWidth - 8, 16, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`Fait à Bordeaux, le ${new Date().toLocaleDateString('fr-FR')} — Visa et signature de l\'installateur habilité :`, m + 8, y + 4.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`${MANDATAIRE_INFO.raisonSociale} — Ingénierie & Conformité Réseau`, m + 8, y + 11);

  // Footer
  doc.setFillColor(...themeColor);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Dossier Technique Pré-Rempli Nelson PV — À joindre lors de la commande de l\'attestation sur consuel.com', m, H - 4);
  doc.text('Page 1 / 1', W - m - 12, H - 4);

  const filename = `Dossier_Technique_Consuel_${(project.name || project.lastName || 'Projet').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

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
// 3. EXPORT GLOBAL ZIP PRÊT POUR LE PORTAIL ENEDIS CONNECT
// ═════════════════════════════════════════════════════════════════════════════

export async function generateEnedisGlobalZip(project, racData) {
  const zip = new JSZip();
  const projSlug = (project.name || project.lastName || 'Projet').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  // 1. Génération du Mandat PDF en mémoire
  const mandatRes = await generateEnedisMandatPdf(project, racData, { download: false });
  zip.file(`01_Mandat_de_representation_ENEDIS_signe.pdf`, mandatRes.arrayBuffer);

  // 2. Génération du Dossier Consuel PDF en mémoire
  const consuelRes = await generateConsuelCerfaPdf(project, racData, { download: false });
  zip.file(`02_Dossier_Technique_Consuel_pre_rempli.pdf`, consuelRes.arrayBuffer);

  // 3. Fichier JSON de métadonnées Enedis Connect
  const metadata = {
    plateforme: 'Nelson PV (nelsonpv.fr)',
    dateGeneration: new Date().toISOString(),
    projet: {
      id: project.id || null,
      nom: project.name || project.lastName || 'Sans titre',
      client: project.clientName || project.company || `${project.firstName || ''} ${project.lastName || ''}`.trim(),
      siretProducteur: racData.siretProducteur || project.siret || null,
      adresseSite: project.address || '',
      ville: project.city || '',
      codePostal: project.zip || '',
      coordonneesGps: project.lat && project.lng ? { latitude: project.lat, longitude: project.lng } : null,
      parcellesCadastre: racData.cadastreParcelles || project.cadastre || null,
    },
    caracteristiquesRaccordement: {
      natureInstallation: racData.natureInstallation,
      puissanceInjectionKva: racData.puissanceInjectionKva,
      puissanceSoutirageKva: racData.puissanceSoutirageKva,
      tensionRaccordement: racData.tension,
      typeInjection: racData.typeInjection,
      prmPdrExistant: racData.prmPdr || null,
      numeroAffaireEnedisConnect: racData.enedisAffaireId || null,
    },
    materiel: {
      onduleurs: `${racData.onduleurMarque} ${racData.onduleurModele}`,
      decouplage: racData.onduleurProtectionDecouplage,
    },
    mandataire: MANDATAIRE_INFO,
    piecesJointesIncluses: racData.piecesJointes || {},
  };

  zip.file(`03_Metadonnees_Depot_Enedis_Connect.json`, JSON.stringify(metadata, null, 2));

  // 4. Bordereau Récapitulatif Textuel (prêt à copier-coller)
  const bordereauText = `═══════════════════════════════════════════════════════════════════════════════
BORDEREAU DE DÉPÔT ENEDIS CONNECT — RÉCAPITULATIF DE LA DEMANDE
═══════════════════════════════════════════════════════════════════════════════

1. INFORMATIONS DU DEMANDEUR :
• Mandant (Client) : ${metadata.projet.client}
• SIRET Producteur : ${metadata.projet.siretProducteur || 'En cours'}
• Adresse de l'installation : ${metadata.projet.adresseSite}, ${metadata.projet.codePostal} ${metadata.projet.ville}
• Parcelles Cadastrales : ${metadata.projet.parcellesCadastre || 'Non spécifié'}

2. CARACTÉRISTIQUES ÉLECTRIQUES :
• Nature de l'installation : ${racData.natureInstallation}
• Puissance Maximale d'Injection (Pinj) : ${racData.puissanceInjectionKva} kVA
• Puissance Maximale de Soutirage (Psout) : ${racData.puissanceSoutirageKva} kVA
• Domaine de Tension : ${racData.tension} (${racData.tension === 'HTA' ? '20 000 V' : '400 V Triphasé'})
• Type de Contrat / Injection : ${racData.typeInjection}
• PRM / PDR Existant : ${racData.prmPdr || 'Création d\'un nouveau PDR'}
• N° Affaire Enedis Connect : ${racData.enedisAffaireId || 'À créer lors du dépôt'}

3. MANDATAIRE HABILITÉ :
• Société : ${MANDATAIRE_INFO.raisonSociale} (${MANDATAIRE_INFO.rcs})
• Plateforme : ${MANDATAIRE_INFO.plateforme}
• Contact Raccordement : ${MANDATAIRE_INFO.emailRaccordement}

4. PIÈCES REQUISES À GLISSER SUR ENEDIS CONNECT :
[X] 01 - Mandat de représentation spécial signé (fourni dans ce ZIP)
[X] 02 - Dossier technique préliminaire / Consuel pré-rempli (fourni dans ce ZIP)
[ ] 03 - Plan de situation du terrain (Extrait Cadastre / IGN à l'échelle)
[ ] 04 - Plan de masse orienté avec emprise des générateurs et point de livraison
[ ] 05 - Schéma unifilaire électrique de l'installation
[ ] 06 - Récépissé de déclaration préalable (DP) ou permis de construire (PC)
[ ] 07 - Extrait Kbis < 3 mois du porteur et RIB de la société

Généré le ${new Date().toLocaleDateString('fr-FR')} par la plateforme Nelson PV.
`;
  zip.file(`04_Bordereau_Recapitulatif_Demande.txt`, bordereauText);

  // 5. Guide pas-à-pas pour Enedis Connect
  const guideText = `GUIDE D'UTILISATION — DÉPÔT SUR LE PORTAIL ENEDIS CONNECT
───────────────────────────────────────────────────────────────────────────────
1. Rendez-vous sur le portail officiel Enedis : https://connect.enedis.fr
2. Connectez-vous avec vos identifiants partenaires / mandataire ou créez votre compte.
3. Cliquez sur "Nouvelle demande de raccordement" > Choisissez "Producteur d'électricité".
4. Saisissez les données techniques issues du fichier "03_Metadonnees_Depot_Enedis_Connect.json" :
   - Puissance d'injection : ${racData.puissanceInjectionKva} kVA
   - Si stockage BESS : indiquer également la puissance de soutirage ${racData.puissanceSoutirageKva} kVA
   - Niveau de tension : ${racData.tension}
5. Téléversez les documents :
   - Mandat de représentation : joindre le fichier "01_Mandat_de_representation_ENEDIS_signe.pdf"
   - Ajoutez le Plan de situation, Plan de masse et Schéma unifilaire depuis le dossier Urbanisme Nelson PV.
6. Validez la demande pour recevoir le Numéro d'Affaire Enedis Connect (à reporter dans l'étape 1 du module Nelson).
───────────────────────────────────────────────────────────────────────────────
Support Nelson PV : contact@nelsonpv.fr
`;
  zip.file(`LISEZMOI_Guide_Depot_Enedis_Connect.txt`, guideText);

  // Génération du ZIP binaire et déclenchement du téléchargement
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `Dossier_Raccordement_Enedis_${projSlug}_${dateStr}.zip`;
  saveAs(zipBlob, zipFilename);

  return {
    success: true,
    filename: zipFilename,
    blob: zipBlob,
  };
}

export default {
  MANDATAIRE_INFO,
  INSTALLATION_TYPES,
  INJECTION_TYPES,
  VOLTAGE_LEVELS,
  ENEDIS_CHECKLIST_DOCS,
  formatDateFr,
  formatEuro,
  calculatePtfCountdown,
  getInitialRaccordementData,
  generateEnedisMandatPdf,
  generateConsuelCerfaPdf,
  generateEnedisGlobalZip,
};
