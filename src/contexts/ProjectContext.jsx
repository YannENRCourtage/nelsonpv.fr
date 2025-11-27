import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { apiService } from "../services/api";

/** Clef LS commune (liste projets) */
const LS_KEY = "nelson:projects:v1";

/* Utils LS */
function loadAllProjectsFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllProjectsToLS(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('projectsUpdated'));
  } catch { }
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
  const [projects, setProjects] = useState(() => loadAllProjectsFromLS());
  const [project, _setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les projets depuis l'API au montage
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const apiProjects = await apiService.getProjects();
        if (Array.isArray(apiProjects)) {
          setProjects(apiProjects);
          // Sync LS pour backup
          saveAllProjectsToLS(apiProjects);
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
  }, []);

  // Écouter les changements du localStorage (sync entre onglets)
  useEffect(() => {
    const handleStorageChange = () => {
      const local = loadAllProjectsFromLS();
      setProjects(local);
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
  const saveProject = useCallback(async () => {
    if (!project || !project.id) return;

    // 1. Sauvegarde optimiste dans LS
    const all = loadAllProjectsFromLS();
    const idx = all.findIndex((x) => x.id === project.id);
    const updatedProject = { ...project };
    if (idx >= 0) all[idx] = updatedProject;
    else all.push(updatedProject);
    saveAllProjectsToLS(all);
    setProjects(all);

    // 2. Sauvegarde API
    try {
      // Vérifier si le projet existe déjà (via GET ou liste)
      // Pour simplifier, on tente un GET. Si 404 -> CREATE, sinon UPDATE
      // Note: On pourrait optimiser en vérifiant la liste 'projects' mais elle peut être stale
      try {
        await apiService.getProject(project.id);
        // Si pas d'erreur, il existe -> UPDATE
        await apiService.updateProject(project.id, project);
      } catch (e) {
        // Si erreur (ex: 404), on suppose qu'il n'existe pas -> CREATE
        await apiService.createProject(project);
      }

      // Optionnel: Recharger la liste pour être sûr
      // const refreshed = await apiService.getProjects();
      // setProjects(refreshed);
    } catch (err) {
      console.error("API Save failed:", err);
      // Pas grave, on a le backup LS
    }
  }, [project]);

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