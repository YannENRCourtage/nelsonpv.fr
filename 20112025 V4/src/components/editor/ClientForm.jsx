import React, { useEffect, useCallback } from 'react';
import { useProject } from '../../contexts/ProjectContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

const LS_KEY_PREFIX = "nelson:projects:v1";

function saveProjectToLS(projectToSave) {
  if (!projectToSave || !projectToSave.id) return;
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY_PREFIX) || '[]');
    const i = all.findIndex(p => p.id === projectToSave.id);
    if (i > -1) all[i] = projectToSave; else all.push(projectToSave);
    localStorage.setItem(LS_KEY_PREFIX, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to save project to localStorage", e);
  }
}

export default function ClientForm() {
  const { project, setProject, updateProject } = useProject();
  const { user } = useAuth();

  useEffect(() => {
    if (user && project && !project.user) {
      updateProject({ user: user.name });
    }
  }, [user, project, updateProject]);

  const debounce = (fn, delay) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };
  const debouncedSave = useCallback(debounce(saveProjectToLS, 500), []);

  useEffect(() => {
    if (project) debouncedSave(project);
  }, [project, debouncedSave]);

  const handleChange = (key, value) => {
    updateProject({ [key]: value });
  };
  const handleNestedChange = (parentKey, childKey, value) => {
    setProject((prev) => ({
      ...(prev || {}),
      [parentKey]: { ...(prev?.[parentKey] || {}), [childKey]: value }
    }));
  };

  const p = project || {};
  const client = p.client || {};

  return (
    <div className="pe_clientCard">
      <div className="pe_clientHeader">
        <div>
          <h2>Client & Projet</h2>
          <p className="pe_subtitle">Infos client, projet et localisation.</p>
        </div>
        <div className="pe_clientStatus">
          <div className="pe_field">
            <label>Statut</label>
            <select value={p.status || 'En cours'} onChange={(e) => handleChange('status', e.target.value)}>
              <option>En cours</option>
              <option>Terminé</option>
              <option>Annulé</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="pe_field">
            <label>Nom*</label>
            <input
              placeholder="Nom"
              value={client.lastName || ''}
              onChange={(e) => handleNestedChange('client', 'lastName', e.target.value)}
            />
          </div>
          <div className="pe_field">
            <label>Prénom</label>
            <input
              placeholder="Prénom"
              value={client.firstName || ''}
              onChange={(e) => handleNestedChange('client', 'firstName', e.target.value)}
            />
          </div>
          <div className="pe_field">
            <label>Téléphone</label>
            <input
              placeholder="Téléphone"
              value={client.phone || ''}
              onChange={(e) => handleNestedChange('client', 'phone', e.target.value)}
            />
          </div>
          <div className="pe_field">
            <label>Email</label>
            <input
              placeholder="Email"
              value={client.email || ''}
              onChange={(e) => handleNestedChange('client', 'email', e.target.value)}
            />
          </div>
        </div>

        <div className="pe_field pe_field--full">
          <label>Adresse du projet</label>
          <input
            placeholder="Adresse du projet"
            value={p.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="pe_field">
            <label>Code postal</label>
            <input
              placeholder="Code postal"
              value={p.zip || ''}
              onChange={(e) => handleChange('zip', e.target.value)}
            />
          </div>
          <div className="pe_field">
            <label>Ville</label>
            <input
              placeholder="Ville"
              value={p.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}