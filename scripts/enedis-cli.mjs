// scripts/enedis-cli.mjs
/**
 * CLI & Module d'automatisation Enedis Tiers pour Nelson
 * Usage :
 *   node scripts/enedis-cli.mjs auth
 *   node scripts/enedis-cli.mjs declare 16138350177475 --name "Jean Dupont" --email "jean@example.com"
 *   node scripts/enedis-cli.mjs fetch 16138350177475
 *   node scripts/enedis-cli.mjs load-curve 16138350177475 --days 7
 *   node scripts/enedis-cli.mjs auto 16138350177475 --name "Jean Dupont" (Appelé par Webhook Signature)
 */

import { getAccessToken, declareAndFetchEnedis } from '../src/services/enedisAutomation.js';

export { getAccessToken, declareAndFetchEnedis };

// Mode CLI
async function main() {
  if (process.argv[1]?.endsWith('enedis-cli.mjs')) {
    const action = process.argv[2] || 'auth';
    const prm = process.argv[3] || '16138350177475';

    if (action === 'auth') {
      console.log('--- Test Authentification Enedis ---');
      try {
        const token = await getAccessToken('production');
        console.log('✅ Token Production généré :', token.substring(0, 20) + '...');
      } catch (e) {
        console.error('❌ Erreur token :', e.message);
      }
    } else if (action === 'auto' || action === 'fetch') {
      try {
        const res = await declareAndFetchEnedis({ prm });
        console.log('Résultats :', res);
      } catch (e) {
        console.error('❌ Erreur auto :', e.message);
      }
    }
  }
}

main().catch(err => {
  console.error('[CLI Error]:', err.message);
});
