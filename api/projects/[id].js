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

                // Update or create contact from project data
                try {
                    const contactData = {
                        name: `${req.body.name || ''} ${req.body.firstName || ''}`.trim() || 'Sans nom',
                        company: req.body.projectSize || 'N/A',
                        email: req.body.email || '',
                        phone: req.body.phone || '',
                        city: req.body.city || '',
                        status: req.body.status || 'Nouveau',
                        color: req.body.status === 'Terminé' ? 'bg-green-500' :
                            req.body.status === 'En cours' ? 'bg-blue-500' : 'bg-yellow-500',
                        projectId: id
                    }

                    // Find existing contact by projectId
                    const existingContact = await prisma.contact.findFirst({
                        where: { projectId: id }
                    })

                    if (existingContact) {
                        await prisma.contact.update({
                            where: { id: existingContact.id },
                            data: contactData
                        })
                    } else {
                        // Create new contact if it doesn't exist
                        await prisma.contact.create({
                            data: contactData
                        })
                    }
                } catch (contactError) {
                    console.error('Error updating contact:', contactError)
                    // Don't fail the project update if contact fails
                }

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
