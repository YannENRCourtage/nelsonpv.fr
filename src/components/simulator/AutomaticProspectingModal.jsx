import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Search, Building2, MapPin, FolderDown, FolderOpen,
  FileText, CheckCircle2, AlertCircle, Loader2, Play, Square,
  RotateCcw, SlidersHorizontal, ExternalLink, ShieldCheck, X,
  Check, HardDrive, Compass, Euro, TrendingUp, Info, Download,
  Archive, Eye, Layers, ArrowRight
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
  requestDirectoryPicker,
  exportResultsAsZip
} from '@/services/localPdfExportService';

export default function AutomaticProspectingModal({
  isOpen,
  onClose,
  currentMapBbox = null,
  simulatorMapCenter = null,
  defaultCommune = 'Seclin'
}) {
  // Mode de sélection géographique : 'commune' | 'bbox'
  const [geoMode, setGeoMode] = useState('commune');

  // Recherche par commune
  const [communeSearch, setCommuneSearch] = useState(defaultCommune || '');
  const [communeSuggestions, setCommuneSuggestions] = useState([]);
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [isSearchingCommune, setIsSearchingCommune] = useState(false);

  // Rayon pour l'emprise carte (en mètres)
  const [mapRadius, setMapRadius] = useState(1000); // 500, 1000, 2000, 5000

  // Critères de filtrage et dimensionnement
  const [minArea, setMinArea] = useState(500);
  const [maxArea, setMaxArea] = useState(2500);
  const [targetLimit, setTargetLimit] = useState(10);
  const [roofPitch, setRoofPitch] = useState(15);
  const [roofType, setRoofType] = useState('symetrique');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Gestion du dossier local d'exportation
  const [bridgeStatus, setBridgeStatus] = useState({ online: false, checking: true });
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [folderFeedback, setFolderFeedback] = useState(null);

  // Onglets du panneau droit
  const [rightPanelTab, setRightPanelTab] = useState('results'); // 'results' | 'logs'

  // État de l'exécution
  const [status, setStatus] = useState('idle'); // 'idle' | 'sourcing' | 'running' | 'completed' | 'aborted'
  const [currentStepText, setCurrentStepText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [detectedBuildings, setDetectedBuildings] = useState([]);
  const [processedResults, setProcessedResults] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const isAbortedRef = useRef(false);
  const logsEndRef = useRef(null);

  // Détermination du centre pour l'emprise carte
  const activeCenter = useMemo(() => {
    if (simulatorMapCenter && simulatorMapCenter[0] && simulatorMapCenter[1]) {
      return simulatorMapCenter;
    }
    if (currentMapBbox && currentMapBbox.center) {
      return currentMapBbox.center;
    }
    return [50.6292, 3.0573]; // Par défaut : Lille / Métropole Européenne de Lille
  }, [simulatorMapCenter, currentMapBbox]);

  // Bounding box calculée pour l'emprise carte
  const computedMapBbox = useMemo(() => {
    const lat = activeCenter[0];
    const lng = activeCenter[1];
    const deltaLat = mapRadius / 111000;
    const deltaLng = mapRadius / (111000 * Math.cos((lat * Math.PI) / 180));
    return {
      minLat: Number((lat - deltaLat).toFixed(5)),
      minLng: Number((lng - deltaLng).toFixed(5)),
      maxLat: Number((lat + deltaLat).toFixed(5)),
      maxLng: Number((lng + deltaLng).toFixed(5)),
      center: [lat, lng],
      radius: mapRadius
    };
  }, [activeCenter, mapRadius]);

  // Vérifier la santé du daemon local au montage
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

  // Autoscroll des logs
  useEffect(() => {
    if (rightPanelTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, rightPanelTab]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('fr-FR');
    setLogs(prev => [...prev.slice(-120), `[${time}] ${msg}`]);
  };

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

  // Sélection du dossier local (File System Access API)
  const handleSelectFolder = async () => {
    setIsSelectingFolder(true);
    setFolderFeedback(null);
    try {
      const res = await requestDirectoryPicker();
      if (res.success && res.handle) {
        setDirectoryHandle(res.handle);
        setSelectedFolderName(res.folderName || 'Dossier Local');
        setFolderFeedback({
          type: 'success',
          message: `Dossier lié : "${res.folderName}". Les offres y seront enregistrées directement.`
        });
        addLog(`📁 Dossier local d'exportation sélectionné : "${res.folderName}"`);
      } else if (res.cancelled) {
        setFolderFeedback({
          type: 'info',
          message: 'Sélection de dossier annulée.'
        });
      } else if (res.error) {
        setFolderFeedback({
          type: 'error',
          message: res.error
        });
        addLog(`⚠️ Sélection dossier : ${res.error}`);
      }
    } catch (err) {
      setFolderFeedback({
        type: 'error',
        message: err.message
      });
      addLog(`❌ Erreur sélection dossier : ${err.message}`);
    } finally {
      setIsSelectingFolder(false);
    }
  };

  // Télécharger toutes les offres en archive ZIP
  const handleDownloadZipBundle = async () => {
    if (!processedResults || processedResults.length === 0) return;
    try {
      setIsExportingZip(true);
      const zoneName = geoMode === 'commune' ? (selectedCommune?.nom || 'Commune') : 'Emprise_Carte';
      const dateStr = new Date().toISOString().slice(0, 10);
      const zipName = `Offres_Solaires_${zoneName}_${dateStr}.zip`;
      addLog(`📦 Préparation de l'archive ZIP groupée (${processedResults.length} fichiers)...`);
      await exportResultsAsZip(processedResults, zipName);
      addLog(`✅ Archive ZIP "${zipName}" téléchargée avec succès.`);
    } catch (err) {
      addLog(`❌ Erreur export ZIP : ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Télécharger unitaire d'un PDF
  const handleDownloadSinglePdf = (item) => {
    if (!item) return;
    const content = item.blob || (item.arrayBuffer ? new Blob([item.arrayBuffer], { type: 'application/pdf' }) : null);
    if (!content) return;
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ORCHESTRATEUR PRINCIPAL DU TUNNEL DE PROSPECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStartProspecting = async () => {
    isAbortedRef.current = false;
    setStatus('sourcing');
    setProgressPercent(0);
    setProcessedResults([]);
    setLogs([]);
    setRightPanelTab('results');

    addLog('🚀 Démarrage du pipeline de prospection automatique Nelson...');

    try {
      // 1. Définition de l'emprise géographique
      let targetBbox = null;
      let zoneLabel = '';

      if (geoMode === 'commune') {
        if (!selectedCommune || !selectedCommune.bbox) {
          throw new Error('Veuillez sélectionner une commune valide disposant d’un contour cadastral.');
        }
        targetBbox = selectedCommune.bbox;
        zoneLabel = `${selectedCommune.nom} (${selectedCommune.postalCode})`;
        addLog(`📍 Zone sélectionnée : Commune de ${zoneLabel}`);
      } else {
        targetBbox = computedMapBbox;
        zoneLabel = `Carte (Lat ${computedMapBbox.center[0].toFixed(3)}, Lng ${computedMapBbox.center[1].toFixed(3)} - Rayon ${mapRadius}m)`;
        addLog(`🗺️ Zone sélectionnée : ${zoneLabel}`);
      }

      // 2. Sourcing géospatial rapide
      setCurrentStepText('Interrogation cadastrale Overpass API...');
      addLog(`🛰️ Recherche des bâtiments (Emprise : ${minArea} à ${maxArea} m²)...`);

      const eligible = await fetchBuildingsInBbox({
        bbox: targetBbox,
        minArea,
        maxArea,
        limit: targetLimit,
        onProgress: (msg) => setCurrentStepText(msg)
      });

      setDetectedBuildings(eligible);
      addLog(`✅ ${eligible.length} bâtiments éligibles identifiés (100 - 500 kWc).`);

      if (eligible.length === 0) {
        setStatus('completed');
        setCurrentStepText('Aucun bâtiment éligible dans cette zone.');
        addLog('⚠️ Aucun bâtiment ne correspond strictement aux critères de surface.');
        return;
      }

      // 3. Boucle de simulation et export PDF
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
        setCurrentStepText(`Traitement ${stepNum}/${total} : ${b.area} m²...`);
        addLog(`─── Bâtiment ${stepNum}/${total} : ${b.area} m² [ID: ${b.osmId}] ───`);

        // A. Géocodage BAN
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

        // D. Génération de l'Offre Commerciale PDF
        setCurrentStepText(`Génération de l'offre PDF ${stepNum}/${total}...`);
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
          addLog(`   💾 Enregistré : ${saveRes.filename} [${saveRes.method}]`);
        } else {
          addLog(`   ⚠️ Erreur enregistrement : ${saveRes.error}`);
        }

        const rowItem = {
          building: b,
          simulation: sim,
          filename: pdfResult.filename,
          blob: pdfResult.blob,
          arrayBuffer: pdfResult.arrayBuffer,
          addressLabel: addressInfo?.label || `${b.area} m² - Commune de ${selectedCommune?.nom || 'Secteur'}`,
          cadastreRef: cadastreInfo?.parcelleRef || 'Parcelle non cadastrée',
          saveResult: saveRes
        };

        results.push(rowItem);
        setProcessedResults([...results]);
        setProgressPercent(Math.round(((i + 1) / total) * 100));
      }

      if (!isAbortedRef.current) {
        setStatus('completed');
        setCurrentStepText('Prospection terminée avec succès !');
        addLog(`🎉 Succès : ${results.length} offres commerciales PDF générées.`);

        if (bridgeStatus.online) {
          openLocalFolderInExplorer();
        }
      }
    } catch (err) {
      console.error('Erreur prospection automatique:', err);
      setStatus('idle');
      addLog(`❌ Erreur : ${err.message}`);
      setCurrentStepText(`Erreur : ${err.message}`);
    }
  };

  const handleStop = () => {
    isAbortedRef.current = true;
    setStatus('aborted');
    addLog('🛑 Demande d’arrêt prise en compte.');
  };

  // Calculs récapitulatifs pour le header/KPI
  const totalKwcCumul = useMemo(() => {
    return processedResults.reduce((acc, r) => acc + (r.simulation?.installedKwc || 0), 0).toFixed(1);
  }, [processedResults]);

  const totalRevenueCumul = useMemo(() => {
    return processedResults.reduce((acc, r) => acc + (r.simulation?.annualRevenueReventeTotale || 0), 0);
  }, [processedResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-[96vw] max-w-7xl 2xl:max-w-[1550px] h-[92vh] max-h-[94vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* ─── 1. EN-TÊTE SUPÉRIEUR SPATIEUX ─────────────────────────────── */}
        <div className="bg-[#0e2b4d] text-white p-4 sm:p-5 border-b border-white/10 shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 shrink-0">
                <Zap className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                    Recherche &amp; Prospection Automatique de Toitures Solaires
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Mode Headless
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    100 à 500 kWc
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Détection par cadastre IGN &amp; OSM (toitures de 500 à 2 500 m²), calepinage géométrique 465 Wc, tarification EDF OA et export d'offres commerciales PDF.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={status === 'running' || status === 'sourcing' ? handleStop : onClose}
              className="text-slate-400 hover:text-white p-2.5 rounded-2xl hover:bg-white/10 transition-colors shrink-0"
              title="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* ─── BANDEAU STATUT DOSSIER & AGENT LOCAL ───────────────────────── */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold">Dossier d'exportation :</span>

              {directoryHandle ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-black shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Dossier actif : <code>{selectedFolderName || directoryHandle.name}</code></span>
                </div>
              ) : bridgeStatus.online ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-black shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Agent local connecté : <code>{bridgeStatus.targetDir || 'C:\\Users\\Utilisateur\\PDF TOITURES'}</code></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 font-semibold">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Aucun dossier sélectionné (Cliquez sur "Sélectionner le dossier")</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isSelectingFolder}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-105 active:scale-95"
              >
                {isSelectingFolder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderDown className="w-4 h-4" />
                )}
                <span>{directoryHandle ? 'Changer de dossier' : 'Sélectionner le dossier'}</span>
              </button>

              {bridgeStatus.online && (
                <button
                  type="button"
                  onClick={openLocalFolderInExplorer}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ouvrir dans l'Explorateur</span>
                </button>
              )}

              <button
                type="button"
                onClick={refreshBridgeStatus}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Actualiser le statut de l'agent local"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 2. CORPS PRINCIPAL SPATIEUX EN 2 COLONNES (DOUBLE LARGEUR) ─── */}
        <div className="p-4 sm:p-6 overflow-hidden flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 bg-slate-100/70">

          {/* ═══ COLONNE GAUCHE (5 cols) : CONFIGURATION & DÉCLENCHEURS ════ */}
          <div className="lg:col-span-5 flex flex-col space-y-4 overflow-y-auto pr-1">

            {/* CARTE 1 : ZONE GÉOGRAPHIQUE */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  1. Zone Géographique de Prospection
                </label>

                {/* SELECTEUR D'ONGLET COMMUNE / EMPRISE CARTE */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setGeoMode('commune')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      geoMode === 'commune'
                        ? 'bg-[#0e2b4d] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Par Commune
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeoMode('bbox')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      geoMode === 'bbox'
                        ? 'bg-[#0e2b4d] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Emprise Carte
                  </button>
                </div>
              </div>

              {/* CONTENU MODE COMMUNE */}
              {geoMode === 'commune' && (
                <div className="relative space-y-2 pt-1">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={communeSearch}
                      onChange={(e) => handleSearchCommunes(e.target.value)}
                      placeholder="Nom de la commune ou code postal (ex: Seclin, Agen, Lille...)"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-xs"
                      disabled={status === 'running' || status === 'sourcing'}
                    />
                    {isSearchingCommune && (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {communeSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {communeSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCommune(c)}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                        >
                          <span>{c.nom} ({c.postalCode})</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{c.departmentCode} • pop: {c.population.toLocaleString('fr-FR')}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCommune && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Commune prête : <strong>{selectedCommune.nom}</strong> ({selectedCommune.postalCode})
                        <span className="text-slate-500 font-normal"> — Cadastre IGN et contours prêts.</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CONTENU MODE EMPRISE CARTE */}
              {geoMode === 'bbox' && (
                <div className="space-y-2.5 pt-1">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-slate-900">
                        <Compass className="w-4 h-4 text-blue-600" />
                        Position actuelle du simulateur :
                      </span>
                      <code className="text-[11px] bg-white px-2 py-0.5 rounded-lg border border-slate-200 font-mono text-slate-800">
                        {activeCenter[0].toFixed(4)}°N, {activeCenter[1].toFixed(4)}°E
                      </code>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Rayon d'emprise de recherche :
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { radius: 500, label: '500 m', desc: '~80 ha' },
                          { radius: 1000, label: '1 km', desc: 'Zone d\'act.' },
                          { radius: 2000, label: '2 km', desc: 'Bassin' },
                          { radius: 5000, label: '5 km', desc: 'Massif' }
                        ].map((r) => (
                          <button
                            key={r.radius}
                            type="button"
                            onClick={() => setMapRadius(r.radius)}
                            className={`p-1.5 rounded-xl text-center text-xs font-black transition-all ${
                              mapRadius === r.radius
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <div>{r.label}</div>
                            <div className="text-[9px] font-normal opacity-80">{r.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-2xl">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Emprise active centrée sur la vue satellite du simulateur (rayon de {mapRadius} m).</span>
                  </div>
                </div>
              )}
            </div>

            {/* CARTE 2 : DOSSIER LOCAL DE DESTINATION */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-600" />
                2. Dossier Local d'Enregistrement des Offres PDF
              </label>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-800">
                    Destination sur votre ordinateur :
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectFolder}
                    disabled={isSelectingFolder}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isSelectingFolder ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderDown className="w-3.5 h-3.5" />
                    )}
                    <span>{directoryHandle ? 'Modifier le dossier' : 'Sélectionner le dossier'}</span>
                  </button>
                </div>

                {directoryHandle ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">Dossier lié : <code>{selectedFolderName || directoryHandle.name}</code></span>
                  </div>
                ) : bridgeStatus.online ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">Écriture directe active : <code>{bridgeStatus.targetDir || 'C:\\Users\\Utilisateur\\PDF TOITURES'}</code></span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Cliquez sur <strong>"Sélectionner le dossier"</strong> pour choisir un dossier de votre disque (ex: <code>C:\Users\Utilisateur\PDF TOITURES</code>). Tous les PDF générés y seront écrits automatiquement par le navigateur.
                  </p>
                )}

                {folderFeedback && (
                  <div className={`p-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    folderFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' :
                    folderFeedback.type === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {folderFeedback.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    {folderFeedback.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{folderFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* CARTE 3 : PARAMÈTRES TECHNIQUES & DIMENSIONNEMENT */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  3. Critères &amp; Dimensionnement Solaire
                </label>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  {showAdvanced ? 'Masquer' : 'Ajuster les seuils'}
                </button>
              </div>

              {/* Grille des critères */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Surface toiture</span>
                  <strong className="text-slate-900 font-black">{minArea} à {maxArea} m²</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Puissance installable</span>
                  <strong className="text-emerald-700 font-black">100 à 500 kWc</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Profil toiture</span>
                  <strong className="text-slate-900 font-black">Bipente 15° (Symétrique)</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Tarif EDF OA</span>
                  <strong className="text-blue-700 font-black">0,085 €/kWh (S21)</strong>
                </div>
              </div>

              {showAdvanced && (
                <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Nombre max :</label>
                    <select
                      value={targetLimit}
                      onChange={(e) => setTargetLimit(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    >
                      <option value={5}>5 bâtiments</option>
                      <option value={10}>10 bâtiments</option>
                      <option value={20}>20 bâtiments</option>
                      <option value={50}>50 bâtiments</option>
                      <option value={100}>100 bâtiments</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Min m² :</label>
                    <input
                      type="number"
                      value={minArea}
                      onChange={(e) => setMinArea(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Max m² :</label>
                    <input
                      type="number"
                      value={maxArea}
                      onChange={(e) => setMaxArea(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRAND BOUTON D'ACTION PRINCIPAL */}
            <div className="pt-1">
              {status === 'running' || status === 'sourcing' ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 transition-all cursor-pointer"
                >
                  <Square className="w-5 h-5 fill-white" />
                  <span>Interrompre la Prospection Automatique</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartProspecting}
                  disabled={geoMode === 'commune' && !selectedCommune}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>
                    Lancer la Prospection Automatique
                    {geoMode === 'commune' && selectedCommune ? ` (${selectedCommune.nom})` : ''}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ═══ COLONNE DROITE (7 cols) : DASHBOARD TEMPS RÉEL & RÉSULTATS ═══ */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-slate-900 rounded-3xl p-5 text-white shadow-2xl border border-slate-800 space-y-4">

            {/* 1. GRILLE KPI EN TEMPS RÉEL */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-emerald-400" /> Bâtiments Cibles
                </span>
                <strong className="text-xl font-black text-white">{detectedBuildings.length}</strong>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Puissance Cumulée
                </span>
                <strong className="text-xl font-black text-amber-400">{totalKwcCumul} kWc</strong>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Euro className="w-3 h-3 text-blue-400" /> CA Estimé EDF OA
                </span>
                <strong className="text-xl font-black text-blue-400">{totalRevenueCumul.toLocaleString('fr-FR')} €/an</strong>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <FileText className="w-3 h-3 text-teal-400" /> Offres Générées
                </span>
                <strong className="text-xl font-black text-teal-400">{processedResults.length}</strong>
              </div>
            </div>

            {/* 2. PROGRESSION & ÉTAT */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {status === 'running' || status === 'sourcing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : status === 'aborted' ? (
                    <Square className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-bold text-slate-200">
                    {currentStepText || 'En attente de lancement...'}
                  </span>
                </div>

                <span className="font-black text-amber-400">{progressPercent}%</span>
              </div>

              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* 3. BARRE D'ACTION RÉSULTATS (TÉLÉCHARGEMENT ZIP GROUPÉ) */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-xs font-bold border border-slate-700">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('results')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    rightPanelTab === 'results'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Offres Générées ({processedResults.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('logs')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    rightPanelTab === 'logs'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Journal Live ({logs.length})</span>
                </button>
              </div>

              {processedResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadZipBundle}
                  disabled={isExportingZip}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  title="Télécharger l'ensemble des offres PDF dans une archive .zip"
                >
                  {isExportingZip ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                  <span>Télécharger tout en ZIP (.zip)</span>
                </button>
              )}
            </div>

            {/* 4. CONTENU DE L'ONGLET SÉLECTIONNÉ */}
            <div className="flex-1 min-h-0 bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col">

              {/* VUE 1 : TABLEAU DES OFFRES COMMERCIALES GÉNÉRÉES */}
              {rightPanelTab === 'results' && (
                <div className="overflow-y-auto flex-1 p-2 divide-y divide-slate-800/80">
                  {processedResults.length === 0 ? (
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <Building2 className="w-10 h-10 stroke-1 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-400">
                        Aucune offre générée pour le moment.
                      </p>
                      <p className="text-[11px] text-slate-600 max-w-sm">
                        Sélectionnez une commune ou l'emprise de la carte, puis cliquez sur <strong>"Lancer la Prospection Automatique"</strong>.
                      </p>
                    </div>
                  ) : (
                    processedResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 hover:bg-slate-900/60 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xs shrink-0">
                            #{idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-white truncate max-w-xs sm:max-w-md">
                              {item.addressLabel}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                              <span>📐 {item.cadastreRef}</span>
                              <span>•</span>
                              <span>Toiture : <strong>{item.building.area} m²</strong></span>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">⚡ {item.simulation?.installedKwc} kWc</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">💶 {item.simulation?.annualRevenueReventeTotale?.toLocaleString('fr-FR')} €/an</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Prêt
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDownloadSinglePdf(item)}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 transition-colors cursor-pointer"
                            title={`Télécharger le PDF : ${item.filename}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VUE 2 : JOURNAL CONSOLE EN DIRECT */}
              {rightPanelTab === 'logs' && (
                <div className="overflow-y-auto flex-1 p-3 font-mono text-[11px] text-slate-300 space-y-1 select-all">
                  {logs.length === 0 ? (
                    <div className="text-slate-600 text-center py-8">Journal en attente d'exécution...</div>
                  ) : (
                    logs.map((line, idx) => (
                      <div key={idx} className="leading-relaxed hover:bg-slate-900 px-1 rounded">
                        {line}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              )}

            </div>
          </div>

        </div>

        {/* ─── 3. PIED DE PAGE DU MODAL ─────────────────────────────────── */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Offres commerciales conformes aux arrêtés tarifaires EDF OA (S21) et dimensionnées aux modules 465 Wc.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
