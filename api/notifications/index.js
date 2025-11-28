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
                // Récupérer les notifications de l'utilisateur
                const { userId } = req.query

                if (!userId) {
                    return res.status(400).json({ error: 'userId is required' })
                }

                const notifications = await prisma.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: 50 // Limiter à 50 dernières notifications
                })

                return res.status(200).json(notifications)
            }

            case 'PUT': {
                // Marquer des notifications comme lues
                const { notificationIds, userId } = req.body

                if (!userId) {
                    return res.status(400).json({ error: 'userId is required' })
                }

                if (notificationIds && Array.isArray(notificationIds)) {
                    // Marquer des notifications spécifiques
                    await prisma.notification.updateMany({
                        where: {
                            id: { in: notificationIds },
                            userId
                        },
                        data: { read: true }
                    })
                } else {
                    // Marquer toutes comme lues
                    await prisma.notification.updateMany({
                        where: { userId, read: false },
                        data: { read: true }
                    })
                }

                return res.status(200).json({ success: true })
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
