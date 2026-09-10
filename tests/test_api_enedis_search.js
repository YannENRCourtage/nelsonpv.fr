// tests/test_api_enedis_search.js
/**
 * Test d'intégration de l'endpoint backend /api/enedis/search-prm
 */
import handler from '../api/enedis/[[...slug]].js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('   TEST D\'INTÉGRATION BACKEND /api/enedis/search-prm           ');
console.log('═══════════════════════════════════════════════════════════════\n');

function createMockReqRes(method, body = {}, query = {}, url = '/api/enedis/search-prm') {
  const req = {
    method,
    body,
    query: { slug: ['search-prm'], ...query },
    url,
    headers: { host: 'localhost:3000' }
  };

  let statusCode = 200;
  let jsonResponse = null;
  const headers = {};

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, val) {
      headers[name] = val;
      return this;
    },
    json(payload) {
      jsonResponse = payload;
      return this;
    },
    send(payload) {
      jsonResponse = payload;
      return this;
    },
    end() {
      return this;
    }
  };

  return {
    req,
    res,
    getResponse: () => ({ statusCode, data: jsonResponse })
  };
}

async function runBackendTests() {
  let passed = 0;
  let total = 0;

  function check(cond, msg) {
    total++;
    if (cond) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  // Test 1: Recherche avec adresse et nom d'entreprise (EARL Du Mas)
  console.log('1. Appel POST /api/enedis/search-prm avec entreprise :');
  const mock1 = createMockReqRes('POST', {
    address: '14 Rue des Lilas',
    zip: '34000',
    city: 'Montpellier',
    companyName: 'EARL DU MAS',
    clientName: 'Pierre Dupont',
    autoSave: false
  });

  await handler(mock1.req, mock1.res);
  const resp1 = mock1.getResponse();

  check(resp1.statusCode === 200, 'Code HTTP 200 renvoyé');
  check(resp1.data?.success === true, 'Succès true');
  check(resp1.data?.status === 'HIGH_CONFIDENCE', 'Statut HIGH_CONFIDENCE détecté');
  check(resp1.data?.selectedPrm?.puissance_souscrite_kva === 36, 'Compteur professionnel 36 kVA identifié');
  check(resp1.data?.selectedPrm?.prm?.length === 14, `PRM à 14 chiffres renvoyé (${resp1.data?.selectedPrm?.prm})`);

  // Test 2: Recherche ambiguë (2 compteurs industriels similaires)
  console.log('\n2. Appel POST /api/enedis/search-prm avec cas ambigu :');
  const mock2 = createMockReqRes('POST', {
    address: 'Chemin Principal',
    zip: '13000',
    city: 'Marseille',
    companyName: 'SITE INDUSTRIEL AMBIGU',
    autoSave: false
  });

  await handler(mock2.req, mock2.res);
  const resp2 = mock2.getResponse();

  check(resp2.statusCode === 200, 'Code HTTP 200 renvoyé');
  check(resp2.data?.isAmbiguous === true, 'isAmbiguous est true pour déclencher la modale');
  check(Array.isArray(resp2.data?.candidates) && resp2.data?.candidates.length >= 2, 'Au moins 2 candidats renvoyés');

  // Test 3: Recherche sans code postal ni ville (Erreur 400)
  console.log('\n3. Appel avec critères insuffisants :');
  const mock3 = createMockReqRes('POST', {
    address: 'Quelque part'
  });

  await handler(mock3.req, mock3.res);
  const resp3 = mock3.getResponse();

  check(resp3.statusCode === 400, 'Code HTTP 400 pour critères manquants');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`   RÉSULTAT BACKEND : ${passed}/${total} tests réussis.`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

runBackendTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
