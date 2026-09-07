import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Search, Building2, MapPin, FolderDown, FolderOpen,
  FileText, CheckCircle2, AlertCircle, Loader2, Play, Square,
  RotateCcw, SlidersHorizontal, ExternalLink, ShieldCheck, X,
  Check, HardDrive, Compass, Euro, TrendingUp, Info
} from 'lucide-react';

import {
  searchCommunes,
  fetchBuildingsInBbox,
  reverseGeocodeBAN,
  getCadastreParcel
} from '@/services/prospectingGisService';

import {
  simulateBuildingHeadless,
  generateProspectingPdfBlob
} from '@/services/headlessSimulationEngine';

import {
  checkLocalBridgeHealth,
  openLocalFolderInExplorer,
  savePdfToLocalDestination,
  requestDirectoryPicker
} from '@/services/localPdfExportService';

export default function AutomaticProspectingModal({
  isOpen,
  onClose,
  currentMapBbox = null,
  defaultCommune = 'Seclin'
}) {
  // Mode de sélection géographique
  const [geoMode, setGeoMode] = useState('commune'); // 'commune' | 'bbox'

  // Recherche commune
  const [communeSearch, setCommuneSearch] = useState(defaultCommune || '');
  const [communeSuggestions, setCommuneSuggestions] = useState([]);
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [isSearchingCommune, setIsSearchingCommune] = useState(false);

  // Critères de filtrage
  const [minArea, setMinArea] = useState(500);
  const [maxArea, setMaxArea] = useState(2500);
  const [targetLimit, setTargetLimit] = useState(10);
  const [roofPitch, setRoofPitch] = useState(15);
  const [roofType, setRoofType] = useState('symetrique');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Statut Agent Local et Directory Picker
  const [bridgeStatus, setBridgeStatus] = useState({ online: false, checking: true });
  const [directoryHandle, setDirectoryHandle] = useState(null);

  // État d'exécution de la queue
  const [status, setStatus] = useState('idle'); // 'idle' | 'sourcing' | 'running' | 'completed' | 'aborted'
  const [currentStepText, setCurrentStepText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [detectedBuildings, setDetectedBuildings] = useState([]);
  const [processedResults, setProcessedResults] = useState([]);
  const [logs, setLogs] = useState([]);

  const isAbortedRef = useRef(false);

  // Vérifier la santé du daemon local au montage et à l'ouverture
  const refreshBridgeStatus = useCallback(async () => {
    setBridgeStatus(prev => ({ ...prev, checking: true }));
    const health = await checkLocalBridgeHealth();
    setBridgeStatus({ online: health.online, targetDir: health.targetDir, checking: false });
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshBridgeStatus();
      if (!selectedCommune && communeSearch) {
        handleSearchCommunes(communeSearch);
      }
    }
  }, [isOpen, refreshBridgeStatus]);

  // Autocomplétion commune
  const handleSearchCommunes = async (text) => {
    setCommuneSearch(text);
    if (!text || text.trim().length < 2) {
      setCommuneSuggestions([]);
      return;
    }
    setIsSearchingCommune(true);
    const results = await searchCommunes(text);
    setCommuneSuggestions(results);
    setIsSearchingCommune(false);
    if (results.length > 0 && !selectedCommune) {
      setSelectedCommune(results[0]);
    }
  };

  const handleSelectCommune = (c) => {
    setSelectedCommune(c);
    setCommuneSearch(c.nom);
    setCommuneSuggestions([]);
  };

  // Demander l'accès au dossier via File System Access API
  const handleSelectFolder = async () => {
    const handle = await requestDirectoryPicker();
    if (handle) {
      setDirectoryHandle(handle);
      addLog(`📁 Dossier local sélectionné dans le navigateur : ${handle.name}`);
    }
  };

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('fr-FR');
    setLogs(prev => [...prev.slice(-80), `[${time}] ${msg}`]);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ORCHESTRATEUR PRINCIPAL DU TUNNEL DE PROSPECTION HEADLESS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStartProspecting = async () => {
    isAbortedRef.current = false;
    setStatus('sourcing');
    setProgressPercent(0);
    setProcessedResults([]);
    setLogs([]);

    addLog('🚀 Démarrage du processus de prospection automatique...');

    try {
      // 1. Détermination de la bounding box
      let bbox = null;
      if (geoMode === 'commune') {
        if (!selectedCommune || !selectedCommune.bbox) {
          throw new Error('Veuillez sélectionner une commune valide disposant d’une emprise cadastrale.');
        }
        bbox = selectedCommune.bbox;
        addLog(`📍 Zone sélectionnée : ${selectedCommune.nom} (${selectedCommune.postalCode})`);
      } else {
        if (!currentMapBbox) {
          throw new Error('Emprise cartographique actuelle introuvable.');
        }
        bbox = currentMapBbox;
        addLog('🗺️ Utilisation de l’emprise cartographique visible');
      }

      // 2. Sourcing géospatial des bâtiments
      setCurrentStepText('Extraction des bâtiments via Overpass API...');
      addLog(`🛰️ Interrogation du cadastre OSM (Surface cible : ${minArea} m² à ${maxArea} m²)...`);

      const eligible = await fetchBuildingsInBbox({
        bbox,
        minArea,
        maxArea,
        limit: targetLimit,
        onProgress: (msg) => setCurrentStepText(msg)
      });

      setDetectedBuildings(eligible);
      addLog(`✅ ${eligible.length} bâtiments éligibles identifiés (100 - 500 kWc).`);

      if (eligible.length === 0) {
        setStatus('completed');
        setCurrentStepText('Aucun bâtiment éligible trouvé dans cette zone.');
        addLog('⚠️ Aucun bâtiment ne correspond strictement aux critères de surface.');
        return;
      }

      // 3. Boucle de simulation et d'exportation PDF
      setStatus('running');
      const results = [];

      for (let i = 0; i < eligible.length; i++) {
        if (isAbortedRef.current) {
          addLog('🛑 Prospection interrompue par l’utilisateur.');
          setStatus('aborted');
          break;
        }

        const b = eligible[i];
        const stepNum = i + 1;
        const total = eligible.length;
        setCurrentStepText(`Traitement du bâtiment ${stepNum}/${total} (${b.area} m²)...`);
        addLog(`─── Bâtiment ${stepNum}/${total} : ${b.area} m² [ID: ${b.osmId}] ───`);

        // A. Enrichissement adresse (BAN)
        let addressInfo = null;
        try {
          addressInfo = await reverseGeocodeBAN(b.center[0], b.center[1]);
          if (addressInfo?.label) {
            addLog(`   📍 Adresse : ${addressInfo.label}`);
          }
        } catch (e) {}

        // B. Qualification cadastrale
        let cadastreInfo = null;
        try {
          cadastreInfo = await getCadastreParcel(b.center[0], b.center[1]);
          if (cadastreInfo?.parcelleRef) {
            addLog(`   📐 Cadastre : ${cadastreInfo.parcelleRef}`);
          }
        } catch (e) {}

        // C. Simulation Toiture Headless
        const sim = await simulateBuildingHeadless({
          building: b,
          addressInfo,
          cadastreInfo,
          customSettings: {
            pitch: roofPitch,
            roofType,
            costPerKwc: 920
          }
        });

        addLog(`   ⚡ Puissance : ${sim.installedKwc} kWc (${sim.panelCount} modules 465 Wc)`);
        addLog(`   💶 Production : ~${sim.annualProductionKwh?.toLocaleString('fr-FR')} kWh/an • CA EDF OA : ~${sim.annualRevenueReventeTotale?.toLocaleString('fr-FR')} €/an`);

        // D. Génération du PDF
        setCurrentStepText(`Génération de l’offre commerciale PDF ${stepNum}/${total}...`);
        const pdfResult = await generateProspectingPdfBlob(sim);

        if (!pdfResult || (!pdfResult.blob && !pdfResult.arrayBuffer)) {
          addLog(`   ❌ Échec génération PDF pour bâtiment ${b.osmId}`);
          continue;
        }

        // E. Enregistrement local
        const saveRes = await savePdfToLocalDestination({
          filename: pdfResult.filename,
          blob: pdfResult.blob,
          arrayBuffer: pdfResult.arrayBuffer,
          directoryHandle,
          preferBridge: true
        });

        if (saveRes.success) {
          addLog(`   💾 Enregistré avec succès : ${saveRes.filename} [Mode: ${saveRes.method}]`);
        } else {
          addLog(`   ⚠️ Erreur enregistrement : ${saveRes.error}`);
        }

        results.push({
          building: b,
          simulation: sim,
          filename: pdfResult.filename,
          saveResult: saveRes
        });

        setProcessedResults([...results]);
        setProgressPercent(Math.round(((i + 1) / total) * 100));
      }

      if (!isAbortedRef.current) {
        setStatus('completed');
        setCurrentStepText('Prospection terminée avec succès !');
        addLog(`🎉 Terminé : ${results.length} offres commerciales PDF générées et enregistrées.`);

        // Si l'agent local est connecté, ouvrir automatiquement le dossier
        if (bridgeStatus.online) {
          openLocalFolderInExplorer();
        }
      }
    } catch (err) {
      console.error('Erreur prospection automatique:', err);
      setStatus('idle');
      addLog(`❌ Erreur fatale : ${err.message}`);
      setCurrentStepText(`Erreur : ${err.message}`);
    }
  };

  const handleStop = () => {
    isAbortedRef.current = true;
    setStatus('aborted');
    addLog('🛑 Demande d’arrêt prise en compte.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* ─── EN-TÊTE DU MODAL ─────────────────────────────────────────── */}
        <div className="bg-[#0e2b4d] text-white p-5 sm:p-6 border-b border-white/10 shrink-0 relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/30">
                <Zap className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Recherche &amp; Prospection Automatique
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Mode Headless
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Sourcing géospatial des toitures de <strong>500 m² à 2 500 m²</strong> (puissance cible : <strong>100 à 500 kWc</strong>) avec génération d'offres commerciales PDF.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={status === 'running' ? handleStop : onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ─── STATUT DE L'AGENT LOCAL (C:\Users\Utilisateur\PDF TOITURES) ─ */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Cible d'exportation :</span>
              {bridgeStatus.checking ? (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  Vérification de l'agent local...
                </span>
              ) : bridgeStatus.online ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Agent local connecté : <code>C:\Users\Utilisateur\PDF TOITURES</code></span>
                </div>
              ) : directoryHandle ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dossier sélectionné : <code>{directoryHandle.name}</code></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Agent local non détecté (port 4199)</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {bridgeStatus.online ? (
                <button
                  type="button"
                  onClick={openLocalFolderInExplorer}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  Ouvrir le dossier
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <FolderDown className="w-3.5 h-3.5" />
                  Sélectionner le dossier
                </button>
              )}

              <button
                type="button"
                onClick={refreshBridgeStatus}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Actualiser le statut de l'agent"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── CORPS DU MODAL ───────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* SÉLECTEUR DE ZONE */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                1. Définir la zone géographique de prospection
              </label>

              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setGeoMode('commune')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    geoMode === 'commune' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Par Commune
                </button>
                <button
                  type="button"
                  onClick={() => setGeoMode('bbox')}
                  disabled={!currentMapBbox}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    geoMode === 'bbox' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  } ${!currentMapBbox ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Emprise Carte
                </button>
              </div>
            </div>

            {geoMode === 'commune' && (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={communeSearch}
                    onChange={(e) => handleSearchCommunes(e.target.value)}
                    placeholder="Saisissez une commune ou un code postal (ex: Seclin, Lille, Roubaix...)"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    disabled={status === 'running' || status === 'sourcing'}
                  />
                  {isSearchingCommune && (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Suggestions autocomplétion */}
                {communeSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {communeSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCommune(c)}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                      >
                        <span>{c.nom} ({c.postalCode})</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{c.departmentCode} • pop: {c.population.toLocaleString('fr-FR')}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedCommune && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Commune sélectionnée : <strong>{selectedCommune.nom}</strong> ({selectedCommune.postalCode}) — Cadastre IGN prêt</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PARAMÈTRES TECHNIQUES DE DIMENSIONNEMENT */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                2. Paramètres de filtrage &amp; Dimensionnement Solaire
              </label>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
              >
                {showAdvanced ? 'Masquer détails' : 'Ajuster les seuils'}
              </button>
            </div>

            {/* Badges récapitulatifs des filtres stricts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Emprise Sol Cible</span>
                <strong className="text-slate-900 font-black">{minArea} à {maxArea} m²</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Puissance Installable</span>
                <strong className="text-emerald-700 font-black">100 à 500 kWc</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Profil Toiture</span>
                <strong className="text-slate-900 font-black">Symétrique 15°</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tarif EDF OA</span>
                <strong className="text-blue-700 font-black">0,085 €/kWh</strong>
              </div>
            </div>

            {showAdvanced && (
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Nombre max de bâtiments :</label>
                  <select
                    value={targetLimit}
                    onChange={(e) => setTargetLimit(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value={5}>5 bâtiments (test rapide)</option>
                    <option value={10}>10 bâtiments</option>
                    <option value={25}>25 bâtiments</option>
                    <option value={50}>50 bâtiments</option>
                    <option value={100}>100 bâtiments (massif)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Surface minimum (m²) :</label>
                  <input
                    type="number"
                    value={minArea}
                    onChange={(e) => setMinArea(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Surface maximum (m²) :</label>
                  <input
                    type="number"
                    value={maxArea}
                    onChange={(e) => setMaxArea(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION D'EXÉCUTION & PROGRESSION */}
          {(status === 'sourcing' || status === 'running' || status === 'completed' || status === 'aborted') && (
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status === 'running' || status === 'sourcing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    {currentStepText || 'Traitement en cours...'}
                  </span>
                </div>
                <span className="text-xs font-black text-amber-400">{progressPercent}%</span>
              </div>

              {/* Barre de progression */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Statistiques en temps réel */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Bâtiments Détectés</span>
                  <strong className="text-white font-black text-sm">{detectedBuildings.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Offres Générées</span>
                  <strong className="text-emerald-400 font-black text-sm">{processedResults.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Puissance Cumulée</span>
                  <strong className="text-amber-400 font-black text-sm">
                    {processedResults.reduce((sum, r) => sum + (r.simulation?.installedKwc || 0), 0).toFixed(1)} kWc
                  </strong>
                </div>
              </div>

              {/* Console de log en direct */}
              <div className="mt-2 bg-slate-950 p-3 rounded-xl max-h-36 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 select-all border border-slate-800">
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── PIED DU MODAL & BOUTONS D'ACTION ─────────────────────────── */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Chaque bâtiment génère une offre commerciale complète avec vue satellite haute résolution.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {status === 'running' || status === 'sourcing' ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Square className="w-4 h-4" />
                Arrêter
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  onClick={handleStartProspecting}
                  disabled={geoMode === 'commune' && !selectedCommune}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Lancer la Prospection Automatique
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
