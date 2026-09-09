/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE POSTAL API ROUTER
 * Catch-all Serverless Vercel : /api/servicepostal/[[...slug]]
 *
 * Routes :
 *   POST /api/servicepostal/send    → Envoi de courrier postal (La Poste)
 *   GET  /api/servicepostal/status  → Consultation du statut / suivi de lettre
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apiKey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query || {};
  const action = Array.isArray(slug) ? slug[0] : (slug || '');
  const url = req.url || '';

  const apiKey = process.env.SERVICEPOSTAL_API_KEY;
  const baseUrl = process.env.SERVICEPOSTAL_API_URL || 'https://prod-api.servicepostal.com';

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'La clé API ServicePostal (SERVICEPOSTAL_API_KEY) n\'est pas configurée sur le serveur.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ROUTE 1 : STATUS (GET /api/servicepostal/status?uid=...)
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'status' || url.includes('/status')) {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée. Seul GET est accepté pour /status.' });
    }

    const { uid } = req.query || {};
    if (!uid) {
      return res.status(400).json({ success: false, error: 'Le paramètre uid est obligatoire.' });
    }

    try {
      const infoRes = await fetch(`${baseUrl}/lettres/${encodeURIComponent(uid)}/infos`, {
        method: 'GET',
        headers: {
          'apiKey': apiKey,
          'Accept': 'application/json'
        }
      });

      const infoData = await infoRes.json().catch(() => null);

      if (!infoRes.ok) {
        return res.status(infoRes.status).json({
          success: false,
          error: infoData?.message || `Erreur Service Postal (${infoRes.status})`,
          details: infoData
        });
      }

      // Suivi postal si disponible
      let trackingData = null;
      try {
        const trackRes = await fetch(`${baseUrl}/lettres/${encodeURIComponent(uid)}/suivi`, {
          headers: { 'apiKey': apiKey, 'Accept': 'application/json' }
        });
        if (trackRes.ok) {
          trackingData = await trackRes.json().catch(() => null);
        }
      } catch {
        // Ignorer l'erreur si le suivi n'est pas actif pour cet affranchissement
      }

      return res.status(200).json({
        success: true,
        uid,
        statut: infoData?.data?.statut || infoData?.statut || 'inconnu',
        dateEnvoi: infoData?.data?.date_envoi || infoData?.date_envoi,
        infos: infoData?.data || infoData,
        suivi: trackingData
      });
    } catch (error) {
      console.error('[ServicePostal Router] Erreur statut:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur interne lors de la récupération du statut.',
        message: error.message
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ROUTE 2 : SEND (POST /api/servicepostal/send)
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'send' || url.includes('/send') || req.method === 'POST') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée. Seul POST est accepté pour /send.' });
    }

    try {
      const { pdfBase64, recipient, options = {} } = req.body || {};

      if (!pdfBase64) {
        return res.status(400).json({
          success: false,
          error: 'Le document PDF au format Base64 est obligatoire (paramètre pdfBase64).'
        });
      }

      if (!recipient) {
        return res.status(400).json({
          success: false,
          error: 'Les coordonnées du destinataire sont obligatoires (paramètre recipient).'
        });
      }

      // Nettoyage de la chaîne Base64 si préfixée par data URI
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();

      // Normalisation de l'adresse destinataire
      const rawStreet = (recipient.adresse_ligne1 || recipient.address || recipient.street || '').trim();
      let streetLine = rawStreet;
      let postalCode = (recipient.code_postal || recipient.postalCode || recipient.cp || '').trim();
      let city = (recipient.ville || recipient.city || recipient.commune || '').trim();

      // Détection automatique du code postal et de la ville si intégrés dans l'adresse
      if (!postalCode || !city) {
        const cpMatch = streetLine.match(/\b(\d{5})\b\s*(.*)$/);
        if (cpMatch) {
          if (!postalCode) postalCode = cpMatch[1];
          if (!city && cpMatch[2]) city = cpMatch[2].replace(/[,\.]/g, '').trim();
          streetLine = streetLine.replace(cpMatch[0], '').replace(/[,\s]+$/, '').trim();
        }
      }

      const nomSociete = (recipient.nom_societe || recipient.company || recipient.societe || recipient.ownerName || '').trim();
      const contactNom = (recipient.nom || recipient.name || recipient.contact || '').trim();

      if (!streetLine || !postalCode || !city) {
        return res.status(400).json({
          success: false,
          error: 'Adresse postale incomplète pour l\'envoi La Poste (adresse, code postal et ville requis).',
          details: { streetLine, postalCode, city }
        });
      }

      const payload = {
        adresse_expedition: {
          nom_societe: 'ENR COURTAGE',
          adresse_ligne1: '7 RUE GUTENBERG',
          code_postal: '33700',
          ville: 'MERIGNAC',
          pays: 'FRANCE'
        },
        adresse_destination: {
          nom_societe: nomSociete || undefined,
          nom: contactNom || (nomSociete ? undefined : 'Direction de l\'établissement'),
          adresse_ligne1: streetLine.slice(0, 38).toUpperCase(),
          adresse_ligne2: recipient.adresse_ligne2 ? recipient.adresse_ligne2.slice(0, 38).toUpperCase() : undefined,
          code_postal: postalCode,
          ville: city.toUpperCase(),
          pays: (recipient.pays || recipient.country || 'FRANCE').toUpperCase()
        },
        fichier: {
          format: 'pdf',
          contenu_base64: cleanBase64
        },
        type_affranchissement: options.affranchissement || 'verte',
        couleur: options.couleur || 'couleur',
        recto_verso: options.recto_verso || 'rectoverso',
        placement_adresse: 'premiere_page',
        surimpression_adresses_document: false, // Utilise directement notre bloc AFNOR sans surimprimer
        impression_expediteur: false,
        reference: options.reference ? String(options.reference).slice(0, 50) : undefined
      };

      const isPreview = Boolean(options.preview);
      const endpoint = isPreview ? `${baseUrl}/lettres/previsualiser` : `${baseUrl}/lettres`;

      console.log(`[ServicePostal Router] Appel ${endpoint} pour ${nomSociete || contactNom} (${postalCode} ${city})...`);

      const spResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apiKey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const rawResponse = await spResponse.text();
      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch {
        data = { raw: rawResponse };
      }

      if (!spResponse.ok) {
        console.error(`[ServicePostal Router] Erreur HTTP ${spResponse.status}:`, data);

        if (spResponse.status === 403) {
          return res.status(403).json({
            success: false,
            errorCode: 'SERVICEPOSTAL_ACCOUNT_403',
            error: "Votre compte Service Postal n'est pas autorisé à accéder à l'API (HTTP 403). Veuillez vous connecter à votre espace client sur servicepostal.com et vérifier que l'option API est bien activée, ou contacter leur support.",
            details: data
          });
        }

        if (spResponse.status === 401) {
          return res.status(401).json({
            success: false,
            errorCode: 'SERVICEPOSTAL_AUTH_401',
            error: "Clé d'API Service Postal invalide ou révoquée (HTTP 401).",
            details: data
          });
        }

        return res.status(spResponse.status).json({
          success: false,
          error: data.message || `Erreur Service Postal (${spResponse.status})`,
          details: data
        });
      }

      return res.status(200).json({
        success: true,
        isPreview,
        uid: data.uid,
        statut: data.statut || (isPreview ? 'previsualise' : 'valide'),
        affranchissement: data.affranchissement,
        service: data.service,
        total: data.total,
        url: data.fichier_previsualisation?.url || data.fichier?.url,
        data
      });

    } catch (error) {
      console.error('[ServicePostal Router] Erreur interne serveur:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur interne lors de la communication avec Service Postal.',
        message: error.message
      });
    }
  }

  return res.status(404).json({ success: false, error: 'Route Service Postal non trouvée.' });
}
