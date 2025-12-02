// Script pour créer l'utilisateur Nicolas BACHEVALIER
// Exécuter avec : node scripts/create-nicolas-user.js

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'n.bachevalier@enr-courtage.fr'
    const password = 'Nicolas30000'
    const firstName = 'Nicolas'
    const lastName = 'BACHEVALIER'

    try {
        // Vérifier si l'utilisateur existe déjà
        const existing = await prisma.user.findUnique({
            where: { email }
        })

        if (existing) {
            console.log('❌ Un utilisateur avec cet email existe déjà')
            console.log('ID:', existing.id)
            console.log('Nom:', existing.firstName, existing.lastName)

            // Mettre à jour le mot de passe
            const hashedPassword = await bcrypt.hash(password, 10)
            await prisma.user.update({
                where: { id: existing.id },
                data: { password: hashedPassword }
            })
            console.log('✅ Mot de passe mis à jour !')
            return
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
                phone: null,
                role: 'admin',
                pageAccess: {
                    crm: true,
                    monday: true,
                    administration: true,
                    editeur: true
                }
            }
        })

        console.log('✅ Utilisateur créé avec succès !')
        console.log('ID:', user.id)
        console.log('Email:', user.email)
        console.log('Nom:', user.firstName, user.lastName)
        console.log('Rôle:', user.role)
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
