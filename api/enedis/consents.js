// api/enedis/consents.js
// Retourne la liste des consentements Enedis depuis Firestore via Admin SDK
// (le SDK client est bloqué par les règles Firestore)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { getAdminDb } = await import('../../src/lib/firebase-admin.js');
        const db = getAdminDb();

        const snapshot = await db
            .collection('enedis_consents')
            .orderBy('updatedAt', 'desc')
            .get();

        const consents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Ne pas exposer les tokens dans la liste
            accessToken: undefined,
            refreshToken: undefined
        }));

        console.log(`[Enedis Consents] Returning ${consents.length} consents`);
        return res.status(200).json({ consents });

    } catch (err) {
        console.error('[Enedis Consents] Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
