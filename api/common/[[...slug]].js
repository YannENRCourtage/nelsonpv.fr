import { prisma } from '../../src/lib/prisma.js'
import docusign from 'docusign-esign'
import bcrypt from 'bcryptjs'
import { withAuth } from '../common/_authMiddleware.js'

async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const { slug } = req.query
    const module = slug && slug.length > 0 ? slug[0] : null

    try {
        // SDIS Integration
        if (module === 'sdis') {
            const { dept } = req.query
            if (!dept) return res.status(400).json({ error: 'Département requis' })
            const DEPARTMENTS = {
                '17': 'https://api.deci.sdis17.fr/api/v1/peis?format=geojson',
                '84': 'https://api.deci.sdis84.fr/api/v1/peis?format=geojson',
                '81': 'https://api.deci.sdis81.fr/api/v1/peis?format=geojson',
                '34': 'https://www.herault-data.fr/api/explore/v2.1/catalog/datasets/points-deau-incendie-du-departement-de-lherault/exports/geojson',
                '18': 'https://api.deci.sdis18.fr/api/v1/peis?format=geojson',
                '33': 'https://api.deci.sdis33.fr/api/v1/peis?format=geojson',
                '04': 'https://api.deci.sdis04.fr/api/v1/peis?format=geojson',
                '05': 'https://api.deci.sdis05.fr/api/v1/peis?format=geojson',
                '06': 'https://api.deci.sdis06.fr/api/v1/peis?format=geojson',
                '26': 'https://api.deci.sdis26.fr/api/v1/peis?format=geojson',
                '83': 'https://api.deci.sdis83.fr/api/v1/peis?format=geojson',
                '07': 'https://api.deci.sdis07.fr/api/v1/peis?format=geojson'
            }
            let url = DEPARTMENTS[dept] || `https://api.deci.sdis${dept}.fr/api/v1/peis?format=geojson`
            const sdisResponse = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            if (!sdisResponse.ok) throw new Error(`Erreur API SDIS ${dept}: ${sdisResponse.status}`)
            const data = await sdisResponse.json()
            return res.status(200).json(data)
        }

        // Notifications
        if (module === 'notifications') {
            switch (req.method) {
                case 'GET': {
                    const { userId } = req.query
                    if (!userId) return res.status(400).json({ error: 'userId is required' })
                    
                    // Ownership Check: User can only see their own notifications
                    if (req.user && req.user.uid !== userId && req.user.email !== 'y.barberis@enr-courtage.fr') {
                        return res.status(403).json({ error: 'Forbidden: Access denied to these notifications' })
                    }

                    const notifications = await prisma.notification.findMany({
                        where: { userId }, orderBy: { createdAt: 'desc' }, take: 50
                    })
                    return res.status(200).json(notifications)
                }
                case 'PUT': {
                    const { notificationIds, userId } = req.body
                    if (!userId) return res.status(400).json({ error: 'userId is required' })
                    
                    if (req.user && req.user.uid !== userId) {
                        return res.status(403).json({ error: 'Forbidden' })
                    }

                    if (notificationIds && Array.isArray(notificationIds)) {
                        await prisma.notification.updateMany({ where: { id: { in: notificationIds }, userId }, data: { read: true } })
                    } else {
                        await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
                    }
                    return res.status(200).json({ success: true })
                }
                default:
                    return res.status(405).json({ error: 'Method not allowed' })
            }
        }

        // DocuSign
        if (module === 'docusign') {
            if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
            const { pdfBase64, signerEmail, signerName, docName } = req.body
            const dsApi = new docusign.ApiClient()
            dsApi.setOAuthBasePath('account.docusign.com')
            const privateKey = process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n')
            const results = await dsApi.requestJWTUserToken(
                process.env.DOCUSIGN_INTEGRATION_KEY, process.env.DOCUSIGN_USER_ID, ['signature', 'impersonation'], privateKey, 3600
            )
            const accessToken = results.body.access_token
            dsApi.addDefaultHeader('Authorization', 'Bearer ' + accessToken)
            const userInfo = await dsApi.getUserInfo(accessToken)
            const accountInfo = userInfo.accounts.find(a => a.accountId === process.env.DOCUSIGN_API_ACCOUNT_ID)
            dsApi.setBasePath(accountInfo.baseUri + '/restapi')
            const envelopesApi = new docusign.EnvelopesApi(dsApi)
            const envelopeDefinition = new docusign.EnvelopeDefinition()
            envelopeDefinition.emailSubject = `Signature : ${docName}`
            const doc = new docusign.Document()
            doc.documentBase64 = pdfBase64
            doc.name = docName || 'Document'
            doc.fileExtension = 'pdf'
            doc.documentId = '1'
            envelopeDefinition.documents = [doc]
            const signer = new docusign.Signer()
            signer.email = signerEmail
            signer.name = signerName
            signer.recipientId = '1'
            envelopeDefinition.recipients = new docusign.Recipients()
            envelopeDefinition.recipients.signers = [signer]
            envelopeDefinition.status = 'created'
            const envelopeSummary = await envelopesApi.createEnvelope(process.env.DOCUSIGN_API_ACCOUNT_ID, { envelopeDefinition })
            const viewRequest = { returnUrl: 'https://www.nelsonpv.fr/cdp' }
            const viewUrl = await envelopesApi.createSenderView(process.env.DOCUSIGN_API_ACCOUNT_ID, envelopeSummary.envelopeId, { senderViewRequest: viewRequest })
            return res.status(200).json({ url: viewUrl.url, envelopeId: envelopeSummary.envelopeId })
        }

        // Auth (Legacy)
        if (module === 'auth') {
            if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
            const { email, password } = req.body
            if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' })
            const user = await prisma.user.findUnique({ where: { email } })
            if (!user) return res.status(401).json({ error: 'Identifiants invalides' })
            const isValid = await bcrypt.compare(password, user.password)
            if (!isValid) return res.status(401).json({ error: 'Identifiants invalides' })
            const { password: _, ...userWithoutPassword } = user
            return res.status(200).json({ user: userWithoutPassword })
        }

        return res.status(404).json({ error: 'Module not found' })
    } catch (error) {
        console.error('Common API Error:', error)
        return res.status(500).json({ error: error.message || 'Internal server error' })
    }
}

export default async function(req, res) {
    const { slug } = req.query
    const module = slug && slug.length > 0 ? slug[0] : null
    
    // Auth module doesn't need withAuth because it's for logging in
    if (module === 'auth') {
        return handler(req, res)
    }
    
    return withAuth(handler)(req, res)
}
