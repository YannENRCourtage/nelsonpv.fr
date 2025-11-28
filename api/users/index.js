import { prisma } from '../../src/lib/prisma.js'
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

    try {
        switch (req.method) {
            case 'GET': {
                // Récupérer tous les utilisateurs sans leurs mots de passe
                const users = await prisma.user.findMany({
                    orderBy: { createdAt: 'desc' },
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
                        // password: false - Ne jamais retourner le mot de passe
                    }
                })
                return res.status(200).json(users)
            }

            case 'POST': {
                const { email, password, firstName, lastName, phone, role, pageAccess } = req.body

                // Validation
                if (!email || !password || !firstName || !lastName) {
                    return res.status(400).json({
                        error: 'Email, password, firstName et lastName sont requis'
                    })
                }

                // Vérifier si l'email existe déjà
                const existingUser = await prisma.user.findUnique({
                    where: { email }
                })

                if (existingUser) {
                    return res.status(409).json({
                        error: 'Un utilisateur avec cet email existe déjà'
                    })
                }

                // Hasher le mot de passe
                const hashedPassword = await bcrypt.hash(password, 10)

                // Créer l'utilisateur
                const user = await prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        phone: phone || null,
                        role: role || 'user',
                        pageAccess: pageAccess || { crm: true, monday: false, administration: false }
                    },
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

                return res.status(201).json(user)
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
