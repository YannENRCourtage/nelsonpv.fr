import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { apiService } from "../services/api";
import { uploadProjectCapture, uploadProjectPhoto } from "../services/firebase/storage.service";
import { createProjectAssignmentNotification } from "../services/firebase/comments.service";
import { useAuth } from "./AuthContext";

/** Clef LS cloisonnée par tenant */
const getTenantLSKey = (tId) => `nelson:projects:${tId || 'green-invest'}:v1`;

// Clean legacy / obsolete localStorage keys to free quota space
try {
  localStorage.removeItem('nelson:projects:v1');
  localStorage.removeItem('nelson:projects:undefined:v1');
  localStorage.removeItem('nelson:projects:null:v1');
} catch (_) {}

/* Utils LS */
function sanitizeProjectForLS(p) {
  if (!p || typeof p !== 'object') return p;
  const copy = { ...p };

  // Strip massive non-list fields that bloat localStorage beyond the 5MB quota
  delete copy.features;
  delete copy.urbanisme_saved_state;
  delete copy.cadastre_geojson;
  delete copy.sun_data;
  delete copy.pdf_blob;
  delete copy.urbanisme_captures;

  // Clean buildings and solutions from heavy nested captures and photos
  if (Array.isArray(copy.buildings)) {
    copy.buildings = copy.buildings.map(b => {
      if (!b || typeof b !== 'object') return b;
      const { captures, photos, urbanisme_captures, masse_capture, ...rest } = b;
      return rest;
    });
  }

  if (copy.solutions && typeof copy.solutions === 'object') {
    const sol = {};
    for (const [k, v] of Object.entries(copy.solutions)) {
      if (v && Array.isArray(v.buildings)) {
        sol[k] = {
          ...v,
          buildings: v.buildings.map(b => {
            if (!b || typeof b !== 'object') return b;
            const { captures, photos, urbanisme_captures, masse_capture, ...rest } = b;
            return rest;
          })
        };
      } else {
        sol[k] = v;
      }
    }
    copy.solutions = sol;
  }

  // Strip large data URLs (base64) which exceed localStorage 5MB quota
  if (Array.isArray(copy.captures)) {
    copy.captures = copy.captures.filter(c => typeof c === 'string' && !c.startsWith('data:') && c.length <= 500);
  }
  if (Array.isArray(copy.photos)) {
    copy.photos = copy.photos.filter(c => typeof c === 'string' && !c.startsWith('data:') && c.length <= 500);
  }

  return copy;
}

/**
 * Migration automatique : suppression du portefeuille LOUXOR.
 * - Tout dossier BESS affilié à LOUXOR est basculé vers TESLA.
 * - Tout dossier PV affilié à LOUXOR (dont le dossier DUPORT) est retiré de LOUXOR.
 */
function migrateProjectsLouxorToTesla(list) {
  if (!Array.isArray(list)) return list;
  return list.map(p => {
    if (!p) return p;
    let updated = { ...p };
    let changed = false;

    // 1. Dossiers BESS affiliés à LOUXOR -> TESLA
    const bessPort = (p.bess_portfolio || p.portfolio_bess || '').toUpperCase();
    if (bessPort === 'LOUXOR') {
      updated.bess_portfolio = 'TESLA';
      changed = true;
    }

    // 2. Dossiers PV affiliés à LOUXOR -> retrait immédiat
    const pvPort = (p.pv_portfolio || p.portfolio_pv || p.portfolio || '').toUpperCase();
    if (pvPort === 'LOUXOR') {
      updated.pv_portfolio = null;
      changed = true;
    }

    // Retirer spécifiquement DUPORT du portefeuille PV s'il était sur LOUXOR
    const pName = (p.name || '').toLowerCase();
    const pClient = (p.client_name || p.client || '').toLowerCase();
    if ((pName.includes('duport') || pClient.includes('duport')) && (pvPort === 'LOUXOR' || !updated.pv_portfolio)) {
      if (updated.pv_portfolio) {
        updated.pv_portfolio = null;
        changed = true;
      }
    }

    // Mise à jour asynchrone proactive de Firestore si le projet a changé
    if (changed && p.id && p.id !== 'new') {
      apiService.updateProject(p.id, {
        bess_portfolio: updated.bess_portfolio || null,
        pv_portfolio: null
      }).catch(() => {});
    }

    return updated;
  });
}

function loadProjectsFromLS(tenantId) {
  try {
    const raw = localStorage.getItem(getTenantLSKey(tenantId));
    return raw ? migrateProjectsLouxorToTesla(JSON.parse(raw)) : [];
  } catch (e) {
    console.warn('localStorage access blocked or unavailable:', e);
    return [];
  }
}

function saveProjectsToLS(tenantId, list) {
  if (!tenantId) return;
  try {
    const migrated = migrateProjectsLouxorToTesla(list);
    const sanitized = Array.isArray(migrated) ? migrated.map(sanitizeProjectForLS) : migrated;
    localStorage.setItem(getTenantLSKey(tenantId), JSON.stringify(sanitized));
  } catch (e) {
    console.warn('localStorage write error, attempting ultralight payload:', e);
    try {
      // Fallback ultra-léger (strictement l'affichage CRM & portefeuilles) en cas de quota presque saturé
      const ultralight = (Array.isArray(list) ? list : []).map(p => ({
        id: p.id,
        name: p.name,
        firstName: p.firstName,
        client: p.client || p.name,
        client_name: p.client_name,
        address: p.address,
        zip: p.zip,
        city: p.city,
        commune: p.commune,
        kwc: p.kwc,
        puissance: p.puissance,
        productible: p.productible,
        projectSize: p.projectSize,
        pv_portfolio: p.pv_portfolio,
        bess_portfolio: p.bess_portfolio,
        portfolio: p.portfolio,
        portfolio_pv: p.portfolio_pv,
        portfolio_bess: p.portfolio_bess,
        type: p.type,
        status: p.status,
        lat: p.lat,
        lng: p.lng,
        gps: p.gps,
        tenantId: p.tenantId,
        assignedUser: p.assignedUser,
        commercial: p.commercial,
        user: p.user,
        createdBy: p.createdBy,
        createdByFirstName: p.createdByFirstName,
        creatorId: p.creatorId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
      localStorage.setItem(getTenantLSKey(tenantId), JSON.stringify(ultralight));
    } catch (e2) {
      console.warn('localStorage ultralight write also failed:', e2);
    }
  }
}

/* Fonctions de compatibilité */
export function loadAllProjectsFromLS(tenantId) {
  return loadProjectsFromLS(tenantId);
}

/** Charge l'ensemble des projets de tous les tenants (Green Invest, ENR Courtage, Acama) */
export function loadAllTenantProjectsFromLS() {
  const tenants = ['green-invest', 'enr-courtage-energie', 'acama'];
  const map = new Map();
  tenants.forEach(t => {
    try {
      const raw = localStorage.getItem(getTenantLSKey(t));
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(p => {
            if (p && p.id && !map.has(p.id)) {
              map.set(p.id, { ...p, _tenantId: p.tenantId || t });
            }
          });
        }
      }
    } catch (e) {
      console.warn(`Error reading projects for tenant ${t}:`, e);
    }
  });
  return migrateProjectsLouxorToTesla(Array.from(map.values()));
}

export function saveAllProjectsToLS(tenantIdOrList, maybeList) {
  if (Array.isArray(tenantIdOrList)) {
    return saveProjectsToLS(null, tenantIdOrList);
  }
  return saveProjectsToLS(tenantIdOrList, maybeList);
}

/** Contexte */
const ProjectContext = createContext({
  projects: [],
  allProjects: [],
  setProjects: () => { },
  project: null,
  setProject: () => { },
  updateProject: () => { },
  saveProject: () => { },
  loadAllProjects: (tenantId) => loadProjectsFromLS(tenantId),
  loadAllTenantProjects: () => loadAllTenantProjectsFromLS(),
  refreshProjects: async () => { },
  loading: false,
  error: null
});

/**
 * Provider unique :
 * - page Projets (liste)  => projects
 * - page Client & Projet  => project + updateProject
 */
export function ProjectProvider({ children }) {
  const { user, activeTenantId } = useAuth(); // Get current user and active tenant
  const activeTenantIdRef = useRef(activeTenantId);
  useEffect(() => { activeTenantIdRef.current = activeTenantId; }, [activeTenantId]);
  const [projects, _setProjects] = useState(() => loadProjectsFromLS(activeTenantId));
  const [allProjects, setAllProjects] = useState(() => loadAllTenantProjectsFromLS());
  const [project, _setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Wrapper for setProjects that automatically syncs to localStorage and keeps allProjects updated
  const setProjects = useCallback((updater) => {
    _setProjects((prev) => {
      const rawProjects = typeof updater === 'function' ? updater(prev) : updater;
      const newProjects = migrateProjectsLouxorToTesla(rawProjects);
      // Sync to localStorage immediately for the active tenant
      saveProjectsToLS(activeTenantIdRef.current, newProjects);
      // Synchroniser allProjects en mémoire
      setAllProjects(prevAll => {
        const map = new Map();
        (prevAll || []).forEach(p => { if (p && p.id) map.set(p.id, p); });
        (newProjects || []).forEach(p => { if (p && p.id) map.set(p.id, { ...(map.get(p.id) || {}), ...p }); });
        return migrateProjectsLouxorToTesla(Array.from(map.values()));
      });
      return newProjects;
    });
  }, []);

  // Subscription to real-time updates from Firestore — re-subscribe on tenant change or auth resolution
  useEffect(() => {
    let unsubscribe = () => { };

    if (!user) {
      return;
    }

    // Charger immédiatement le cache du tenant actif et de l'ensemble des tenants
    const cached = loadProjectsFromLS(activeTenantId);
    _setProjects(cached);
    setAllProjects(loadAllTenantProjectsFromLS());

    const setupSubscription = async () => {
      setLoading(true);
      try {
        console.log("Setting up real-time project subscription for tenant:", activeTenantId);
        unsubscribe = await apiService.subscribeToProjects((updatedProjects) => {
          console.log("Projects updated from Firestore:", updatedProjects?.length);
          if (Array.isArray(updatedProjects)) {
            setProjects(prev => {
              if (updatedProjects.length === 0 && Array.isArray(prev) && prev.length > 0) {
                console.warn("Ignoring transient empty projects snapshot from Firestore while local state has items");
                return prev;
              }
              return updatedProjects;
            });
          }
          setLoading(false);
        }, activeTenantId);

        // Fetch direct pour peupler immédiatement la liste
        const directData = await apiService.getProjects(activeTenantId);
        if (Array.isArray(directData) && directData.length > 0) {
          setProjects(directData);
        }

        // Précharger également les projets des tenants partenaires (Green Invest & ENR Courtage)
        // afin que les portefeuilles PV et BESS soient complets sur les deux interfaces
        const partnerTenants = ['green-invest', 'enr-courtage-energie', 'acama'].filter(t => t !== activeTenantId);
        for (const pt of partnerTenants) {
          try {
            const partnerData = await apiService.getProjects(pt);
            if (Array.isArray(partnerData) && partnerData.length > 0) {
              saveProjectsToLS(pt, partnerData);
              setAllProjects(prevAll => {
                const map = new Map();
                (prevAll || []).forEach(p => { if (p && p.id) map.set(p.id, p); });
                partnerData.forEach(p => { if (p && p.id) map.set(p.id, { ...(map.get(p.id) || {}), ...p }); });
                return Array.from(map.values());
              });
            }
          } catch (pe) {
            console.warn(`Could not preload partner projects for ${pt}:`, pe);
          }
        }
      } catch (err) {
        console.error("Failed to subscribe to projects:", err);
        setError(err);
        setLoading(false);

        // Fallback: try one-time fetch if subscription fails
        try {
          const fallbackData = await apiService.getProjects(activeTenantId);
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            setProjects(fallbackData);
          }
        } catch (e) {
          console.error("Fallback fetch failed", e);
        }
      }
    };

    setupSubscription();

    return () => {
      console.log("Unsubscribing from projects...");
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [setProjects, activeTenantId, user]);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await apiService.getProjects(activeTenantIdRef.current);
      if (Array.isArray(updated) && updated.length > 0) {
        setProjects(updated);
      }
      const partnerTenants = ['green-invest', 'enr-courtage-energie', 'acama'].filter(t => t !== activeTenantIdRef.current);
      for (const pt of partnerTenants) {
        try {
          const pData = await apiService.getProjects(pt);
          if (Array.isArray(pData) && pData.length > 0) {
            saveProjectsToLS(pt, pData);
            setAllProjects(prevAll => {
              const map = new Map();
              (prevAll || []).forEach(p => { if (p && p.id) map.set(p.id, p); });
              pData.forEach(p => { if (p && p.id) map.set(p.id, { ...(map.get(p.id) || {}), ...p }); });
              return Array.from(map.values());
            });
          }
        } catch (e) { }
      }
    } catch (err) {
      console.error("Manual refresh failed:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [setProjects]);

  // Écouter les changements du localStorage (sync entre onglets uniquement)
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Ignorer si ce n'est pas un événement inter-onglets concernant le tenant actif
      if (e && e.key && e.key !== getTenantLSKey(activeTenantIdRef.current)) {
        return;
      }
      const local = loadProjectsFromLS(activeTenantIdRef.current);
      if (Array.isArray(local) && local.length > 0) {
        _setProjects(local);
      }
      setAllProjects(loadAllTenantProjectsFromLS());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /** Setter sécurisé */
  const setProject = useCallback((next) => {
    if (typeof next === "function") {
      _setProject((prev) => next(prev));
    } else {
      _setProject(next);
    }
  }, []);

  /** Mises à jour partielles (patch) synchronisées sur le projet actif et les listes */
  const updateProject = useCallback(async (patch) => {
    _setProject((prev) => {
      const updated = { ...(prev || {}), ...(patch || {}) };
      if (updated.id) {
        _setProjects(list => (Array.isArray(list) ? list.map(item => item.id === updated.id ? { ...item, ...patch } : item) : list));
        setAllProjects(list => (Array.isArray(list) ? list.map(item => item.id === updated.id ? { ...item, ...patch } : item) : list));
      }
      return updated;
    });
  }, []);

  /** Sauvegarde (API + LS backup) */
  /** Sauvegarde (API + LS backup) */
  const isSaving = useRef(false);

  const saveProject = useCallback(async () => {
    if (!project) return;
    if (isSaving.current) {
      console.warn("Save already in progress, skipping...");
      return;
    }

    isSaving.current = true;

    // 1. Sauvegarde optimiste dans LS
    const all = loadProjectsFromLS(activeTenantIdRef.current);
    // Si pas d'ID (nouveau projet), on génère un ID temporaire pour le LS si besoin, 
    // ou on attend la réponse API. Ici on suppose que le composant a déjà mis un ID ou non.
    // Si pas d'ID, on ne peut pas vraiment sauvegarder dans LS de manière fiable pour la réhydratation
    // sans créer de doublons.

    // MAIS, la logique existante suppose project.id existant.
    // Si c'est un nouveau projet, il faut peut-être le créer d'abord.

    // --- Correction : Gestion des erreurs et feedback ---
    try {
      let projectId = project.id;
      let savedProject = { ...project };

      // Ne définir le tenantId que pour les NOUVEAUX projets
      // Pour les projets existants, on conserve leur tenant d'origine pour éviter les fuites
      if (!savedProject.tenantId) {
        const isBat = (savedProject.type || '').toLowerCase().includes('batterie');
        if (isBat) {
          savedProject.tenantId = 'enr-courtage-energie';
        } else {
          savedProject.tenantId = activeTenantIdRef.current || 'green-invest';
        }
      }

      // Handle captures: upload to Storage if they are data URLs
      // This prevents Firestore document size limit errors (1 MB)
      if (savedProject.captures && Array.isArray(savedProject.captures)) {
        console.log("Processing captures for upload to Storage...");
        const captureUrls = await Promise.all(
          savedProject.captures.map(async (capture, index) => {
            if (!capture) return null;

            // Check if it's a data URL (base64) that needs to be uploaded
            if (capture.startsWith('data:image')) {
              console.log(`Uploading capture ${index} to Storage...`);
              try {
                // Use temp ID if project not yet created
                const tempId = projectId && projectId !== 'new' ? projectId : `temp_${Date.now()}`;
                const downloadUrl = await uploadProjectCapture(capture, tempId, index);
                console.log(`Capture ${index} uploaded successfully`);
                return downloadUrl;
              } catch (uploadError) {
                console.error(`Failed to upload capture ${index}:`, uploadError);
                // Return null instead of the data URL to avoid size limits
                return null;
              }
            }

            // Already a download URL, keep it
            return capture;
          })
        );

        // Update project with Storage URLs
        savedProject.captures = captureUrls;
      }

      // Handle photos: upload to Storage if they are data URLs (same logic as captures)
      if (savedProject.photos && Array.isArray(savedProject.photos)) {
        console.log("Processing photos for upload to Storage...");
        const photoUrls = await Promise.all(
          savedProject.photos.map(async (photo, index) => {
            if (!photo) return null;

            // Check if it's a data URL (base64) that needs to be uploaded
            if (photo.startsWith('data:image')) {
              console.log(`Uploading photo ${index} to Storage...`);
              try {
                // Use temp ID if project not yet created
                const tempId = projectId && projectId !== 'new' ? projectId : `temp_${Date.now()}`;
                const downloadUrl = await uploadProjectPhoto(photo, tempId, index);
                console.log(`Photo ${index} uploaded successfully`);
                return downloadUrl;
              } catch (uploadError) {
                console.error(`Failed to upload photo ${index}:`, uploadError);
                return null;
              }
            }

            // Already a download URL, keep it
            return photo;
          })
        );

        // Update project with Storage URLs
        savedProject.photos = photoUrls;
      }
      
      // Handle urbanisme_captures: upload each key to Storage if it's a data URL
      if (savedProject.urbanisme_captures && typeof savedProject.urbanisme_captures === 'object') {
        console.log("Processing urbanisme_captures for upload to Storage...");
        const newUrbanismeCaptures = { ...savedProject.urbanisme_captures };
        const keys = Object.keys(newUrbanismeCaptures);
        
        await Promise.all(
          keys.map(async (key) => {
            const capture = newUrbanismeCaptures[key];
            if (capture && typeof capture === 'string' && capture.startsWith('data:image')) {
              console.log(`Uploading urbanisme capture ${key} to Storage...`);
              try {
                const tempId = projectId && projectId !== 'new' ? projectId : `temp_${Date.now()}`;
                const downloadUrl = await uploadProjectCapture(capture, tempId, `urb_${key}`);
                newUrbanismeCaptures[key] = downloadUrl;
              } catch (uploadError) {
                console.error(`Failed to upload urbanisme capture ${key}:`, uploadError);
              }
            }
          })
        );
        savedProject.urbanisme_captures = newUrbanismeCaptures;
      }

      // Helper to remove undefined values for Firestore
      const sanitizeForFirestore = (obj) => {
        return JSON.parse(JSON.stringify(obj));
      };

      savedProject = sanitizeForFirestore(savedProject);

      // 2. Sauvegarde API
      // On tente d'abord l'API pour avoir la vérité terrain (et l'ID généré si création)
      // FIX: Check for temp IDs (starting with "proj_" or "temp_") to force creation
      const isTempId = projectId && (String(projectId).startsWith('proj_') || String(projectId).startsWith('temp_'));

      // VALIDATION: Prevent saving unnamed projects
      const hasName = (savedProject.name && savedProject.name.trim()) || (savedProject.firstName && savedProject.firstName.trim());
      if (!hasName) {
        throw new Error("Veuillez renseigner le nom du client ou du projet pour sauvegarder.");
      }

      if (!projectId || projectId === 'new' || isTempId) {
        // CREATION
        console.log("Creating new project via API...");
        // If it was a temp ID, remove it from the data sent to API to let Firestore generate a real one
        if (isTempId) {
          delete savedProject.id;
        }

        const created = await apiService.createProject(savedProject, false, activeTenantIdRef.current);
        console.log("Project created:", created);

        savedProject = { ...savedProject, ...created }; // Récupère l'ID et les timestamps
        projectId = created.id;

        // Mise à jour du state local pour refléter l'ID serveur
        // Cela évite de recréer le projet au prochain 'save'
        setProject(prev => ({ ...prev, ...created }));
      } else {
        // UPDATE
        try {
          await apiService.updateProject(projectId, savedProject, false, activeTenantIdRef.current);
        } catch (e) {
          // Fallback: si l'update échoue (ex: document supprimé ou inexistant), on le recrée
          console.warn("Update failed, trying create (upsert):", e);
          await apiService.createProject(savedProject);
        }
      }

      // 3. Mise à jour du Cache Local (LS) et Liste
      // On recharge la liste officielle depuis le serveur avec le bon tenant
      const refreshedProjects = await apiService.getProjects(activeTenantIdRef.current);
      setProjects(refreshedProjects);
      saveProjectsToLS(activeTenantIdRef.current, refreshedProjects);

      // Feedback succès (si géré par le composant)
      return savedProject;

    } catch (err) {
      console.error("CRITICAL API SAVE FAILURE:", err);
      // On propage l'erreur pour que l'UI puisse afficher un toast d'erreur
      throw err;
    } finally {
      isSaving.current = false;
    }
  }, [project, setProject]);

  const value = useMemo(
    () => ({
      projects,
      allProjects,
      setProjects,
      project,
      setProject,
      updateProject,
      saveProject, // Nouvelle méthode unifiée
      saveProjectToLS: saveProject, // Alias pour compatibilité
      refreshProjects,
      loadAllProjects: loadAllProjectsFromLS,
      loadAllTenantProjects: loadAllTenantProjectsFromLS,
      loading,
      error
    }),
    [projects, allProjects, project, setProject, updateProject, saveProject, refreshProjects, loading, error]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

/** Hooks */
export function useProjects() {
  return useContext(ProjectContext);
}
export function useProject() {
  const { project, updateProject, saveProject, setProject } = useContext(ProjectContext);
  return { project, updateProject, saveProject, saveProjectToLS: saveProject, setProject };
}