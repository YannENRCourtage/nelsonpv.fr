import { prisma } from '../../src/lib/prisma.js'

export default async function handler(req, res) {
    const { id } = req.query

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
                const project = await prisma.project.findUnique({
                    where: { id }
                })
                if (!project) {
                    return res.status(404).json({ error: 'Project not found' })
                }
                return res.status(200).json(project)
            }

            case 'PUT': {
                const project = await prisma.project.update({
                    where: { id },
                    data: req.body
                })
                return res.status(200).json(project)
            }

            case 'DELETE': {
                await prisma.project.delete({
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
            return res.status(404).json({ error: 'Project not found' })
        }
        return res.status(500).json({ error: 'Internal server error' })
    }
}
