/**
 * SERVICE D'INITIALISATION ET DE CONFIGURATION AUTOMATIQUE DE LA DP BESS
 * Gère le modèle de données `dp_config` et le flux hybride :
 * 1. Génération Express 1-Clic
 * 2. Tunnel interactif et modifiable
 */

import { findBessOdreData } from '../data/bessOdreMatrix.js';
import { resolveDemandeurNames } from './SmartCerfaService.js';
import { cadastreService } from './CadastreService.js';

/**
 * Initialise et structure l'état complet du dossier Déclaration Préalable BESS (`dp_config`)
 * @param {object} project Projet Nelson CRM
 * @param {object} [cadastreOverride] Informations parcellaires résolues spatialement
 * @returns {object} Payload `dp_config` complet
 */
export function initBessDpAutoConfig(project, cadastreOverride = null) {
  if (!project) return null;

  // 1. Appariement automatique avec la matrice ODRE des 31 sites
  const odreSite = findBessOdreData(
    project.name || project.client_name || project.clientName || project.id,
    project.city || project.commune,
    project.address,
    project.lat,
    project.lng
  );

  // 2. Résolution du déclarant / demandeur
  const names = resolveDemandeurNames(project);
  const clientNom = names.lastName || project.lastName || project.client_name || project.name || 'BAILLEUR';
  const clientPrenom = names.firstName || project.firstName || project.client_firstname || '';
  const clientAdresse = project.address || project.client_address || project.adresse || (odreSite ? odreSite.commune : '');
  const clientCp = project.zip || project.postalCode || project.code_postal || (odreSite ? odreSite.codePostal : '');
  const clientVille = project.city || project.commune || (odreSite ? odreSite.commune : '');
  const clientTel = project.phone || project.clientPhone || project.client_phone || '05 56 00 00 00';
  const clientEmail = project.email2 || project.email || project.client_email || 'contact@enr-courtage.fr';

  // 3. Références foncières et cadastrales (avec priorité à la parcelle réelle d'implantation)
  const terrainCommune = cadastreOverride?.nom_commune || (odreSite ? odreSite.commune : (project.terrain_city || project.commune || project.city || 'Commune'));
  const terrainCp = cadastreOverride?.code_postal || (odreSite ? odreSite.codePostal : (project.terrain_zip || project.zip || project.code_postal || '00000'));
  
  // Résolution prioritaire : cadastreOverride (spatial) > odreSite (matrice certifiée) > projet CRM
  const rawParcelles = (Array.isArray(project.parcelles) && project.parcelles.length > 0)
    ? project.parcelles
    : (Array.isArray(project.cadastre_parcelles) && project.cadastre_parcelles.length > 0)
      ? project.cadastre_parcelles
      : [];

  let primarySection = cadastreOverride?.section || odreSite?.section || rawParcelles[0]?.section || project.cadastre_section || 'A';
  let primaryNumero = cadastreOverride?.numero || odreSite?.numero || rawParcelles[0]?.numero || project.cadastre_numero || '1';
  let primarySurface = cadastreOverride?.contenance 
    || odreSite?.contenance 
    || Number(String(rawParcelles[0]?.surface || project.cadastre_surface || 2500).replace(/\D/g, '')) 
    || 2500;

  // Cas spécifique PRAVIE : parcelle mitoyenne réelle ZB 0062
  const isPravie = (project.name && /pravie/i.test(project.name)) || (odreSite && odreSite.siteName === 'PRAVIE');
  if (isPravie && (!cadastreOverride || cadastreOverride.numero === '0061' || !cadastreOverride.numero)) {
    primarySection = 'ZB';
    primaryNumero = '0062';
    primarySurface = 27100;
  }

  // 4. Coordonnées d'implantation de la dalle BESS
  const lat = parseFloat(
    project.bessLatitude || project.bess_lat || project.implantation?.lat || project.lat || (odreSite ? (odreSite.bessLatitude || odreSite.latitude) : 45.0)
  );
  const lng = parseFloat(
    project.bessLongitude || project.bess_lng || project.implantation?.lng || project.lng || (odreSite ? (odreSite.bessLongitude || odreSite.longitude) : 1.0)
  );

  // 5. Paramètres techniques standardisés BESS
  const puissanceKw = 500;
  const capaciteKwh = 1044;
  const nbArmoires = 4;
  const longueurDalleM = 6.20;
  const largeurDalleM = 3.20;
  const empriseDalleM2 = 19.84; // 6.20 x 3.20 m
  const hauteurArmoiresM = 2.38;
  const hauteurClotureM = 2.00;
  const reculVoieM = 5.0;
  const reculLimiteM = 3.0;
  const posteSourceNom = odreSite?.posteSourceEnedis || project.substation?.name || 'Poste Source Enedis HTA';
  const distanceKmPoste = odreSite?.distanceKm || project.substation?.distanceKm || 5.0;

  // 6. Rédaction de la Notice Descriptive DP3 & SDIS standardisée
  const noticeCustom = {
    objet: `Installation d'une station de stockage d'énergie stationnaire par batteries (BESS) d'une puissance nominale de 500 kW / 1 044 kWh raccordée au réseau public HTA 20 kV.`,
    site: `Le projet est implanté sur la commune de ${terrainCommune} (${terrainCp}), sur la parcelle cadastrée section ${primarySection} n° ${primaryNumero} d'une contenance de ${primarySurface.toLocaleString('fr-FR')} m². Le terrain d'assiette présente une topographie plane, sans covisibilité directe avec des monuments historiques.`,
    projet: `La station de stockage se compose de 4 armoires compactes CESC Mercury 261 (L 1,30 m x P 1,00 m x H 2,38 m) disposées sur une dalle béton armé étanche de 6,20 m x 3,20 m (emprise au sol : 19,84 m²). L'ensemble est ceinturé par une clôture rigide grillagée thermolaquée verte RAL 6005 d'une hauteur de 2,00 m avec portillon d'accès sécurisé sous cadenas.`,
    raccordement: `Le raccordement électrique s'effectue en HTA 20 kV vers le poste source Enedis "${posteSourceNom}" situé à une distance de ${distanceKmPoste} km, via un câble souterrain respectant les prescriptions techniques du distributeur Enedis.`,
    sdis: `Sécurité incendie & SDIS : Système d'extinction automatique par aérosol au gaz inerte intégré dans chaque rack batterie, capteurs thermiques et détecteurs de fumée communicants 24h/24. Aire d'accès pompier stabilisée hors gel à moins de 50 m du point d'eau incendie homologué (PEI 120 m³/h).`
  };

  const existingConfig = project.dp_config || project.dpConfig || {};

  return {
    declarant: {
      nom: clientNom,
      prenom: clientPrenom,
      date_naissance: existingConfig.declarant?.date_naissance || project.birthDate || '01011980',
      lieu_naissance: existingConfig.declarant?.lieu_naissance || project.birthCity || clientVille,
      dept_naissance: existingConfig.declarant?.dept_naissance || project.birthDepartment || (clientCp ? clientCp.substring(0, 2) : '33'),
      pays_naissance: 'FRANCE',
      adresse: clientAdresse,
      code_postal: clientCp,
      ville: clientVille,
      telephone: clientTel,
      email: clientEmail
    },
    terrain: {
      section: primarySection,
      parcelle: primaryNumero,
      contenance_m2: primarySurface,
      parcelles: rawParcelles,
      adresse: project.address || `${clientAdresse}, ${clientCp} ${clientVille}`,
      code_postal: terrainCp,
      ville: terrainCommune,
      code_insee: project.insee || project.code_insee || terrainCp,
      altitude: project.altitude || 120
    },
    implantation: {
      lat: isNaN(lat) ? 45.0 : lat,
      lng: isNaN(lng) ? 1.0 : lng,
      angle_rotation: existingConfig.implantation?.angle_rotation || 0,
      recul_voie_m: existingConfig.implantation?.recul_voie_m || reculVoieM,
      recul_limite_m: existingConfig.implantation?.recul_limite_m || reculLimiteM
    },
    technique: {
      puissance_kw: puissanceKw,
      capacite_kwh: capaciteKwh,
      nb_armoires: nbArmoires,
      longueur_m: longueurDalleM,
      largeur_m: largeurDalleM,
      emprise_dalle_m2: empriseDalleM2,
      hauteur_armoire_m: hauteurArmoiresM,
      hauteur_cloture_m: hauteurClotureM,
      poste_source: posteSourceNom,
      distance_km: distanceKmPoste,
      tension: "HTA 20 kV"
    },
    notice_custom: {
      ...noticeCustom,
      ...(existingConfig.notice_custom || {})
    },
    pieces_jointes: {
      dp1: existingConfig.pieces_jointes?.dp1 || true,
      dp2: existingConfig.pieces_jointes?.dp2 || true,
      dp3: existingConfig.pieces_jointes?.dp3 || true,
      dp4: existingConfig.pieces_jointes?.dp4 || true,
      dp6: existingConfig.pieces_jointes?.dp6 || true,
      dp7: existingConfig.pieces_jointes?.dp7 || true,
      dp8: existingConfig.pieces_jointes?.dp8 || true,
      dp11: existingConfig.pieces_jointes?.dp11 || true,
      cerfa: true,
      photos: existingConfig.pieces_jointes?.photos || project.photos || project.pc_photos || {}
    },
    status: existingConfig.status || 'READY',
    generatedAt: existingConfig.generatedAt || null,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Construit le payload projet complet à transmettre au moteur `generateFullUrbanismePDF`
 * pour la génération 1-Clic Express de la Déclaration Préalable BESS.
 * @param {object} project Projet Nelson
 * @param {object} [dpConfigOverride] Configuration DP personnalisée ou auto
 * @returns {object} Payload unifié prêt pour le compilateur
 */
export function buildExpressBessProjectPayload(project, dpConfigOverride = null) {
  const dpConfig = dpConfigOverride || initBessDpAutoConfig(project);
  const isBattery = true;

  const fullNoticeText = `1- OBJET DU PROJET :\n${dpConfig.notice_custom.objet}\n\n2- SITE D'IMPLANTATION :\n${dpConfig.notice_custom.site}\n\n3- DESCRIPTION DU PROJET :\n${dpConfig.notice_custom.projet}\n\n4- RACCORDEMENT ÉLECTRIQUE :\n${dpConfig.notice_custom.raccordement}\n\n5- SÉCURITÉ INCENDIE ET ACCÈS SDIS :\n${dpConfig.notice_custom.sdis}`;

  return {
    ...project,
    dp_config: dpConfig,
    isBattery: true,
    isBatteryStandAlone: true,
    solutionType: 'battery',
    urbanisme_solutionType: 'battery',
    type: 'battery',
    installationType: 'Station Batteries Stand-Alone',
    urbanismeType: 'Station Batteries Stand-Alone',
    typeLabel: 'Station Batteries Stand-Alone',
    
    // Déclarant
    demandeur: `${dpConfig.declarant.prenom} ${dpConfig.declarant.nom}`.trim(),
    lastName: dpConfig.declarant.nom,
    firstName: dpConfig.declarant.prenom,
    birthDate: dpConfig.declarant.date_naissance,
    birthCity: dpConfig.declarant.lieu_naissance,
    birthDepartment: dpConfig.declarant.dept_naissance,
    birthCountry: dpConfig.declarant.pays_naissance,
    email: dpConfig.declarant.email,
    email2: dpConfig.declarant.email,
    phone: dpConfig.declarant.telephone,

    // Terrain
    address: dpConfig.terrain.adresse,
    city: dpConfig.terrain.ville,
    commune: dpConfig.terrain.ville,
    terrain_city: dpConfig.terrain.ville,
    terrain_commune: dpConfig.terrain.ville,
    zip: dpConfig.terrain.code_postal,
    postalCode: dpConfig.terrain.code_postal,
    cadastre_section: dpConfig.terrain.section,
    cadastre_numero: dpConfig.terrain.parcelle,
    cadastre_surface: String(dpConfig.terrain.contenance_m2),
    parcelles: dpConfig.terrain.parcelles,

    // Technique
    puissance: `${dpConfig.technique.puissance_kw} kW`,
    kwc: dpConfig.technique.puissance_kw,
    projectSize: `${dpConfig.technique.puissance_kw} kW`,
    emprise: String(Math.round(dpConfig.technique.emprise_dalle_m2)),
    emprise_creee: String(Math.round(dpConfig.technique.emprise_dalle_m2)),

    // Implantation
    lat: dpConfig.implantation.lat,
    lng: dpConfig.implantation.lng,

    // Textes
    description: fullNoticeText,
    noticeText: fullNoticeText,
    objet_travaux: dpConfig.notice_custom.objet,

    // Photos
    photos: dpConfig.pieces_jointes.photos,
    pc_photos: dpConfig.pieces_jointes.photos,
    selectedPages: {
      cover: true,
      situation: true,
      masse: true,
      section_notice: true,
      section: true,
      facades: true,
      insertion: true,
      env: true,
      env_proche: true,
      env_lointain: true,
      dp7: true,
      dp8: true,
      dp_notice: true,
      cerfa: true
    }
  };
}

/**
 * Résout asynchronement la parcelle cadastrale réelle d'implantation via les coordonnées GPS de la station BESS
 * en interrogeant le service Apicarto IGN Cadastre officiel.
 * @param {object} project Projet Nelson
 * @returns {Promise<object>} Payload dp_config avec références cadastrales réelles
 */
export async function initBessDpAutoConfigAsync(project) {
  if (!project) return null;

  try {
    const odreSite = findBessOdreData(
      project.name || project.client_name || project.clientName || project.id,
      project.city || project.commune,
      project.address,
      project.lat,
      project.lng
    );

    const bessLat = parseFloat(
      project.bessLatitude || project.bess_lat || project.implantation?.lat || project.lat || (odreSite ? (odreSite.bessLatitude || odreSite.latitude) : 0)
    );
    const bessLng = parseFloat(
      project.bessLongitude || project.bess_lng || project.implantation?.lng || project.lng || (odreSite ? (odreSite.bessLongitude || odreSite.longitude) : 0)
    );

    let cadastreInfo = null;
    if (bessLat && bessLng && !isNaN(bessLat) && !isNaN(bessLng)) {
      try {
        cadastreInfo = await cadastreService.getParcelle(bessLat, bessLng);
      } catch (cadErr) {
        console.warn('[bessDpAutoInitService] Erreur interrogation Apicarto, utilisation du fallback:', cadErr);
      }
    }

    return initBessDpAutoConfig(project, cadastreInfo);
  } catch (err) {
    console.error('[bessDpAutoInitService] Erreur initBessDpAutoConfigAsync:', err);
    return initBessDpAutoConfig(project);
  }
}

