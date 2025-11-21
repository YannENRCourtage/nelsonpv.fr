import React, { useState } from 'react';
import { Search, Filter, Import, Upload, Plus, MoreHorizontal, ChevronDown, ChevronRight, Mail, Phone, User } from 'lucide-react';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Checkbox } from './ui/checkbox.jsx';
import './CRM.css'; // Nous allons créer ce fichier

// Données statiques pour l'exemple
const crmData = {
  prospects: [
    { id: 'p1', entreprise: 'Solar Corp', contact: 'Jean Solaire', email: 'jean@solarcorp.fr', status: 'Prospect', projet: 'Toiture 500m²', utilisateur: 'Yann' },
  ],
  clients: [
    { id: 'c1', entreprise: 'Eco Bâtiment', contact: 'Marie Vert', email: 'marie@ecobat.fr', status: 'Client', projet: 'PV 100kWc', utilisateur: 'Nico' },
    { id: 'c2', entreprise: 'Futur Energie', contact: 'Paul Avenir', email: 'paul@futur.fr', status: 'Abandonné', projet: 'Étude faisabilité', utilisateur: 'Jack' },
  ],
};

// Couleurs pour les statuts
const statusColors = {
  'Prospect': 'bg-yellow-400 text-yellow-900',
  'Client': 'bg-green-500 text-white',
  'Abandonné': 'bg-red-600 text-white',
};

// Couleurs pour les utilisateurs
const userColors = {
  'Yann': 'bg-blue-500 text-white',
  'Nico': 'bg-purple-500 text-white',
  'Jack': 'bg-pink-500 text-white',
};

// Ligne de la table
function CrmRow({ item, columns }) {
  return (
    <div className="crm-table-row">
      <div className="crm-cell crm-cell-checkbox">
        <Checkbox />
        <MoreHorizontal className="h-4 w-4 text-gray-400" />
      </div>
      {columns.map(col => (
        <div key={col.key} className={`crm-cell crm-cell-${col.key}`}>
          {col.key === 'entreprise' && (
            <>
              <User className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="font-medium truncate">{item[col.key]}</span>
            </>
          )}
          {col.key === 'email' && (
            <>
              <Mail className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="truncate">{item[col.key]}</span>
            </>
          )}
          {col.key === 'contact' && (
            <>
              <Phone className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="truncate">{item[col.key]}</span>
            </>
          )}
          {col.key === 'status' && (
            <span className={`crm-status ${statusColors[item[col.key]] || 'bg-gray-200 text-gray-800'}`}>
              {item[col.key]}
            </span>
          )}
          {col.key === 'utilisateur' && (
            <span className={`crm-user ${userColors[item[col.key]] || 'bg-gray-200 text-gray-800'}`}>
              {item[col.key]}
            </span>
          )}
          {col.key !== 'entreprise' && col.key !== 'email' && col.key !== 'contact' && col.key !== 'status' && col.key !== 'utilisateur' && (
            <span className="truncate">{item[col.key]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Groupe de la table (ex: Prospects, Clients)
function CrmGroup({ title, items, columns, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="crm-group">
      <div className="crm-group-header" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        <h3 className="font-semibold text-lg">{title}</h3>
        <span className="text-sm text-gray-500">{items.length}</span>
      </div>
      {isOpen && (
        <div className="crm-group-content">
          {items.map(item => (
            <CrmRow key={item.id} item={item} columns={columns} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CRM() {
  // Définition des colonnes
  const columns = [
    { key: 'entreprise', label: 'Entreprise' },
    { key: 'contact', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Statut' },
    { key: 'projet', label: 'Projet' },
    { key: 'utilisateur', label: 'Utilisateur' },
  ];

  return (
    <div className="max-w-full mx-auto p-4 sm:p-6 lg:p-8 bg-white h-full">
      {/* Barre d'outils du haut */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Rechercher..." className="pl-9" />
          </div>
          <Button variant="outline" className="text-gray-700">
            <Filter className="h-4 w-4 mr-2" /> Filtrer
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-gray-700">
            <Import className="h-4 w-4 mr-2" /> Importer
          </Button>
          <Button variant="outline" className="text-gray-700">
            <Upload className="h-4 w-4 mr-2" /> Exporter
          </Button>
        </div>
      </div>

      {/* Table CRM */}
      <div className="crm-table">
        {/* En-tête de la table */}
        <div className="crm-table-header">
          <div className="crm-cell crm-cell-checkbox">
            <Checkbox />
          </div>
          {columns.map(col => (
            <div key={col.key} className={`crm-cell crm-cell-${col.key}`}>
              <span>{col.label}</span>
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
          ))}
        </div>

        {/* Groupes de données */}
        <CrmGroup title="Prospects" items={crmData.prospects} columns={columns} defaultOpen={true} />
        <CrmGroup title="Clients" items={crmData.clients} columns={columns} defaultOpen={true} />
      </div>
    </div>
  );
}