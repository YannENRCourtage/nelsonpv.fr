// api/enedis/send-consent.js
// Envoie le lien de consentement ENEDIS au client par email.
// Utilise Resend si RESEND_API_KEY est configuré, sinon retourne juste le lien.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prm, projectId, email, name } = req.body || {};

    if (!prm || prm.length !== 14) {
        return res.status(400).json({ error: 'PRM invalide (14 chiffres requis).' });
    }
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    try {
        // Générer l'URL de consentement
        const baseUrl = process.env.VERCEL_URL
            ? `https://www.nelsonpv.fr`
            : (req.headers['x-forwarded-host']
                ? `https://${req.headers['x-forwarded-host']}`
                : 'https://www.nelsonpv.fr');

        const params = new URLSearchParams({ projectId: projectId || 'admin_test' });
        if (prm) params.append('prm', prm);
        const consentUrl = `${baseUrl}/api/enedis/auth?${params.toString()}`;

        const clientName = (name || 'Client').trim();

        // Template HTML de l'email
        const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Autorisation Enedis Data Connect</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:40px 48px;text-align:center;">
            <p style="margin:0 0 8px 0;color:#bfdbfe;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">ENR Courtage Énergie</p>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2;">Autorisation Enedis<br>Data Connect</h1>
            <p style="margin:16px 0 0 0;color:#bfdbfe;font-size:14px;">Accès à vos données de consommation électrique</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:48px 48px 32px;">
            <p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.6;">
              Bonjour <strong>${clientName}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
              Dans le cadre de l'étude de votre installation photovoltaïque, nous souhaitons accéder à vos données de consommation électrique via <strong>Enedis Data Connect</strong>.
            </p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;color:#1e40af;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">Service Public de Distribution</p>
                  <p style="margin:0 0 10px;color:#1e3a8a;font-size:13px;line-height:1.6;font-style:italic;">
                    Enedis est le gestionnaire du réseau public de distribution d'électricité sur 95% du territoire français continental.
                  </p>
                  <p style="margin:0 0 6px;color:#1e3a8a;font-size:13px;line-height:1.6;">
                    <strong>Finalité :</strong> Visualiser votre courbe de charge et consommation journalière pour dimensionner votre installation photovoltaïque.
                  </p>
                  <p style="margin:0;color:#1e3a8a;font-size:13px;line-height:1.6;">
                    <strong>Durée :</strong> Consentement de 3 ans maximum, révocable à tout moment.
                  </p>
                </td>
              </tr>
            </table>

            <!-- PRM info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:32px;">
              <tr>
                <td style="padding:16px 24px;">
                  <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Numéro PRM concerné</p>
                  <p style="margin:0;color:#0f172a;font-size:20px;font-weight:800;font-family:'Courier New',monospace;letter-spacing:0.05em;">${prm}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
              Pour donner votre accord, cliquez sur le bouton ci-dessous. Vous serez redirigé vers la page officielle Enedis. Vous pouvez vous identifier avec <strong>FranceConnect</strong> — <u>aucun compte Enedis n'est nécessaire</u>.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="${consentUrl}"
                     style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:18px 48px;border-radius:12px;box-shadow:0 4px 16px rgba(59,130,246,0.4);letter-spacing:0.02em;">
                    ✓ Autoriser l'accès à mes données
                  </a>
                </td>
              </tr>
            </table>

            <!-- How it works -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;color:#92400e;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">Comment ça se passe ?</p>
                  <ol style="margin:0;padding-left:20px;color:#78350f;font-size:13px;line-height:2;">
                    <li>Cliquez sur le bouton ci-dessus</li>
                    <li>Identifiez-vous avec <strong>FranceConnect</strong> (France Identité, Impots.gouv, Ameli…)</li>
                    <li>Validez l'autorisation en 2 clics</li>
                    <li>C'est tout ! Vos données nous parviennent automatiquement.</li>
                  </ol>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
              <a href="${consentUrl}" style="color:#3b82f6;word-break:break-all;">${consentUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;text-align:center;">
            <p style="margin:0 0 4px;color:#64748b;font-size:12px;">ENR Courtage Énergie — Nelson PV</p>
            <p style="margin:0;color:#94a3b8;font-size:11px;">Cet email a été envoyé dans le cadre de votre projet photovoltaïque.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

        const textBody = `Bonjour ${clientName},

Dans le cadre de l'étude de votre installation photovoltaïque, nous souhaitons accéder à vos données de consommation électrique via Enedis Data Connect.

PRM concerné : ${prm}
Durée du consentement : 3 ans maximum, révocable à tout moment.

Pour donner votre accord, cliquez sur ce lien :
${consentUrl}

Vous serez redirigé vers la page officielle Enedis. Vous pouvez vous identifier avec FranceConnect (aucun compte Enedis requis).

ENR Courtage Énergie — Nelson PV`;

        const resendKey = process.env.RESEND_API_KEY;

        if (resendKey) {
            // Envoi via Resend
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Nelson PV <noreply@nelsonpv.fr>',
                    to: [email],
                    subject: `Autorisation Enedis Data Connect — PRM ${prm}`,
                    html: htmlBody,
                    text: textBody
                })
            });

            const result = await response.json();
            if (!response.ok) {
                console.error('[Enedis SendConsent] Resend error:', result);
                return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email.', details: result });
            }

            console.log(`[Enedis SendConsent] ✅ Email sent to ${email} for PRM ${prm} via Resend (id: ${result.id})`);
            return res.status(200).json({ success: true, method: 'resend', id: result.id });
        } else {
            // Pas de clé Resend — on retourne le lien pour que le frontend gère l'envoi
            console.warn('[Enedis SendConsent] No RESEND_API_KEY — returning link only');
            return res.status(200).json({
                success: true,
                method: 'link_only',
                consentUrl,
                warning: 'RESEND_API_KEY non configuré — lien généré uniquement.'
            });
        }

    } catch (err) {
        console.error('[Enedis SendConsent] Unexpected error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
