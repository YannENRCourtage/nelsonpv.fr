import dotenv from 'dotenv';
import { getFirebaseAdmin } from '../src/lib/firebase-admin.js';

dotenv.config();

const CORS_CONFIG = [
  {
    origin: ['*'],
    method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    responseHeader: ['*'],
    maxAgeSeconds: 3600
  }
];

async function main() {
  console.log('Configuration des règles CORS sur les buckets Firebase Storage...');
  try {
    const admin = getFirebaseAdmin();
    const storage = admin.storage();

    const bucketNames = [
      'nelsonpv-4722c.appspot.com',
      'nelsonpv-4722c.firebasestorage.app'
    ];

    for (const name of bucketNames) {
      try {
        const bucket = storage.bucket(name);
        await bucket.setCorsConfiguration(CORS_CONFIG);
        console.log(`✅ CORS configuré avec succès pour le bucket: ${name}`);
      } catch (err) {
        console.warn(`⚠️ Notice pour le bucket ${name}:`, err.message);
      }
    }
    console.log('Terminé.');
  } catch (err) {
    console.error('❌ Erreur configuration Firebase Admin CORS:', err.message);
  }
}

main();
