
import docusign from 'docusign-esign';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { pdfBase64, signerEmail, signerName, docName } = req.body;

        const missing = [];
        if (!process.env.DOCUSIGN_INTEGRATION_KEY) missing.push('DOCUSIGN_INTEGRATION_KEY');
        if (!process.env.DOCUSIGN_USER_ID) missing.push('DOCUSIGN_USER_ID');
        if (!process.env.DOCUSIGN_API_ACCOUNT_ID) missing.push('DOCUSIGN_API_ACCOUNT_ID');
        if (!process.env.DOCUSIGN_PRIVATE_KEY) missing.push('DOCUSIGN_PRIVATE_KEY');

        if (missing.length > 0) {
            console.error('Missing DocuSign Environment Variables:', missing);
            return res.status(500).json({ error: `Configuration DocuSign manquante. Variables manquantes : ${missing.join(', ')}` });
        }

        const dsApi = new docusign.ApiClient();
        // PROD: account.docusign.com | DEMO: account-d.docusign.com
        const isProd = process.env.NODE_ENV === 'production';
        // For now, let's stick to user config or default to demo if unsure. 
        // Usually integration key determines env. 
        // But the user logs in to "apps.docusign.com" (Prod) or "demo.docusign.net" (Demo).
        // Safest is account-d for dev, account for prod. 
        // I will use account.docusign.com (PROD) if possible, or fallback.
        // Given the goal is real usage, let's assume PROD or make it configurable.
        // Set to account.docusign.com by default for production apps.
        dsApi.setOAuthBasePath('account.docusign.com');

        const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
        const userId = process.env.DOCUSIGN_USER_ID;
        const accountId = process.env.DOCUSIGN_API_ACCOUNT_ID;
        const privateKey = process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n');

        // 1. JWT Authentication
        try {
            // Request JWT token (scope: signature imitation)
            const results = await dsApi.requestJWTUserToken(
                integrationKey,
                userId,
                ['signature', 'impersonation'],
                privateKey,
                3600
            );
            const accessToken = results.body.access_token;
            dsApi.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

            // Determine Base Path (using getUserInfo is best practice)
            const userInfo = await dsApi.getUserInfo(accessToken);
            const accountInfo = userInfo.accounts.find(a => a.accountId === accountId);
            if (!accountInfo) throw new Error("Compte DocuSign introuvable pour cet ID.");

            dsApi.setBasePath(accountInfo.baseUri + '/restapi');

        } catch (jwtError) {
            // Fallback to DEMO if Prod fails (useful for dev)
            if (jwtError.response?.body?.error === 'consent_required') {
                return res.status(403).json({ error: 'Consentement requis', url: `https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=https://www.nelsonpv.fr` });
            }
            // Try Demo if prod login failed (maybe using demo keys)
            dsApi.setOAuthBasePath('account-d.docusign.com');
            const results = await dsApi.requestJWTUserToken(
                integrationKey,
                userId,
                ['signature', 'impersonation'],
                privateKey,
                3600
            );
            const accessToken = results.body.access_token;
            dsApi.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
            const userInfo = await dsApi.getUserInfo(accessToken);
            const accountInfo = userInfo.accounts.find(a => a.accountId === accountId);
            dsApi.setBasePath(accountInfo.baseUri + '/restapi');
        }


        const envelopesApi = new docusign.EnvelopesApi(dsApi);

        // 2. Create Envelope Definition
        const envelopeDefinition = new docusign.EnvelopeDefinition();
        envelopeDefinition.emailSubject = `Signature : ${docName}`;

        // Document
        const doc = new docusign.Document();
        doc.documentBase64 = pdfBase64;
        doc.name = docName || 'Document';
        doc.fileExtension = 'pdf';
        doc.documentId = '1';

        envelopeDefinition.documents = [doc];

        // Signer (Remote - sent via Email)
        const signer = new docusign.Signer();
        signer.email = signerEmail;
        signer.name = signerName;
        signer.recipientId = '1';
        // No clientUserId => Remote Signing (Email)

        // No Tabs => User places them in Sender View

        envelopeDefinition.recipients = new docusign.Recipients();
        envelopeDefinition.recipients.signers = [signer];
        envelopeDefinition.status = 'created'; // DRAFT

        // 3. Create Envelope (Draft)
        const envelopeSummary = await envelopesApi.createEnvelope(accountId, { envelopeDefinition });
        const envelopeId = envelopeSummary.envelopeId;

        // 4. Create Sender View
        // 4. Create Sender View
        const viewRequest = {
            returnUrl: 'https://www.nelsonpv.fr/cdp'
        };

        const viewUrl = await envelopesApi.createSenderView(accountId, envelopeId, { senderViewRequest: viewRequest });

        return res.status(200).json({ url: viewUrl.url, envelopeId });

    } catch (error) {
        console.error('DocuSign Error:', error);
        // Handle specific JWT errors
        return res.status(500).json({ error: error.message, details: error.response?.body });
    }
}
