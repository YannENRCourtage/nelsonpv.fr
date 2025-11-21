import React, { useState, useEffect } from "react";
import { toast } from '../ui/use-toast.js';
import { Button } from '../ui/button.jsx';

const LS_BUILDING_PRESETS = 'nelson:building_presets:v1';

const getDefaultPresets = () => [
  { id: 1, name: 'Maison', length: 15, width: 10 },
  { id: 2, name: 'Hangar', length: 40, width: 20 },
  { id: 3, name: 'Atelier', length: 25, width: 15 },
];

export const loadPresets = () => {
    try {
        const stored = localStorage.getItem(LS_BUILDING_PRESETS);
        if (stored) return JSON.parse(stored);
    } catch {}
    return getDefaultPresets();
};

export const savePresets = (presets) => {
    localStorage.setItem(LS_BUILDING_PRESETS, JSON.stringify(presets));
};

export default function BuildingForm() {
  const [presets] = useState(loadPresets);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [length, setLength] = useState(45);
  const [width, setWidth] = useState(28);

  useEffect(() => {
    if (selectedPresetId) {
        const selected = presets.find(p => p.id.toString() === selectedPresetId);
        if (selected) {
            setLength(selected.length);
            setWidth(selected.width);
        }
    }
  }, [selectedPresetId, presets]);
  
  const placeCustom = () => {
    window.dispatchEvent(
      new CustomEvent("map:tool-request", {
        detail: { tool: 'building', building: { length, width } },
      })
    );
    toast({
        title: "Mode dessin activé",
        description: "Dessinez le rectangle du bâtiment sur la carte."
    });
  };

  return (
    <>
      <h3>Bâtiments</h3>
      <div className="space-y-4">
        <div className="pe_field">
          <label>Prédéfini</label>
          <select value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
            <option value="">Choisir un bâtiment...</option>
            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="pe_field">
                <label>Longueur (m)</label>
                <input type="number" value={length} onChange={(e) => setLength(Number(e.target.value || 0))} className="w-full p-2 border rounded"/>
            </div>
            <div className="pe_field">
                <label>Largeur (m)</label>
                <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value || 0))} className="w-full p-2 border rounded"/>
            </div>
        </div>

        <Button onClick={placeCustom} className="w-full text-white font-semibold py-2 px-4 rounded-lg" style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}>
            Placer Bâtiment Personnalisé
        </Button>
      </div>
    </>
  );
}