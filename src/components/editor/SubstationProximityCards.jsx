import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

// Haversine formula to calculate distance between two points in meters
const R = 6371000;
function toRad(d) { return (d * Math.PI) / 180; }

function haversine(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export default function SubstationProximityCards({ gps, isVisible }) {
  const [substations, setSubstations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Parse GPS string "lat, lng"
  const markerPos = useMemo(() => {
    if (!gps) return null;
    const parts = gps.split(',');
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  }, [gps]);

  // Fetch substation data
  useEffect(() => {
    if (!isVisible) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/datas/capareseau_map.json');
        if (!response.ok) throw new Error('Failed to load substation data');
        const data = await response.json();
        setSubstations(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching substations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isVisible]);

  // Calculate top 4 closest substations
  const closestSubstations = useMemo(() => {
    if (!markerPos || substations.length === 0) return [];

    return substations
      .map(s => {
        const dist = haversine(markerPos.lat, markerPos.lng, parseFloat(s.Y), parseFloat(s.X));
        return { ...s, distance: dist };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  }, [markerPos, substations]);

  if (!isVisible || !markerPos) return null;

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center gap-2 mb-3 text-slate-800">
        <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
        <h3 className="text-lg font-bold">Postes sources à proximité (Caparéseau)</h3>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {closestSubstations.map((s, idx) => {
          const vals = s.values || {};
          const na = parseFloat(vals.INFO_NA) || 0;
          const hasReste = na > 0;
          const qp = vals.INFO_QP || 'N/A';
          const reserved = vals.INFO_ESS3R || '0';
          const queue = vals.INFO_FAS3R || '0';

          return (
            <div 
              key={s.code || idx} 
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Status Dot */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                 <div 
                  className={cn(
                    "h-3 w-3 rounded-full shadow-sm",
                    hasReste ? "bg-green-500" : "bg-orange-500"
                  )} 
                  title={hasReste ? "Reste à affecter > 0" : "Reste à affecter = 0"}
                />
              </div>

              {/* Substation Header */}
              <div className="mb-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDistance(s.distance)}</div>
                <h4 className="font-bold text-slate-900 truncate pr-6" title={s.name}>{s.name}</h4>
              </div>

              {/* Values grid */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center pb-1 border-b border-slate-50">
                  <span className="text-slate-500">Quote part unitaire</span>
                  <span className="font-bold text-slate-800">{qp}</span>
                </div>
                <div className="flex justify-between items-center pb-1 border-b border-slate-50">
                  <span className="text-slate-500">Capacité réservée</span>
                  <span className="font-bold text-slate-800">{reserved} MW</span>
                </div>
                <div className="flex justify-between items-center pb-1 border-b border-slate-50">
                  <span className="text-slate-500">Reste à affecter</span>
                  <span className={cn("font-bold", hasReste ? "text-green-600" : "text-orange-600")}>
                    {na} MW
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Fil d'attente</span>
                  <span className="font-bold text-slate-800">{queue} MW</span>
                </div>
              </div>
            </div>
          );
        })}

        {closestSubstations.length === 0 && !loading && !error && (
          <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 font-medium">
            Aucun poste source détecté à proximité.
          </div>
        )}

        {error && (
          <div className="col-span-full py-4 text-center text-red-500 bg-red-50 rounded-xl border border-red-100 text-sm italic">
            Erreur lors du chargement des données : {error}
          </div>
        )}
      </div>
    </div>
  );
}
