import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Search, Car, Truck, MapPin, FolderDown, FolderOpen,
  FileText, CheckCircle2, AlertCircle, Loader2, Play, Square,
  RotateCcw, SlidersHorizontal, HardDrive, Compass, Euro,
  Download, Archive, X, ShieldCheck, Warehouse
} from 'lucide-react';

import {
  searchCommunes,
  fetchParkingsInBbox,
  reverseGeocodeBAN,
  getCadastreParcel
} from '@/services/parkingProspectingGisService';

import {
  simulateParkingHeadless,
  generateParkingProspectingPdfBlob
} from '@/services/parkingHeadlessSimulationEngine';

import {
  OMBRIERE_TYPOLOGIES
} from '@/services/parkingCalepinageEngine';

import {
  checkLocalBridgeHealth,
  openLocalFolderInExplorer,
  savePdfToLocalDestination,
  requestDirectoryPicker,
  exportResultsAsZip
} from '@/services/localPdfExportService';

// Profil géographique par défaut : Bordeaux (33)
const DEFAULT_BORDEAUX = {
  id: '33063',
  nom: 'Bordeaux',
  codeInsee: '33063',
  postalCode: '33000',
  departmentCode: '33',
  center: [44.8412, -0.5805],
  bbox: {
    minLat: 44.810741,
    minLng: -0.638699,
    maxLat: 44.916694,
    maxLng: -0.533325
  },
  population: 267991
};

export default function AutomaticOmbriereProspectingModal({
  isOpen,
  onClose,
  currentMapBbox = null,
  simulatorMapCenter = null,
  defaultCommune = 'Bordeaux'
}) {
  // Mode de sélection géographique : 'commune' | 'bbox'
  const [geoMode, setGeoMode] = useState('commune');

  // Recherche par commune (Bordeaux 33 par défaut)
  const [communeSearch, setCommuneSearch] = useState(defaultCommune || 'Bordeaux');
  const [communeSuggestions, setCommuneSuggestions] = useState([]);
  const [selectedCommune, setSelectedCommune] = useState(DEFAULT_BORDEAUX);
  const [isSearchingCommune, setIsSearchingCommune] = useState(false);

  // Rayon pour l'emprise carte (en mètres)
  const [mapRadius, setMapRadius] = useState(1000); // 500, 1000, 2000, 5000

  // Typologie d'ombrière sélectionnée (VL Auto par défaut)
  const [selectedTypology, setSelectedTypology] = useState('ombriere_vl_auto');

  // Critères de filtrage, puissance et dimensionnement
  const [minArea, setMinArea] = useState(220);
  const [targetLimit, setTargetLimit] = useState(10); // 10, 30, 50, 100, 'Tout'
  const [economicModel, setEconomicModel] = useState('vente_totale'); // 'vente_totale' | 'autoconsommation' | 'autoconsommation_stockage'
  const [minTargetKwc, setMinTargetKwc] = useState(100);
  const [maxTargetKwc, setMaxTargetKwc] = useState(500);
  const [tarifEdfOa, setTarifEdfOa] = useState(0.085);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Gestion du dossier local d'exportation (et mode Firefox natif)
  const isFirefoxBrowser = typeof window !== 'undefined' && !window.showDirectoryPicker;
  const [isFirefoxMode, setIsFirefoxMode] = useState(isFirefoxBrowser);
  const [bridgeStatus, setBridgeStatus] = useState({ online: false, checking: true });
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState(
    isFirefoxBrowser ? 'Téléchargements (Dossier Firefox)' : ''
  );
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [folderFeedback, setFolderFeedback] = useState(null);

  // Onglets du panneau droit
  const [rightPanelTab, setRightPanelTab] = useState('results'); // 'results' | 'logs'

  // État de l'exécution
  const [status, setStatus] = useState('idle'); // 'idle' | 'sourcing' | 'running' | 'completed' | 'aborted'
  const [currentStepText, setCurrentStepText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [detectedParkings, setDetectedParkings] = useState([]);
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
    return [44.8412, -0.5805]; // Par défaut : Bordeaux (33)
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
      if (defaultCommune && defaultCommune !== 'Bordeaux' && (!selectedCommune || selectedCommune.nom !== defaultCommune)) {
        setCommuneSearch(defaultCommune);
        searchCommunes(defaultCommune).then((results) => {
          if (results && results.length > 0) {
            setSelectedCommune(results[0]);
          }
        });
      } else if (!selectedCommune) {
        setSelectedCommune(DEFAULT_BORDEAUX);
        setCommuneSearch('Bordeaux');
      }
    }
  }, [isOpen, defaultCommune, refreshBridgeStatus]);

  // Autoscroll des logs
  useEffect(() => {
    if (rightPanelTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, rightPanelTab]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('fr-FR');
    setLogs(prev => [...prev.slice(-150), `[${time}] ${msg}`]);
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
    if (results.length > 0) {
      // Synchroniser la commune sélectionnée si elle ne correspond plus
      if (!selectedCommune || !selectedCommune.nom.toLowerCase().startsWith(text.trim().toLowerCase())) {
        setSelectedCommune(results[0]);
      }
    }
  };

  const handleSelectCommune = (c) => {
    setSelectedCommune(c);
    setCommuneSearch(c.nom);
    setCommuneSuggestions([]);
  };

  // Sélection du dossier local (File System Access API ou Mode Firefox)
  const handleSelectFolder = async () => {
    setIsSelectingFolder(true);
    setFolderFeedback(null);
    try {
      const res = await requestDirectoryPicker();
      if (res.success && res.handle) {
        setDirectoryHandle(res.handle);
        setSelectedFolderName(res.folderName || 'Dossier Local');
        setIsFirefoxMode(false);
        setFolderFeedback({
          type: 'success',
          message: `Dossier lié : "${res.folderName}". Les offres y seront enregistrées directement.`
        });
        addLog(`📁 Dossier local d'exportation sélectionné : "${res.folderName}"`);
      } else if (res.success && res.isFirefoxMode) {
        setIsFirefoxMode(true);
        setSelectedFolderName(res.folderName || 'Téléchargements (Dossier Firefox)');
        setFolderFeedback({
          type: 'success',
          message: 'Mode Firefox actif : Vos offres PDF seront enregistrées directement dans vos Téléchargements locaux.'
        });
        addLog(`🦊 Mode Firefox actif : Vos offres PDF seront enregistrées directement dans votre dossier Téléchargements.`);
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
  const handleDownloadZipBundle = async (customResults = null) => {
    const list = customResults || processedResults;
    if (!list || list.length === 0) return;
    try {
      setIsExportingZip(true);
      const zoneName = geoMode === 'commune' ? (selectedCommune?.nom || 'Bordeaux') : 'Emprise_Carte';
      const dateStr = new Date().toISOString().slice(0, 10);
      const zipName = `Offres_Ombrieres_${zoneName}_${dateStr}.zip`;
      addLog(`📦 Préparation de l'archive ZIP groupée (${list.length} fichiers)...`);
      await exportResultsAsZip(list, zipName);
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
  // ORCHESTRATEUR PRINCIPAL DU TUNNEL DE PROSPECTION OMBRIÈRES
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStartProspecting = async () => {
    isAbortedRef.current = false;
    setStatus('sourcing');
    setProgressPercent(0);
    setProcessedResults([]);
    setLogs([]);
    setRightPanelTab('results');

    const selectedTypoConfig = OMBRIERE_TYPOLOGIES[selectedTypology];
    addLog(`🚗 Démarrage du pipeline de prospection automatique d'ombrières (${selectedTypoConfig?.shortLabel || 'Ombrière'})...`);

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

      // 2. Sourcing géospatial Overpass API
      const effectiveLimit = targetLimit === 'Tout' ? 500 : Number(targetLimit);
      const limitLabel = targetLimit === 'Tout' ? 'tous les parkings éligibles' : `${targetLimit} parkings cibles`;
      setCurrentStepText(`Interrogation Overpass API des parkings ouverts (${limitLabel})...`);
      addLog(`🛰️ Recherche des parkings à l'air libre (Surface >= ${minArea} m² • Objectif : ${limitLabel})...`);

      const eligible = await fetchParkingsInBbox({
        bbox: targetBbox,
        minArea,
        limit: effectiveLimit,
        onProgress: (msg) => setCurrentStepText(msg)
      });

      setDetectedParkings(eligible);
      addLog(`✅ ${eligible.length} parkings à l'air libre identifiés (surface >= ${minArea} m²).`);

      if (eligible.length === 0) {
        setStatus('completed');
        setCurrentStepText('Aucun parking éligible dans cette zone.');
        addLog('⚠️ Aucun parking ne correspond strictement aux critères de surface et d’ouverture.');
        return;
      }

      // 3. Boucle de calepinage géométrique, simulation et export PDF
      setStatus('running');
      const results = [];

      for (let i = 0; i < eligible.length; i++) {
        if (isAbortedRef.current) {
          addLog('🛑 Prospection interrompue par l’utilisateur.');
          setStatus('aborted');
          break;
        }

        const p = eligible[i];
        const stepNum = i + 1;
        const total = eligible.length;
        setCurrentStepText(`Calepinage et simulation ${stepNum}/${total} : ${p.area} m²...`);
        addLog(`─── Parking ${stepNum}/${total} : ${p.area} m² [OSM ID: ${p.osmId}] ───`);

        // FILTRE 1 : Ombrières solaires déjà existantes (Image 4)
        if (p.hasExistingSolar) {
          addLog(`   ⚠️ Parking ignoré : ombrières solaires déjà existantes sur le site.`);
          continue;
        }

        // A. Géocodage BAN
        let addressInfo = null;
        try {
          addressInfo = await reverseGeocodeBAN(p.center[0], p.center[1]);
          if (addressInfo?.label) {
            addLog(`   📍 Adresse : ${addressInfo.label}`);
          }
        } catch (e) {}

        // B. Qualification cadastrale
        let cadastreInfo = null;
        try {
          cadastreInfo = await getCadastreParcel(p.center[0], p.center[1]);
          if (cadastreInfo?.parcelleRef) {
            addLog(`   📐 Cadastre : ${cadastreInfo.parcelleRef}`);
          }
        } catch (e) {}

        // C. Calepinage automatique & Simulation Headless (plafonné à 500 kWc)
        const sim = await simulateParkingHeadless({
          parking: p,
          addressInfo,
          cadastreInfo,
          customSettings: {
            typology: selectedTypology,
            costPerKwc: 1200,
            tarifEdfOa,
            minKwc: minTargetKwc,
            maxKwc: maxTargetKwc,
            economicModel,
            includeCoverLetter
          }
        });

        // FILTRE 2 : Tracé courbé / curviligne non adapté (Image 5)
        if (sim?.isCurved) {
          addLog(`   ⚠️ Parking ignoré : tracé courbé / curviligne non adapté aux ombrières linéaires.`);
          continue;
        }

        // FILTRE 3 : Implantation géométrique valide et puissance strictement comprise entre minTargetKwc et maxTargetKwc
        if (!sim || !sim.placedOmbrieres || sim.placedOmbrieres.length === 0) {
          addLog(`   ⚠️ Parking ignoré : géométrie non optimisable pour des rangées d'ombrières continues.`);
          continue;
        }

        if (sim.installedKwc < minTargetKwc || sim.installedKwc > maxTargetKwc) {
          addLog(`   ⚠️ Parking ignoré : puissance hors fourchette cible ${minTargetKwc}-${maxTargetKwc} kWc (${sim.installedKwc} kWc).`);
          continue;
        }

        if (sim.ownerName) {
          addLog(`   🏢 Propriétaire foncier identifié : ${sim.ownerName}`);
        }
        addLog(`   🚗 Implantation : ${sim.totalShelteredSpots} places abritées (${sim.placedOmbrieres.length} rangée(s))`);
        addLog(`   ⚡ Puissance : ${sim.installedKwc} kWc (${sim.panelCount} modules 465 Wc)`);
        if (economicModel === 'vente_totale') {
          addLog(`   💶 Production : ~${sim.annualProductionKwh?.toLocaleString('fr-FR')} kWh/an • CA Vente Totale (${tarifEdfOa} €/kWh) : ~${sim.annualRevenueReventeTotale?.toLocaleString('fr-FR')} €/an`);
        } else if (economicModel === 'autoconsommation_stockage') {
          addLog(`   💶 Production : ~${sim.annualProductionKwh?.toLocaleString('fr-FR')} kWh/an • Gains Autoconso 100% + Stockage : ~${sim.annualBenefitYear1?.toLocaleString('fr-FR')} €/an`);
        } else {
          addLog(`   💶 Production : ~${sim.annualProductionKwh?.toLocaleString('fr-FR')} kWh/an • Gains Autoconso + Surplus : ~${sim.annualBenefitYear1?.toLocaleString('fr-FR')} €/an`);
        }

        // D. Génération de l'Offre Commerciale PDF (1 page + courrier optionnel)
        setCurrentStepText(`Génération de l'offre PDF ${stepNum}/${total}...`);
        const pdfResult = await generateParkingProspectingPdfBlob(sim);

        if (!pdfResult || (!pdfResult.blob && !pdfResult.arrayBuffer)) {
          addLog(`   ❌ Échec génération PDF pour parking ${p.osmId}`);
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
          parking: p,
          simulation: sim,
          filename: pdfResult.filename,
          blob: pdfResult.blob,
          arrayBuffer: pdfResult.arrayBuffer,
          addressLabel: addressInfo?.label || `${p.area} m² - Commune de ${selectedCommune?.nom || 'Secteur'}`,
          cadastreRef: cadastreInfo?.parcelleRef || 'Parcelle non cadastrée',
          saveResult: saveRes
        };

        results.push(rowItem);
        setProcessedResults([...results]);
        setProgressPercent(Math.round(((i + 1) / total) * 100));
      }

      if (!isAbortedRef.current) {
        setStatus('completed');
        setCurrentStepText('Prospection d’ombrières terminée avec succès !');
        addLog(`🎉 Succès : ${results.length} offres commerciales PDF d'ombrières générées.`);

        if (bridgeStatus.online) {
          openLocalFolderInExplorer();
        } else if (!directoryHandle && results.length > 0) {
          addLog(`📦 Mode Firefox : Téléchargement automatique de l'archive ZIP (${results.length} offres)...`);
          await handleDownloadZipBundle(results);
        }
      }
    } catch (err) {
      console.error('Erreur prospection automatique ombrières:', err);
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
  const totalSpotsCumul = useMemo(() => {
    return processedResults.reduce((acc, r) => acc + (r.simulation?.totalShelteredSpots || 0), 0);
  }, [processedResults]);

  const totalKwcCumul = useMemo(() => {
    return processedResults.reduce((acc, r) => acc + (r.simulation?.installedKwc || 0), 0).toFixed(1);
  }, [processedResults]);

  const totalRevenueCumul = useMemo(() => {
    return processedResults.reduce((acc, r) => acc + (r.simulation?.annualRevenueReventeTotale || 0), 0);
  }, [processedResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-[65px] bottom-0 z-[9990] flex items-center justify-center p-2 sm:p-3 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-[98vw] max-w-[1550px] 2xl:max-w-[1860px] h-[calc(100vh-85px)] max-h-[calc(100vh-85px)] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* ─── 1. EN-TÊTE SUPÉRIEUR COMPACT & ÉLÉGANT ────────────────────── */}
        <div className="bg-[#0e2b4d] text-white px-5 py-3 sm:py-3.5 border-b border-white/10 shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 shrink-0">
                <Car className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
                    Automate de Prospection d'Ombrières de Parking
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Mode Headless
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Calepinage Auto
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  Sourcing OSM (parkings ≥ 220 m² à l'air libre), calcul géométrique d'orientation, dimensionnement PV 465 Wc &amp; PDF commercial.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={status === 'running' || status === 'sourcing' ? handleStop : onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ─── BANDEAU STATUT DOSSIER & AGENT LOCAL ───────────────────────── */}
          <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px]">Dossier d'exportation :</span>

              {directoryHandle ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-black shadow-xs text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dossier actif : <code>{selectedFolderName || directoryHandle.name}</code></span>
                </div>
              ) : isFirefoxMode ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-black shadow-xs text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mode Firefox actif : <code>{selectedFolderName || 'Téléchargements (Dossier Firefox)'}</code></span>
                </div>
              ) : bridgeStatus.online ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-black shadow-xs text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  <span>Agent local : <code>{bridgeStatus.targetDir || 'C:\\Users\\Utilisateur\\PDF OMBRIERES'}</code></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 font-semibold text-[11px]">
                  <FolderOpen className="w-3 h-3 text-amber-400" />
                  <span>Aucun dossier sélectionné</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isSelectingFolder}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              >
                {isSelectingFolder ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderDown className="w-3.5 h-3.5" />
                )}
                <span>{directoryHandle ? 'Changer de dossier' : 'Sélectionner le dossier'}</span>
              </button>

              {bridgeStatus.online && (
                <button
                  type="button"
                  onClick={openLocalFolderInExplorer}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3 text-amber-400" />
                  <span>Explorateur</span>
                </button>
              )}

              <button
                type="button"
                onClick={refreshBridgeStatus}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Actualiser le statut de l'agent local"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 2. CORPS PRINCIPAL EN 2 COLONNES (SANS SCROLL GAUCHE NÉCESSAIRE) ─── */}
        <div className="p-2.5 sm:p-3.5 overflow-hidden flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 bg-slate-100/70">

          {/* ═══ COLONNE GAUCHE (5 cols) : PARAMÈTRES ET CONFIGURATION ════ */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-2 overflow-y-auto overflow-x-hidden pr-1 min-w-0">

            {/* CARTE 1 : ZONE GÉOGRAPHIQUE */}
            <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  1. Zone Géographique
                </label>

                {/* SELECTEUR D'ONGLET COMMUNE / EMPRISE CARTE */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setGeoMode('commune')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] transition-all ${
                      geoMode === 'commune'
                        ? 'bg-[#0e2b4d] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Par Commune
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeoMode('bbox')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] transition-all ${
                      geoMode === 'bbox'
                        ? 'bg-[#0e2b4d] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Emprise Carte
                  </button>
                </div>
              </div>

              {/* CONTENU MODE COMMUNE */}
              {geoMode === 'commune' && (
                <div className="relative space-y-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={communeSearch}
                      onChange={(e) => handleSearchCommunes(e.target.value)}
                      placeholder="Nom de la commune ou code postal (ex: Bordeaux, Auch...)"
                      className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-xs"
                      disabled={status === 'running' || status === 'sourcing'}
                    />
                    {isSearchingCommune && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {communeSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-44 overflow-y-auto divide-y divide-slate-100">
                      {communeSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCommune(c)}
                          className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                        >
                          <span>{c.nom} ({c.postalCode})</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{c.departmentCode} • pop: {c.population.toLocaleString('fr-FR')}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCommune && (
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Commune : <strong>{selectedCommune.nom}</strong> ({selectedCommune.postalCode})
                        <span className="text-slate-500 font-normal"> — Cadastre IGN &amp; contours prêts.</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CONTENU MODE EMPRISE CARTE */}
              {geoMode === 'bbox' && (
                <div className="space-y-1">
                  <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1 text-slate-900 text-[10.5px]">
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        Position :
                      </span>
                      <code className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">
                        {activeCenter[0].toFixed(4)}°N, {activeCenter[1].toFixed(4)}°E
                      </code>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { radius: 500, label: '500 m' },
                        { radius: 1000, label: '1 km' },
                        { radius: 2000, label: '2 km' },
                        { radius: 5000, label: '5 km' }
                      ].map((r) => (
                        <button
                          key={r.radius}
                          type="button"
                          onClick={() => setMapRadius(r.radius)}
                          className={`py-0.5 px-1 rounded-lg text-center text-[11px] font-black transition-all ${
                            mapRadius === r.radius
                              ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-300'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CARTE 2 : TYPOLOGIE D'OMBRIÈRE */}
            <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
              <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-amber-600" />
                2. Typologie d'Ombrière à Déployer
              </label>

              {/* LIGNE 1 : VÉHICULES LÉGERS (VL) */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                  <Car className="w-3 h-3 text-slate-400" />
                  <span>Véhicules Légers (VL)</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    {
                      id: 'ombriere_vl_auto',
                      title: 'Mixte VL (Auto)',
                      desc: 'Double (10m) + Simple (5m)'
                    },
                    {
                      id: 'ombriere_vl_double',
                      title: '100% VL Double',
                      desc: 'Larg. 10m • 4 pl./travée'
                    },
                    {
                      id: 'ombriere_vl_simple',
                      title: '100% VL Simple',
                      desc: 'Larg. 5m • 2 pl./travée'
                    }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedTypology(item.id)}
                      className={`p-1.5 rounded-xl text-left transition-all border cursor-pointer ${
                        selectedTypology === item.id
                          ? 'bg-[#0e2b4d] text-white border-slate-900 shadow-md ring-1 ring-amber-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-black text-[11px] leading-snug">{item.title}</div>
                      <div className={`text-[9px] mt-0.5 leading-tight ${selectedTypology === item.id ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* LIGNE 2 : POIDS LOURDS (PL) */}
              <div className="space-y-0.5 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                  <Truck className="w-3 h-3 text-amber-500" />
                  <span>Ombrières Poids Lourds (PL)</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    {
                      id: 'ombriere_pl_15_8',
                      title: 'PL 15.8 m',
                      desc: 'Porteurs • 1 pl./travée'
                    },
                    {
                      id: 'ombriere_pl_20_2',
                      title: 'PL 20.2 m',
                      desc: 'Semi-remorques • 1 pl./travée'
                    },
                    {
                      id: 'ombriere_pl_24_6',
                      title: 'PL 24.6 m',
                      desc: 'Grands ensembles • 1 pl.'
                    }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedTypology(item.id)}
                      className={`p-1.5 rounded-xl text-left transition-all border cursor-pointer ${
                        selectedTypology === item.id
                          ? 'bg-[#0e2b4d] text-white border-slate-900 shadow-md ring-1 ring-amber-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-black text-[11px] leading-snug">{item.title}</div>
                      <div className={`text-[9px] mt-0.5 leading-tight ${selectedTypology === item.id ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CARTE 3 : PARAMÈTRES TECHNIQUES & OBJECTIFS */}
            <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                  3. Objectifs &amp; Modèle Économique
                </label>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  {showAdvanced ? 'Masquer' : 'Ajuster m²'}
                </button>
              </div>

              {/* SÉLECTEUR DU MODÈLE ÉCONOMIQUE (3 BOUTONS) */}
              <div className="bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black text-slate-800 flex items-center gap-1">
                    <Euro className="w-3 h-3 text-blue-600" />
                    Valorisation de l'électricité :
                  </span>
                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${
                    economicModel === 'vente_totale'
                      ? 'text-blue-700 bg-blue-100/80 border-blue-300'
                      : economicModel === 'autoconsommation_stockage'
                      ? 'text-purple-700 bg-purple-100/80 border-purple-300'
                      : 'text-emerald-700 bg-emerald-100/80 border-emerald-300'
                  }`}>
                    {economicModel === 'vente_totale' ? 'Vente Totale 100%' : economicModel === 'autoconsommation_stockage' ? 'Autoconso + Stockage' : 'Autoconso + Surplus'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setEconomicModel('vente_totale')}
                    className={`p-1.5 rounded-xl text-left transition-all border cursor-pointer ${
                      economicModel === 'vente_totale'
                        ? 'bg-[#0e2b4d] text-white border-slate-900 shadow-sm ring-1 ring-blue-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-black text-[10px]">Vente Totale</div>
                      {economicModel === 'vente_totale' && <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />}
                    </div>
                    <div className={`text-[8.5px] mt-0.5 leading-tight ${economicModel === 'vente_totale' ? 'text-blue-200 font-medium' : 'text-slate-500'}`}>
                      100% à {tarifEdfOa} €/kWh
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEconomicModel('autoconsommation')}
                    className={`p-1.5 rounded-xl text-left transition-all border cursor-pointer ${
                      economicModel === 'autoconsommation'
                        ? 'bg-[#0e2b4d] text-white border-slate-900 shadow-sm ring-1 ring-emerald-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-black text-[10px]">Autoconso + Surplus</div>
                      {economicModel === 'autoconsommation' && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                    </div>
                    <div className={`text-[8.5px] mt-0.5 leading-tight ${economicModel === 'autoconsommation' ? 'text-emerald-200 font-medium' : 'text-slate-500'}`}>
                      Écon. + rachat surplus
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEconomicModel('autoconsommation_stockage')}
                    className={`p-1.5 rounded-xl text-left transition-all border cursor-pointer ${
                      economicModel === 'autoconsommation_stockage'
                        ? 'bg-[#0e2b4d] text-white border-slate-900 shadow-sm ring-1 ring-purple-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-black text-[10px]">Autoconso + Stockage</div>
                      {economicModel === 'autoconsommation_stockage' && <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />}
                    </div>
                    <div className={`text-[8.5px] mt-0.5 leading-tight ${economicModel === 'autoconsommation_stockage' ? 'text-purple-200 font-medium' : 'text-slate-500'}`}>
                      100% autoconsommé
                    </div>
                  </button>
                </div>
              </div>

              {/* PUISSANCE CIBLE MIN & MAX + TARIF EDF OA */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Puissance cible (kWc) :
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="block text-slate-500 font-bold text-[8px]">Min (kWc)</label>
                      <input
                        type="number"
                        value={minTargetKwc}
                        onChange={(e) => setMinTargetKwc(Math.max(10, Number(e.target.value)))}
                        className="w-full p-1 bg-white border border-slate-300 rounded-lg font-black text-slate-800 text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold text-[8px]">Max (kWc)</label>
                      <input
                        type="number"
                        value={maxTargetKwc}
                        onChange={(e) => setMaxTargetKwc(Math.max(minTargetKwc, Number(e.target.value)))}
                        className="w-full p-1 bg-white border border-slate-300 rounded-lg font-black text-slate-800 text-xs text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                    <Euro className="w-3 h-3 text-blue-600" />
                    Tarif EDF OA (€/kWh) :
                  </span>
                  <div>
                    <label className="block text-slate-500 font-bold text-[8px]">Achat EDF OA libre</label>
                    <input
                      type="number"
                      step="0.001"
                      value={tarifEdfOa}
                      onChange={(e) => setTarifEdfOa(parseFloat(e.target.value) || 0)}
                      className="w-full p-1 bg-white border border-slate-300 rounded-lg font-black text-blue-700 text-xs text-center"
                      placeholder="0.085"
                    />
                  </div>
                </div>
              </div>

              {/* SÉLECTEUR DU NOMBRE DE PARKINGS CIBLES (10, 30, 50, 100, Tout) */}
              <div className="bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black text-slate-800 flex items-center gap-1">
                    <Warehouse className="w-3 h-3 text-emerald-600" />
                    Parkings cibles :
                  </span>
                  <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md border border-emerald-300">
                    {targetLimit === 'Tout' ? 'Tous les parkings' : `${targetLimit} parkings`}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {[10, 30, 50, 100, 'Tout'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTargetLimit(val)}
                      className={`py-1 px-1 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
                        targetLimit === val
                          ? 'bg-[#0e2b4d] text-white shadow-xs ring-1 ring-emerald-400 scale-[1.02]'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {val === 'Tout' ? 'Tout' : `${val}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* OPTION COURRIER DE PROSPECTION (PAGE 2) */}
              <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black text-slate-800 leading-tight">Courrier de prospection (Page 2)</div>
                      <div className="text-[8.5px] text-slate-500 leading-tight">Lettre personnalisée Loi APER &amp; proposition d'échange</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCoverLetter}
                    onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                </label>
              </div>

              {/* Grille des critères */}
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase block">Puissance ciblée</span>
                  <strong className="text-emerald-700 font-black text-[10.5px]">{minTargetKwc} à {maxTargetKwc} kWc</strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase block">Surface parking min</span>
                  <strong className="text-slate-900 font-black text-[10.5px]">≥ {minArea} m²</strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase block">Tarif &amp; Modèle</span>
                  <strong className="text-blue-700 font-black text-[10.5px]">
                    {economicModel === 'vente_totale' ? `${tarifEdfOa} €/kWh` : economicModel === 'autoconsommation_stockage' ? 'Autoconso + Stockage' : 'Autoconso + Surplus'}
                  </strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase block">Financement</span>
                  <strong className="text-slate-900 font-black text-[10.5px]">Crédit &amp; SunLib</strong>
                </div>
              </div>

              {showAdvanced && (
                <div className="pt-1 border-t border-slate-200 text-xs">
                  <label className="block text-slate-500 font-bold mb-0.5 text-[9.5px]">Surface minimale requise (m²) :</label>
                  <input
                    type="number"
                    value={minArea}
                    onChange={(e) => setMinArea(Math.max(100, Number(e.target.value)))}
                    className="w-full p-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                  />
                </div>
              )}
            </div>

            {/* GRAND BOUTON D'ACTION PRINCIPAL */}
            <div className="pt-0.5 w-full flex justify-center">
              {status === 'running' || status === 'sourcing' ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="w-[96%] max-w-full min-w-0 py-2.5 sm:py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer overflow-hidden"
                >
                  <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span className="truncate">Interrompre la Prospection</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartProspecting}
                  disabled={geoMode === 'commune' && !selectedCommune}
                  className="w-[96%] max-w-full min-w-0 py-2.5 sm:py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:brightness-105 active:scale-[0.99] cursor-pointer overflow-hidden"
                >
                  <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span className="truncate">
                    Lancer la Prospection Ombrières
                    {geoMode === 'commune'
                      ? ` (${selectedCommune?.nom || communeSearch || 'Commune'} - ${targetLimit === 'Tout' ? 'Tout' : `${targetLimit} parkings`})`
                      : ` (Emprise Carte - ${targetLimit === 'Tout' ? 'Tout' : `${targetLimit} parkings`})`}
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
                  <Warehouse className="w-3 h-3 text-emerald-400" /> Parkings Cibles
                </span>
                <strong className="text-xl font-black text-white">{detectedParkings.length}</strong>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Car className="w-3 h-3 text-cyan-400" /> Places Abritées
                </span>
                <strong className="text-xl font-black text-cyan-400">{totalSpotsCumul}</strong>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Puissance Cumulée
                </span>
                <strong className="text-xl font-black text-amber-400">{totalKwcCumul} kWc</strong>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Euro className="w-3 h-3 text-emerald-400" /> CA Estimé EDF OA
                </span>
                <strong className="text-xl font-black text-emerald-400">{totalRevenueCumul.toLocaleString('fr-FR')} €/an</strong>
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
                  onClick={() => handleDownloadZipBundle()}
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

              {/* VUE 1 : TABLEAU DES OFFRES D'OMBRIÈRES GÉNÉRÉES */}
              {rightPanelTab === 'results' && (
                <div className="overflow-y-auto flex-1 p-2 divide-y divide-slate-800/80">
                  {processedResults.length === 0 ? (
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <Car className="w-10 h-10 stroke-1 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-400">
                        Aucune offre d'ombrière générée pour le moment.
                      </p>
                      <p className="text-[11px] text-slate-600 max-w-sm">
                        Sélectionnez une commune ou l'emprise de la carte, choisissez votre typologie, puis cliquez sur <strong>"Lancer la Prospection Ombrières"</strong>.
                      </p>
                    </div>
                  ) : (
                    processedResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 hover:bg-slate-900/60 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs shrink-0">
                            #{idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-white truncate max-w-xs sm:max-w-md">
                              {item.addressLabel}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                              <span>📐 {item.cadastreRef}</span>
                              <span>•</span>
                              <span>Parking : <strong>{item.parking.area} m²</strong></span>
                              <span>•</span>
                              <span className="text-cyan-400 font-bold">🚗 {item.simulation?.totalShelteredSpots} places</span>
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

        {/* ─── 3. PIED DE PAGE DU MODAL COMPACT ───────────────────────── */}
        <div className="px-5 py-2.5 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Offres dimensionnées aux modules bi-verre 465 Wc • Puissances ciblées {minTargetKwc} à {maxTargetKwc} kWc • {economicModel === 'vente_totale' ? `Vente Totale EDF OA (${tarifEdfOa} €/kWh)` : economicModel === 'autoconsommation_stockage' ? 'Autoconsommation 100% + Stockage' : 'Autoconsommation + Vente Surplus'}.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
