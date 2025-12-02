// Script pour mettre à jour les droits de Nicolas BACHEVALIER
// Exécuter avec : node scripts/update-nicolas-access.js

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'n.bachevalier@enr-courtage.fr'

    try {
        // Mettre à jour les droits d'accès
        const user = await prisma.user.update({
            where: { email },
            data: {
                pageAccess: {
                    crm: false,
                    monday: false,
                    administration: false,
                    editeur: true
                }
            }
        })

        console.log('✅ Droits d\'accès mis à jour avec succès !')
        console.log('ID:', user.id)
        console.log('Email:', user.email)
        console.log('Nom:', user.firstName, user.lastName)
        console.log('Accès:', user.pageAccess)
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
