import React, { useState, useEffect, useRef } from 'react';
import {
  BatteryCharging, Sparkles, MapPin, Search, CheckCircle2,
  FileText, Euro, ShieldCheck, Download, Mail, Building, Zap,
  Layers, Navigation, ExternalLink, Copy, Check, ArrowLeft, Edit2
} from 'lucide-react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { toast } from '@/components/ui/use-toast.js';
import AutomaticBessProspectingModal from './AutomaticBessProspectingModal.jsx';
import BessAddressSearchPanel from './BessAddressSearchPanel.jsx';
import HTALayerEnedis from './HTALayerEnedis.jsx';
import { generateBessProspectingPdfBlob } from './BessPDFGenerator.jsx';
import { fetchCadastralParcel } from '@/services/bessProspectingGisService.js';

// ─── RECENTRAGE AUTOMATIQUE DE LA CARTE ─────────────────────────────────────────
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && !isNaN(Number(center[0])) && !isNaN(Number(center[1]))) {
      map.setView(center, 18, { animate: true });
      const t = setTimeout(() => {
        map.invalidateSize();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [center?.[0], center?.[1], map]);
  return null;
}

// ─── REDIMENSIONNEMENT AUTOMATIQUE LEAFLET ─────────────────────────────────────
function MapAutoResize() {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t);
    };
  }, [map]);
  return null;
}

// ─── ICÔNE DU MARQUEUR DE L'ADRESSE DU PROJET (PIN BLEU SANS TEXTE, DÉPLAÇABLE) ────────
const createAddressMarkerIcon = () => {
  return L.divIcon({
    className: 'bess-address-pin',
    html: `
      <div style="
        position: relative;
        width: 30px;
        height: 40px;
        cursor: grab;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
        transition: transform 0.1s ease;
      " title="Déplacer ce marqueur sur la carte">
        <svg viewBox="0 0 24 32" width="30" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="11" r="4.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });
};

export default function BessSimulator({ selectedProject, onStateUpdate, onSaveSimulation, onExportPDF }) {
  const [isAutomateOpen, setIsAutomateOpen] = useState(false);
  const [isAddressSearchActive, setIsAddressSearchActive] = useState(false);
  const [showHtaLines, setShowHtaLines] = useState(true);
  const [htaCounts, setHtaCounts] = useState({ aerienCount: 0, souterrainCount: 0, postesCount: 0 });
  const [mapLayerType, setMapLayerType] = useState('satellite'); // 'satellite' | 'osm'

  // Site par défaut : SCI DC (Département 10, Torcy-le-Grand / La Rivière-de-Corps, Image 5)
  const [selectedSite, setSelectedSite] = useState({
    name: 'Centrale BESS — La Rivière-de-Corps',
    address: '77, AV GENERAL LECLERC',
    commune: 'La Rivière-de-Corps',
    postalCode: '10210',
    departement: '10',
    lat: 48.2893154,
    lng: 4.0019689,
    parcelId: '103210000A0237',
    section: '0A',
    numero: '0237',
    distSouterrain: 1.1,
    distAerien: 844.9,
    transfoDistance: null,
    nearestTransfoName: null,
    parcelGeometry: null,
    ownerName: 'SCI DC',
    loyerAnnuel: 2000,
    dureeBail: 20,
    surface: 20,
    puissance: 500,
    capacite: 1044
  });

  const [includeBrochure, setIncludeBrochure] = useState(true);

  // Charger la géométrie de la parcelle si manquante
  useEffect(() => {
    if (selectedSite?.lat && selectedSite?.lng && !selectedSite?.parcelGeometry) {
      fetchCadastralParcel(selectedSite.lat, selectedSite.lng).then((p) => {
        if (p && p.geometry) {
          setSelectedSite((prev) => ({
            ...prev,
            parcelGeometry: p.geometry,
            section: prev.section || p.section,
            numero: prev.numero || p.numero,
            parcelId: prev.parcelId || p.idu
          }));
        }
      });
    }
  }, [selectedSite?.lat, selectedSite?.lng]);

  // Synchronisation avec l'état global du simulateur
  useEffect(() => {
    if (onStateUpdate && selectedSite) {
      onStateUpdate({
        type: 'bess',
        title: `Centrale BESS 500 kW / 1 044 kWh — ${selectedSite.name}`,
        address: selectedSite.address,
        cityName: selectedSite.commune,
        departement: selectedSite.departement,
        power: 500,
        loyerAnnuel: selectedSite.loyerAnnuel,
        dureeBail: selectedSite.dureeBail,
        surfaceEmprise: selectedSite.surface,
        parcelId: selectedSite.parcelId,
        ownerName: selectedSite.ownerName,
        includeBrochure
      });
    }
  }, [selectedSite, includeBrochure, onStateUpdate]);

  const [copiedField, setCopiedField] = useState(null); // 'address' | 'gps' | 'legend-gps'

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({
      title: fieldName === 'address' ? 'Adresse copiée !' : fieldName.includes('gps') ? 'Coordonnées GPS copiées !' : 'Copié !',
      description: text,
      duration: 2000
    });
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldName ? null : curr));
    }, 2000);
  };

  const handleDownloadPdf = async () => {
    const { blob, filename } = await generateBessProspectingPdfBlob({
      nom_societe: selectedSite.ownerName,
      nom: '',
      adresse_ligne1: selectedSite.address,
      code_postal: selectedSite.postalCode,
      ville: selectedSite.commune,
      nomCommune: selectedSite.commune,
      lat: selectedSite.lat,
      lng: selectedSite.lng,
      coords: selectedSite.lat && selectedSite.lng ? [selectedSite.lat, selectedSite.lng] : null,
      parcelId: selectedSite.parcelId,
      section: selectedSite.section,
      numero: selectedSite.numero,
      parcelGeometry: selectedSite.parcelGeometry,
      distSouterrain: selectedSite.distSouterrain,
      distAerien: selectedSite.distAerien
    }, { includeBrochure });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const centerCoords = [selectedSite.lat || 48.2893, selectedSite.lng || 4.0020];

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 max-h-[calc(100vh-140px)] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl p-3 sm:p-4 text-slate-100">

      {/* ─── 1. HEADER COMPACT (HAUTEUR FIXE SANS SCROLL) ────────────────────── */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <BatteryCharging className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                Batteries de Soutien Réseau BESS
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                HTA Sol
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                2 000 €/an • 20 m² • 20 ans
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Détection Enedis des postes au sol raccordés en souterrain &bull; Foncier &bull; Courrier AFNOR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddressSearchActive(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="Saisir une nouvelle adresse manuellement"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Saisir une nouvelle adresse</span>
            <span className="sm:hidden">Nouvelle adresse</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAutomateOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Ouvrir l'automate de sourcing de transformateurs Enedis"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black shrink-0" />
            <span className="hidden md:inline">Automate BESS (Transfos Sol)</span>
            <span className="md:hidden">Automate BESS</span>
          </button>
        </div>
      </div>

      {/* ─── 2. CORPS EN 2 COLONNES : CARTES À GAUCHE + CARTE DU TRANSFO À DROITE ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 overflow-hidden">

        {/* COLONNE GAUCHE (5 colonnes) : INFORMATIONS ET BAILLEUR QUALIFIÉ OU ÉCRAN DE SAISIE */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto pr-1">

          {isAddressSearchActive ? (
            <BessAddressSearchPanel
              currentSite={selectedSite}
              onSelectAddress={(newSite) => {
                setSelectedSite((prev) => ({
                  ...prev,
                  ...newSite,
                  transfoDistance: null,
                  nearestTransfoName: null
                }));
                setIsAddressSearchActive(false);
              }}
              onCancel={() => setIsAddressSearchActive(false)}
            />
          ) : (
            <>
              {/* CARTE 1 : SITE & BAILLEUR ACTIF QUALIFIÉ */}
              <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl border border-amber-500/40 shadow-lg space-y-2">
                
                {/* BOUTON SAISIR UNE NOUVELLE ADRESSE */}
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setIsAddressSearchActive(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                    title="Saisir une nouvelle adresse manuellement"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Saisir une nouvelle adresse</span>
                  </button>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    Parcelle {selectedSite.section} {selectedSite.numero}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" /> Site &amp; Bailleur Actif
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {selectedSite.commune} ({selectedSite.departement})
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950/90 rounded-lg border border-slate-800 text-xs space-y-1.5">
                  <div className="font-black text-white text-sm truncate flex items-center justify-between">
                    <span>{selectedSite.ownerName}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                      Qualifié
                    </span>
                  </div>

                  {/* Ligne Adresse avec bouton Copier uniquement (bouton Changer retiré) */}
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-1.5">
                    <div className="min-w-0 pr-1 flex-1">
                      <div className="text-slate-200 font-semibold text-[11px] truncate" title={selectedSite.address}>
                        {selectedSite.address}
                      </div>
                      <div className="text-slate-400 text-[10.5px] truncate">
                        {selectedSite.postalCode} {selectedSite.commune}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(`${selectedSite.address}, ${selectedSite.postalCode} ${selectedSite.commune}`, 'address')}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1 text-[10px] font-bold shrink-0 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                      title="Copier l'adresse complète en 1 clic"
                    >
                      {copiedField === 'address' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ligne GPS avec bouton Copier en 1 clic */}
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Navigation className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="text-slate-300 font-mono text-[10.5px] font-bold truncate">
                        GPS : {selectedSite.lat?.toFixed(5)}, {selectedSite.lng?.toFixed(5)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${selectedSite.lat?.toFixed(6)}, ${selectedSite.lng?.toFixed(6)}`, 'gps')}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1 text-[10px] font-bold shrink-0 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                      title="Copier les coordonnées GPS en 1 clic"
                    >
                      {copiedField === 'gps' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copier GPS</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                    <span className="text-emerald-400 font-mono font-bold">
                      IDU: {selectedSite.parcelId}
                    </span>
                    <span className="text-slate-400">
                      Transfo Enedis le plus proche : <strong className="text-emerald-300">{selectedSite.transfoDistance !== null && selectedSite.transfoDistance !== undefined ? `${selectedSite.transfoDistance}m` : `${selectedSite.distSouterrain || '1.1'}m`}</strong>
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeBrochure}
                      onChange={(e) => setIncludeBrochure(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                    <span>Joindre la Brochure ENR Courtage (V3) en page 2</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger le Courrier Personnalisé (PDF)</span>
                  </button>
                </div>
              </div>

              {/* CARTE 2 : CONDITIONS DU BAIL NOTARIÉ */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Euro className="w-3.5 h-3.5" /> Conditions du Bail Notarié
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Garanti 20 Ans
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9.5px] text-slate-400 block font-bold">Loyer Annuel</span>
                    <strong className="text-xs sm:text-sm text-emerald-400 font-black block">2 000 €/an</strong>
                    <span className="text-[9px] text-slate-500 block">Net de charges</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9.5px] text-slate-400 block font-bold">Emprise Sol</span>
                    <strong className="text-xs sm:text-sm text-white font-black block">20 m²</strong>
                    <span className="text-[9px] text-slate-500 block">Dalle clôturée</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9.5px] text-slate-400 block font-bold">Total 20 Ans</span>
                    <strong className="text-xs sm:text-sm text-amber-400 font-black block">40 000 €</strong>
                    <span className="text-[9px] text-slate-500 block">Indexation an</span>
                  </div>
                </div>
              </div>

              {/* CARTE 3 : SPÉCIFICATIONS TECHNIQUES BESS */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Spécifications Matériel BESS
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    500 kW / 1 044 kWh
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-300">
                  <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Configuration :</span>
                    <span className="font-bold text-white">4 armoires Mercury 261 (125 kW / 261 kWh)</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Technologie :</span>
                    <span className="font-bold text-emerald-400">LiFePO4 certifié &bull; HVAC Liquide</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Sécurité &amp; Clôture :</span>
                    <span className="font-bold text-white">Aérosol NFPA 855 &bull; Grillage thermolaqué H 2m</span>
                  </div>
                </div>
              </div>

              {/* NOTE DE BAS DE PAGE GAUCHE */}
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 px-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Régime délibéré CRE 2025-227 &bull; Réserve 50 Hz Enedis</span>
              </div>
            </>
          )}

        </div>

        {/* COLONNE DROITE (7 colonnes) : CARTE INTERACTIVE DU TRANSFORMATEUR */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">

          {/* BANDEAU FLOTTANT EN HAUT DE CARTE */}
          <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
            <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-xs font-bold text-white flex items-center gap-2 pointer-events-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="truncate">
                Transformateur HTA/BT au Sol &bull; Parcelle {selectedSite.section} {selectedSite.numero} ({selectedSite.commune})
              </span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => setShowHtaLines((v) => !v)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all ${
                  showHtaLines
                    ? 'bg-amber-500/20 border-amber-400/80 text-amber-300'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Afficher ou masquer les lignes HTA Enedis"
              >
                <Zap className={`w-3.5 h-3.5 ${showHtaLines ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                <span>Lignes HTA</span>
              </button>

              <button
                type="button"
                onClick={() => setMapLayerType((t) => (t === 'satellite' ? 'osm' : 'satellite'))}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 shadow cursor-pointer transition-all"
                title="Basculer entre la vue Satellite et le Plan"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">{mapLayerType === 'satellite' ? 'Plan' : 'Satellite'}</span>
              </button>
            </div>
          </div>

          {/* LÉGENDE FLOTTANTE EN BAS DE CARTE (ADRESSE, TRANSFO, LIGNES HTA, PARCELLE) */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-md text-[11px] text-slate-300 flex flex-wrap items-center gap-2.5 sm:gap-3 pointer-events-auto">
            {/* MARQUEUR ADRESSE */}
            <div className="flex items-center gap-1.5">
              <span className="text-sky-400 font-bold">📍 Adresse projet</span>
            </div>

            {/* TRANSFOS ENEDIS RÉELS */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-600 border border-white shrink-0" />
              <span>Transfos Enedis (HTA/BT)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-400 shrink-0" />
              <span>Parcelle {selectedSite.section} {selectedSite.numero}</span>
            </div>

            {/* TRACÉ HTA AÉRIEN : TRAIT PLEIN */}
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0 border-t-2 border-yellow-400 inline-block shrink-0" style={{ borderTopWidth: '3px' }} />
              <span className="text-yellow-300 font-semibold">HTA Aérien (plein)</span>
            </div>

            {/* TRACÉ HTA SOUTERRAIN : POINTILLÉ */}
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0 border-t-2 border-dashed border-yellow-400 inline-block shrink-0" style={{ borderTopWidth: '3px' }} />
              <span className="text-yellow-300 font-semibold">HTA Souterrain (pointillé)</span>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(`${selectedSite.lat?.toFixed(6)}, ${selectedSite.lng?.toFixed(6)}`, 'legend-gps')}
              className="text-slate-400 hover:text-emerald-300 font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-colors bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0"
              title="Cliquer pour copier les coordonnées GPS"
            >
              {copiedField === 'legend-gps' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>{selectedSite.lat?.toFixed(5)}, {selectedSite.lng?.toFixed(5)}</span>
                </>
              )}
            </button>
          </div>

          {/* MAPCONTAINER LEAFLET */}
          <div className="w-full h-full min-h-[350px] relative">
            <MapContainer
              center={centerCoords}
              zoom={18}
              maxZoom={22}
              scrollWheelZoom={true}
              doubleClickZoom={true}
              touchZoom={true}
              zoomControl={false}
              className="w-full h-full z-0"
              style={{ width: '100%', height: '100%', background: '#0b1120' }}
            >
              <MapRecenter center={centerCoords} />
              <MapAutoResize />

              {/* TUILE CARTOGRAPHIQUE : SATELLITE OU PLAN */}
              {mapLayerType === 'satellite' ? (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={19}
                  maxZoom={22}
                  crossOrigin="anonymous"
                  attribution="Esri, Maxar, Earthstar Geographics"
                />
              ) : (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}.png"
                  maxNativeZoom={19}
                  maxZoom={20}
                  attribution="&copy; OpenStreetMap contributors"
                />
              )}

              {/* COUCHE LIGNES HTA ET TRANSFORMATEURS RÉELS ENEDIS (API ENEDIS OFFICIELLE) */}
              <HTALayerEnedis
                active={showHtaLines}
                searchedCoords={centerCoords}
                onNearestTransfoFound={(closestTransfo, dist) => {
                  setSelectedSite((prev) => ({
                    ...prev,
                    transfoDistance: dist,
                    distSouterrain: dist,
                    nearestTransfoName: closestTransfo.nom_poste || closestTransfo.type_poste
                  }));
                }}
                onCountsChange={setHtaCounts}
              />

              {/* CONTOUR GÉOMÉTRIQUE DE LA PARCELLE CADASTRALE (CYAN FLUORESCENT) */}
              {selectedSite.parcelGeometry && (
                <GeoJSON
                  key={`parcel_geom_${selectedSite.parcelId || `${selectedSite.lat}_${selectedSite.lng}`}`}
                  data={{
                    type: 'Feature',
                    geometry: selectedSite.parcelGeometry,
                    properties: {}
                  }}
                  style={{
                    color: '#38bdf8', // cyan vif
                    weight: 3,
                    fillColor: '#0284c7',
                    fillOpacity: 0.22,
                    dashArray: '5, 5'
                  }}
                />
              )}

              {/* MARQUEUR DE L'ADRESSE DU PROJET (DÉPLAÇABLE, SANS TEXTE SUR LA CARTE) */}
              <Marker
                position={centerCoords}
                icon={createAddressMarkerIcon()}
                draggable={true}
                autoPan={true}
                eventHandlers={{
                  dragend: async (e) => {
                    const latlng = e.target.getLatLng();
                    const newLat = latlng.lat;
                    const newLng = latlng.lng;

                    // Mettre à jour immédiatement la position
                    setSelectedSite((prev) => ({
                      ...prev,
                      lat: newLat,
                      lng: newLng
                    }));

                    // Récupérer la parcelle cadastrale à cette nouvelle position
                    try {
                      const parcel = await fetchCadastralParcel(newLat, newLng);
                      let ownerName = 'Propriétaire Foncier';
                      if (parcel?.idu) {
                        try {
                          const owners = await fetchParcelOwners(parcel.idu);
                          if (owners && owners.length > 0 && owners[0].denomination) {
                            ownerName = owners[0].denomination;
                          }
                        } catch (err) {}
                      }

                      setSelectedSite((prev) => ({
                        ...prev,
                        lat: newLat,
                        lng: newLng,
                        parcelId: parcel?.idu || prev.parcelId,
                        section: parcel?.section || prev.section,
                        numero: parcel?.numero || prev.numero,
                        parcelGeometry: parcel?.geometry || null,
                        ownerName: ownerName !== 'Propriétaire Foncier' ? ownerName : prev.ownerName
                      }));

                      toast({
                        title: 'Position du projet déplacée',
                        description: parcel ? `Parcelle ${parcel.section} ${parcel.numero} (${parcel.idu})` : `GPS : ${newLat.toFixed(5)}, ${newLng.toFixed(5)}`,
                        duration: 3000
                      });
                    } catch (err) {
                      console.warn('Erreur mise à jour parcelle après déplacement:', err);
                    }
                  }
                }}
              >
                <Popup className="bess-popup">
                  <div className="p-1 text-xs text-slate-900 space-y-1 min-w-[170px]">
                    <div className="font-black text-sky-600 flex items-center gap-1 text-sm">
                      📍 Emplacement du projet (BESS)
                    </div>
                    <div className="font-bold text-slate-800">
                      {selectedSite.address}
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      {selectedSite.postalCode} {selectedSite.commune}
                    </div>
                    {selectedSite.section && (
                      <div className="text-emerald-700 font-mono text-[10px] font-bold">
                        Cadastre : {selectedSite.section} {selectedSite.numero} ({selectedSite.parcelId})
                      </div>
                    )}
                    {selectedSite.transfoDistance !== null && selectedSite.transfoDistance !== undefined && (
                      <div className="text-slate-700 text-[10.5px] border-t pt-1 font-semibold">
                        Transfo Enedis le plus proche : <strong className="text-emerald-600">{selectedSite.transfoDistance} m</strong>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 italic pt-0.5">
                      💡 Déplacez ce marqueur pour ajuster l'emplacement
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

        </div>

      </div>

      {/* ─── 3. MODALE AUTOMATE DE PROSPECTION BESS ──────────────────────────── */}
      <AutomaticBessProspectingModal
        isOpen={isAutomateOpen}
        onClose={() => setIsAutomateOpen(false)}
        defaultCommune={selectedSite.commune}
        onSelectProspect={(prospect) => {
          setSelectedSite({
            name: `Centrale BESS — ${prospect.ville || prospect.commune}`,
            address: prospect.adresse_ligne1,
            commune: prospect.ville || prospect.commune,
            postalCode: prospect.code_postal,
            departement: prospect.departement || '24',
            lat: prospect.lat,
            lng: prospect.lng,
            parcelId: prospect.parcelId,
            section: prospect.section,
            numero: prospect.numero,
            contenanceM2: prospect.contenanceM2,
            parcelGeometry: prospect.parcelGeometry || null,
            distSouterrain: prospect.distSouterrain,
            distAerien: prospect.distAerien,
            transfoDistance: prospect.distSouterrain,
            nearestTransfoName: null,
            ownerName: prospect.nom_societe || 'Propriétaire Foncier',
            loyerAnnuel: 2000,
            dureeBail: 20,
            surface: 20,
            puissance: 500,
            capacite: 1044
          });
        }}
      />
    </div>
  );
}
