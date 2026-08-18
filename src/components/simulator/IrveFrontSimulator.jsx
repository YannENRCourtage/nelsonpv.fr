import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Car, ShieldCheck, Lightbulb, TrendingUp,
  Save, FileDown, CheckCircle2, ChevronRight, Sliders, Euro, Calculator,
  MapPin, Search, Loader2, Plus, Minus, Trash2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSimulatorSettingsStore } from '@/stores/useSimulatorSettingsStore';
import { generateSatelliteSnapshot } from '@/utils/satelliteSnapshot';
import EvComparator from '@/components/simulator/EvComparator';

// ─── Contrôles de Zoom Flottants Leaflet ─────────────────────────────────────
function CustomMapZoom() {
  const map = useMap();
  return (
    <div className="absolute top-3 left-3 z-[1100] flex flex-col gap-1.5 shadow-md">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-black flex items-center justify-center border border-slate-200 shadow-sm transition-all hover:scale-105"
        title="Zoomer (+)"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-black flex items-center justify-center border border-slate-200 shadow-sm transition-all hover:scale-105"
        title="Dézoomer (-)"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Trait d'échelle dynamique en bas à gauche ──────────────────────────────
function MapScaleBar() {
  const map = useMap();
  const [scaleData, setScaleData] = useState({ widthPx: 80, label: '10 m' });

  const calculateScale = () => {
    const lat = map.getCenter().lat;
    const zoom = map.getZoom();
    const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);

    const targetPx = 80;
    const rawMeters = targetPx * metersPerPx;
    let roundedMeters = 10;
    if (rawMeters <= 3) roundedMeters = 2;
    else if (rawMeters <= 7) roundedMeters = 5;
    else if (rawMeters <= 15) roundedMeters = 10;
    else if (rawMeters <= 35) roundedMeters = 20;
    else if (rawMeters <= 75) roundedMeters = 50;
    else if (rawMeters <= 150) roundedMeters = 100;
    else roundedMeters = 200;

    const actualPx = Math.max(25, roundedMeters / metersPerPx);
    const label = `${roundedMeters} m`;
    setScaleData({ widthPx: actualPx, label });
  };

  useMapEvents({
    zoomend: calculateScale,
    moveend: calculateScale,
    zoom: calculateScale,
  });

  useEffect(() => {
    calculateScale();
  }, []);

  return (
    <div className="absolute bottom-9 left-3 z-[1000] bg-slate-900/85 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold border border-white/20 shadow-md flex items-center gap-1.5 pointer-events-none">
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-mono leading-none mb-0.5">{scaleData.label}</span>
        <div className="h-1 border-x-2 border-b-2 border-white" style={{ width: `${scaleData.widthPx}px` }} />
      </div>
    </div>
  );
}

// ─── Indicateur du niveau de zoom ───────────────────────────────────────────
function ZoomLevelIndicator() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
    zoom() {
      setZoom(map.getZoom());
    }
  });

  return (
    <div className="absolute bottom-2.5 left-3 z-[1000] bg-slate-900/85 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold border border-white/20 shadow-md flex items-center gap-1 pointer-events-none">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span>Zoom : {zoom}</span>
    </div>
  );
}

// ─── Tracker de déplacement du centre de la carte ────────────────────────────
function MapCenterTracker({ onCenterChange }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      if (onCenterChange) onCenterChange([c.lat, c.lng]);
    }
  });
  return null;
}

// ─── Icône personnalisée Carrée pour les Bornes IRVE ───────────────────────────
const createStationIcon = (number) => {
  return L.divIcon({
    className: 'custom-irve-pin',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: #059669;
        color: #ffffff;
        border: 2.5px solid #ffffff;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      ">
        ⚡${number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) onMapClick(e.latlng);
    }
  });
  return null;
}

export default function IrveFrontSimulator({
  selectedProject,
  onSaveSimulation,
  onExportPDF,
  onStateUpdate
}) {
  const { settings } = useSimulatorSettingsStore();
  const irveSettings = settings.irve;

  // Nom du client dynamique
  const [clientNameInput, setClientNameInput] = useState(
    selectedProject?.name || selectedProject?.lastName || ''
  );

  // Adresse du projet
  const [addressInput, setAddressInput] = useState(
    selectedProject ? [selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', ') : ''
  );
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('33');
  const [cityName, setCityName] = useState('Bordeaux');

  // Coordonnées & Carte Interactive
  const [mapCenter, setMapCenter] = useState([44.8378, -0.5792]);
  const [stationMarkers, setStationMarkers] = useState([
    { id: 1, lat: 44.8378 + 0.0001, lng: -0.5792 + 0.0001 }
  ]);
  const mapContainerRef = useRef(null);
  const [mapScreenshotDataUrl, setMapScreenshotDataUrl] = useState(null);

  // Configuration Matériel
  const products = irveSettings.products || [];
  const [selectedPower, setSelectedPower] = useState(22);
  const [targetTypology, setTargetTypology] = useState('personnalise');
  const [usageType, setUsageType] = useState('NonEligible');
  const [pricingMode, setPricingMode] = useState('margin');
  const [marginPerRecharge, setMarginPerRecharge] = useState(irveSettings.defaultMarginPerRecharge || 4.000);
  const [salePrice, setSalePrice] = useState(irveSettings.defaultSalePriceKwh || 0.400);
  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState(irveSettings.defaultElectricityCostKwh || 0.200);
  const [rechargesPerMonth, setRechargesPerMonth] = useState(205);
  
  // Taux de consommation personnelle (0 à 100%, marge = 0 € sur cette part)
  const [personalConsoRate, setPersonalConsoRate] = useState(0);

  const quantity = stationMarkers.length > 0 ? stationMarkers.length : 1;

  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.name || selectedProject.lastName) {
        setClientNameInput(selectedProject.name || selectedProject.lastName);
      }
      if (selectedProject.address || selectedProject.city) {
        setAddressInput([selectedProject.address, selectedProject.zip, selectedProject.city].filter(Boolean).join(', '));
        setIsAddressSelected(true);
      }
      if (selectedProject.zip) setDepartmentCode(selectedProject.zip.substring(0, 2));
      if (selectedProject.city) setCityName(selectedProject.city);
      if (selectedProject.lat && selectedProject.lng) {
        const lat = Number(selectedProject.lat);
        const lng = Number(selectedProject.lng);
        setMapCenter([lat, lng]);
        setStationMarkers([{ id: 1, lat, lng }]);
      }
    }
  }, [selectedProject]);

  // Recherche BAN lors de la saisie
  useEffect(() => {
    if (isAddressSelected || !addressInput || addressInput.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const resp = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressInput)}&limit=5`);
        const data = await resp.json();
        if (data && data.features) setSuggestions(data.features);
      } catch (err) {
        console.error('Erreur API BAN IRVE:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [addressInput, isAddressSelected]);

  const handleSelectSuggestion = (feat) => {
    const label = feat.properties.label;
    const [lng, lat] = feat.geometry.coordinates;
    const postcode = feat.properties.postcode || '';
    const dept = postcode.substring(0, 2);
    const city = feat.properties.city || '';

    setAddressInput(label);
    setIsAddressSelected(true);
    setMapCenter([lat, lng]);
    setStationMarkers([{ id: 1, lat, lng }]);
    if (dept) setDepartmentCode(dept);
    if (city) setCityName(city);
    setSuggestions([]);
  };

  const handleSearchGo = async () => {
    if (!addressInput || addressInput.trim().length < 2) return;
    setIsSearchingAddress(true);
    try {
      const resp = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressInput)}&limit=1`);
      const data = await resp.json();
      if (data && data.features && data.features.length > 0) {
        handleSelectSuggestion(data.features[0]);
      }
    } catch (err) {
      console.error('Erreur GO BAN:', err);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleAddMarker = () => {
    const newId = stationMarkers.length + 1;
    const offset = (stationMarkers.length * 0.0001);
    setStationMarkers([
      ...stationMarkers,
      { id: newId, lat: mapCenter[0] + offset, lng: mapCenter[1] + offset }
    ]);
  };

  const handleMarkerDrag = (id, newLatLng) => {
    setStationMarkers(stationMarkers.map(m => m.id === id ? { ...m, lat: newLatLng.lat, lng: newLatLng.lng } : m));
  };

  const handleRemoveMarker = (id) => {
    if (stationMarkers.length <= 1) return;
    setStationMarkers(stationMarkers.filter(m => m.id !== id));
  };

  const currentProduct = useMemo(() => {
    return products.find(p => p.power === selectedPower) || products[0] || { power: 22, price: 2960 };
  }, [products, selectedPower]);

  const typologies = irveSettings.typologies || {
    personnalise: { label: 'Personnalisé', estimate: 205 },
    tpe: { label: 'TPE / Bureaux', estimate: 30 },
    copro: { label: 'Copropriété', estimate: 60 },
    restaurant: { label: 'Restaurant', estimate: 150 },
    hotel: { label: 'Hôtel', estimate: 300 },
    parking: { label: 'Parking public', estimate: 500 },
    flotte: { label: 'Flotte entreprise', estimate: 100 },
  };

  const handleTypologyChange = (val) => {
    setTargetTypology(val);
    if (typologies[val]?.estimate !== null && typologies[val]?.estimate !== undefined) {
      setRechargesPerMonth(typologies[val].estimate * quantity);
    }
  };

  const hardwareCost = currentProduct.price * quantity;
  const installCostTotal = (irveSettings.defaultInstallFeePerPoint || 1000) * quantity;
  const totalInvestment = hardwareCost + installCostTotal;

  const subvention = useMemo(() => {
    const sub = irveSettings.subventions?.[usageType];
    if (!sub || !sub.rate) return 0;
    return Math.min(totalInvestment * sub.rate, sub.cap * quantity);
  }, [usageType, totalInvestment, quantity, irveSettings]);

  const resteACharge = totalInvestment - subvention;

  const effectiveMargin = useMemo(() => {
    if (pricingMode === 'price') {
      return Math.max(0, (salePrice - electricityCostPerKwh) * 48);
    }
    return marginPerRecharge;
  }, [pricingMode, salePrice, electricityCostPerKwh, marginPerRecharge]);

  // Calcul intégrant le taux de consommation personnelle (marge = 0 sur la part personnelle)
  const commercialRechargeFraction = Math.max(0, (100 - personalConsoRate) / 100);
  const monthlyCommercialRecharges = rechargesPerMonth * commercialRechargeFraction;
  const monthlyRevenue = Math.round(effectiveMargin * monthlyCommercialRecharges);
  const annualRevenue = monthlyRevenue * 12;

  const breakEvenMonths = monthlyRevenue > 0 ? (resteACharge / monthlyRevenue) : 0;
  const breakEvenYears = (breakEvenMonths / 12).toFixed(1);

  // Projection financière sur 30 ans avec cumul 10 / 20 / 30 ans
  const financialProjection30Years = useMemo(() => {
    const data = [];
    let cumul = -resteACharge;
    let cumul10 = 0;
    let cumul20 = 0;
    let cumul30 = 0;

    for (let yr = 1; yr <= 30; yr++) {
      const yearRevenue = annualRevenue;
      cumul += yearRevenue;
      if (yr <= 10) cumul10 += yearRevenue;
      if (yr <= 20) cumul20 += yearRevenue;
      if (yr <= 30) cumul30 += yearRevenue;

      data.push({
        year: `${yr}`,
        gain: Math.round(cumul),
        yearRevenue,
        isPayback: cumul >= 0
      });
    }

    return {
      data,
      cumul10,
      cumul20,
      cumul30
    };
  }, [resteACharge, annualRevenue]);

  const ensureMapSnapshot = async () => {
    const snapshot = await generateSatelliteSnapshot({
      center: mapCenter,
      stationMarkers: stationMarkers,
      polygonPoints: [],
      width: 800,
      height: 480,
      zoom: 20
    });
    if (snapshot) setMapScreenshotDataUrl(snapshot);
    return snapshot;
  };

  useEffect(() => {
    if (mapCenter) {
      ensureMapSnapshot();
    }
  }, [mapCenter, stationMarkers]);

  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        type: 'irve',
        title: `Bornes IRVE ${quantity}x ${selectedPower} kW — ${clientNameInput || cityName || 'Projet'}`,
        clientName: clientNameInput || cityName,
        address: addressInput,
        cityName,
        departmentCode,
        power: selectedPower,
        quantity,
        targetTypology,
        personalConsoRate,
        rechargesPerMonth,
        pricingMode,
        effectiveMargin,
        monthlyRevenue,
        annualRevenue,
        annualBenefitYear1: annualRevenue,
        totalInvestment,
        subvention,
        resteACharge,
        totalInvestmentHT: totalInvestment,
        breakEvenMonths: Math.round(breakEvenMonths),
        breakEvenYears,
        paybackYear: breakEvenYears,
        totalGains30Years: financialProjection30Years.cumul30,
        cumul10: financialProjection30Years.cumul10,
        cumul20: financialProjection30Years.cumul20,
        cumul30: financialProjection30Years.cumul30,
        stationMarkers,
        mapScreenshot: mapScreenshotDataUrl
      });
    }
  }, [
    selectedPower, quantity, clientNameInput, cityName, addressInput, departmentCode,
    targetTypology, personalConsoRate, rechargesPerMonth, pricingMode, effectiveMargin,
    monthlyRevenue, annualRevenue, totalInvestment, subvention, resteACharge,
    breakEvenMonths, breakEvenYears, financialProjection30Years, stationMarkers,
    mapScreenshotDataUrl, onStateUpdate
  ]);

  return (
    <div className="w-full space-y-4">
      
      {/* ─── BANDEAU SUPÉRIEUR PLEINE LARGEUR ───────────────────────────────── */}
      <div className="bg-[#0e2b4d] text-white rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Infrastructures de <span className="text-emerald-400">Recharge Électrique (IRVE)</span>
            </h2>
            <p className="text-sm text-slate-300 mt-0.5 max-w-3xl">
              Estimez le retour sur investissement et positionnez vos bornes sur votre parking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20">
              <span className="text-xs text-amber-300 font-bold">Client :</span>
              <input
                type="text"
                value={clientNameInput}
                onChange={(e) => setClientNameInput(e.target.value)}
                placeholder="Nom du client..."
                className="bg-transparent text-xs font-extrabold text-white placeholder:text-white/50 focus:outline-none w-32 sm:w-40 border-b border-white/30 focus:border-amber-400 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-white">
                {quantity} × {selectedPower} kW ({currentProduct.price.toLocaleString('fr-FR')} € HT/u)
              </span>
            </div>
          </div>
        </div>
      </div>

      <EvComparator />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Colonne Gauche : Paramètres & Carte interactive */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            
            {/* Recherche d'adresse d'implantation avec Bouton GO ! */}
            <div className="space-y-1.5 border-b border-slate-100 pb-3">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Adresse du site d'implantation
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => {
                      setAddressInput(e.target.value);
                      setIsAddressSelected(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchGo();
                    }}
                    placeholder="Saisissez l'adresse de votre parking ou entreprise..."
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                  {isSearchingAddress && (
                    <Loader2 className="w-4 h-4 absolute right-3 top-3 text-emerald-600 animate-spin" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearchGo}
                  disabled={isSearchingAddress}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1 shrink-0"
                  title="Rechercher et centrer la carte sur cette adresse"
                >
                  GO !
                </button>
              </div>

              {!isAddressSelected && suggestions.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 mt-1">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors flex items-center gap-2 text-xs font-semibold text-slate-800"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{s.properties.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Carte satellite avec carrés déplaçables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Implantation des bornes sur plan satellite ({quantity})
                </label>
                <button
                  type="button"
                  onClick={handleAddMarker}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter borne
                </button>
              </div>

              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-200 shadow-inner" ref={mapContainerRef}>
                <MapContainer
                  center={mapCenter}
                  zoom={20}
                  maxZoom={23}
                  scrollWheelZoom={true}
                  doubleClickZoom={true}
                  touchZoom={true}
                  zoomControl={false}
                  className="w-full h-full"
                >
                  <CustomMapZoom />
                  <MapCenterTracker onCenterChange={setMapCenter} />
                  <MapScaleBar />
                  <ZoomLevelIndicator />
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxNativeZoom={19}
                    maxZoom={23}
                    crossOrigin="anonymous"
                    attribution="Esri, Maxar, Earthstar Geographics"
                  />
                  {stationMarkers.map((marker, idx) => (
                    <Marker
                      key={marker.id}
                      position={[marker.lat, marker.lng]}
                      icon={createStationIcon(idx + 1)}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => handleMarkerDrag(marker.id, e.target.getLatLng())
                      }}
                    >
                      <Popup>
                        <div className="text-center p-1">
                          <p className="font-bold text-xs">Borne #{idx + 1} ({selectedPower} kW)</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveMarker(marker.id)}
                            className="mt-1 text-[10px] text-red-600 hover:underline font-bold flex items-center gap-1 mx-auto"
                          >
                            <Trash2 className="w-3 h-3" /> Supprimer
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Déplacez librement les carrés verts ⚡ sur vos places de stationnement.
              </p>
            </div>

            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 pt-2 border-t border-slate-100">
              <Sliders className="w-5 h-5 text-blue-600" />
              Paramètres Économiques
            </h3>

            {/* Puissance de la borne */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Puissance unitaire</label>
              <div className="grid grid-cols-3 gap-2">
                {products.map(p => (
                  <button
                    key={p.id || p.power}
                    type="button"
                    onClick={() => setSelectedPower(p.power)}
                    className={`p-2 rounded-xl text-xs font-black transition-all border ${
                      selectedPower === p.power
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-sm">{p.power} kW</span>
                    <span className="text-[10px] font-normal opacity-85 block">{p.price.toLocaleString('fr-FR')} €</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Taux de consommation personnelle */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-amber-950">
                <span>Taux de consommation personnelle</span>
                <span className="font-black text-sm text-amber-700">{personalConsoRate} %</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={personalConsoRate}
                onChange={(e) => setPersonalConsoRate(Number(e.target.value))}
                className="w-full h-2.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-[10px] text-amber-800 leading-tight">
                Pour la part consommée par vos propres véhicules ({personalConsoRate}%), le tarif de vente est égal au coût d'achat (marge = 0 €).
              </p>
            </div>

            {/* Recharges mensuelles */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Recharges mensuelles totales</span>
                <span className="text-emerald-600 font-black text-sm">{rechargesPerMonth} recharges</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={rechargesPerMonth}
                onChange={(e) => setRechargesPerMonth(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            {/* Marge nette par recharge & Hypothèses dynamiques en €/kWh */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Marge par recharge publique</span>
                <span className="text-emerald-600 font-black text-sm">{marginPerRecharge.toFixed(2)} € / session</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={marginPerRecharge}
                onChange={(e) => setMarginPerRecharge(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />

              {/* Hypothèses dynamiques Prix d'achat & Prix de vente en €/kWh */}
              {(() => {
                const avgKwhSession = 40;
                const marginKwh = marginPerRecharge / avgKwhSession;
                const purchasePriceKwh = 0.18;
                const sellPriceKwh = purchasePriceKwh + marginKwh;
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] space-y-1 text-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-slate-500 font-semibold border-b border-slate-200 pb-1 mb-1">
                      <span>Hypothèses tarifaires (base {avgKwhSession} kWh / recharge) :</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Prix d'achat électricité :</span>
                      <strong className="text-slate-900 font-bold">{purchasePriceKwh.toFixed(2)} € / kWh</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Prix de vente rechargé :</span>
                      <strong className="text-emerald-700 font-bold">{sellPriceKwh.toFixed(2)} € / kWh</strong>
                    </div>
                    <div className="flex justify-between items-center text-emerald-800 font-extrabold pt-0.5 border-t border-slate-200">
                      <span>Marge brute calculée :</span>
                      <span>+{marginKwh.toFixed(2)} € / kWh ({marginPerRecharge.toFixed(2)} €/session)</span>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>

        {/* Colonne Droite : Synthèse & Graphique 30 Ans */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase block">Revenus Mensuels</span>
              <span className="text-2xl font-black text-emerald-600 block my-1">
                +{monthlyRevenue.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-semibold">€/mois</span>
              </span>
              <span className="text-xs text-slate-400">+{annualRevenue.toLocaleString('fr-FR')} € / an</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase block">Investissement Net</span>
              <span className="text-2xl font-black text-slate-900 block my-1">
                {resteACharge.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-semibold">€ HT</span>
              </span>
              <span className="text-xs text-slate-400">Matériel + Pose ({totalInvestment} €)</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase block">Retour sur Invest.</span>
              <span className="text-2xl font-black text-blue-600 block my-1">
                {breakEvenMonths < 12 ? `${Math.round(breakEvenMonths)} mois` : `${breakEvenYears} ans`}
              </span>
              <span className="text-xs text-slate-400">Amorti à M{Math.round(breakEvenMonths)}</span>
            </div>
          </div>

          {/* ─── SECTION REVENUS CUMULÉS SUR 30 ANS ───────────── */}
          <div className="bg-[#0e2b4d] text-white rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Projection Financière &amp; Bénéfices Cumulés (30 ans)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Projection sur 30 ans des recettes nettes générées par les bornes de recharge
              </p>
            </div>

            {/* 3 Cartes Milestones 10 ans / 20 ans / 30 ans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                <span className="text-xs font-bold text-slate-300 block">sur 10 ans</span>
                <span className="text-2xl font-black text-white block mt-0.5">{financialProjection30Years.cumul10.toLocaleString('fr-FR')} €</span>
              </div>

              <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                <span className="text-xs font-bold text-slate-300 block">sur 20 ans</span>
                <span className="text-2xl font-black text-white block mt-0.5">{financialProjection30Years.cumul20.toLocaleString('fr-FR')} €</span>
              </div>

              <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
                <span className="text-xs font-bold text-slate-300 block">sur 30 ans</span>
                <span className="text-2xl font-black text-emerald-400 block mt-0.5">{financialProjection30Years.cumul30.toLocaleString('fr-FR')} €</span>
              </div>
            </div>

            {/* Graphique 30 Ans avec Barres Bicolores */}
            <div className="space-y-2">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialProjection30Years.data} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                    <Tooltip
                      formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} €`, 'Cumul net']}
                      labelFormatter={(yr) => `Année ${yr}`}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#ffffff', fontSize: 12 }}
                    />
                    <ReferenceLine
                      x={Math.round(Number(breakEvenYears)).toString()}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{
                        value: `Amorti en ${breakEvenYears} ans`,
                        fill: '#ef4444',
                        position: 'top',
                        fontSize: 10,
                        fontWeight: 'bold'
                      }}
                    />
                    <Bar dataKey="gain" radius={[4, 4, 0, 0]}>
                      {financialProjection30Years.data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isPayback ? '#10b981' : '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-slate-300 pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                  Amortissement en cours
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  Bénéfices nets (Post-ROI)
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
