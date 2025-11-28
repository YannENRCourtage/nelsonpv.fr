import { prisma } from '../../../src/lib/prisma.js'
import bcrypt from 'bcryptjs'

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

    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { newPassword } = req.body

        if (!newPassword) {
            return res.status(400).json({ error: 'newPassword is required' })
        }

        // Validation du mot de passe (minimum 6 caractères)
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Le mot de passe doit contenir au moins 6 caractères'
            })
        }

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Mettre à jour uniquement le mot de passe
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        })

        return res.status(200).json({ message: 'Password updated successfully' })
    } catch (error) {
        console.error('API Error:', error)

        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' })
        }

        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
