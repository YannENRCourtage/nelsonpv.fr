import admin from 'firebase-admin';

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDUAVixZOOZ+xVq
nq6t4gnmNW7YOEsN7RK6syAUkrrR9msqRVVBKwExlh4xOzyvGQQ54de5hi3ntN/2E
n8P17nA31Oj8frSBRIXSb45WPZo0fPFh3KV3ZKHdxdjQmyVIASE9XOYnsahRHl
JEW
nr2Qij74dUD9+FbiweGWcRc+YFUTXY45AJyZugNt66kkjvOA+HlU6RLifMuzX2il
nHz6Op3jiMKj6iXmyoh82n/jL8TY3DOfO+uxpf3wx9UKJ/ftjs1MbAwIxUpuiB9OA
n/UGPwGT0gms4JALZMHCteFhsrqJpKxS++FEDDwCP+JqINEq4YqPKAk8GabMgypO6
nW+H6RAJLAgMBAAECggEAWwJELQeJPRV1oKiYP/wZUuTzfg1FYYQ6/4jsxaufal1
nVUH1kcNpXoXF7/EnWNRGHIBXqE00sAu746VKm+UmbCmgsnLszmrruX3tt0d0S+vm
nWCUYZiynsbvZ8GqM+pUQBJQrmMBGkdU2mBUKyctAzqmjz/b4JTIUv6BSWTYXZoj
nlQD0hprrxSxdxlUlloaisNqv5FliC59bxmkYkY+j7fmIXi6kI4EOF5L/zzLGgxDHA
nczckzTL3NsZH8
MFTHDCUgl0x21LSLZmyhFmHD2TouD6OZ1qFoiVsVmnP5GEEO++9
nAfeSrjjnoRWi6B995GrWTruou9bchd422uh4WWyGFQKBgQD5mJGFHbZtyBcGGezC
nBPbde5yK7kzodp6/DV5wajJQuF5Frha1SVov1txyEI/EzI+PnaZa5GtKkmOExojU
neg/0nFR59up9p+I70me28QOJeJtOg1gj6s+12UsQ2CgBgdtH9JOocoaooQK58uic
nHbPyTR8k/G9nnljy8ARD9lsIrWKBqQDZCfdohdncv2GVKNcE+XBLGL16EDMuWLmp
nTvDabIvIfE+GaJ9t9YD8wf6mk1dBQFTEJNWRlZOCIhPSHpary6dTDqysgMaeoXgV
nrB/mV6+okgs417YzWw21DFfJQUjljod3RSTC35m7qxYEQnmmN80/Vt/QOuAoSoSx
nRY8eiduQpQKBgQc8nVVsgWqbatLbmbdbng4LeSow4vOk+Be3eqIamYZSHnvUwugLt
Ncp6DJ9W0EXvY5PtTpAO/ZZKqy6ElaHHF1q5we3IorWAyv5+gHjZ2XX3y8lpYN4X
n3l1j+lp9QYLiRecs6jUXQVGMiQuxhgrvL7qfWQOXBUpQJdLL5HDwrE581hwKBGDU
n0Bu84guyHeiuiGu5aSH/ogIdWe+Ng56p+q21SVJOTtpP1ON8TdPhCzFXNoHeq63S
nji5LLwWBbnKxqehS2S25F1qenNauKGAL7fsGlH1N5SmAh3Y2Cv5+XEcanQ+I5Bbm
n/O/8U1JV7xrMLnc628CD5DWGaajrjhG9RAHPPInSVQKBgQCMqz4lzCm4F2euR1ES
naG6HOtgjjnk2qnOiPEfQxfroUQu1/fyJ+6SlAGtL3O4HWd0Xrw5ZTgfmxDWFUJ3w
n65tYaguYSYCICBrAGEBMLhARtGUgkIvUpqWGECGTLlmCV3b7dYH3ayQSeedO4ox
A03MofVL8nSyyn8R/7rG6cnVlg==
-----END PRIVATE KEY-----`;

async function run() {
    try {
        console.log("Initializing Admin with HARDCODED key...");
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "nelsonpv-4722c",
                clientEmail: "firebase-adminsdk-fbsvc@nelsonpv-4722c.iam.gserviceaccount.com",
                privateKey: privateKey
            })
        });

        // Wait! The cert() method expects actual newlines or it might fail if I don't use my cleaning logic.
        // I'll just use the key AS IS first.
        
        console.log("SUCCESS Initializing.");
        const auth = admin.auth();
        
        console.log("Updating Alexandru...");
        const u1 = await auth.getUserByEmail('a.mihaiov@acama-energies.fr');
        await auth.updateUser(u1.uid, { password: '#zPVEl@58ZqV9qZc' });
        console.log("✅ Success for mihaiov (no L)");

        try {
            const u2 = await auth.getUserByEmail('a.mihailov@acama-energies.fr');
            await auth.updateUser(u2.uid, { password: '#zPVEl@58ZqV9qZc' });
            console.log("✅ Success for mihailov (with L)");
        } catch (e) { console.log("Mihailov (with L) not found"); }

        console.log("Updating Christophe...");
        const u3 = await auth.getUserByEmail('christophe.poisson@acama.fr');
        await auth.updateUser(u3.uid, { password: 'IHGS8PC8QK4Mq?TL' });
        console.log("✅ Success for Christophe");

        process.exit(0);
    } catch (error) {
        console.error("FATAL:", error.message);
        process.exit(1);
    }
}
run();
