import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase.js';
import initialProjectsData from '@/data/shantiOneInitialData.json';
import * as XLSX from 'xlsx';

const COLLECTION_NAME = 'shanti_one_projects';
const UPDATES_COLLECTION = 'shanti_one_updates';

/**
 * Abonnement en temps réel aux projets Shanti One
 * Si la collection est vide, initialisation automatique à partir des données extraites du fichier Excel.
 */
export const subscribeToShantiOneProjects = (callback, onError) => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          console.log('[ShantiOne] Collection vide, déclenchement du seeding initial...');
          try {
            await seedShantiOneProjects();
          } catch (seedErr) {
            console.warn('[ShantiOne] Seeding Firestore non bloquant, utilisation des données locales:', seedErr);
            callback(initialProjectsData.filter((r) => !r.isTotal));
          }
          return;
        }

        const projects = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id
        }));

        // Trier par rowIdx ou ID
        projects.sort((a, b) => (Number(a.rowIdx) || 0) - (Number(b.rowIdx) || 0));
        callback(projects);
      },
      (error) => {
        console.warn('[ShantiOne] onSnapshot Firestore notice (utilisation du fallback):', error);
        // Fallback transparent avec les données initiales locales
        callback(initialProjectsData.filter((r) => !r.isTotal));
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[ShantiOne] Exception lors de la souscription:', err);
    callback(initialProjectsData.filter((r) => !r.isTotal));
    if (onError) onError(err);
    return () => {};
  }
};

/**
 * Seeding initial dans Firestore avec les 33 projets extraits du fichier Excel
 */
export const seedShantiOneProjects = async () => {
  try {
    const batch = writeBatch(db);
    const validProjects = initialProjectsData.filter((p) => !p.isTotal);

    validProjects.forEach((proj) => {
      const docRef = doc(db, COLLECTION_NAME, proj.id);
      batch.set(docRef, {
        ...proj,
        __updates: proj.__updates || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    console.log(`[ShantiOne] ${validProjects.length} projets insérés avec succès.`);
  } catch (err) {
    console.error('[ShantiOne] Erreur lors du seeding initial:', err);
    throw err;
  }
};

/**
 * Mise à jour d'un champ ou plusieurs champs d'un projet
 */
export const updateShantiOneProject = async (projectId, updates, user) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, projectId);
    const authorName = user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : user?.displayName || user?.email || 'Utilisateur';

    await updateDoc(docRef, {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: authorName,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error(`[ShantiOne] Erreur mise à jour projet ${projectId}:`, err);
    throw err;
  }
};

/**
 * Ajout d'une mise à jour / commentaire (style Monday)
 */
export const addShantiOneUpdate = async (project, text, user) => {
  try {
    const authorName = user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : user?.displayName || user?.email || 'Collaborateur';
    const authorAvatar = user?.photoURL || '';
    const authorRole = user?.title || (user?.role === 'admin' ? 'Administrateur' : 'Conseiller');
    const authorEmail = user?.email || '';

    const newUpdate = {
      id: `upd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      author: authorName,
      authorId: user?.uid || user?.id || 'anon',
      authorEmail,
      avatar: authorAvatar,
      role: authorRole,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false,
      replies: []
    };

    const existingUpdates = Array.isArray(project.__updates) ? project.__updates : [];
    const updatedList = [newUpdate, ...existingUpdates];

    // Mise à jour sur le document projet
    const projectRef = doc(db, COLLECTION_NAME, project.id);
    await updateDoc(projectRef, {
      __updates: updatedList,
      updated_at: new Date().toISOString(),
      updated_by: authorName,
      updatedAt: serverTimestamp()
    });

    // Également dans la table globale shanti_one_updates
    try {
      const updateDocRef = doc(db, UPDATES_COLLECTION, newUpdate.id);
      await setDoc(updateDocRef, {
        ...newUpdate,
        projectId: project.id,
        projectName: project.projet,
        createdAtTimestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn('[ShantiOne] Secondary update log write:', e);
    }

    return newUpdate;
  } catch (err) {
    console.error('[ShantiOne] Erreur ajout commentaire:', err);
    throw err;
  }
};

/**
 * Bascule du like sur un commentaire
 */
export const toggleLikeShantiOneUpdate = async (project, updateId) => {
  const existingUpdates = Array.isArray(project.__updates) ? project.__updates : [];
  const updatedList = existingUpdates.map((u) => {
    if (u.id === updateId) {
      const nextLiked = !u.liked;
      return {
        ...u,
        liked: nextLiked,
        likes: nextLiked ? Number(u.likes || 0) + 1 : Math.max(0, Number(u.likes || 1) - 1)
      };
    }
    return u;
  });

  const projectRef = doc(db, COLLECTION_NAME, project.id);
  await updateDoc(projectRef, {
    __updates: updatedList,
    updatedAt: serverTimestamp()
  });
};

/**
 * Suppression d'un commentaire
 */
export const deleteShantiOneUpdate = async (project, updateId) => {
  const existingUpdates = Array.isArray(project.__updates) ? project.__updates : [];
  const updatedList = existingUpdates.filter((u) => u.id !== updateId);

  const projectRef = doc(db, COLLECTION_NAME, project.id);
  await updateDoc(projectRef, {
    __updates: updatedList,
    updatedAt: serverTimestamp()
  });

  try {
    await deleteDoc(doc(db, UPDATES_COLLECTION, updateId));
  } catch (e) {
    console.warn('[ShantiOne] Secondary update delete:', e);
  }
};

/**
 * Export au format Excel (.xlsx)
 */
export const exportShantiOneToExcel = (projects, filename = 'SUIVI_SHANTI_ONE.xlsx') => {
  try {
    const rowsForExport = projects.map((p, idx) => ({
      'N°': idx + 1,
      'PROJET': p.projet || '',
      'SPV': p.spv || '',
      'PUISSANCE (kWc)': p.puissance_kwc ?? '',
      'ENR COURTAGE': p.enr_courtage || '',
      'Courtier': p.courtier || '',
      'Adresse Projet': p.adresse_projet || '',
      'Modèle de base': p.modele_base || '',
      'PLAN PC DP': p.plan_pc || '',
      'GPS': p.gps || '',
      'Tel': p.tel || '',
      'Mail': p.mail || '',
      'Type de projet': p.type_projet_categorie || '',
      'Type projet détail': p.type_projet_detail || '',
      'ACCORD DP': p.accord_dp || '',
      'ACCORD PC': p.accord_pc || '',
      'PC': p.pc || '',
      'PIECES COMPLEMENTAIRES': p.pieces_complementaires || '',
      'UNITE FONCIERE': p.unite_fonciere || '',
      'FICHE PROJET GEOMETRE': p.fiche_projet_geometre || '',
      'RETOUR GEOMETRE': p.retour_geometre || '',
      'GEOMETRE': p.geometre || '',
      'MTT HT DEVIS GEOMETRE': p.mtt_ht_devis_geometre ?? '',
      'DEVIS VALIDE': p.devis_valide || '',
      'Géomètre AB6': p.geometre_ab6 || '',
      'Montant HT AB6': p.montant_ht_ab6 ?? '',
      'Observ Géomètre': p.observ_geometre || '',
      'NOTAIRE': p.notaire || '',
      'Nombre de MAJ': Array.isArray(p.__updates) ? p.__updates.length : 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(rowsForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SHANTI ONE');
    XLSX.writeFile(workbook, filename);
  } catch (err) {
    console.error('[ShantiOne] Erreur export Excel:', err);
  }
};
