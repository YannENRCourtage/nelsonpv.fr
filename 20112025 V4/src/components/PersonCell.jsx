// src/components/PersonCell.jsx
import React, { useState, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Plus, Check, Palette, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const defaultColors = [
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399', '#2dd4bf',
  '#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#78716c'
];

/**
 * Affiche/édite l'utilisateur dans une cellule de tableau.
 * Rendu centré : on affiche uniquement le PRÉNOM (1er mot).
 */
export default function PersonCell({
  value,                         // string: nom complet actuel (ex: "Yann Barberis")
  onChange,                      // (newName:string) => void
  availablePeople = [],          // [{name, color, photoUrl}]
  onAvailablePeopleChange = () => {}
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonColor, setNewPersonColor] = useState(defaultColors[0]);

  // personne sélectionnée (si trouvée)
  const selectedPerson = useMemo(
    () => availablePeople.find(p => p.name === value) || null,
    [availablePeople, value]
  );

  // util : extraire le prénom (1er mot non-vide)
  const firstName = useMemo(() => {
    if (!value) return '';
    const parts = String(value).trim().split(/\s+/);
    return parts[0] || '';
  }, [value]);

  const handleStartEdit = (person) => {
    setEditingPerson(person);
    setNewPersonName(person.name);
    setNewPersonColor(person.color);
    setIsAdding(true);
  };

  const handleCancelEdit = () => {
    setEditingPerson(null);
    setIsAdding(false);
    setNewPersonName('');
    setNewPersonColor(defaultColors[0]);
  };

  const handleSavePerson = () => {
    if (!newPersonName.trim()) return;

    let updatedPeople;
    if (editingPerson) {
      // modification
      updatedPeople = availablePeople.map(p =>
        p.name === editingPerson.name ? { ...p, name: newPersonName, color: newPersonColor } : p
      );
    } else {
      // ajout
      if (availablePeople.some(p => p.name === newPersonName)) {
        // déjà présent → on se contente de sélectionner
        onChange(newPersonName);
        handleCancelEdit();
        return;
      }
      updatedPeople = [...availablePeople, { name: newPersonName, color: newPersonColor, photoUrl: null }];
    }

    onAvailablePeopleChange(updatedPeople);
    onChange(newPersonName);
    handleCancelEdit();
  };

  const PersonBadge = ({ person }) => {
    // Contenu centré, uniquement le PRÉNOM
    const fname = person?.name ? String(person.name).trim().split(/\s+/)[0] : '';
    return (
      <div
        className={cn(
          "w-full h-full px-2 truncate",
          "flex items-center justify-center text-center",
          "font-semibold text-sm text-white"
        )}
        style={{ backgroundColor: person?.color || '#cbd5e1' }}
        title={person?.name || ''}
      >
        {fname || ''}
      </div>
    );
  };

  const renderForm = () => (
    <div className="p-2 space-y-2">
      <Input
        placeholder="Nom complet (ex: Yann Barberis)"
        value={newPersonName}
        onChange={e => setNewPersonName(e.target.value)}
      />
      <div className="flex items-center gap-2 flex-wrap">
        {defaultColors.map(c => (
          <button
            key={c}
            onClick={() => setNewPersonColor(c)}
            className={cn(
              "w-6 h-6 rounded-full border",
              newPersonColor === c && "ring-2 ring-offset-2 ring-blue-500"
            )}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        <label className="ml-2 inline-flex items-center gap-2 text-sm cursor-pointer">
          <Palette size={16} />
          <input
            type="color"
            value={newPersonColor}
            onChange={(e) => setNewPersonColor(e.target.value)}
            className="h-6 w-10 p-0 border rounded"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSavePerson}><Check className="w-4 h-4 mr-1" /> Enregistrer</Button>
        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Annuler</Button>
      </div>
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Cellule cliquable : contenu tjrs centré */}
        <div className="w-full h-full cursor-pointer select-none">
          <PersonBadge person={selectedPerson || { name: value || '', color: '#cbd5e1' }} />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[220px]">
        <DropdownMenuLabel>Assigner un utilisateur</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availablePeople.map((p) => (
          <DropdownMenuItem
            key={p.name}
            onSelect={() => onChange(p.name)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span>{p.name}</span>
            </div>
            {p.name === value && <Check size={16} />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setIsAdding(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau…
        </DropdownMenuItem>
        {selectedPerson && (
          <DropdownMenuItem onSelect={() => handleStartEdit(selectedPerson)}>
            <Pencil className="mr-2 h-4 w-4" /> Modifier “{selectedPerson.name}”
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>

      {/* Petit “formulaire” d’ajout/édition */}
      {isAdding && (
        <div className="absolute z-[60] mt-2 bg-white border rounded shadow">
          {renderForm()}
        </div>
      )}
    </DropdownMenu>
  );
}