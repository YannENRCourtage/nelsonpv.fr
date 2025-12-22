import React, { useEffect, useCallback } from 'react';
import { useProject } from '../../contexts/ProjectContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ClientForm() {
  const { project, setProject, updateProject, saveProject } = useProject();
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
  // Utiliser saveProject du contexte au lieu de la fonction locale
  const debouncedSave = useCallback(debounce(saveProject, 1000), [saveProject]);

  useEffect(() => {
    if (project) debouncedSave();
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
            <select value={p.status || 'En cours'} onChange={(e) => handleChange('status', e.target.value)} onFocus={preventAutoScroll}>
              <option>En cours</option>
              <option>Terminé</option>
              <option>Annulé</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* --- CHAMPS CLIENT --- */}
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

        <hr />

        {/* --- CHAMPS PROJET (AJOUTÉS POUR LE PDF) --- */}
        <div className="grid grid-cols-2 gap-4">
          <div className="pe_field">
            <label>Nom du projet (Client)</label>
            <input
              placeholder="Ex: BARBERIS"
              value={p.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}

            />
          </div>
          <div className="pe_field">
            <label>Type de projet</label>
            <input
              placeholder="Ex: Construction"
              value={p.projectType || ''}
              onChange={(e) => handleChange('projectType', e.target.value)}

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
          <div className="pe_field">
            <label>Parcelle cadastrale</label>
            <input
              placeholder="Ex: 24205 / AR / 0008"
              value={p.parcel || ''}
              onChange={(e) => handleChange('parcel', e.target.value)}

            />
          </div>
          <div className="pe_field">
            <label>GPS</label>
            <input
              placeholder="Ex: 44.83188, -0.571036"
              value={p.gps || ''}
              onChange={(e) => handleChange('gps', e.target.value)}

            />
          </div>
          <div className="pe_field">
            <label>Altitude</label>
            <input
              placeholder="Ex: 87.94 m"
              value={p.altitude || ''}
              onChange={(e) => handleChange('altitude', e.target.value)}

            />
          </div>
          <div className="pe_field">
            <label>Type de bâtiments</label>
            <input
              placeholder="Ex: S8.8 46x29.7m"
              value={p.buildingType || ''}
              onChange={(e) => handleChange('buildingType', e.target.value)}

            />
          </div>
        </div>

        {/* --- COMMENTAIRES --- */}
        <div className="pe_field pe_field--full">
          <label>Commentaires</label>
          <textarea
            placeholder="Commentaires pour le PDF..."
            rows={4}
            value={p.comments || ''}
            onChange={(e) => handleChange('comments', e.target.value)}

          />
        </div>

      </div>
    </div>
  );
}