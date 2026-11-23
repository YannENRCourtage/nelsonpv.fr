// src/services/smsService.js
/**
 * Service Frontend d'envoi de SMS via la passerelle serveur TextBee (/api/sms/send)
 * avec repli intelligent et automatique sur le protocole natif `sms:` + copie presse-papiers
 * si le téléphone Android TextBee est hors ligne, non encore appairé ou si le quota est atteint.
 */

import {
  normalizePhoneNumber,
  buildSmsUri,
  buildEnedisConsentSmsText,
  getCrmSmsTemplates,
  getSmsQrCodeImageUrl
} from '@/utils/smsLauncher';

/**
 * Envoie un SMS en interrogeant en priorité l'endpoint serveur `POST /api/sms/send` (passerelle Android TextBee).
 * En cas d'indisponibilité de la passerelle (appareil Android non encore appairé à l'étape 4, hors ligne ou quota),
 * bascule automatiquement sur l'ouverture du lien natif `sms:<numero>?body=<message>` et copie le texte dans le presse-papiers.
 *
 * @param {Object} params
 * @param {string} params.to - Numéro de téléphone mobile du destinataire (ex: "06 12 34 56 78" ou "+33612345678")
 * @param {string} params.message - Texte du SMS à envoyer
 * @param {string} [params.deviceId] - ID d'appareil TextBee optionnel
 * @param {boolean} [params.allowNativeFallback=true] - Ouvrir automatiquement `sms:` si l'API TextBee n'est pas joignable
 * @returns {Promise<{
 *   success: boolean,
 *   mode: 'api' | 'fallback_native' | 'error',
 *   recipient: string,
 *   formattedPhone: string,
 *   copiedToClipboard: boolean,
 *   smsUri: string,
 *   data?: any,
 *   fallbackReason?: string,
 *   error?: string
 * }>}
 */
export async function sendSms({
  to = '',
  message = '',
  deviceId = undefined,
  allowNativeFallback = true
} = {}) {
  const norm = normalizePhoneNumber(to);
  if (!norm.valid) {
    return {
      success: false,
      mode: 'error',
      recipient: '',
      formattedPhone: to,
      copiedToClipboard: false,
      smsUri: '',
      error: norm.error || 'Numéro de téléphone mobile invalide.'
    };
  }

  const cleanMessage = (message || '').toString().trim();
  if (!cleanMessage) {
    return {
      success: false,
      mode: 'error',
      recipient: norm.e164,
      formattedPhone: norm.formatted,
      copiedToClipboard: false,
      smsUri: '',
      error: 'Le message SMS est vide.'
    };
  }

  // Toujours copier le message dans le presse-papiers en parallèle par sécurité
  let copiedToClipboard = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(cleanMessage);
      copiedToClipboard = true;
    } catch (_) {
      copiedToClipboard = false;
    }
  }

  const smsUri = buildSmsUri(norm.e164, cleanMessage);

  // 1. Appel principal vers la route serveur TextBee : POST /api/sms/send
  let apiErrorReason = '';
  try {
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: norm.e164,
        message: cleanMessage,
        ...(deviceId ? { deviceId } : {})
      })
    });

    const json = await response.json().catch(() => ({}));

    if (response.ok && json?.success) {
      return {
        success: true,
        mode: 'api',
        provider: 'textbee',
        recipient: json.recipient || norm.e164,
        formattedPhone: norm.formatted,
        deviceId: json.deviceId || null,
        deviceName: json.deviceName || null,
        copiedToClipboard,
        smsUri,
        data: json.data
      };
    }

    apiErrorReason = json?.error || `Statut HTTP ${response.status}`;
  } catch (networkErr) {
    apiErrorReason = networkErr?.message || 'Serveur SMS injoignable';
  }

  // 2. Mode Fallback intelligent : ouverture de l'application SMS native (`sms:`) + copie presse-papiers
  if (allowNativeFallback && typeof window !== 'undefined') {
    window.location.href = smsUri;
    return {
      success: true,
      mode: 'fallback_native',
      recipient: norm.e164,
      formattedPhone: norm.formatted,
      copiedToClipboard,
      smsUri,
      fallbackReason: apiErrorReason
    };
  }

  return {
    success: false,
    mode: 'error',
    recipient: norm.e164,
    formattedPhone: norm.formatted,
    copiedToClipboard,
    smsUri,
    error: apiErrorReason || 'Échec de l’envoi du SMS.'
  };
}

/**
 * Vérifie l'état de la passerelle TextBee (clé serveur & téléphone Android appairé)
 */
export async function checkTextBeeGatewayStatus() {
  try {
    const res = await fetch('/api/sms/send', { method: 'GET' });
    if (!res.ok) return { configured: false, hasDevice: false };
    return await res.json();
  } catch (_) {
    return { configured: false, hasDevice: false };
  }
}

export const smsService = {
  sendSms,
  checkTextBeeGatewayStatus,
  normalizePhoneNumber,
  buildSmsUri,
  buildEnedisConsentSmsText,
  getCrmSmsTemplates,
  getSmsQrCodeImageUrl
};

export default smsService;
