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

    const { id } = req.query

    if (!id) {
        return res.status(400).json({ error: 'Board ID is required' })
    }

    try {
        switch (req.method) {
            case 'GET': {
                // Récupérer le board avec toutes ses lignes
                const board = await prisma.board.findUnique({
                    where: { id },
                    include: {
                        rows: {
                            orderBy: [
                                { groupId: 'asc' },
                                { order: 'asc' }
                            ]
                        },
                        _count: {
                            select: {
                                comments: true,
                                attachments: true
                            }
                        }
                    }
                })

                if (!board) {
                    return res.status(404).json({ error: 'Board not found' })
                }

                return res.status(200).json(board)
            }

            case 'PUT': {
                // Mettre à jour le board (configuration, colonnes, groupes, etc.)
                const { name, description, icon, groups, columns, accessRights, gutterWidth } = req.body

                const updateData = {}
                if (name !== undefined) updateData.name = name
                if (description !== undefined) updateData.description = description
                if (icon !== undefined) updateData.icon = icon
                if (groups !== undefined) updateData.groups = groups
                if (columns !== undefined) updateData.columns = columns
                if (accessRights !== undefined) updateData.accessRights = accessRights
                if (gutterWidth !== undefined) updateData.gutterWidth = gutterWidth

                const board = await prisma.board.update({
                    where: { id },
                    data: updateData
                })

                return res.status(200).json(board)
            }

            case 'DELETE': {
                // Supprimer le board (cascade delete sur rows, comments, attachments)
                await prisma.board.delete({
                    where: { id }
                })

                return res.status(204).end()
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)

        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Board not found' })
        }

        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
