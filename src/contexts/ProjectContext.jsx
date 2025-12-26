import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { apiService } from "../services/api";

/** Clef LS commune (liste projets) */
const LS_KEY = "nelson:projects:v1";

/* Utils LS */
function loadAllProjectsFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('localStorage access blocked or unavailable:', e);
    return [];
  }
}

function saveAllProjectsToLS(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('projectsUpdated'));
  } catch (e) {
    console.warn('localStorage write blocked or unavailable:', e);
    // Gracefully fail: app can still work without localStorage
  }
}

/** Contexte */
const ProjectContext = createContext({
  projects: [],
  setProjects: () => { },
  project: null,
  setProject: () => { },
  updateProject: () => { },
  saveProject: () => { },
  loadAllProjects: loadAllProjectsFromLS,
  loading: false,
  error: null
});

/**
 * Provider unique :
 * - page Projets (liste)  => projects
 * - page Client & Projet  => project + updateProject
 */
export function ProjectProvider({ children }) {
  const [projects, _setProjects] = useState(() => loadAllProjectsFromLS());
  const [project, _setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Wrapper for setProjects that automatically syncs to localStorage
  const setProjects = useCallback((updater) => {
    _setProjects((prev) => {
      const newProjects = typeof updater === 'function' ? updater(prev) : updater;
      // Sync to localStorage immediately
      saveAllProjectsToLS(newProjects);
      return newProjects;
    });
  }, []);

  // Charger les projets depuis l'API au montage
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const apiProjects = await apiService.getProjects();
        const localProjects = loadAllProjectsFromLS();

        if (Array.isArray(apiProjects)) {
          // MIGRATION : Vérifier s'il y a des projets locaux qui ne sont pas dans l'API
          // (Cas du premier lancement après déploiement ou données hors ligne)
          const missingInApi = localProjects.filter(lp => !apiProjects.find(ap => ap.id === lp.id));

          if (missingInApi.length > 0) {
            console.log("Migration : Envoi des projets locaux vers l'API...", missingInApi);
            let successCount = 0;
            // On les envoie un par un
            for (const p of missingInApi) {
              try {
                // On s'assure que l'ID est présent, sinon l'API le générera (mais on veut garder l'ID local si possible)
                await apiService.createProject(p);
                successCount++;
              } catch (e) {
                console.error("Erreur migration projet:", p.id, e);
              }
            }

            // On recharge la liste définitive depuis l'API SEULEMENT si tout a réussi
            if (successCount === missingInApi.length) {
              const updatedApiProjects = await apiService.getProjects();
              setProjects(updatedApiProjects);
            } else {
              console.warn("Migration incomplète. Conservation du cache local pour éviter la perte de données.");
              // On ne fait rien, on garde les données locales chargées au démarrage
            }
          } else {
            // Pas de migration nécessaire, on prend la vérité serveur
            setProjects(apiProjects);
          }
        }
      } catch (err) {
        console.error("Failed to fetch projects from API:", err);
        setError(err);
        // Fallback sur LS (déjà chargé par useState)
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [setProjects]);

  // Écouter les changements du localStorage (sync entre onglets)
  useEffect(() => {
    const handleStorageChange = () => {
      const local = loadAllProjectsFromLS();
      _setProjects(local); // Use _setProjects to avoid triggering another save
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectsUpdated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectsUpdated', handleStorageChange);
    };
  }, []);

  /** Setter sécurisé */
  const setProject = useCallback((next) => {
    if (typeof next === "function") {
      _setProject((prev) => next(prev));
    } else {
      _setProject((prev) => ({ ...(prev || {}), ...(next || {}) }));
    }
  }, []);

  /** Mises à jour partielles (patch) */
  const updateProject = useCallback((patch) => {
    _setProject((prev) => ({ ...(prev || {}), ...(patch || {}) }));
  }, []);

  /** Sauvegarde (API + LS backup) */
  /** Sauvegarde (API + LS backup) */
  const saveProject = useCallback(async () => {
    if (!project) return;

    // 1. Sauvegarde optimiste dans LS
    const all = loadAllProjectsFromLS();
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

      // 2. Sauvegarde API
      // On tente d'abord l'API pour avoir la vérité terrain (et l'ID généré si création)
      if (!projectId || projectId === 'new') {
        // CREATION
        console.log("Creating new project via API...");
        const created = await apiService.createProject(project);
        console.log("Project created:", created);

        savedProject = { ...project, ...created }; // Récupère l'ID et les timestamps
        projectId = created.id;

        // Mise à jour du state local pour refléter l'ID serveur
        // Cela évite de recréer le projet au prochain 'save'
        setProject(prev => ({ ...prev, ...created }));
      } else {
        // UPDATE ou CREATION si inexistant (upsert)
        try {
          await apiService.updateProject(projectId, project);
        } catch (e) {
          // Fallback: si l'update échoue (ex: document supprimé ou inexistant), on le recrée
          console.warn("Update failed, trying create (upsert):", e);
          await apiService.createProject(project);
        }
      }

      // 3. Sauvegarde Contact (Best effort)
      try {
        const contactData = {
          name: [savedProject.firstName, savedProject.name].filter(Boolean).join(' ').trim() || 'Client sans nom',
          company: null,
          email: savedProject.email || null,
          phone: savedProject.phone || null,
          city: savedProject.city || null,
          status: savedProject.status || 'Nouveau',
          projectId: projectId,
        };

        const allContacts = await apiService.getContacts();
        const existingContact = allContacts.find(c => c.projectId === projectId);

        if (existingContact) {
          await apiService.updateContact(existingContact.id, contactData);
        } else {
          await apiService.createContact(contactData);
        }
      } catch (contactError) {
        console.error("Erreur sauvegarde contact (non-bloquant):", contactError);
      }

      // 4. Mise à jour du Cache Local (LS) et Liste
      // On recharge la liste officielle depuis le serveur pour être sûr
      const refreshedProjects = await apiService.getProjects();
      setProjects(refreshedProjects);
      saveAllProjectsToLS(refreshedProjects);

      // Feedback succès (si géré par le composant)
      return savedProject;

    } catch (err) {
      console.error("CRITICAL API SAVE FAILURE:", err);
      // On propage l'erreur pour que l'UI puisse afficher un toast d'erreur
      throw err;
    }
  }, [project, setProject]);

  const value = useMemo(
    () => ({
      projects,
      setProjects,
      project,
      setProject,
      updateProject,
      saveProject, // Nouvelle méthode unifiée
      saveProjectToLS: saveProject, // Alias pour compatibilité
      loadAllProjects: loadAllProjectsFromLS,
      loading,
      error
    }),
    [projects, project, setProject, updateProject, saveProject, loading, error]
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