// tests/test_prm_search.js
/**
 * Tests automatisés pour la Recherche et le Dé-doublonnage de PRM Enedis (Nelson)
 */
import {
  normalizeText,
  stripLegalForm,
  calculateTextSimilarity,
  scoreElectricalProfile,
  scoreNameMatch,
  matchAndDisambiguatePrms
} from '../src/services/enedisPrmMatcher.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('   TESTS DE LA RECHERCHE & DISAMBIGUÏSATION DE PRM ENEDIS      ');
console.log('═══════════════════════════════════════════════════════════════\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ─── 1. Test de normalisation et suppression des formes juridiques ───
console.log('1. Tests de normalisation textuelle :');
assert(
  normalizeText('EARL Les Terres Jaunes !') === 'earl les terres jaunes',
  'Normalisation minuscules et ponctuation'
);
assert(
  stripLegalForm('EARL Les Terres Jaunes') === 'les terres jaunes',
  'Suppression de la forme juridique "EARL"'
);
assert(
  stripLegalForm('GAEC DU SOLEIL SAS') === 'du soleil',
  'Suppression des formes juridiques multiples'
);
assert(
  calculateTextSimilarity('EARL Les Terres Jaunes', 'Les Terres Jaunes') >= 0.9,
  'Similarité élevée entre raison sociale avec et sans statut juridique'
);

// ─── 2. Test de scoring du profil électrique ───
console.log('\n2. Tests du profil électrique :');
const proMeter = {
  puissance_souscrite_kva: 36,
  complement_adresse: 'Hangar Agricole / Bâtiment d\'élevage',
  usage: 'Professionnel',
  segment: 'BT <= 36 kVA'
};
const proScore = scoreElectricalProfile(proMeter);
assert(proScore >= 80, `Score pro élevé (${proScore}/100) pour un compteur 36 kVA avec complément Hangar`);

const resiMeter = {
  puissance_souscrite_kva: 6,
  complement_adresse: 'Maison d\'habitation principale',
  usage: 'Résidentiel',
  segment: 'BT <= 36 kVA'
};
const resiScore = scoreElectricalProfile(resiMeter);
assert(resiScore <= 30, `Score faible (${resiScore}/100) pour une maison 6 kVA`);

// ─── 3. Test de Cas Réel : Site agricole mixte (Maison + Hangar) ───
console.log('\n3. Test Cas Réel : Détection automatique sur site agricole mixte :');
const candidatesMixte = [
  {
    usage_point_id: '16123456789001',
    prm: '16123456789001',
    adresse: {
      numero_voie: '12',
      nom_voie: 'Chemin des Plaines',
      code_postal: '34000',
      commune: 'Montpellier',
      complement_adresse: 'Maison d\'habitation'
    },
    matricule: '101',
    puissance_souscrite_kva: 6,
    segment: 'BT <= 36 kVA',
    etat_contractuel: 'En service',
    titulaire: 'M. Jean Dupont',
    usage: 'Résidentiel'
  },
  {
    usage_point_id: '16123456789002',
    prm: '16123456789002',
    adresse: {
      numero_voie: '12',
      nom_voie: 'Chemin des Plaines',
      code_postal: '34000',
      commune: 'Montpellier',
      complement_adresse: 'Hangar Agricole / Élevage'
    },
    matricule: '450',
    puissance_souscrite_kva: 36,
    segment: 'BT <= 36 kVA',
    etat_contractuel: 'En service',
    titulaire: 'EARL LES TERRES JAUNES',
    usage: 'Professionnel'
  }
];

const resultMixte = matchAndDisambiguatePrms(candidatesMixte, {
  companyName: 'EARL Les Terres Jaunes',
  clientName: 'Jean Dupont',
  address: '12 Chemin des Plaines',
  zip: '34000',
  city: 'Montpellier'
});

assert(resultMixte.status === 'HIGH_CONFIDENCE', 'Le statut doit être HIGH_CONFIDENCE');
assert(resultMixte.selectedPrm?.prm === '16123456789002', 'Le compteur Hangar 36 kVA de l\'EARL doit être sélectionné');
assert(resultMixte.isAmbiguous === false, 'Ne doit pas être ambigu');
assert(resultMixte.selectedPrm?.confidenceScore >= 80, `Score de confiance élevé (${resultMixte.selectedPrm?.confidenceScore}%)`);

// ─── 4. Test de Cas Réel : Site avec compteurs ambigus ───
console.log('\n4. Test Cas Ambigu : Plusieurs compteurs industriels similaires :');
const candidatesAmbigus = [
  {
    usage_point_id: '16999999999001',
    prm: '16999999999001',
    adresse: { numero_voie: '4', nom_voie: 'ZI Les Paluds', code_postal: '13400', commune: 'Aubagne', complement_adresse: 'Bâtiment 1' },
    matricule: '201',
    puissance_souscrite_kva: 36,
    segment: 'BT <= 36 kVA',
    etat_contractuel: 'En service',
    titulaire: 'INDUSTRIE SUD',
    usage: 'Professionnel'
  },
  {
    usage_point_id: '16999999999002',
    prm: '16999999999002',
    adresse: { numero_voie: '4', nom_voie: 'ZI Les Paluds', code_postal: '13400', commune: 'Aubagne', complement_adresse: 'Bâtiment 2' },
    matricule: '202',
    puissance_souscrite_kva: 48,
    segment: 'BT > 36 kVA',
    etat_contractuel: 'En service',
    titulaire: 'INDUSTRIE SUD',
    usage: 'Professionnel'
  }
];

const resultAmbigus = matchAndDisambiguatePrms(candidatesAmbigus, {
  companyName: 'INDUSTRIE SUD',
  address: '4 ZI Les Paluds',
  zip: '13400',
  city: 'Aubagne'
});

assert(resultAmbigus.status === 'AMBIGUOUS', 'Le statut doit être AMBIGUOUS pour 2 compteurs pro de même titulaire');
assert(resultAmbigus.isAmbiguous === true, 'Le flag isAmbiguous doit être vrai pour déclencher la modale');
assert(resultAmbigus.candidates.length === 2, 'Les 2 candidats doivent être présentés au commercial');

// ─── 5. Test Cas : Aucun compteur trouvé ───
console.log('\n5. Test Cas Adresse Inexistante :');
const resultVide = matchAndDisambiguatePrms([], {
  companyName: 'Entreprise Inexistante',
  address: 'Adresse introuvable',
  zip: '99999',
  city: 'Nullepart'
});
assert(resultVide.status === 'NOT_FOUND', 'Statut NOT_FOUND quand la liste est vide');
assert(resultVide.selectedPrm === null, 'selectedPrm est null');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`   RÉSULTAT : ${passedTests}/${totalTests} tests réussis.`);
console.log('═══════════════════════════════════════════════════════════════\n');
