import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase.js';

const PORTFOLIOS_LS_KEY = 'nelson:portfolios:v1';

export const DEFAULT_PORTFOLIOS = [
  {
    id: 'pv-helios',
    name: 'HELIOS',
    type: 'PV',
    spv: 'HÉLIOS SPV 1',
    description: 'Portefeuille Photovoltaïque HÉLIOS (Toitures & Hangars Agricoles)',
    color: '#f59e0b',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'pv-cassiopee',
    name: 'CASSIOPEE',
    type: 'PV',
    spv: 'CASSIOPÉE SPV 1',
    description: 'Portefeuille Photovoltaïque CASSIOPÉE',
    color: '#8b5cf6',
    isDefault: false,
    createdAt: '2026-09-24T00:00:00.000Z'
  },
  {
    id: 'bess-volta',
    name: 'VOLTA',
    type: 'BESS',
    spv: 'SPV A (VOLTA)',
    description: 'Portefeuille Stockage BESS VOLTA (500 kW / 1044 kWh)',
    color: '#3b82f6',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'bess-tesla',
    name: 'TESLA',
    type: 'BESS',
    spv: 'SPV B (TESLA)',
    description: 'Portefeuille Stockage BESS TESLA Megapack',
    color: '#ef4444',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'bess-acama',
    name: 'ACAMA',
    type: 'BESS',
    spv: 'ACAMA STOCKAGE',
    description: 'Portefeuille Stockage BESS ACAMA',
    color: '#10b981',
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

/**
 * Charge la liste des portefeuilles depuis le localStorage
 */
export function getPortfoliosFromLS() {
  try {
    const raw = localStorage.getItem(PORTFOLIOS_LS_KEY);
    if (!raw) {
      savePortfoliosToLS(DEFAULT_PORTFOLIOS);
      return DEFAULT_PORTFOLIOS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // S'assurer que CASSIOPEE est toujours présent
      const hasCassiopee = parsed.some(p => (p.name || '').toUpperCase() === 'CASSIOPEE');
      if (!hasCassiopee) {
        const merged = [...parsed, DEFAULT_PORTFOLIOS.find(p => p.name === 'CASSIOPEE')].filter(Boolean);
        savePortfoliosToLS(merged);
        return merged;
      }
      return parsed;
    }
    return DEFAULT_PORTFOLIOS;
  } catch (e) {
    console.warn('Erreur lecture localStorage portfolios:', e);
    return DEFAULT_PORTFOLIOS;
  }
}

/**
 * Sauvegarde la liste des portefeuilles dans le localStorage et notifie
 */
export function savePortfoliosToLS(list) {
  try {
    localStorage.setItem(PORTFOLIOS_LS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('portfoliosUpdated', { detail: list }));
  } catch (e) {
    console.warn('Erreur écriture localStorage portfolios:', e);
  }
}

/**
 * Vérification des droits administrateur
 */
export function isUserAdmin(user) {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    user.role === 'Administrator' ||
    user.isAdmin === true ||
    user.email === 'y.barberis@enr-courtage.fr' ||
    user.email === 'contact@nelsonpv.fr'
  );
}

/**
 * Souscription en temps réel aux portefeuilles depuis Firestore
 */
export function subscribeToPortfolios(callback) {
  try {
    const colRef = collection(db, 'portfolios');
    const unsubscribe = onSnapshot(colRef, async (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // S'assurer que CASSIOPEE est présent
        const hasCassiopee = docs.some(p => (p.name || '').toUpperCase() === 'CASSIOPEE');
        let finalDocs = docs;
        if (!hasCassiopee) {
          const cassiopee = DEFAULT_PORTFOLIOS.find(p => p.name === 'CASSIOPEE');
          if (cassiopee) {
            finalDocs = [...docs, cassiopee];
          }
        }
        savePortfoliosToLS(finalDocs);
        callback(finalDocs);
      } else {
        // Initialiser Firestore avec les valeurs par défaut si vide
        const initial = DEFAULT_PORTFOLIOS;
        savePortfoliosToLS(initial);
        callback(initial);
        // Tenter de peupler Firestore en arrière-plan
        try {
          for (const item of initial) {
            await setDoc(doc(db, 'portfolios', item.id), item, { merge: true });
          }
        } catch (initErr) {
          console.warn('Could not auto-seed portfolios collection:', initErr);
        }
      }
    }, (error) => {
      console.warn('Firestore portfolios subscription warning, using local cache:', error);
      callback(getPortfoliosFromLS());
    });

    return unsubscribe;
  } catch (e) {
    console.warn('Failed to setup portfolios subscription:', e);
    callback(getPortfoliosFromLS());
    return () => {};
  }
}

/**
 * Créer un nouveau portefeuille (réservé aux administrateurs)
 */
export async function createPortfolio(data, user) {
  if (!isUserAdmin(user)) {
    throw new Error("Action réservée aux administrateurs : vous n'avez pas l'autorisation de créer un portefeuille.");
  }

  const name = (data.name || '').trim().toUpperCase();
  if (!name) {
    throw new Error("Le nom du portefeuille est obligatoire.");
  }

  const type = (data.type || 'PV').toUpperCase();
  if (!['PV', 'BESS', 'HYBRIDE'].includes(type)) {
    throw new Error("Le type de portefeuille doit être 'PV', 'BESS' ou 'HYBRIDE'.");
  }

  const currentList = getPortfoliosFromLS();
  if (currentList.some(p => p.name.toUpperCase() === name)) {
    throw new Error(`Un portefeuille nommé "${name}" existe déjà.`);
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const id = `port_${slug}_${Date.now()}`;

  const newPortfolio = {
    id,
    name,
    type,
    spv: (data.spv || `${name} SPV 1`).trim(),
    description: (data.description || `Portefeuille ${type} ${name}`).trim(),
    color: data.color || (type === 'PV' ? '#f59e0b' : (type === 'BESS' ? '#3b82f6' : '#10b981')),
    isDefault: false,
    createdAt: new Date().toISOString(),
    createdBy: user?.email || 'admin'
  };

  // Sauvegarde locale immédiate
  const updatedList = [...currentList, newPortfolio];
  savePortfoliosToLS(updatedList);

  // Sauvegarde Firestore
  try {
    await setDoc(doc(db, 'portfolios', id), newPortfolio);
  } catch (err) {
    console.warn('Could not write portfolio to Firestore, kept in local storage:', err);
  }

  return newPortfolio;
}

/**
 * Modifier un portefeuille existant (réservé aux administrateurs)
 */
export async function updatePortfolio(id, data, user) {
  if (!isUserAdmin(user)) {
    throw new Error("Action réservée aux administrateurs : vous n'avez pas l'autorisation de modifier un portefeuille.");
  }

  const currentList = getPortfoliosFromLS();
  const index = currentList.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error("Portefeuille introuvable.");
  }

  const existing = currentList[index];
  const updatedName = data.name ? data.name.trim().toUpperCase() : existing.name;

  // Vérifier doublon de nom si modifié
  if (updatedName !== existing.name && currentList.some(p => p.id !== id && p.name.toUpperCase() === updatedName)) {
    throw new Error(`Un portefeuille nommé "${updatedName}" existe déjà.`);
  }

  const updatedPortfolio = {
    ...existing,
    ...data,
    name: updatedName,
    type: (data.type || existing.type).toUpperCase(),
    spv: data.spv !== undefined ? data.spv.trim() : existing.spv,
    description: data.description !== undefined ? data.description.trim() : existing.description,
    color: data.color || existing.color,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.email || 'admin'
  };

  const updatedList = [...currentList];
  updatedList[index] = updatedPortfolio;
  savePortfoliosToLS(updatedList);

  try {
    await setDoc(doc(db, 'portfolios', id), updatedPortfolio, { merge: true });
  } catch (err) {
    console.warn('Could not update portfolio in Firestore:', err);
  }

  return updatedPortfolio;
}

/**
 * Supprimer un portefeuille existant (réservé aux administrateurs)
 */
export async function deletePortfolio(id, user) {
  if (!isUserAdmin(user)) {
    throw new Error("Action réservée aux administrateurs : vous n'avez pas l'autorisation de supprimer un portefeuille.");
  }

  const currentList = getPortfoliosFromLS();
  const target = currentList.find(p => p.id === id);
  if (!target) {
    throw new Error("Portefeuille introuvable.");
  }

  if (target.isDefault && (target.name === 'HELIOS' || target.name === 'VOLTA')) {
    throw new Error(`Le portefeuille système "${target.name}" ne peut pas être supprimé car il sert de référence de base.`);
  }

  const updatedList = currentList.filter(p => p.id !== id);
  savePortfoliosToLS(updatedList);

  try {
    await deleteDoc(doc(db, 'portfolios', id));
  } catch (err) {
    console.warn('Could not delete portfolio from Firestore:', err);
  }

  return true;
}
