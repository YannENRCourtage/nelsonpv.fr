import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Zap, ArrowRight, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { loadSubstationsDataset, haversineDistanceKm } from '@/services/capareseauService.js';

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

// Paliers normalisés de transformateurs HTA/BT pour le test rapide de faisabilité Caparéseau
const TEST_CALIBRES = [
  { kva: 250, label: '250 kVA' },
  { kva: 400, label: '400 kVA' },
  { kva: 630, label: '630 kVA' },
  { kva: 800, label: '800 kVA' },
  { kva: 1000, label: '1 000 kVA' },
  { kva: 1250, label: '1 250 kVA' },
  { kva: 2500, label: '2 500 kVA' },
];

export default function SubstationProximityCards({ gps, isVisible }) {
  const [substations, setSubstations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTestKva, setSelectedTestKva] = useState(800); // 800 kVA par défaut

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

  // Chargement ultra-rapide des données Caparéseau avec cache partagé
  useEffect(() => {
    if (!isVisible) return;
    
    let isCancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await loadSubstationsDataset();
        if (!isCancelled) {
          setSubstations(data || []);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching substations:', err);
        if (!isCancelled) {
          setError(err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [isVisible]);

  // Calcul instantané des 4 postes sources RTE les plus proches
  const closestSubstations = useMemo(() => {
    if (!markerPos || substations.length === 0) return [];

    return substations
      .map(s => {
        const sLat = parseFloat(s.Y ?? s.lat);
        const sLng = parseFloat(s.X ?? s.lng);
        if (isNaN(sLat) || isNaN(sLng)) return null;
        const distKm = haversineDistanceKm(markerPos.lat, markerPos.lng, sLat, sLng);
        return { ...s, sLat, sLng, distance: distKm * 1000 };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  }, [markerPos, substations]);

  if (!isVisible || !markerPos) return null;

  return (
    <div className="mt-4 w-full">
      {/* Header avec Titre et Sélecteur rapide de test de faisabilité */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-slate-800">
          <div className="p-1.5 bg-orange-50 border border-orange-200 rounded-lg">
            <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              Postes sources à proximité (Caparéseau)
            </h3>
            <p className="text-[11px] text-slate-500">
              Capacités d'accueil HTA RTE / Enedis & Raccordement Transformateur
            </p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 ml-2" />}
        </div>

        {/* Sélecteur rapide de test de calibre */}
        <div className="flex items-center flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
            <span>Tester un calibre de transformateur :</span>
          </span>
          {TEST_CALIBRES.map((c) => {
            const isSelected = selectedTestKva === c.kva;
            return (
              <button
                key={c.kva}
                type="button"
                onClick={() => setSelectedTestKva(isSelected ? null : c.kva)}
                className={cn(
                  "px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-orange-500 text-white shadow-xs scale-102"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                )}
                title={`Vérifier la faisabilité d'un raccordement transfo ${c.label}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {closestSubstations.map((s, idx) => {
          const vals = s.values || {};
          const na = parseFloat(vals.INFO_NA ?? s.capMw) || 0;
          const hasReste = na > 0;
          const qp = vals.INFO_QP ?? s.quotePart ?? 'N/A';
          const reserved = vals.INFO_ESS3R ?? s.capReserveeMw ?? '0';
          const queue = vals.INFO_FAS3R ?? s.fileAttenteMw ?? '0';

          // Calculs d'ingénierie HTA
          // 1. Injection : directement issue de la capacité réservataire restante S3REnR (INFO_NA)
          const injectionMw = na;
          const injectionKva = Math.round(injectionMw * 1000);

          // 2. Soutirage (IRVE / BESS / Conso) : Capacité d'un départ HTA standard 20 kV (150A-250A)
          // Sur le poste source, la capacité de soutirage disponible est au minimum de 4.9 MW (limite départ standard)
          // et s'étend jusqu'à la puissance résiduelle du transformateur HTB/HTA
          const soutirageMw = na > 0 ? parseFloat(Math.max(4.9, na * 1.35).toFixed(1)) : 4.9;
          const soutirageKva = Math.round(soutirageMw * 1000);

          // 3. Faisabilité pour le calibre sélectionné
          let feasibility = null;
          if (selectedTestKva) {
            const testMw = selectedTestKva / 1000;
            const isDistanceOk = s.distance <= 20000; // Rayon max recommandé de 20 km en 20 kV (chute de tension < 5%)
            const isCapacityOk = selectedTestKva <= 250 || soutirageMw >= testMw;

            if (isCapacityOk && isDistanceOk) {
              feasibility = {
                type: 'ok',
                label: `✅ Raccordable (Transfo ${selectedTestKva >= 1000 ? `${(selectedTestKva / 1000).toFixed(1)} MW` : `${selectedTestKva} kVA`})`,
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-300'
              };
            } else if (isCapacityOk && !isDistanceOk) {
              feasibility = {
                type: 'warning',
                label: `⚠️ Transfo ${selectedTestKva} kVA : Éloignement (${formatDistance(s.distance)}) — Chute de tension HTA à valider`,
                bg: 'bg-amber-50 text-amber-800 border-amber-300'
              };
            } else {
              feasibility = {
                type: 'danger',
                label: `⚠️ Capacité insuffisante (< ${testMw} MW disponible)`,
                bg: 'bg-rose-50 text-rose-800 border-rose-300'
              };
            }
          }

          return (
            <div 
              key={s.code || idx} 
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Status Dot */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                   <div 
                    className={cn(
                      "h-3 w-3 rounded-full shadow-xs",
                      hasReste ? "bg-green-500" : "bg-orange-500"
                    )} 
                    title={hasReste ? "Reste à affecter S3REnR > 0" : "Reste à affecter S3REnR = 0"}
                  />
                </div>

                {/* Substation Header */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDistance(s.distance)}</div>
                  <h4 className="font-bold text-slate-900 truncate pr-6" title={s.name}>{s.name}</h4>
                </div>

                {/* 1. Les 4 lignes Caparéseau actuelles conservées */}
                <div className="space-y-1.5 text-xs pb-3 border-b border-slate-100">
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

                {/* 2. Section dédiée : Capacité Raccordement Transfo HTA (Soutirage & Injection) */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-700">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Capacité Transfo HTA</span>
                  </div>

                  {/* Puissance Max Raccordable (Soutirage & Injection) */}
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 font-medium">Puissance Max (Soutirage) :</span>
                      <span className="font-extrabold font-mono text-sky-700">
                        {soutirageMw.toFixed(1)} MW / {soutirageKva.toLocaleString('fr-FR')} kVA
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 font-medium">Puissance Max (Injection) :</span>
                      <span className={cn("font-extrabold font-mono", hasReste ? "text-emerald-700" : "text-slate-500")}>
                        {hasReste 
                          ? `${injectionMw.toFixed(1)} MW / ${injectionKva.toLocaleString('fr-FR')} kVA` 
                          : '0 kVA (Saturé)'}
                      </span>
                    </div>

                    {/* Calibre Transfo Max Recommandé (NF C 13-100) */}
                    <div className="pt-1 border-t border-slate-200/80 text-[10px] text-slate-600 leading-tight">
                      <span className="font-semibold text-slate-700">Calibre max recommandé : </span>
                      <span>Jusqu'à 1 000 / 1 250 kVA en coupure d'artère</span>
                      <span className="text-slate-400 block text-[9.5px] mt-0.5">
                        (Départ direct Poste Source requis &gt; 3 600 kVA)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Badge de faisabilité rapide selon calibre sélectionné */}
              {feasibility && (
                <div className={cn("mt-3 p-2 rounded-lg border text-[10.5px] font-bold text-center leading-snug", feasibility.bg)}>
                  {feasibility.label}
                </div>
              )}
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
