import { prisma } from '../../src/lib/prisma.js'

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    try {
        switch (req.method) {
            case 'GET': {
                const contacts = await prisma.contact.findMany({
                    orderBy: { createdAt: 'desc' }
                })
                return res.status(200).json(contacts)
            }

            case 'POST': {
                const contact = await prisma.contact.create({
                    data: req.body
                })
                return res.status(201).json(contact)
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
