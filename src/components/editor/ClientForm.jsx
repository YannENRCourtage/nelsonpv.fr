import React, { useEffect, useCallback } from 'react';
import React, { useEffect, useCallback, useState } from 'react';
import { useProject } from '../../contexts/ProjectContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ClientForm() {
  const { project, setProject, updateProject, saveProject } = useProject();
  const { user } = useAuth();

  // État pour la liste dynamique des utilisateurs
  const [usersList, setUsersList] = useState([]);

  // Chargement des utilisateurs pour le menu déroulant
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // On suppose que l'API expose getUsers (ce qui est le cas pour les admins, 
        // mais on va assumer que l'utilisateur courant peut voir la liste simplifiée ou que l'API le permet)
        // Note: Si getUsers est restreint aux admins, il faudra peut-être une méthode listPublicUsers ou similaire.
        // Pour l'instant on tente apiService.getUsers(). Si ça échoue, on fallback sur une liste par défaut + current.
        const users = await import('../../services/api').then(m => m.apiService.getUsers().catch(() => []));

        // On formate pour avoir juste les noms/prénoms
        const formattedUsers = users.map(u => u.firstName || u.displayName || u.email.split('@')[0]);

        // On ajoute "Contact" et les valeurs par défaut au cas où la liste soit vide
        const uniqueUsers = [...new Set(['Yann', 'Nicolas', 'Jack', 'Contact', ...formattedUsers])];
        setUsersList(uniqueUsers);
      } catch (err) {
        console.warn("Impossible de charger les utilisateurs", err);
        setUsersList(['Yann', 'Nicolas', 'Jack', 'Contact']);
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
        // Logique de matching : Si c'est contact@..., on met 'Contact', sinon le prénom s'il est dans la liste, sinon 'Contact' par défaut
        const userFirstName = user.firstName || user.displayName?.split(' ')[0] || user.name || '';
        // Recherche insensible à la casse
        const match = usersList.find(u => u.toLowerCase() === userFirstName.toLowerCase());

        // Si l'utilisateur connecté est dans la liste, on le sélectionne. 
        // Sinon si c'est le compte générique contact..., on met 'Contact'
        const defaultUser = match
          ? match
          : (user.email === 'contact@enr-courtage.fr' ? 'Contact' : (match || 'Contact'));

        updates.user = defaultUser;
        updates.createdByFirstName = defaultUser; // On garde la cohérence
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
              {USERS_LIST.map(u => (
                <option key={u} value={u}>{u}</option>
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