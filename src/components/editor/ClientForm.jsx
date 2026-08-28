import React, { useEffect, useCallback, useState } from 'react';
import { useProject } from '../../contexts/ProjectContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { formatGps } from '@/utils/formatGps.js';

export default function ClientForm() {
  const { project, setProject, updateProject, saveProject } = useProject();
  const { user } = useAuth();

  // Calcul du prénom de l'utilisateur connecté pour affichage "en dur" (Lecture seule)
  const currentUserName = user?.firstName || user?.displayName?.split(' ')[0] || user?.name || 'Utilisateur';

  useEffect(() => {
    if (user && project) {
      const updates = {};
      let hasUpdates = false;

      // 1. Initialiser l'Utilisateur par défaut avec le compte connecté
      if (!project.user) {
        updates.user = currentUserName;
        updates.createdByFirstName = currentUserName;
        hasUpdates = true;
      }

      // 2. Initialiser le Statut par défaut
      // IMPORTANT: On force "Nouveau" si le champ est vide, null ou undefined
      if (!project.status || project.status === '') {
        updates.status = 'Nouveau';
        hasUpdates = true;
      }

      if (hasUpdates) {
        updateProject(updates);
      }
    }
  }, [user, project, updateProject, currentUserName]);

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

  // Helper function to prevent auto-scroll on select focus
  const preventAutoScroll = (e) => {
    e.target.blur();
    e.target.focus({ preventScroll: true });
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
            <select value={p.status || 'Nouveau'} onChange={(e) => handleChange('status', e.target.value)} onFocus={preventAutoScroll}>
              <option>Nouveau</option>
              <option>En cours</option>
              <option>Terminé</option>
              <option>Annulé</option>
            </select>
          </div>
          <div className="pe_field">
            <label>Utilisateur</label>
            <select
              value={p.user || currentUserName}
              onChange={(e) => handleChange('user', e.target.value)}
              onFocus={preventAutoScroll}
              className="w-full p-2 border rounded bg-white text-slate-900"
            >
              <option value="Yann">Yann</option>
              <option value="Elodie">Elodie</option>
              <option value="Jack">Jack</option>
              <option value="Nicolas">Nicolas</option>
              <option value="Contact">Contact</option>
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
            <select
              value={p.type || p.projectType || 'Construction'}
              onChange={(e) => {
                handleChange('type', e.target.value);
                handleChange('projectType', e.target.value);
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 h-10 bg-background font-medium"
            >
              <option value="Construction">Construction</option>
              <option value="Bâtiment">Bâtiment</option>
              <option value="Ombrières">Ombrières</option>
              <option value="BatiTech">BatiTech</option>
              <option value="Batterie SA">Batterie SA</option>
            </select>
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
            <label>Utilisateur</label>
            <select
              value={p.user || currentUserName}
              onChange={(e) => handleChange('user', e.target.value)}
              onFocus={preventAutoScroll}
              className="w-full p-2 border rounded bg-white text-slate-900"
            >
              <option value="Yann">Yann</option>
              <option value="Elodie">Elodie</option>
              <option value="Jack">Jack</option>
              <option value="Nicolas">Nicolas</option>
              <option value="Contact">Contact</option>
            </select>
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
              placeholder="Ex: 44.831880, -0.571036"
              value={formatGps(p.gps) || ''}
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