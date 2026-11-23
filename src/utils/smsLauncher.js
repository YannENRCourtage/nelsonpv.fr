// src/utils/smsLauncher.js
/**
 * Utilitaire centralisé d'envoi de SMS pour NELSON (Enedis Data Connect & CRM)
 * - Normalise les numéros de téléphone français et internationaux (E.164 / local)
 * - Construit les liens natifs `sms:` compatibles iOS, Android, macOS et Windows (Mobile connecté)
 * - Supporte une passerelle SMS optionnelle gratuite (ex. TextBee / Webhook via VITE_SMS_GATEWAY_URL & VITE_SMS_GATEWAY_KEY)
 *   avec repli transparent sur `sms:` natif + copie automatique dans le presse-papiers
 * - Génère l'URL d'un QR Code du lien `sms:` (pour flasher depuis un smartphone quand on travaille sur PC)
 */

/**
 * Normalise un numéro de téléphone français ou international.
 * @param {string} rawPhone - Numéro brut (ex: "06 12 34 56 78", "+33 6 12 34 56 78", "0033612345678")
 * @param {Object} options
 * @param {boolean} [options.international=true] - Si true, convertit "06..." en "+336..."
 * @returns {{ valid: boolean, e164: string, local: string, formatted: string, error?: string }}
 */
export function normalizePhoneNumber(rawPhone = '', { international = true } = {}) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      valid: false,
      e164: '',
      local: '',
      formatted: '',
      error: 'Numéro de téléphone manquant.'
    };
  }

  // Conserver uniquement les chiffres et le signe + initial
  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly || digitsOnly.length < 8) {
    return {
      valid: false,
      e164: '',
      local: '',
      formatted: trimmed,
      error: 'Numéro de téléphone trop court ou invalide (10 chiffres attendus).'
    };
  }

  let e164 = '';
  let local = '';

  // Cas 1 : Numéro français standard à 10 chiffres commençant par 0 (06, 07, 01..09)
  if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
    local = digitsOnly;
    e164 = `+33${digitsOnly.slice(1)}`;
  }
  // Cas 2 : Numéro français à 9 chiffres sans le 0 initial (ex: "612345678")
  else if (digitsOnly.length === 9 && /^[1-9]\d{8}$/.test(digitsOnly)) {
    local = `0${digitsOnly}`;
    e164 = `+33${digitsOnly}`;
  }
  // Cas 3 : Numéro commençant par 33 (ex: +33612345678 -> 11 chiffres)
  else if (digitsOnly.startsWith('33') && digitsOnly.length === 11) {
    const nat = digitsOnly.slice(2);
    local = `0${nat}`;
    e164 = `+33${nat}`;
  }
  // Cas 4 : Numéro commençant par 0033 (ex: 0033612345678 -> 13 chiffres)
  else if (digitsOnly.startsWith('0033') && digitsOnly.length === 13) {
    const nat = digitsOnly.slice(4);
    local = `0${nat}`;
    e164 = `+33${nat}`;
  }
  // Cas 5 : Numéro international (DOM-TOM ou étranger)
  else if (hasPlus && digitsOnly.length >= 9 && digitsOnly.length <= 15) {
    e164 = `+${digitsOnly}`;
    local = digitsOnly;
  } else if (digitsOnly.startsWith('00') && digitsOnly.length >= 11 && digitsOnly.length <= 17) {
    e164 = `+${digitsOnly.slice(2)}`;
    local = digitsOnly;
  } else if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    e164 = `+${digitsOnly}`;
    local = digitsOnly;
  } else {
    return {
      valid: false,
      e164: '',
      local: '',
      formatted: trimmed,
      error: 'Format de numéro non reconnu.'
    };
  }

  // Formatage lisible (ex: 06 12 34 56 78)
  const formatted = local.length === 10
    ? local.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
    : e164;

  return {
    valid: true,
    e164: international ? e164 : local,
    local,
    formatted
  };
}

/**
 * Détecte si l'appareil courant est sous iOS / macOS pour choisir le bon séparateur URI `sms:`
 */
export function isAppleDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /iPad|iPhone|iPod|Macintosh|Mac OS X/i.test(ua);
}

/**
 * Construit le lien natif `sms:` compatible iOS (`sms:+336...&body=...` ou `sms:+336...?&body=...`)
 * et Android / Windows (`sms:+336...?body=...`).
 * Note : La syntaxe universelle `sms:<numero>?body=<texte>` est aujourd'hui supportée par
 * Android, Windows, iOS >= 14 et macOS, tandis que `?&body=` assure la compatibilité iOS historique.
 * @param {string} rawPhone
 * @param {string} messageBody
 * @param {Object} [options]
 * @param {boolean} [options.universalSeparator=false] - Utiliser `?body=` (recommandé pour QR Code)
 * @returns {string} URI `sms:...`
 */
export function buildSmsUri(rawPhone = '', messageBody = '', { universalSeparator = false } = {}) {
  const norm = normalizePhoneNumber(rawPhone);
  const targetNumber = norm.valid ? norm.e164 : (rawPhone || '').replace(/[^\d+]/g, '');
  const encodedBody = encodeURIComponent(messageBody || '');

  if (!encodedBody) {
    return `sms:${targetNumber}`;
  }

  // Sur iOS natif, `?&body=` fonctionne sur toutes les versions ; pour un QR code multi-OS, `?body=` est universel
  const separator = (!universalSeparator && isAppleDevice()) ? '?&body=' : '?body=';
  return `sms:${targetNumber}${separator}${encodedBody}`;
}

/**
 * Construit le message professionnel standard d'autorisation Enedis Data Connect
 */
export function buildEnedisConsentSmsText({ clientName = '', prm = '', consentUrl = '' } = {}) {
  const cleanName = (clientName || '').trim() || 'Madame, Monsieur';
  const cleanPrm = (prm || '').toString().trim() || 'votre compteur';
  const url = consentUrl || (typeof window !== 'undefined'
    ? `${window.location.origin}/api/enedis/auth?projectId=admin_test${prm ? `&prm=${encodeURIComponent(prm)}` : ''}`
    : `https://www.nelsonpv.fr/api/enedis/auth?projectId=admin_test${prm ? `&prm=${encodeURIComponent(prm)}` : ''}`);

  return `Bonjour ${cleanName}, dans le cadre de votre étude solaire/stockage avec ENR Courtage, merci de valider votre autorisation Enedis Data Connect (PRM ${cleanPrm}) via ce lien sécurisé (connexion FranceConnect possible) : ${url}`;
}

/**
 * Retourne les modèles rapides de SMS pour le CRM (Contacts & Projets)
 */
export function getCrmSmsTemplates({ clientName = '', prm = '', projectId = '', city = '', commercialName = '' } = {}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.nelsonpv.fr';
  const cleanName = (clientName || '').trim() || 'Madame, Monsieur';
  const targetProjectId = projectId || 'admin_test';
  const consentParams = new URLSearchParams({ projectId: targetProjectId });
  if (prm && prm.toString().trim().length === 14) {
    consentParams.append('prm', prm.toString().trim());
  }
  const consentUrl = `${origin}/api/enedis/auth?${consentParams.toString()}`;
  const studyUrl = projectId ? `${origin}/project/${encodeURIComponent(projectId)}/edit` : `${origin}`;
  const signatureLabel = commercialName ? `ENR Courtage (${commercialName})` : 'ENR Courtage Énergie';

  return [
    {
      id: 'enedis_consent',
      label: '⚡ Lien consentement Enedis Data Connect',
      description: 'Demande d\'autorisation Linky (FranceConnect / 3 ans max)',
      link: consentUrl,
      message: buildEnedisConsentSmsText({
        clientName: cleanName,
        prm: prm || 'Linky',
        consentUrl
      })
    },
    {
      id: 'rdv_confirmation',
      label: '📅 Confirmation de RDV / Étude solaire & stockage',
      description: 'Confirmation d\'étude technique et prise de rendez-vous',
      link: `${origin}/enedis-admin`,
      message: `Bonjour ${cleanName}, suite à notre échange concernant votre projet photovoltaïque / stockage batterie${city ? ` à ${city}` : ''}, nous confirmons le lancement de votre étude de dimensionnement. Pour activer l'analyse de votre compteur Enedis : ${consentUrl} — ${signatureLabel}`
    },
    {
      id: 'proposal_link',
      label: '📄 Envoi lien proposition / suivi dossier',
      description: 'Notification de mise à disposition de l\'étude et chiffrage',
      link: studyUrl,
      message: `Bonjour ${cleanName}, votre étude de dimensionnement solaire / stockage batterie est prête chez ${signatureLabel}. Vous pouvez finaliser l'autorisation de raccordement Enedis ou consulter votre référent via : ${consentUrl}`
    }
  ];
}

/**
 * Génère une URL d'image QR Code encodant le lien `sms:` (format universel SMSTO / sms:)
 * afin qu'un utilisateur travaillant sur PC puisse scanner le code avec son smartphone
 * et expédier instantanément le SMS depuis sa carte SIM.
 */
export function getSmsQrCodeImageUrl(rawPhone = '', messageBody = '', size = 220) {
  const smsUri = buildSmsUri(rawPhone, messageBody, { universalSeparator: true });
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&ecc=M&data=${encodeURIComponent(smsUri)}`;
}

/**
 * Vérifie si une passerelle SMS externe (TextBee / Webhook) est configurée dans les variables d'environnement
 */
export function hasSmsGatewayConfigured() {
  try {
    const gatewayUrl = import.meta?.env?.VITE_SMS_GATEWAY_URL;
    return Boolean(gatewayUrl && gatewayUrl.trim().length > 0);
  } catch (_) {
    return false;
  }
}

/**
 * Envoie le SMS via une passerelle configurée (`VITE_SMS_GATEWAY_URL` + `VITE_SMS_GATEWAY_KEY`, ex: TextBee)
 * ou ouvre l'application SMS native (`sms:`) tout en copiant le message dans le presse-papiers.
 *
 * @param {Object} params
 * @param {string} params.phone - Numéro du destinataire
 * @param {string} params.message - Contenu du SMS
 * @param {boolean} [params.preferGateway=false] - Tenter d'abord la passerelle API si configurée
 * @param {boolean} [params.openNativeApp=true] - Ouvrir le protocole `sms:`
 * @returns {Promise<{ success: boolean, method: 'gateway' | 'native_sms' | 'clipboard_only', normalizedPhone: string, smsUri: string, copiedToClipboard: boolean, error?: string }>}
 */
export async function launchSms({
  phone = '',
  message = '',
  preferGateway = false,
  openNativeApp = true
} = {}) {
  const norm = normalizePhoneNumber(phone);
  if (!norm.valid) {
    return {
      success: false,
      method: 'native_sms',
      normalizedPhone: '',
      smsUri: '',
      copiedToClipboard: false,
      error: norm.error || 'Numéro de téléphone invalide.'
    };
  }

  // 1. Copier systématiquement le message dans le presse-papiers par sécurité
  let copiedToClipboard = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard && message) {
    try {
      await navigator.clipboard.writeText(message);
      copiedToClipboard = true;
    } catch (_) {
      copiedToClipboard = false;
    }
  }

  const smsUri = buildSmsUri(norm.e164, message);

  // 2. Tentative prioritaire via l'endpoint serveur TextBee (/api/sms/send) ou passerelle VITE_SMS_GATEWAY_URL
  if (preferGateway) {
    try {
      const apiRes = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ to: norm.e164, message })
      });
      const apiJson = await apiRes.json().catch(() => ({}));
      if (apiRes.ok && apiJson?.success) {
        return {
          success: true,
          method: 'gateway',
          mode: 'api',
          provider: 'textbee',
          normalizedPhone: norm.e164,
          formattedPhone: norm.formatted,
          deviceId: apiJson.deviceId || null,
          deviceName: apiJson.deviceName || null,
          smsUri,
          copiedToClipboard
        };
      }
    } catch (apiErr) {
      console.warn('[smsLauncher] /api/sms/send indisponible, repli :', apiErr.message);
    }
  }

  const gatewayUrl = import.meta?.env?.VITE_SMS_GATEWAY_URL;
  const gatewayKey = import.meta?.env?.VITE_SMS_GATEWAY_KEY;

  if (preferGateway && gatewayUrl) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (gatewayKey) {
        headers['x-api-key'] = gatewayKey;
        headers['Authorization'] = `Bearer ${gatewayKey}`;
      }
      const res = await fetch(gatewayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipients: [norm.e164],
          phone: norm.e164,
          message
        })
      });
      if (res.ok) {
        return {
          success: true,
          method: 'gateway',
          normalizedPhone: norm.e164,
          formattedPhone: norm.formatted,
          smsUri,
          copiedToClipboard
        };
      }
    } catch (gwErr) {
      console.warn('[smsLauncher] Passerelle SMS indisponible, repli sur sms: natif :', gwErr.message);
    }
  }

  // 3. Ouverture du protocole natif `sms:`
  if (openNativeApp && typeof window !== 'undefined') {
    window.location.href = smsUri;
    return {
      success: true,
      method: 'native_sms',
      normalizedPhone: norm.e164,
      formattedPhone: norm.formatted,
      smsUri,
      copiedToClipboard
    };
  }

  return {
    success: copiedToClipboard,
    method: 'clipboard_only',
    normalizedPhone: norm.e164,
    formattedPhone: norm.formatted,
    smsUri,
    copiedToClipboard
  };
}
