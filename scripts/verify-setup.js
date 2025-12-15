// Script de vérification rapide pour s'assurer que tout fonctionne
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function verifySetup() {
    console.log('🔍 Vérification de la configuration...\\n');

    // 1. Vérifier l'utilisateur
    const user = await prisma.user.findUnique({
        where: { email: 'contact@enr-courtage.fr' }
    });

    if (!user) {
        console.log('❌ Utilisateur contact@enr-courtage.fr non trouvé');
        return;
    }

    console.log('✅ Utilisateur trouvé:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nom: ${user.firstName} ${user.lastName}`);
    console.log(`   Rôle: ${user.role}`);

    // 2. Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare('NELSONENR2025', user.password);
    console.log(`\\n${passwordMatch ? '✅' : '❌'} Mot de passe: ${passwordMatch ? 'Correct' : 'Incorrect'}`);

    // 3. Vérifier les accès
    console.log('\\n✅ Accès aux pages:');
    console.log(`   CRM: ${user.pageAccess?.crm ? 'Oui' : 'Non'}`);
    console.log(`   Administration: ${user.pageAccess?.administration ? 'Oui' : 'Non'}`);
    console.log(`   Editeur: ${user.pageAccess?.editeur ? 'Oui' : 'Non'}`);

    console.log('\\n✅ Configuration vérifiée avec succès!');
}

verifySetup()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
