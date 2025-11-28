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
                // TODO: Récupérer l'utilisateur connecté depuis la session/token
                // Pour l'instant, on retourne tous les boards
                // En production, filtrer par accessRights

                const boards = await prisma.board.findMany({
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        icon: true,
                        order: true,
                        accessRights: true,
                        createdAt: true,
                        updatedAt: true,
                        _count: {
                            select: {
                                rows: true,
                                comments: true
                            }
                        }
                    }
                })

                return res.status(200).json(boards)
            }

            case 'POST': {
                const { name, description, icon, accessRights } = req.body

                if (!name) {
                    return res.status(400).json({ error: 'Name is required' })
                }

                // Créer un board avec configuration par défaut
                const board = await prisma.board.create({
                    data: {
                        name,
                        description: description || null,
                        icon: icon || '📊',
                        accessRights: accessRights || {},
                        groups: [
                            { id: 'group-1', name: 'Nouveau groupe', isCollapsed: false }
                        ],
                        columns: [
                            { id: 'element', title: 'Élément', width: 220, type: 'text' },
                            { id: 'responsable', title: 'Responsable', width: 180, type: 'user' },
                            {
                                id: 'statut', title: 'Statut', width: 190, type: 'status', options: [
                                    { value: 'En cours', color: '#facc15' },
                                    { value: 'Terminé', color: '#4ade80' },
                                    { value: 'En attente', color: '#fb923c' }
                                ]
                            }
                        ]
                    }
                })

                return res.status(201).json(board)
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
