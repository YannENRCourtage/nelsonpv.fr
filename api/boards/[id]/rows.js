import { prisma } from '../../../src/lib/prisma.js'

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

    const { id } = req.query // Board ID

    if (!id) {
        return res.status(400).json({ error: 'Board ID is required' })
    }

    try {
        switch (req.method) {
            case 'POST': {
                // Créer une nouvelle ligne
                const { groupId, data, order } = req.body

                if (!groupId) {
                    return res.status(400).json({ error: 'groupId is required' })
                }

                // Déterminer l'ordre si non fourni
                let rowOrder = order
                if (rowOrder === undefined) {
                    const lastRow = await prisma.boardRow.findFirst({
                        where: { boardId: id, groupId },
                        orderBy: { order: 'desc' }
                    })
                    rowOrder = lastRow ? lastRow.order + 1 : 0
                }

                const row = await prisma.boardRow.create({
                    data: {
                        boardId: id,
                        groupId,
                        order: rowOrder,
                        data: data || {}
                    }
                })

                return res.status(201).json(row)
            }

            case 'PUT': {
                // Mettre à jour une ligne
                const { rowId, groupId, data, order, selected } = req.body

                if (!rowId) {
                    return res.status(400).json({ error: 'rowId is required' })
                }

                const updateData = {}
                if (groupId !== undefined) updateData.groupId = groupId
                if (data !== undefined) updateData.data = data
                if (order !== undefined) updateData.order = order
                if (selected !== undefined) updateData.selected = selected

                const row = await prisma.boardRow.update({
                    where: { id: rowId },
                    data: updateData
                })

                return res.status(200).json(row)
            }

            case 'DELETE': {
                // Supprimer une ligne
                const { rowId } = req.query

                if (!rowId) {
                    return res.status(400).json({ error: 'rowId is required' })
                }

                await prisma.boardRow.delete({
                    where: { id: rowId }
                })

                return res.status(204).end()
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)

        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Row not found' })
        }

        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
