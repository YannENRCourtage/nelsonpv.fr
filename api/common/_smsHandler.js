// api/common/_smsHandler.js
// Gestionnaire backend pour l'envoi de SMS via la passerelle Android TextBee (https://api.textbee.dev)
// Monté dans api/common/[[...slug]].js (avec préfixe "_" pour ne pas compter comme fonction Serverless Vercel supplémentaire)
// Accessible via /api/sms/send et /api/common/sms/send

import axios from 'axios';

const TEXTBEE_BASE_URL = 'https://api.textbee.dev/api/v1';

// Cache léger en mémoire de l'ID de l'appareil Android détecté automatiquement
let cachedDeviceId = null;
let cachedDeviceTimestamp = 0;

/**
 * Normalise un numéro de téléphone français ou international au format E.164 (+33612345678).
 */
function normalizeToE164(rawPhone = '') {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, e164: '', error: 'Numéro de téléphone manquant.' };
  }

  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits || digits.length < 8) {
    return {
      valid: false,
      e164: '',
      error: 'Numéro de téléphone trop court ou invalide (10 chiffres attendus).'
    };
  }

  // 1. Numéro français à 10 chiffres commençant par 0 (ex: 06 12 34 56 78)
  if (digits.length === 10 && digits.startsWith('0')) {
    return { valid: true, e164: `+33${digits.slice(1)}` };
  }
  // 2. Numéro français à 9 chiffres sans 0 initial (ex: 612345678)
  if (digits.length === 9 && /^[1-9]\d{8}$/.test(digits)) {
    return { valid: true, e164: `+33${digits}` };
  }
  // 3. Numéro français préfixé 33 (ex: +33612345678 -> 11 chiffres)
  if (digits.startsWith('33') && digits.length === 11) {
    return { valid: true, e164: `+${digits}` };
  }
  // 4. Numéro français préfixé 0033 (ex: 0033612345678 -> 13 chiffres)
  if (digits.startsWith('0033') && digits.length === 13) {
    return { valid: true, e164: `+33${digits.slice(4)}` };
  }
  // 5. Autres numéros internationaux
  if (hasPlus && digits.length >= 9 && digits.length <= 15) {
    return { valid: true, e164: `+${digits}` };
  }
  if (digits.startsWith('00') && digits.length >= 11 && digits.length <= 17) {
    return { valid: true, e164: `+${digits.slice(2)}` };
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return { valid: true, e164: `+${digits}` };
  }

  return { valid: false, e164: '', error: 'Format de numéro non reconnu.' };
}

/**
 * Résout le DEVICE_ID TextBee :
 *  1) Priorité au paramètre `deviceId` passé dans la requête ou à `process.env.TEXTBEE_DEVICE_ID`
 *  2) Sinon, interroge automatiquement `GET https://api.textbee.dev/api/v1/gateway/devices`
 *     pour récupérer le premier téléphone Android appairé sur le compte TextBee.
 */
async function resolveTextBeeDeviceId(apiKey, overrideDeviceId = '') {
  const cleanOverride = (overrideDeviceId || '').toString().trim();
  if (cleanOverride) return { deviceId: cleanOverride, source: 'request' };

  const envDeviceId = (process.env.TEXTBEE_DEVICE_ID || '').toString().trim();
  if (envDeviceId) return { deviceId: envDeviceId, source: 'env' };

  const now = Date.now();
  if (cachedDeviceId && now - cachedDeviceTimestamp < 5 * 60 * 1000) {
    return { deviceId: cachedDeviceId, source: 'cache' };
  }

  const res = await axios.get(`${TEXTBEE_BASE_URL}/gateway/devices`, {
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json'
    },
    timeout: 8000
  });

  const devices = Array.isArray(res.data?.data)
    ? res.data.data
    : (Array.isArray(res.data?.devices)
        ? res.data.devices
        : (Array.isArray(res.data) ? res.data : []));

  if (!devices || devices.length === 0) {
    return {
      deviceId: null,
      devices: [],
      errorCode: 'NO_TEXTBEE_DEVICE_PAIRED',
      errorMessage: 'Aucun téléphone Android n’est encore appairé sur votre compte TextBee (Étape 4 : scannez le QR Code depuis l’application Android TextBee).'
    };
  }

  const activeDevice = devices.find(d => d && (d.enabled === true || d.isOnline === true || d.status === 'ONLINE')) || devices[0];
  const detectedId = (activeDevice?._id || activeDevice?.id || activeDevice?.deviceId || '').toString().trim();

  if (!detectedId) {
    return {
      deviceId: null,
      devices,
      errorCode: 'INVALID_TEXTBEE_DEVICE',
      errorMessage: 'Appareil TextBee détecté mais identifiant (_id) introuvable.'
    };
  }

  cachedDeviceId = detectedId;
  cachedDeviceTimestamp = now;

  return {
    deviceId: detectedId,
    deviceName: activeDevice?.brand ? `${activeDevice.brand} ${activeDevice.model || ''}`.trim() : (activeDevice?.name || 'Android Gateway'),
    devices,
    source: 'auto_discovered'
  };
}

export default async function handleSms(req, res) {
  const apiKey = (process.env.TEXTBEE_API_KEY || '').toString().trim();

  // Route GET /api/sms/send : permet de vérifier l'état de la passerelle TextBee et les appareils connectés
  if (req.method === 'GET') {
    if (!apiKey) {
      return res.status(200).json({
        configured: false,
        hasDevice: false,
        code: 'MISSING_API_KEY',
        message: 'Variable serveur TEXTBEE_API_KEY non configurée.'
      });
    }
    try {
      const resolved = await resolveTextBeeDeviceId(apiKey, req.query?.deviceId);
      return res.status(200).json({
        configured: true,
        hasDevice: Boolean(resolved.deviceId),
        deviceId: resolved.deviceId,
        deviceName: resolved.deviceName || null,
        devices: resolved.devices || [],
        source: resolved.source || null,
        message: resolved.deviceId
          ? `Passerelle TextBee opérationnelle (${resolved.deviceName || resolved.deviceId})`
          : resolved.errorMessage
      });
    } catch (err) {
      return res.status(200).json({
        configured: true,
        hasDevice: false,
        error: err.response?.data?.message || err.message
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const { to, phone, recipient, recipients, message, deviceId } = req.body || {};

  // Support d'envoi unitaire ({ to }) ou multiple ({ recipients: [...] }) pour les campagnes SMS
  const rawTargets = Array.isArray(recipients) && recipients.length > 0
    ? recipients
    : [to || phone || recipient || ''];

  const validE164List = [];
  for (const r of rawTargets) {
    const norm = normalizeToE164(String(r || ''));
    if (norm.valid && !validE164List.includes(norm.e164)) {
      validE164List.push(norm.e164);
    }
  }

  if (validE164List.length === 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PHONE_NUMBER',
      error: 'Aucun numéro de téléphone mobile valide (10 chiffres attendus).'
    });
  }

  // 2. Validation du message
  const cleanMessage = (message || '').toString().trim();
  if (!cleanMessage) {
    return res.status(400).json({
      success: false,
      code: 'EMPTY_MESSAGE',
      error: 'Le contenu du message SMS ne peut pas être vide.'
    });
  }

  // 3. Vérification de la clé API TextBee côté serveur
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      fallbackRequired: true,
      code: 'MISSING_TEXTBEE_API_KEY',
      error: 'La clé serveur TEXTBEE_API_KEY n’est pas configurée sur cet environnement.'
    });
  }

  try {
    // 4. Résolution automatique ou par variable d'environnement du DEVICE_ID Android
    const resolved = await resolveTextBeeDeviceId(apiKey, deviceId);
    if (!resolved.deviceId) {
      return res.status(422).json({
        success: false,
        fallbackRequired: true,
        code: resolved.errorCode || 'NO_TEXTBEE_DEVICE_PAIRED',
        error: resolved.errorMessage || 'Aucun appareil Android appairé sur TextBee.'
      });
    }

    // 5. Envoi du SMS via TextBee : POST /api/v1/gateway/devices/{DEVICE_ID}/send-sms
    const sendUrl = `${TEXTBEE_BASE_URL}/gateway/devices/${encodeURIComponent(resolved.deviceId)}/send-sms`;
    const textBeeRes = await axios.post(
      sendUrl,
      {
        recipients: validE164List,
        message: cleanMessage
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );

    return res.status(200).json({
      success: true,
      mode: 'api',
      provider: 'textbee',
      recipient: validE164List[0],
      recipients: validE164List,
      count: validE164List.length,
      deviceId: resolved.deviceId,
      deviceName: resolved.deviceName || null,
      deviceSource: resolved.source,
      data: textBeeRes.data?.data || textBeeRes.data
    });
  } catch (err) {
    const httpStatus = err.response?.status || 500;
    const rawErrData = err.response?.data || {};
    const rawMsg = rawErrData.message || rawErrData.error || err.message || 'Erreur lors de l’envoi via TextBee.';

    let code = 'TEXTBEE_API_ERROR';
    let userFriendlyError = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);

    if (httpStatus === 429 || /quota|limit|50/i.test(userFriendlyError)) {
      code = 'TEXTBEE_QUOTA_REACHED';
      userFriendlyError = 'Quota journalier TextBee atteint (50 SMS / jour sur le plan gratuit). Bascule automatique sur le mode SMS natif.';
    } else if (httpStatus === 401 || httpStatus === 403) {
      code = 'TEXTBEE_AUTH_ERROR';
      userFriendlyError = 'Clé API TextBee refusée (401/403). Vérifiez TEXTBEE_API_KEY.';
    } else if (httpStatus === 404 || /device|offline|not found/i.test(userFriendlyError)) {
      code = 'TEXTBEE_DEVICE_OFFLINE';
      userFriendlyError = 'Téléphone Android TextBee introuvable ou hors ligne. Bascule automatique sur le mode SMS natif.';
      cachedDeviceId = null;
    }

    console.warn(`[API /api/sms/send] TextBee error (${httpStatus} - ${code}):`, userFriendlyError);

    return res.status(httpStatus >= 400 && httpStatus < 600 ? httpStatus : 500).json({
      success: false,
      fallbackRequired: true,
      code,
      error: userFriendlyError,
      details: rawErrData
    });
  }
}
