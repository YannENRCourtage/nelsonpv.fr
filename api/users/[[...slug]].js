import { prisma } from '../../src/lib/prisma.js'
import bcrypt from 'bcryptjs'
import { withAdmin } from '../common/authMiddleware.js'

async function handler(req, res) {
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

    const { slug } = req.query
    const id = slug && slug.length > 0 ? slug[0] : null
    const isPasswordAction = slug && slug.length > 1 && slug[1] === 'password'

    try {
        if (!id) {
            // INDEX LOGIC: /api/users
            switch (req.method) {
                case 'GET': {
                    const users = await prisma.user.findMany({
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true, email: true, firstName: true, lastName: true, phone: true, role: true, pageAccess: true, createdAt: true, updatedAt: true,
                        }
                    })
                    return res.status(200).json(users)
                }
                case 'POST': {
                    const { email, password, firstName, lastName, phone, role, pageAccess } = req.body
                    if (!email || !password || !firstName || !lastName) {
                        return res.status(400).json({ error: 'Email, password, firstName et lastName sont requis' })
                    }
                    const existingUser = await prisma.user.findUnique({ where: { email } })
                    if (existingUser) {
                        return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' })
                    }
                    const hashedPassword = await bcrypt.hash(password, 10)
                    const user = await prisma.user.create({
                        data: {
                            email, password: hashedPassword, firstName, lastName, phone: phone || null, role: role || 'user', pageAccess: pageAccess || { crm: true, monday: false, administration: false }
                        },
                        select: {
                            id: true, email: true, firstName: true, lastName: true, phone: true, role: true, pageAccess: true, createdAt: true, updatedAt: true
                        }
                    })
                    return res.status(201).json(user)
                }
                default:
                    return res.status(405).json({ error: 'Method not allowed' })
            }
        } else if (isPasswordAction) {
            // PASSWORD LOGIC: /api/users/[id]/password
            if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })
            const { newPassword } = req.body
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' })
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10)
            await prisma.user.update({
                where: { id },
                data: { password: hashedPassword }
            })
            return res.status(200).json({ message: 'Password updated successfully' })
        } else {
            // ID LOGIC: /api/users/[id]
            switch (req.method) {
                case 'GET': {
                    const user = await prisma.user.findUnique({
                        where: { id },
                        select: {
                            id: true, email: true, firstName: true, lastName: true, phone: true, role: true, pageAccess: true, createdAt: true, updatedAt: true
                        }
                    })
                    if (!user) return res.status(404).json({ error: 'User not found' })
                    return res.status(200).json(user)
                }
                case 'PUT': {
                    const { email, firstName, lastName, phone, role, pageAccess } = req.body
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
                            id: true, email: true, firstName: true, lastName: true, phone: true, role: true, pageAccess: true, createdAt: true, updatedAt: true
                        }
                    })
                    return res.status(200).json(user)
                }
                case 'DELETE': {
                    await prisma.user.delete({ where: { id } })
                    return res.status(204).end()
                }
                default:
                    return res.status(405).json({ error: 'Method not allowed' })
            }
        }
    } catch (error) {
        console.error('API Error:', error)
        if (error.code === 'P2025') return res.status(404).json({ error: 'User not found' })
        if (error.code === 'P2002') return res.status(409).json({ error: 'Email already exists' })
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}

export default withAdmin(handler)
