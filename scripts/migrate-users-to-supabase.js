import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

const defaultUsers = {
    'contact@enr-courtage.fr': {
        password: 'NELSONENR2025',
        firstName: 'Admin',
        lastName: 'ENR',
        phone: null,
        role: 'admin',
        pageAccess: { crm: true, administration: true, editeur: true },
    },
    'yann@enr.fr': {
        password: 'nelson',
        firstName: 'Yann',
        lastName: 'Nelson',
        phone: null,
        role: 'user',
        pageAccess: { crm: true, administration: false, editeur: true },
    },
};

async function migrateUsers() {
    console.log('🚀 Migration des utilisateurs localStorage → Supabase...\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const [email, userData] of Object.entries(defaultUsers)) {
        try {
            // Vérifier si l'utilisateur existe déjà
            const existing = await prisma.user.findUnique({ where: { email } });

            if (existing) {
                console.log(`⏭️  ${email} existe déjà (ID: ${existing.id})`);
                skipped++;
                continue;
            }

            // Hash le password avec bcrypt
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Créer l'utilisateur dans Supabase
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phone: userData.phone,
                    role: userData.role,
                    pageAccess: userData.pageAccess,
                },
            });

            console.log(`✅ ${email} migré avec succès`);
            console.log(`   → ID: ${user.id}`);
            console.log(`   → Nom: ${user.firstName} ${user.lastName}`);
            console.log(`   → Rôle: ${user.role}\n`);
            created++;
        } catch (error) {
            console.error(`❌ Erreur migration ${email}:`, error.message);
            errors++;
        }
    }

    console.log('\n📊 Résumé de la migration:');
    console.log(`   ✅ Créés: ${created}`);
    console.log(`   ⏭️  Ignorés (déjà existants): ${skipped}`);
    console.log(`   ❌ Erreurs: ${errors}`);

    if (errors === 0) {
        console.log('\n✅ Migration terminée avec succès !');
        console.log('   Vous pouvez maintenant supprimer localStorage users.');
    } else {
        console.log('\n⚠️  Migration terminée avec des erreurs.');
        console.log('   Vérifiez les logs ci-dessus.');
    }
}

migrateUsers()
    .catch((error) => {
        console.error('💥 Erreur fatale:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
