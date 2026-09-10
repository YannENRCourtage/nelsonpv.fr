// src/components/solar/GoogleSolarPanel.jsx
import React, { useState } from 'react';
import { Loader2, CloudSun, Edit, SquarePen } from 'lucide-react';
import { getBuildingInsights, selectBestRoofSegment, boundingBoxToPolygon } from '@/services/googleSolar';
import { toast } from '@/components/ui/use-toast';

/**
 * Reusable panel used in ProjectEditor and Simulator.
 * Props:
 *   gps: string "lat, lng" – location of the site.
 *   onSolarDetected: ({ slope, azimuth, polygon }) => void – called when a segment is selected.
 *   onDrawMode: () => void – asks the map to enable manual drawing.
 *   onSquare: (squaredPolygon) => void – called after squaring.
 *   activePolygon: array of {lat,lng} – current roof polygon (if any).
 */
export default function GoogleSolarPanel({
  gps,
  onSolarDetected,
  onDrawMode,
  onSquare,
  activePolygon,
}) {
  const [loading, setLoading] = useState(false);
  const [detected, setDetected] = useState(null); // { slope, azimuth, polygon }

  const handleDetect = async () => {
    if (!gps) {
      toast({ title: 'Coordonnées manquantes', description: 'Veuillez d\'abord saisir une adresse valide.', variant: 'destructive' });
      return;
    }
    const [latStr, lngStr] = gps.split(',').map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast({ title: 'Coordonnées invalides', description: 'Le format GPS doit être "lat, lng".', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const data = await getBuildingInsights(lat, lng);
      const segment = selectBestRoofSegment(data.roofSegmentSummaries || []);
      if (!segment) {
        toast({ title: 'Aucun segment détecté', description: 'Google Solar n\'a trouvé aucune surface exploitable.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const polygon = boundingBoxToPolygon(segment.boundingBox);
      const slope = segment.pitchDegrees;
      const azimuth = segment.azimuthDegrees;
      const result = { slope, azimuth, polygon };
      setDetected(result);
      toast({ title: 'Détection réussie', description: `Inclinaison ${slope}°, azimut ${azimuth}°` });
      if (onSolarDetected) onSolarDetected(result);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur Google Solar', description: err.message || 'Erreur inconnue', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSquare = () => {
    if (!activePolygon || activePolygon.length < 4) {
      toast({ title: 'Polygone manquant', description: 'Dessinez d\'abord un polygone de toiture.', variant: 'destructive' });
      return;
    }
    // Dynamically import to avoid bundling heavy code if never used
    import('@/utils/squarePolygon').then(({ squarePolygon }) => {
      const squared = squarePolygon(activePolygon);
      toast({ title: 'Optimisation appliquée', description: 'Les angles ont été arrondis à 90°.' });
      if (onSquare) onSquare(squared);
    }).catch((e) => {
      console.error(e);
      toast({ title: 'Erreur', description: 'Impossible d\'appliquer l\'optimisation.', variant: 'destructive' });
    });
  };

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-md bg-white shadow-sm">
      <div className="flex items-center gap-2">
        <CloudSun className="w-5 h-5 text-yellow-600" />
        <span className="font-medium">Détection 3D Auto (Google Solar)</span>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleDetect}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lancer la détection'}
      </button>
      {detected && (
        <div className="text-sm text-gray-700 mt-2">
          Inclinaison: <strong>{detected.slope}°</strong> – Azimut: <strong>{detected.azimuth}°</strong>
        </div>
      )}
      <hr className="my-2" />
      <div className="flex items-center gap-2">
        <Edit className="w-5 h-5 text-indigo-600" />
        <span className="font-medium">Tracer manuellement</span>
      </div>
      <button
        type="button"
        onClick={onDrawMode}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        <Edit className="w-4 h-4" /> Dessiner le polygone
      </button>
      <hr className="my-2" />
      <div className="flex items-center gap-2">
        <SquarePen className="w-5 h-5 text-green-600" />
        <span className="font-medium">Optimiser les angles (90°)</span>
      </div>
      <button
        type="button"
        onClick={handleSquare}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
      >
        <SquarePen className="w-4 h-4" /> Appliquer le squaring
      </button>
    </div>
  );
}
