// src/services/enedisPrmMatcher.js
/**
 * Moteur de croisement, filtrage anti-doublon et scoring de certitude
 * pour l'identification automatique du PRM professionnel Enedis.
 */

// Mots-clés indiquant une installation ou bâtiment professionnel / agricole
const PRO_KEYWORDS = [
  'hangar', 'atelier', 'exploitation', 'batiment', 'bâtiment', 'entrepot', 'entrepôt',
  'silo', 'grange', 'hangar agricole', 'elevage', 'élevage', 'cave', 'serre',
  'bureau', 'bureaux', 'usine', 'depot', 'dépôt', 'zone artisanale', 'za', 'zi', 'parc'
];

// Mots-clés indiquant une installation résidentielle / domestique
const RESIDENTIAL_KEYWORDS = [
  'maison', 'habitation', 'logement', 'appartement', 'residence', 'résidence',
  'villa', 'pavillon', 'studio', 'domestique', 'particulier'
];

// Formes juridiques courantes à normaliser
const LEGAL_FORMS = [
  'sas', 'sasu', 'sarl', 'eurl', 'earl', 'gaec', 'scea', 'sci', 'sa', 'snc',
  'gfa', 'gie', 'association', 'cooperative', 'coop', 'exploitant'
];

/**
 * Normalise une chaîne de caractères : suppression des accents, ponctuation,
 * passage en minuscules et suppression des formes juridiques.
 */
export function normalizeText(str = '') {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')   // Remplace la ponctuation par un espace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Nettoie un nom d'entreprise en supprimant les formes juridiques courantes.
 */
export function stripLegalForm(companyName = '') {
  const norm = normalizeText(companyName);
  const words = norm.split(' ').filter(w => !LEGAL_FORMS.includes(w) && w.length > 1);
  return words.join(' ');
}

/**
 * Calcule un indice de similarité textuelle entre 0 et 1 (Token Overlap / Jaccard étendu).
 */
export function calculateTextSimilarity(str1 = '', str2 = '') {
  const clean1 = stripLegalForm(str1);
  const clean2 = stripLegalForm(str2);

  if (!clean1 || !clean2) return 0;
  if (clean1 === clean2) return 1.0;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.9;

  const tokens1 = new Set(clean1.split(' ').filter(t => t.length > 2));
  const tokens2 = new Set(clean2.split(' ').filter(t => t.length > 2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach(t => {
    if (tokens2.has(t)) intersection++;
  });

  const union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Analyse le profil électrique et le complément d'adresse d'un point Enedis.
 * Retourne un score de profil professionnel de 0 à 100.
 */
export function scoreElectricalProfile(meter = {}) {
  let score = 50; // Score de départ neutre
  const powerKva = parseFloat(meter.puissance_souscrite_kva || meter.puissance_souscrite || 0);
  const complement = normalizeText(meter.complement_adresse || meter.adresse?.complement_adresse || '');
  const usage = normalizeText(meter.usage || meter.type_point || '');
  const segment = normalizeText(meter.segment || '');
  const titulaire = normalizeText(meter.titulaire || '');

  // 1. Analyse du croisement Sirene ou compteur résidentiel
  if (meter.sireneMatched) {
    score += 25;
  }
  if (titulaire === 'compteur residentiel' || usage.includes('resi') || usage.includes('domest')) {
    score -= 30;
  }

  // 2. Analyse de la puissance souscrite
  if (powerKva >= 36) {
    // Puissance typique professionnelle / agricole (Tarif Jaune ou Vert ou max Bleu)
    score += 35;
  } else if (powerKva >= 18) {
    score += 20;
  } else if (powerKva > 0 && powerKva <= 6) {
    // Petite puissance typique d'une maison d'habitation
    score -= 30;
  } else if (powerKva <= 9) {
    score -= 15;
  }

  // 3. Analyse des mots-clés du complément d'adresse
  for (const kw of PRO_KEYWORDS) {
    if (complement.includes(kw)) {
      score += 25;
      break;
    }
  }

  for (const kw of RESIDENTIAL_KEYWORDS) {
    if (complement.includes(kw)) {
      score -= 35;
      break;
    }
  }

  // 4. Analyse du segment ou usage explicite
  if (usage.includes('pro') || segment.includes('jaune') || segment.includes('vert') || segment.includes('c4') || segment.includes('c3') || segment.includes('c2')) {
    score += 20;
  }

  // Borner entre 0 et 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Évalue la concordance entre le titulaire du compteur et l'entreprise / le contact.
 * Retourne un score de 0 à 100.
 */
export function scoreNameMatch(meter = {}, criteria = {}) {
  const meterTitulaire = meter.titulaire || meter.nom_client || meter.raison_sociale || '';
  const { companyName = '', clientName = '' } = criteria;

  if (normalizeText(meterTitulaire) === 'compteur residentiel') {
    return 0; // Compteur domestique neutre RGPD
  }

  if (meter.sireneMatched) {
    return 95; // Entreprise certifiée croisée via l'API Sirene
  }

  if (!meterTitulaire) return 40; // Donnée non fournie par Enedis (souvent masquée RGPD)

  let maxSim = 0;

  // Comparaison avec la raison sociale
  if (companyName) {
    const simCompany = calculateTextSimilarity(meterTitulaire, companyName);
    maxSim = Math.max(maxSim, simCompany);
  }

  // Comparaison avec le nom du client / gérant
  if (clientName) {
    const simClient = calculateTextSimilarity(meterTitulaire, clientName);
    maxSim = Math.max(maxSim, simClient * 0.85); // Légèrement moins prioritaire que la raison sociale
  }

  return Math.round(maxSim * 100);
}

/**
 * Score le statut contractuel (En service vs Résilié).
 */
export function scoreContractState(meter = {}) {
  const etat = normalizeText(meter.etat_contractuel || meter.statut || 'en service');
  if (etat.includes('resilie') || etat.includes('inactif') || etat.includes('coupe')) {
    return 10;
  }
  return 100;
}

/**
 * Fonction principale : prend une liste de compteurs candidats Enedis et des critères de recherche,
 * calcule les scores de confiance de chaque compteur, et détermine le résultat (HIGH_CONFIDENCE, AMBIGUOUS, NOT_FOUND).
 *
 * @param {Array} candidates - Liste des compteurs renvoyés par Enedis
 * @param {Object} criteria - Critères du prospect { companyName, clientName, address, zip, city }
 * @returns {Object} { status, selectedPrm, candidates, isAmbiguous }
 */
export function matchAndDisambiguatePrms(candidates = [], criteria = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      status: 'NOT_FOUND',
      selectedPrm: null,
      candidates: [],
      isAmbiguous: false,
      message: 'Aucun compteur trouvé à cette adresse exacte. Veuillez saisir le PRM manuellement.'
    };
  }

  // 1. Scorer chaque candidat
  const scoredCandidates = candidates.map(meter => {
    const nameScore = scoreNameMatch(meter, criteria);
    const profileScore = scoreElectricalProfile(meter);
    const contractScore = scoreContractState(meter);

    // Pondération : 45% Nom, 40% Profil électrique pro, 15% Contrat actif
    const totalScore = Math.round(
      (nameScore * 0.45) +
      (profileScore * 0.40) +
      (contractScore * 0.15)
    );

    const powerKva = parseFloat(meter.puissance_souscrite_kva || meter.puissance_souscrite || 0);

    // Construction d'une explication lisible
    const reasons = [];
    if (meter.sireneMatched) {
      reasons.push(`Entreprise certifiée Sirene ("${meter.titulaire}")`);
    } else if (nameScore >= 70) {
      reasons.push(`Titulaire concordant ("${meter.titulaire || criteria.companyName}")`);
    }

    if (powerKva >= 36) reasons.push(`Puissance professionnelle (${powerKva} kVA)`);
    else if (powerKva > 0 && powerKva <= 6) reasons.push(`Faible puissance (${powerKva} kVA - logement)`);

    if (normalizeText(meter.titulaire) === 'compteur residentiel') {
      reasons.push('Usage Domestique • RGPD');
    }

    const complement = meter.complement_adresse || meter.adresse?.complement_adresse;
    if (complement) reasons.push(`Complément : ${complement}`);

    return {
      ...meter,
      prm: (meter.prm || meter.usage_point_id || '').toString(),
      puissance_souscrite_kva: powerKva,
      confidenceScore: totalScore,
      scoringDetails: { nameScore, profileScore, contractScore },
      recommendationReason: reasons.join(' • ') || 'Profil correspondant'
    };
  });

  // 2. Trier par score décroissant
  scoredCandidates.sort((a, b) => b.confidenceScore - a.confidenceScore);

  // Marquer le meilleur comme recommandé
  if (scoredCandidates.length > 0) {
    scoredCandidates[0].isRecommended = true;
  }

  // 3. Détermination de la certitude
  // Cas A : Un seul compteur trouvé
  if (scoredCandidates.length === 1) {
    const sole = scoredCandidates[0];
    if (sole.confidenceScore >= 40) {
      return {
        status: 'HIGH_CONFIDENCE',
        selectedPrm: sole,
        candidates: scoredCandidates,
        isAmbiguous: false,
        message: 'Compteur identifié avec certitude.'
      };
    }
    // Score trop bas même pour un seul compteur
    return {
      status: 'AMBIGUOUS',
      selectedPrm: sole,
      candidates: scoredCandidates,
      isAmbiguous: true,
      message: 'Un compteur a été trouvé mais avec un faible indice de correspondance.'
    };
  }

  // Cas B : Plusieurs compteurs trouvés
  const best = scoredCandidates[0];
  const second = scoredCandidates[1];
  const margin = best.confidenceScore - second.confidenceScore;

  // Si le premier a un score solide (>= 75) et bat nettement le second (marge >= 25)
  if (best.confidenceScore >= 75 && margin >= 25) {
    return {
      status: 'HIGH_CONFIDENCE',
      selectedPrm: best,
      candidates: scoredCandidates,
      isAmbiguous: false,
      message: `Compteur professionnel sélectionné automatiquement (${best.recommendationReason}).`
    };
  }

  // Sinon, c'est ambigu : modale requise
  return {
    status: 'AMBIGUOUS',
    selectedPrm: best.confidenceScore >= 50 ? best : null,
    candidates: scoredCandidates,
    isAmbiguous: true,
    message: `${scoredCandidates.length} compteurs détectés à cette adresse. Validation nécessaire.`
  };
}
