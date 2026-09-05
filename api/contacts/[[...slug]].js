import { prisma } from '../../src/lib/prisma.js'
import { withAuth, setSecureCors } from '../common/authMiddleware.js'

async function handler(req, res) {
    setSecureCors(req, res, 'GET,OPTIONS,PATCH,DELETE,POST,PUT')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const { slug } = req.query
    const id = slug && slug.length > 0 ? slug[0] : null

    try {
        if (!id) {
            // INDEX LOGIC (List / Create)
            switch (req.method) {
                case 'GET': {
                    const contacts = await prisma.contact.findMany({
                        orderBy: { createdAt: 'desc' }
                    })
                    return res.status(200).json(contacts)
                }

                case 'POST': {
                    const contact = await prisma.contact.create({
                        data: req.body
                    })
                    return res.status(201).json(contact)
                }

                default:
                    return res.status(405).json({ error: 'Method not allowed' })
            }
        } else {
            // ID LOGIC (Get / Update / Delete)
            switch (req.method) {
                case 'GET': {
                    const contact = await prisma.contact.findUnique({
                        where: { id }
                    })

                    if (!contact) {
                        return res.status(404).json({ error: 'Contact not found' })
                    }

                    return res.status(200).json(contact)
                }

                case 'PUT': {
                    const contact = await prisma.contact.update({
                        where: { id },
                        data: req.body
                    })
                    return res.status(200).json(contact)
                }

                case 'DELETE': {
                    await prisma.contact.delete({
                        where: { id }
                    })
                    return res.status(204).end()
                }

                default:
                    return res.status(405).json({ error: 'Method not allowed' })
            }
        }
    } catch (error) {
        console.error('API Error:', error)

        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Contact not found' })
        }

        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}

export default withAuth(handler)
