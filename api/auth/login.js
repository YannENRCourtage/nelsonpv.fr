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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Parse body - handle different body formats
        let body = req.body

        // If body is a string, try to parse it as JSON
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body)
            } catch (e) {
                console.error('Failed to parse body string:', body)
                return res.status(400).json({ error: 'Invalid JSON body' })
            }
        }

        // If body is still empty, check if there's raw body data
        if (!body || Object.keys(body).length === 0) {
            console.error('Empty body received. req.body:', req.body, 'typeof:', typeof req.body)
            return res.status(400).json({ error: 'Email et mot de passe requis (corps vide)' })
        }

        const { email, password } = body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' })
        }

        console.log('Login attempt for email:', email)

        // Trouver l'utilisateur par email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: {
                id: true,
                email: true,
                password: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                pageAccess: true,
            }
        })

        if (!user) {
            console.log('User not found:', email)
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            console.log('Invalid password for user:', email)
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }

        console.log('Login successful for user:', email)

        // Retourner les données utilisateur (sans le mot de passe)
        const { password: _, ...userData } = user

        return res.status(200).json({
            ...userData,
            name: `${user.firstName} ${user.lastName}`,
            photoUrl: null
        })

    } catch (error) {
        console.error('Login Error:', error)
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
}

