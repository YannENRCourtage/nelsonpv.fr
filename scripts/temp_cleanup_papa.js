
import { db } from '../src/config/firebase.js';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

async function cleanupPapa() {
    console.log("Starting cleanup for project PAPA...");

    try {
        // 1. Find the project(s) named PAPA
        const projectsQ = query(collection(db, 'projects'));
        const projectsSnap = await getDocs(projectsQ);
        const papaProjects = projectsSnap.docs.filter(d =>
            d.data().name?.toUpperCase().includes('PAPA') ||
            d.data().firstName?.toUpperCase().includes('PAPA')
        );

        if (papaProjects.length === 0) {
            console.log("No PAPA projects found.");
            return;
        }

        console.log(`Found ${papaProjects.length} projects related to PAPA.`);

        const batch = writeBatch(db);
        let totalActivitiesMigrated = 0;

        for (const projectDoc of papaProjects) {
            const projectId = projectDoc.id;
            const projectName = projectDoc.data().name || projectDoc.data().firstName;
            console.log(`Processing project: ${projectName} (${projectId})`);

            // Ensure project itself is on ACAMA (if that's where it should be)
            if (projectDoc.data().tenantId !== 'acama') {
                console.log(`Moving project ${projectId} to ACAMA...`);
                batch.update(projectDoc.ref, { tenantId: 'acama' });
            }

            // Find all activities for this project
            const activitiesQ = query(collection(db, 'activities'), where('itemId', '==', projectId));
            const activitiesSnap = await getDocs(activitiesQ);

            activitiesSnap.docs.forEach(activityDoc => {
                if (activityDoc.data().tenantId !== 'acama') {
                    batch.update(activityDoc.ref, { tenantId: 'acama' });
                    totalActivitiesMigrated++;
                }
            });

            // Also check activities that mention "PAPA" in description but might not have itemId
            const allActivitiesQ = query(collection(db, 'activities'));
            const allActivitiesSnap = await getDocs(allActivitiesQ);
            allActivitiesSnap.docs.forEach(activityDoc => {
                const desc = activityDoc.data().description || "";
                if (desc.includes("PAPA") && activityDoc.data().tenantId !== 'acama') {
                    batch.update(activityDoc.ref, { tenantId: 'acama' });
                    totalActivitiesMigrated++;
                }
            });
        }

        if (totalActivitiesMigrated > 0 || papaProjects.some(p => p.data().tenantId !== 'acama')) {
            await batch.commit();
            console.log(`Success! Migrated ${totalActivitiesMigrated} activities to ACAMA.`);
        } else {
            console.log("All activities were already correctly isolated.");
        }

    } catch (error) {
        console.error("Cleanup failed:", error);
    }
}

cleanupPapa();
