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

    // Extract ID from query parameters
    const { id } = req.query

    if (!id) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        switch (req.method) {
            case 'GET': {
                const user = await prisma.user.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        role: true,
                        pageAccess: true,
                        createdAt: true,
                        updatedAt: true,
                        // Ne jamais retourner le mot de passe
                    }
                })

                if (!user) {
                    return res.status(404).json({ error: 'User not found' })
                }

                return res.status(200).json(user)
            }

            case 'PUT': {
                const { email, firstName, lastName, phone, role, pageAccess } = req.body

                // Préparer les données à mettre à jour (sans le mot de passe)
                const updateData = {}
                if (email !== undefined) updateData.email = email
                if (firstName !== undefined) updateData.firstName = firstName
                if (lastName !== undefined) updateData.lastName = lastName
                if (phone !== undefined) updateData.phone = phone
                if (role !== undefined) updateData.role = role
                if (pageAccess !== undefined) updateData.pageAccess = pageAccess

                const user = await prisma.user.update({
                    where: { id },
                    data: updateData,
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        role: true,
                        pageAccess: true,
                        createdAt: true,
                        updatedAt: true,
                    }
                })

                return res.status(200).json(user)
            }

            case 'DELETE': {
                await prisma.user.delete({
                    where: { id }
                })

                return res.status(204).end()
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)

        // Handle Prisma errors
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' })
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists' })
        }

        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
