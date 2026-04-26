import admin from 'firebase-admin';

async function migrate() {
    try {
        const projectId = "nelsonpv-4722c";
        const clientEmail = "firebase-adminsdk-fbsvc@nelsonpv-4722c.iam.gserviceaccount.com";
        
        // Hardcoded clean key from .env.local with manual fixes for spaces
        let privateKey = "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDUAVixZOOZ+xVq\nnq6t4gnmNW7YOEsN7RK6syAUkrrR9msqRVVBKwExlh4xOzyvGQQ54de5hi3ntN/2E\nn8P17nA31Oj8frSBRIXSb45WPZo0fPFh3KV3ZKHdxdjQmyVIASE9XOYnsahRHl\nJEW\nnr2Qij74dUD9+FbiweGWcRc+YFUTXY45AJyZugNt66kkjvOA+HlU6RLifMuzX2il\nnHz6Op3jiMKj6iXmyoh82n/jL8TY3DOfO+uxpf3wx9UKJ/ftjs1MbAwIxUpuiB9OA\nn/UGPwGT0gms4JALZMHCteFhsrqJpKxS++FEDDwCP+JqINEq4YqPKAk8GabMgypO6\nnW+H6RAJLAgMBAAECggEAWwJELQeJPRV1oKiYP/wZUuTzfg1FYYQ6/4jsxaufal1\nnVUH1kcNpXoXF7/EnWNRGHIBXqE00sAu746VKm+UmbCmgsnLszmrruX3tt0d0S+vm\nnWCUYZiynsbvZ8GqM+pUQB JQrmMBGkdU2mBUKyctAzqmjz/b4JTIUv6BSWTYXZoj\nnlQD0hprrxSxdxlUl loaisNqv5FliC59bxmkYkY+j7fmIXi6kI4EOF5L/zzLGgxDHA\nnczckzTL3NsZH8\nMFTHDCUgl0x21LSLZmyhFmHD2TouD6OZ1qFoiVsVmnP5GEEO++9\nnAfeSrjjnoRWi6B995GrWTr uou9bchd422uh4WWyGFQKBgQD5mJGFHbZtyBcGGezC\nnBPbde5yK7kzodp6/DV5wa jJQuF5Frha1SVov1txyEI/EzI+PnaZa5GtKkmOExojU\nneg/0nFR59up9p+I70me28QOJeJtOg1gj6s+12UsQ2CgBgdtH9JOocoaooQK58uic\nnHbPyTR8k/G9nnljy8ARD9lsIrWKBqQDZCfdohdncv2GVKNcE+XBLGL16EDMuWLmp\nnTvDabIvIfE+GaJ9t9YD8wf6mk1dBQFTEJNWRlZOCIhPSHpary6dTDqysgMaeoXgV\nnrB/mV6+okgs417YzWw21DFfJQUjl jod3RSTC35m7qxYEQnmmN80/Vt/QOuAoSoSx\nnRY8eiduQpQK BgQc8nVVsgWqbatLbmbdbng4LeSow4vOk+Be3eqIamYZSHnvUwugLt\nNcp6DJ9W0EXvY5PtTpAO/ZZKqy6ElaHHF1q5we3IorWAyv5+gHjZ2XX3y8lpYN4X\nn3l1j+lp9QYLiRecs6jUXQVGMiQuxhgrvL7qfWQOXBUpQJdLL5HDwrE581hwKBGDU\nn0Bu84guyHeiuiGu5aSH/ogIdWe+Ng56p+q21SVJOTtpP1ON8TdPhCzFXNoHeq63S\nnji5LLwW BbnKxqehS2S25F1qenNauKGAL7fsGlH1N5SmAh3Y2Cv5+XEcanQ+I5Bbm\nn/O/8U1JV7xrMLnc628CD5DWGaajrjhG9RAHPPInSVQKBgQCMqz4lzCm4F2euR1ES\nnaG6HOtgjjnk2qnOiPEfQxfroUQu1/fyJ+6SlAGtL3O4HWd0Xrw5ZTgfmxDWFUJ3w\nn65tYaguYSYCICBrAGEBMLhARtGUgkIvUpqWGECGTLlmCV3b7dYH3ayQSeedO4ox\nA03MofVL8nSyyn8R/7rG6cnVlg==";
        
        // CLEANUP
        privateKey = privateKey.replace(/\\n/g, '\n').replace(/ /g, '');
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });

        const db = admin.firestore();
        const tenantId = 'enr-courtage-energie';

        console.log(`Starting migration for tenant: ${tenantId}...`);

        const projectsSnapshot = await db.collection('projects')
            .where('tenantId', '==', tenantId)
            .get();

        const projects = [];
        projectsSnapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Found ${projects.length} projects.`);

        const contactsSnapshot = await db.collection('contacts')
            .where('tenantId', '==', tenantId)
            .get();
        
        const contacts = [];
        contactsSnapshot.forEach(doc => {
            contacts.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`Found ${contacts.length} existing contacts.`);

        let createdCount = 0;
        let updatedCount = 0;

        for (const project of projects) {
            const firstName = (project.firstName || '').trim();
            const lastName = (project.name || '').trim();
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Client sans nom';
            
            if (fullName === 'Client sans nom') continue;

            const email = (project.email || '').trim().toLowerCase();
            const city = (project.city || '').trim();
            const phone = (project.phone || '').trim();

            let existingContact = null;
            if (email && email !== '-') {
                existingContact = contacts.find(c => c.email && c.email.toLowerCase().trim() === email);
            }
            if (!existingContact) {
                existingContact = contacts.find(c => 
                    c.name && c.name.toLowerCase().trim() === fullName.toLowerCase()
                );
            }

            const contactData = {
                name: fullName,
                email: email || null,
                phone: phone || null,
                city: city || null,
                address: project.address || null,
                zipCode: project.zip || null,
                status: project.status || 'Nouveau',
                tenantId: tenantId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (existingContact) {
                console.log(`Updating contact: ${fullName}`);
                await db.collection('contacts').doc(existingContact.id).update(contactData);
                updatedCount++;
            } else {
                console.log(`Creating contact: ${fullName}`);
                const newContactRef = db.collection('contacts').doc();
                await newContactRef.set({
                    ...contactData,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: project.createdBy || 'migration-script'
                });
                contacts.push({ id: newContactRef.id, ...contactData });
                createdCount++;
            }
        }

        console.log(`Migration finished: ${createdCount} created, ${updatedCount} updated.`);
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
