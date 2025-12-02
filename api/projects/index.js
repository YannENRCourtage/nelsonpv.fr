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

    try {
        switch (req.method) {
            case 'GET': {
                const projects = await prisma.project.findMany({
                    orderBy: { createdAt: 'desc' }
                })
                return res.status(200).json(projects)
            }

            case 'POST': {
                const project = await prisma.project.create({
                    data: req.body
                })

                // Create or update contact from project data
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
                        projectId: project.id
                    }

                    // Check if contact with this projectId already exists
                    const existingContact = await prisma.contact.findFirst({
                        where: { projectId: project.id }
                    })

                    if (existingContact) {
                        await prisma.contact.update({
                            where: { id: existingContact.id },
                            data: contactData
                        })
                    } else {
                        await prisma.contact.create({
                            data: contactData
                        })
                    }
                } catch (contactError) {
                    console.error('Error creating/updating contact:', contactError)
                    // Don't fail the project creation if contact fails
                }

                return res.status(201).json(project)
            }


            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('API Error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
