import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

/** Clef LS commune (liste projets) */
const LS_KEY = "nelson:projects:v1";

/* Utils LS */
function loadAllProjects() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveAllProjects(list) {
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
  saveProjectToLS: () => { },
  loadAllProjects,
});

/**
 * Provider unique :
 * - page Projets (liste)  => projects
 * - page Client & Projet  => project + updateProject
 */
export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState(() => loadAllProjects());
  const [project, _setProject] = useState(null);

  /** Setter sécurisé :
   *  - si on passe une fonction -> on laisse faire (API React)
   *  - si on passe un objet -> on MERGE avec l’état courant (et pas de remplacement sauvage)
   */
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

  /** Sauvegarde locale */
  const saveProjectToLS = useCallback(() => {
    if (!project || !project.id) return;
    const all = loadAllProjects();
    const idx = all.findIndex((x) => x.id === project.id);
    const updatedProject = { ...project };
    if (idx >= 0) all[idx] = updatedProject;
    else all.push(updatedProject);
    saveAllProjects(all);
    setProjects(all);
  }, [project]);

  const value = useMemo(
    () => ({
      projects,
      setProjects,
      project,
      setProject,      // <- safe setter (merge)
      updateProject,   // <- patch helper
      saveProjectToLS,
      loadAllProjects,
    }),
    [projects, project, setProject, updateProject, saveProjectToLS]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

/** Hooks */
export function useProjects() {
  return useContext(ProjectContext);
}
export function useProject() {
  const { project, updateProject, saveProjectToLS, setProject } = useContext(ProjectContext);
  return { project, updateProject, saveProjectToLS, setProject };
}