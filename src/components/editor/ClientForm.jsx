import React, { useEffect, useCallback } from 'react';
import React, { useEffect, useCallback, useState } from 'react';
import { useProject } from '../../contexts/ProjectContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ClientForm() {
  const { project, setProject, updateProject, saveProject } = useProject();
  const { user } = useAuth();

  // État pour la liste dynamique des utilisateurs
  const [usersList, setUsersList] = useState(['Yann', 'Elodie', 'Jack', 'Nicolas', 'Contact']);

  // Chargement des utilisateurs pour le menu déroulant
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // On tente de charger les utilisateurs depuis l'API
        const users = await import('../../services/api').then(m => m.apiService.getUsers().catch(() => []));

        // On formate pour avoir juste les noms/prénoms
        const formattedUsers = users.map(u => u.firstName || u.displayName || u.email.split('@')[0]);

        // On fusionne avec la liste par défaut (en ajoutant Elodie qui manquait)
        const uniqueUsers = [...new Set(['Yann', 'Elodie', 'Jack', 'Nicolas', 'Contact', ...formattedUsers])].filter(Boolean);
        setUsersList(uniqueUsers);
      } catch (err) {
        console.warn("Impossible de charger les utilisateurs", err);
        // Fallback déjà géré par l'état initial
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (user && project) {
      const updates = {};
      let hasUpdates = false;

      // 1. Initialiser l'Utilisateur par défaut
      if (!project.user) {
        // Pseudo-automapper : On essaie de trouver le prénom de l'user connecté dans la liste
        // On nettoie le nom (ex: "Jack LLC" -> "Jack")
        const currentName = user.firstName || user.displayName || user.name || '';
        const nameToMatch = currentName.split(' ')[0]; // Prend le premier mot (Prénom)

        // Recherche insensible à la casse
        const match = usersList.find(u => u && u.toLowerCase() === nameToMatch.toLowerCase());

        // Logique de priorité : Match > Nom exact > Contact
        let defaultUser = match || 'Contact';

        // Cas spécifiques si nécessaire (ex: si admin connecté mais pas dans la liste courante, on le force ?)
        // Pour l'instant on reste sur la liste prédéfinie + API

        updates.user = defaultUser;
        updates.createdByFirstName = defaultUser;
        hasUpdates = true;
      }

      // 2. Initialiser le Statut par défaut
      if (!project.status) {
        updates.status = 'Nouveau';
        hasUpdates = true;
      }

      if (hasUpdates) {
        updateProject(updates);
      }
    }
  }, [user, project, updateProject, usersList]);

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
              value={p.user || ''}
              onChange={(e) => handleChange('user', e.target.value)}
              onFocus={preventAutoScroll}
            >
              <option value="" disabled>Choisir un utilisateur</option>
              {usersList.map((u, index) => (
                <option key={index} value={u}>{u}</option>
              ))}
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
          <div className="pe_clientUser">
            <label>Utilisateur</label>
            <select
              value={p.user || ''}
              onChange={(e) => handleChange('user', e.target.value)}
              className="pe_userSelect"
            >
              <option value="" disabled>Sélectionner...</option>
              {usersList.map((u, index) => (
                <option key={index} value={u}>{u}</option>
              ))}
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