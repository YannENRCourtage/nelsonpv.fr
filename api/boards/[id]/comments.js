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
            case 'GET': {
                // Récupérer les commentaires d'une ligne
                const { rowId } = req.query

                if (!rowId) {
                    return res.status(400).json({ error: 'rowId is required' })
                }

                const comments = await prisma.boardComment.findMany({
                    where: { boardId: id, rowId },
                    orderBy: { createdAt: 'asc' }
                })

                return res.status(200).json(comments)
            }

            case 'POST': {
                // Ajouter un commentaire
                const { rowId, userId, userName, content } = req.body

                if (!rowId || !userId || !content) {
                    return res.status(400).json({
                        error: 'rowId, userId, and content are required'
                    })
                }

                // Détecter les mentions (@userId)
                const mentionRegex = /@([a-zA-Z0-9_-]+)/g
                const mentions = []
                let match
                while ((match = mentionRegex.exec(content)) !== null) {
                    mentions.push(match[1])
                }

                // Créer le commentaire
                const comment = await prisma.boardComment.create({
                    data: {
                        boardId: id,
                        rowId,
                        userId,
                        userName: userName || 'Utilisateur',
                        content,
                        mentions
                    }
                })

                // Créer des notifications pour les mentions
                if (mentions.length > 0) {
                    const notificationPromises = mentions.map(mentionedUserId =>
                        prisma.notification.create({
                            data: {
                                userId: mentionedUserId,
                                type: 'mention',
                                title: 'Vous avez été mentionné',
                                message: `${userName} vous a mentionné dans un commentaire`,
                                link: `/suivi?board=${id}&row=${rowId}`,
                                data: {
                                    boardId: id,
                                    rowId,
                                    commentId: comment.id,
                                    authorId: userId,
                                    authorName: userName
                                }
                            }
                        })
                    )

                    await Promise.all(notificationPromises)
                }

                return res.status(201).json(comment)
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
