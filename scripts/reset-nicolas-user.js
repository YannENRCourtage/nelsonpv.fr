// Script pour supprimer et recréer l'utilisateur Nicolas BACHEVALIER
// Exécuter avec : node scripts/reset-nicolas-user.js

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'n.bachevalier@enr-courtage.fr'

    try {
        // 1. Supprimer l'utilisateur s'il existe
        console.log('🔍 Recherche de l\'utilisateur...')
        const existing = await prisma.user.findUnique({
            where: { email }
        })

        if (existing) {
            console.log('🗑️  Suppression de l\'utilisateur existant...')
            await prisma.user.delete({
                where: { email }
            })
            console.log('✅ Utilisateur supprimé')
        } else {
            console.log('ℹ️  Aucun utilisateur existant trouvé')
        }

        // 2. Créer le nouvel utilisateur
        console.log('🔨 Création du nouvel utilisateur...')
        const hashedPassword = await bcrypt.hash('Nicolas30000', 10)

        const user = await prisma.user.create({
            data: {
                email: 'n.bachevalier@enr-courtage.fr',
                password: hashedPassword,
                firstName: 'Nicolas',
                lastName: 'BACHEVALIER',
                phone: null,
                role: 'user',
                pageAccess: {
                    crm: false,
                    monday: false,
                    administration: false,
                    editeur: true
                }
            }
        })

        console.log('✅ Utilisateur créé avec succès !')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('ID:', user.id)
        console.log('Email:', user.email)
        console.log('Nom:', user.firstName, user.lastName)
        console.log('Rôle:', user.role)
        console.log('Accès:', user.pageAccess)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('\n🔐 Mot de passe: Nicolas30000')
        console.log('\n📝 Testez maintenant la connexion sur https://nelsonpv.fr/login')

    } catch (error) {
        console.error('❌ Erreur:', error.message)
        console.error('Détails:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
