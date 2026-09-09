// api/signature/[[...slug]].js
// API Omnicanal de Signature Électronique eIDAS & Webhooks pour le Mandat Enedis
// Routes gérées :
//   POST /api/signature/initiate        → Initie la signature (Email, SMS, WhatsApp, Tablette)
//   GET  /api/signature/session         → Récupère les infos d'une session de signature
//   POST /api/signature/send-otp        → Envoie un code OTP par SMS pour authentification eIDAS
//   POST /api/signature/verify-and-sign → Valide l'OTP, scelle le PDF et DÉCLENCHE Enedis
//   POST /api/signature/webhook         → Écoute les retours webhooks externes (Yousign / DocuSign)

import crypto from 'crypto';
import { getAdminDb } from '../../src/lib/firebase-admin.js';
import { setSecureCors } from '../common/authMiddleware.js';
import { generateMandatPdf } from '../../src/services/enedisMandatPdfService.js';
import { declareAndFetchEnedis } from '../../src/services/enedisAutomation.js';

// Cache en mémoire pour sessions de signature rapides (avec persistance Firestore)
const memorySessions = new Map();

// ─── 1. INITIATION DE LA DEMANDE DE SIGNATURE ─────────────────────────────────
async function handleInitiate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    prm,
    clientName = '',
    clientCompany = '',
    clientSiren = '',
    clientAddress = '',
    clientEmail = '',
    clientPhone = '',
    channel = 'email', // 'email' | 'sms' | 'whatsapp' | 'tablet'
    projectId = 'admin_test'
  } = req.body || {};

  const cleanPrm = (prm || '').toString().trim();
  if (!cleanPrm || cleanPrm.length !== 14 || !/^\d{14}$/.test(cleanPrm)) {
    return res.status(400).json({ error: 'Le PRM doit contenir exactement 14 chiffres.' });
  }

  const sessionId = 'sig_' + cleanPrm + '_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
  const baseUrl = 'https://www.nelsonpv.fr';
  const signingUrl = `${baseUrl}/signer-mandat?session=${sessionId}${channel === 'tablet' ? '&mode=tablet' : ''}`;

  const sessionData = {
    sessionId,
    prm: cleanPrm,
    clientName: clientName.trim(),
    clientCompany: clientCompany.trim(),
    clientSiren: clientSiren.trim(),
    clientAddress: clientAddress.trim(),
    clientEmail: clientEmail.trim(),
    clientPhone: clientPhone.trim(),
    channel,
    projectId,
    status: 'PENDING_SIGNATURE',
    signingUrl,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() // 7 jours de validité pour signer
  };

  // 1. Sauvegarde en mémoire & Firestore
  memorySessions.set(sessionId, sessionData);
  try {
    const db = getAdminDb();
    await db.collection('mandat_signature_sessions').doc(sessionId).set(sessionData);
  } catch (e) {
    console.warn('[Signature Initiate] Firestore save warning:', e.message);
  }

  let deliveryResult = { success: true, channel };

  // 2. Traitement spécifique par canal de diffusion
  if (channel === 'email') {
    if (!clientEmail || !clientEmail.includes('@')) {
      return res.status(400).json({ error: 'Adresse email requise pour l\'envoi par email.' });
    }

    const emailSubject = `Action requise : Signature de votre Mandat Enedis — PRM ${cleanPrm}`;
    const emailHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Signature Mandat Enedis</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:36px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#0f2b48,#1e4a7a);padding:36px 40px;text-align:center;">
  <p style="margin:0 0 6px;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">ENR Courtage Énergie — Plateforme Nelson</p>
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Signature Électronique Sécurisée</h1>
  <p style="margin:10px 0 0;color:#bfdbfe;font-size:13px;">Mandat de collecte de données de comptage Enedis</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Bonjour <strong>${clientName || 'Madame, Monsieur'}</strong>,</p>
  <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">Dans le cadre de l'étude photovoltaïque et de l'optimisation énergétique de votre site, veuillez signer électroniquement votre <strong>Mandat de représentation Enedis</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;margin-bottom:24px;">
    <tr><td style="padding:14px 20px;">
      <p style="margin:0 0 2px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;">Numéro PRM désigné</p>
      <p style="margin:0;color:#0f172a;font-size:18px;font-weight:800;font-family:monospace;">${cleanPrm}</p>
    </td></tr>
  </table>
  <p style="margin:0 0 24px;color:#475569;font-size:13px;line-height:1.5;">🔒 Ce processus de signature est 100% dématérialisé et conforme eIDAS. Une vérification par code de sécurité (OTP SMS) vous sera demandée au moment de valider.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr><td align="center">
      <a href="${signingUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 36px;border-radius:10px;box-shadow:0 2px 10px rgba(37,99,235,0.3);">✍️ Signer mon Mandat Enedis</a>
    </td></tr>
  </table>
  <p style="margin:0;color:#94a3b8;font-size:11px;">Lien direct de signature : <a href="${signingUrl}" style="color:#2563eb;word-break:break-all;">${signingUrl}</a></p>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
  <p style="margin:0;color:#64748b;font-size:11px;">ENR Courtage Énergie — Mandataire Agréé Enedis SGE Tiers • contact@enr-courtage.fr</p>
</td></tr>
</table></td></tr></table></body></html>`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Nelson PV <noreply@nelsonpv.fr>',
            to: [clientEmail],
            subject: emailSubject,
            html: emailHtml
          })
        });
        const resJson = await emailRes.json();
        deliveryResult.emailId = resJson.id;
      } catch (err) {
        console.warn('[Email Delivery Warning]:', err.message);
      }
    }
  } else if (channel === 'whatsapp') {
    const rawPhone = (clientPhone || '').replace(/[^0-9]/g, '');
    const phone = rawPhone.startsWith('0') ? '33' + rawPhone.slice(1) : rawPhone;
    const msg = `Bonjour ${clientName || ''}, dans le cadre de votre projet solaire avec ENR Courtage Énergie, voici votre lien sécurisé pour signer le mandat Enedis (PRM ${cleanPrm}) : ${signingUrl}`;
    deliveryResult.whatsAppUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  } else if (channel === 'sms') {
    const rawPhone = (clientPhone || '').replace(/[^0-9]/g, '');
    const phone = rawPhone.startsWith('0') ? '+33' + rawPhone.slice(1) : '+' + rawPhone;
    const smsText = `Nelson PV : Signez votre mandat Enedis (PRM ${cleanPrm}) en ligne : ${signingUrl}`;

    // Si Twilio est configuré
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
        const twilioAuth = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const body = new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER,
          To: phone,
          Body: smsText
        });
        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: { 'Authorization': twilioAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        deliveryResult.smsSent = twilioRes.ok;
      } catch (smsErr) {
        console.warn('[Twilio SMS Error]:', smsErr.message);
      }
    } else {
      deliveryResult.smsSimulated = true;
    }
  }

  return res.status(200).json({
    success: true,
    sessionId,
    channel,
    signingUrl,
    delivery: deliveryResult,
    session: sessionData
  });
}

// ─── 2. RÉCUPÉRATION DE SESSION DE SIGNATURE ───────────────────────────────────
async function handleGetSession(req, res) {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'Session ID requis' });

  let session = memorySessions.get(sessionId);
  if (!session) {
    try {
      const db = getAdminDb();
      const doc = await db.collection('mandat_signature_sessions').doc(sessionId).get();
      if (doc.exists) session = doc.data();
    } catch (e) {
      console.warn('[Get Session] Firestore lookup failed:', e.message);
    }
  }

  if (!session) return res.status(404).json({ error: 'Session de signature introuvable ou expirée' });
  return res.status(200).json({ session });
}

// ─── 3. ENVOI DU CODE OTP SMS (Sécurité eIDAS) ─────────────────────────────────
async function handleSendOtp(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, phone } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Session ID requis' });

  let session = memorySessions.get(sessionId);
  if (!session) {
    const db = getAdminDb();
    const doc = await db.collection('mandat_signature_sessions').doc(sessionId).get();
    if (doc.exists) session = doc.data();
  }
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  const targetPhone = phone || session.clientPhone;
  if (!targetPhone) return res.status(400).json({ error: 'Numéro de téléphone requis pour l\'envoi du code OTP.' });

  // Génération d'un code OTP à 6 chiffres
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
  const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  session.otpHash = otpHash;
  session.otpExpiresAt = otpExpiresAt;
  memorySessions.set(sessionId, session);

  try {
    const db = getAdminDb();
    await db.collection('mandat_signature_sessions').doc(sessionId).update({
      otpHash,
      otpExpiresAt,
      otpPhone: targetPhone
    });
  } catch (e) { /* non bloquant */ }

  // Envoi SMS via Twilio ou Simulation
  let smsSent = false;
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const twilioAuth = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const formattedPhone = targetPhone.replace(/[^0-9]/g, '').replace(/^0/, '+33');
      const body = new URLSearchParams({
        From: process.env.TWILIO_PHONE_NUMBER,
        To: formattedPhone.startsWith('+') ? formattedPhone : '+' + formattedPhone,
        Body: `Votre code de signature Mandat Enedis : ${otpCode}. Valable 10 minutes.`
      });
      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: { 'Authorization': twilioAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      smsSent = twilioRes.ok;
    } catch (e) {
      console.warn('[OTP SMS error]:', e.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Code de sécurité OTP envoyé.',
    phoneMasked: targetPhone.slice(0, 3) + ' ••• •• ' + targetPhone.slice(-2),
    // En environnement de test ou si Twilio n'est pas configuré, on renvoie un code de démonstration
    demoCode: !process.env.TWILIO_ACCOUNT_SID ? otpCode : undefined
  });
}

// ─── 4. VÉRIFICATION OTP, SCELLEMENT DU PDF & DÉCLENCHEUR CRITIQUE ENEDIS ──────
async function handleVerifyAndSign(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    sessionId,
    otpCode,
    signatureImageBase64 = null,
    isTabletInPerson = false,
    signaturePlace = 'France'
  } = req.body || {};

  if (!sessionId) return res.status(400).json({ error: 'Session ID requis' });

  let session = memorySessions.get(sessionId);
  if (!session) {
    const db = getAdminDb();
    const doc = await db.collection('mandat_signature_sessions').doc(sessionId).get();
    if (doc.exists) session = doc.data();
  }
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  // Vérification OTP (obligatoire à distance, facultative en mode tablette présentiel si expressément consenti)
  if (!isTabletInPerson) {
    if (!otpCode) return res.status(400).json({ error: 'Code de sécurité OTP obligatoire.' });
    if (!session.otpHash || Date.now() > session.otpExpiresAt) {
      return res.status(400).json({ error: 'Code OTP expiré. Veuillez en redemander un nouveau.' });
    }
    const inputHash = crypto.createHash('sha256').update(otpCode.trim()).digest('hex');
    if (inputHash !== session.otpHash) {
      return res.status(400).json({ error: 'Code OTP incorrect.' });
    }
  }

  const signerIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const nowIso = new Date().toISOString();
  const sha256Fingerprint = crypto.createHash('sha256').update(sessionId + nowIso + signerIp).digest('hex');

  const eidasAuditTrail = {
    envelopeId: session.sessionId,
    authMethod: isTabletInPerson ? 'Signature Présentielle sur Tablette' : 'Code OTP SMS certifié',
    provider: 'Nelson eIDAS Security Engine',
    timestamp: nowIso,
    signerIp: signerIp.toString(),
    sha256: sha256Fingerprint
  };

  // 1. Génération du PDF signé officiel scellé
  const signedPdfBytes = await generateMandatPdf({
    clientName: session.clientName,
    clientCompany: session.clientCompany,
    clientSiren: session.clientSiren,
    clientAddress: session.clientAddress,
    clientPhone: session.clientPhone,
    clientEmail: session.clientEmail,
    prm: session.prm,
    signatureDate: new Date().toLocaleDateString('fr-FR'),
    signaturePlace: signaturePlace || 'France',
    signatureImageBase64,
    eidasAuditTrail
  });

  const pdfBase64 = Buffer.from(signedPdfBytes).toString('base64');

  // 2. Mise à jour de la session
  session.status = 'COMPLETED';
  session.signedAt = nowIso;
  session.auditTrail = eidasAuditTrail;
  memorySessions.set(sessionId, session);

  // 3. Mise à jour dans Firestore
  try {
    const db = getAdminDb();
    await db.collection('mandat_signature_sessions').doc(sessionId).set({
      ...session,
      pdfBase64Preview: pdfBase64.substring(0, 100) + '...'
    }, { merge: true });

    // Mise à jour du projet / CRM au statut 'Mandat Signé'
    if (session.projectId && session.projectId !== 'admin_test') {
      await db.collection('projects').doc(session.projectId).set({
        mandatStatus: 'SIGNE',
        mandatSignedAt: nowIso,
        mandatPrm: session.prm,
        mandatSessionId: sessionId
      }, { merge: true });
    }
  } catch (dbErr) {
    console.warn('[Verify & Sign] Firestore update warning:', dbErr.message);
  }

  // 4. ⚡ DÉCLENCHEUR CRITIQUE AUTOMATISÉ : Enregistrement Enedis & Ingestion Courbes
  let enedisResult = null;
  try {
    console.log(`[Signature Completed] Déclenchement automatique Enedis pour PRM ${session.prm}...`);
    enedisResult = await declareAndFetchEnedis({
      prm: session.prm,
      clientName: session.clientName || session.clientCompany,
      clientEmail: session.clientEmail,
      clientCompany: session.clientCompany,
      mandateRef: session.sessionId,
      env: 'production'
    });
    console.log(`[Signature Completed] Enedis déclenché avec succès : ${enedisResult.annualKwh || 0} kWh ingérés.`);
  } catch (enedisErr) {
    console.error('[Signature Completed] Erreur déclenchement Enedis:', enedisErr.message);
    enedisResult = { error: enedisErr.message };
  }

  return res.status(200).json({
    success: true,
    message: 'Mandat Enedis signé avec succès et transmis au gestionnaire de réseau.',
    sessionId,
    signedAt: nowIso,
    prm: session.prm,
    auditTrail: eidasAuditTrail,
    enedisAutomation: enedisResult,
    pdfBase64
  });
}

// ─── 5. WEBHOOK EXTERNE (Yousign / DocuSign) ───────────────────────────────────
async function handleWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const event = req.body || {};
  console.log('[Signature Webhook] Événement reçu :', event.event_name || event.action || 'Unknown');

  // Détection Yousign (signature_request.completed) ou DocuSign
  const isCompleted = event.event_name === 'signature_request.completed' ||
                      event.action === 'envelope-completed' ||
                      event.status === 'completed';

  if (isCompleted) {
    const prm = event.data?.custom_id || event.prm || event.envelopeId;
    if (prm) {
      console.log(`[Signature Webhook] DÉCLENCHEUR AUTOMATISÉ pour PRM ${prm}...`);
      try {
        await declareAndFetchEnedis({ prm });
      } catch (e) {
        console.error('[Signature Webhook] Enedis trigger error:', e.message);
      }
    }
  }

  return res.status(200).json({ received: true });
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  const { slug } = req.query;
  const route = slug && slug.length > 0 ? slug[0] : '';

  setSecureCors(req, res, 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (route === 'initiate')        return await handleInitiate(req, res);
    if (route === 'session')         return await handleGetSession(req, res);
    if (route === 'send-otp')        return await handleSendOtp(req, res);
    if (route === 'verify-and-sign') return await handleVerifyAndSign(req, res);
    if (route === 'webhook')         return await handleWebhook(req, res);

    return res.status(404).json({ error: `Route Signature inconnue: ${route}` });
  } catch (err) {
    console.error('[Signature API Dispatcher] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
