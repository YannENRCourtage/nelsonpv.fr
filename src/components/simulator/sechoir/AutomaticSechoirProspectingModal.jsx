import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Search, Leaf, MapPin, FolderDown, FolderOpen,
  FileText, CheckCircle2, AlertCircle, Loader2, Play, Square,
  RotateCcw, SlidersHorizontal, HardDrive, Compass, Euro,
  Download, Archive, X, ShieldCheck, Warehouse, ExternalLink,
  ChevronRight, Wheat, Check, Filter, Building2
} from 'lucide-react';

import {
  DEPARTEMENTS_FRANCE,
  RPG_BATITECH_CROP_MAPPING,
  searchCommunes,
  fetchDepartmentCommunes,
  fetchRpgParcelsInBbox,
  groupParcelsByPacage,
  reverseGeocodeBAN
} from '@/services/sechoirProspectingGisService';

import {
  simulateFarmHeadless,
  generateSechoirProspectingPdfBlob
} from '@/services/sechoirHeadlessSimulationEngine';

import {
  checkLocalBridgeHealth,
  openLocalFolderInExplorer,
  savePdfToLocalDestination,
  requestDirectoryPicker,
  exportResultsAsZip
} from '@/services/localPdfExportService';

import useSechoirStore from '@/stores/useSechoirStore';

// Profil géographique par défaut : Samatan / Gers (32) ou Mont-de-Marsan (40)
const DEFAULT_COMMUNE = {
  id: '40192',
  nom: 'Mont-de-Marsan',
  codeInsee: '40192',
  postalCode: '40000',
  departmentCode: '40',
  center: [43.8912, -0.4995],
  bbox: {
    minLat: 43.8650,
    minLng: -0.5400,
    maxLat: 43.9250,
    maxLng: -0.4500
  },
  population: 31000
};

export default function AutomaticSechoirProspectingModal({
  isOpen,
  onClose,
  defaultCommune = 'Mont-de-Marsan',
  onSelectProspect = null
}) {
  // Mode de sélection géographique : 'commune' | 'departement'
  const [geoMode, setGeoMode] = useState('commune');

  // Recherche par commune
  const [communeSearch, setCommuneSearch] = useState(defaultCommune || 'Mont-de-Marsan');
  const [communeSuggestions, setCommuneSuggestions] = useState([]);
  const [selectedCommune, setSelectedCommune] = useState(DEFAULT_COMMUNE);
  const [isSearchingCommune, setIsSearchingCommune] = useState(false);

  // Recherche par département entier
  const [selectedDeptCode, setSelectedDeptCode] = useState('40'); // Landes par défaut
  const [deptSearch, setDeptSearch] = useState('');

  // Filières prioritaires sélectionnées (Toutes par défaut)
  const [selectedStreams, setSelectedStreams] = useState([
    'fourrage_vrac',
    'bottes_carrees',
    'cereales_ble',
    'cereales_mais',
    'plaquettes_bois'
  ]);

  // Critères de rentabilité & dimensionnement
  const [targetRoi, setTargetRoi] = useState(15.0); // ROI STRICTEMENT < 15 ans
  const [targetLimit, setTargetLimit] = useState(10); // 10, 25, 50, 'Tout'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedBuildingModel, setSelectedBuildingModel] = useState('auto'); // 'auto' | 'BT-3.1.15' | 'BT-6.2.15' | 'BT-8.3.15'

  // Dossier local d'exportation
  const isFirefoxBrowser = typeof window !== 'undefined' && !window.showDirectoryPicker;
  const [isFirefoxMode, setIsFirefoxMode] = useState(isFirefoxBrowser);
  const [bridgeStatus, setBridgeStatus] = useState({ online: false, checking: true });
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState(
    isFirefoxBrowser ? 'Téléchargements (Dossier Firefox)' : ''
  );
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [folderFeedback, setFolderFeedback] = useState(null);

  // Onglets du panneau droit : 'results' | 'logs'
  const [rightPanelTab, setRightPanelTab] = useState('results');

  // État de l'exécution
  const [status, setStatus] = useState('idle'); // 'idle' | 'sourcing' | 'running' | 'completed' | 'aborted'
  const [currentStepText, setCurrentStepText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Résultats & logs
  const [detectedFarms, setDetectedFarms] = useState([]);
  const [processedResults, setProcessedResults] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const abortControllerRef = useRef(false);
  const logsEndRef = useRef(null);

  const appendLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Défilement automatique du journal
  useEffect(() => {
    if (rightPanelTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, rightPanelTab]);

  // Recherche dynamique de commune avec debounce
  useEffect(() => {
    if (geoMode !== 'commune') return;
    if (!communeSearch || communeSearch.trim().length < 2) {
      setCommuneSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCommune(true);
      try {
        const results = await searchCommunes(communeSearch);
        setCommuneSuggestions(results);
      } catch (err) {
        setCommuneSuggestions([]);
      } finally {
        setIsSearchingCommune(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [communeSearch, geoMode]);

  // Vérification de santé du bridge local
  useEffect(() => {
    let isMounted = true;
    checkLocalBridgeHealth().then((res) => {
      if (isMounted) {
        setBridgeStatus({ online: res.online, checking: false });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle d'une filière prioritaire
  const toggleStream = (streamId) => {
    setSelectedStreams((prev) => {
      if (prev.includes(streamId)) {
        if (prev.length === 1) return prev; // Au moins 1 filière active
        return prev.filter((id) => id !== streamId);
      }
      return [...prev, streamId];
    });
  };

  // Sélection du dossier de destination local
  const handleSelectFolder = async () => {
    setIsSelectingFolder(true);
    setFolderFeedback(null);
    try {
      const handle = await requestDirectoryPicker();
      if (handle) {
        setDirectoryHandle(handle);
        setSelectedFolderName(handle.name);
        setFolderFeedback({
          type: 'success',
          message: `Dossier lié : "${handle.name}". Sauvegarde directe activée.`
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setFolderFeedback({
          type: 'error',
          message: 'Impossible de lier ce dossier. Utilisation du téléchargement direct.'
        });
      }
    } finally {
      setIsSelectingFolder(false);
    }
  };

  // Arrêt d'urgence de la prospection
  const handleStop = () => {
    abortControllerRef.current = true;
    setStatus('aborted');
    setCurrentStepText('Prospection interrompue par l’utilisateur.');
    appendLog('⚠️ Prospection interrompue manuellement.');
  };

  // Réinitialisation de l'automate
  const handleReset = () => {
    abortControllerRef.current = false;
    setStatus('idle');
    setCurrentStepText('');
    setProgressPercent(0);
    setDetectedFarms([]);
    setProcessedResults([]);
    setLogs([]);
  };

  // ═══ RECALCUL INSTANTANÉ PAR MODIFICATION DU TYPE DE BÂTIMENT ═══════════════
  const recalculateSimulations = useCallback((modelId) => {
    const sourceFarms = detectedFarms.length > 0
      ? detectedFarms
      : processedResults.map((p) => ({
          pacage: p.pacage,
          addressLabel: p.addressLabel,
          city: p.commune,
          postalCode: p.codePostal,
          centroid: p.coords,
          totalAreaHa: p.totalAreaHa,
          cropsSummary: p.cropsSummary,
          streamsAreaHa: p.streamsAreaHa,
          streamTonnages: p.streamTonnages,
          totalDryTonnage: p.totalDryTonnage,
        }));

    if (sourceFarms.length === 0) return;

    const deptCode = geoMode === 'commune'
      ? selectedCommune?.departmentCode || '40'
      : selectedDeptCode;

    appendLog(`🔄 Recalcul instantané avec le type de bâtiment : ${modelId === 'auto' ? 'Auto (Optimal)' : modelId}...`);

    const updated = [];
    const effectiveLimit = targetLimit === 'Tout' ? sourceFarms.length : Number(targetLimit);

    for (let idx = 0; idx < sourceFarms.length; idx++) {
      if (updated.length >= effectiveLimit) break;
      const farm = sourceFarms[idx];

      // Vérifier si le prospect avait déjà un candidateMap pour bascule immédiate en 0ms
      const existing = processedResults.find((p) => p.pacage === farm.pacage);
      if (existing?.candidateMap && modelId !== 'auto' && existing.candidateMap[modelId]) {
        const cand = existing.candidateMap[modelId];
        if (cand.roi < targetRoi) {
          updated.push({
            ...existing,
            bestModelId: cand.modelId,
            model: cand.model,
            materials: cand.materials,
            simulation: cand.sim,
            totalDryingVolumeUsed: cand.totalDryingVolume,
            filename: `Offre_Etude_Sechoir_BatiTech_${cand.modelId}_PACAGE_${farm.pacage}.pdf`
          });
          continue;
        }
      }

      // Simulation headless avec le modèle forcé
      const prospect = simulateFarmHeadless({
        farm,
        departement: deptCode,
        targetRoi: Number(targetRoi),
        priorityStreams: selectedStreams,
        customFinancialParams: {},
        forcedModelId: modelId
      });

      if (prospect) {
        updated.push(prospect);
      }
    }

    setProcessedResults(updated);
    setCurrentStepText(`Modèle appliqué : ${modelId === 'auto' ? 'Auto (Optimal)' : modelId} — ${updated.length} exploitations rentables (ROI < ${targetRoi} ans).`);
    appendLog(`✅ Recalcul terminé : ${updated.length} exploitations rentables pour ce type de bâtiment.`);
  }, [detectedFarms, processedResults, geoMode, selectedCommune, selectedDeptCode, targetLimit, targetRoi, selectedStreams, appendLog]);

  // Gestionnaire de changement global du modèle de bâtiment
  const handleBuildingModelChange = (modelId) => {
    setSelectedBuildingModel(modelId);
    if (detectedFarms.length > 0 || processedResults.length > 0) {
      recalculateSimulations(modelId);
    }
  };

  // Gestionnaire de changement du modèle pour une exploitation individuelle
  const handleSwitchFarmModel = (pacage, modelId) => {
    setProcessedResults((prev) =>
      prev.map((item) => {
        if (item.pacage !== pacage) return item;
        if (modelId === 'auto') {
          const bestCand = item.allCandidates?.[0];
          if (!bestCand || !item.candidateMap?.[bestCand.modelId]) return item;
          const c = item.candidateMap[bestCand.modelId];
          return {
            ...item,
            bestModelId: c.modelId,
            model: c.model,
            materials: c.materials,
            simulation: c.sim,
            totalDryingVolumeUsed: c.totalDryingVolume,
            filename: `Offre_Etude_Sechoir_BatiTech_${c.modelId}_PACAGE_${item.pacage}.pdf`
          };
        }
        if (item.candidateMap?.[modelId]) {
          const c = item.candidateMap[modelId];
          return {
            ...item,
            bestModelId: c.modelId,
            model: c.model,
            materials: c.materials,
            simulation: c.sim,
            totalDryingVolumeUsed: c.totalDryingVolume,
            filename: `Offre_Etude_Sechoir_BatiTech_${c.modelId}_PACAGE_${item.pacage}.pdf`
          };
        }
        return item;
      })
    );
    appendLog(`🔄 Exploitation PACAGE ${pacage} : modèle basculé sur ${modelId}`);
  };

  // ═══ ALGORITHME PRINCIPAL DE PROSPECTION SÉCHOIRS BATITECH ═══════════════════
  const handleStartProspecting = async () => {
    abortControllerRef.current = false;
    setStatus('sourcing');
    setProgressPercent(5);
    setDetectedFarms([]);
    setProcessedResults([]);
    setLogs([]);

    const startTime = Date.now();
    appendLog('🚀 Démarrage de l’Automate Séchoirs BatiTech®...');
    appendLog(`⚙️ Critère strict d’éligibilité : Temps de Retour sur Investissement (ROI) < ${targetRoi} ans.`);

    try {
      let bboxesToQuery = [];
      let deptCode = '40';

      if (geoMode === 'commune') {
        if (!selectedCommune || !selectedCommune.bbox) {
          throw new Error('Veuillez sélectionner une commune valide disposant d’une emprise géographique.');
        }
        deptCode = selectedCommune.departmentCode || '40';
        bboxesToQuery.push({
          nom: selectedCommune.nom,
          bbox: selectedCommune.bbox,
          code: selectedCommune.codeInsee
        });
        setCurrentStepText(`Interrogation IGN RPG 2024 sur ${selectedCommune.nom} (${deptCode})...`);
        appendLog(`📍 Zone ciblée : Commune de ${selectedCommune.nom} (${selectedCommune.postalCode || deptCode}).`);
      } else {
        // Mode Département
        deptCode = selectedDeptCode;
        const deptObj = DEPARTEMENTS_FRANCE.find((d) => d.code === deptCode);
        setCurrentStepText(`Sourcing des communes agricoles du département ${deptCode} (${deptObj?.nom || ''})...`);
        appendLog(`🗺️ Zone ciblée : Département entier ${deptCode} - ${deptObj?.nom || ''} (${deptObj?.region || ''}).`);

        const communesInDept = await fetchDepartmentCommunes(deptCode, 20);
        if (communesInDept.length === 0) {
          throw new Error(`Aucune commune trouvée pour le département ${deptCode}.`);
        }
        bboxesToQuery = communesInDept.map((c) => ({
          nom: c.nom,
          bbox: c.bbox,
          code: c.codeInsee
        }));
        appendLog(`🔍 ${bboxesToQuery.length} zones communales agricoles sélectionnées pour l’exploration.`);
      }

      // ─── 1. SOURCING WFS RPG 2024 ──────────────────────────────────────────
      setProgressPercent(15);
      let allRawFeatures = [];

      for (let i = 0; i < bboxesToQuery.length; i++) {
        if (abortControllerRef.current) break;
        const zone = bboxesToQuery[i];
        setCurrentStepText(`Extraction des parcelles RPG 2024 : ${zone.nom} (${i + 1}/${bboxesToQuery.length})...`);
        const features = await fetchRpgParcelsInBbox(zone.bbox, 250);
        allRawFeatures.push(...features);
        appendLog(`🌾 ${zone.nom} : ${features.length} parcelles déclarées récupérées.`);

        const pct = 15 + Math.round(((i + 1) / bboxesToQuery.length) * 25);
        setProgressPercent(pct);
      }

      if (abortControllerRef.current) return;

      appendLog(`📊 Total parcelles brutes collectées : ${allRawFeatures.length}`);
      if (allRawFeatures.length === 0) {
        setStatus('completed');
        setCurrentStepText('Aucune parcelle agricole RPG 2024 recensée sur cette zone.');
        appendLog('⚠️ Aucune parcelle agricole trouvée sur l’emprise sélectionnée.');
        return;
      }

      // ─── 2. REGROUPEMENT PAR PACAGE & CONVERSION DES CULTURES ──────────────
      setCurrentStepText('Agrégation agronomique des exploitations par numéro PACAGE...');
      setProgressPercent(45);
      const farms = groupParcelsByPacage(allRawFeatures);
      setDetectedFarms(farms);
      appendLog(`🚜 ${farms.length} exploitations agricoles distinctes (PACAGE) identifiées avec potentiel séchage.`);

      if (farms.length === 0) {
        setStatus('completed');
        setCurrentStepText('Aucune exploitation avec cultures adaptées au séchage (>10 t MS/an).');
        appendLog('⚠️ Aucune exploitation avec gisement suffisant de fourrage, céréales, maïs ou bois.');
        return;
      }

      // ─── 3. SIMULATION HEADLESS MULTI-MODÈLES & FILTRE ROI < 15 ANS ─────────
      setStatus('running');
      setProgressPercent(50);
      const resultsAccumulator = [];
      const effectiveLimit = targetLimit === 'Tout' ? farms.length : Number(targetLimit);

      for (let idx = 0; idx < farms.length; idx++) {
        if (abortControllerRef.current) break;
        if (resultsAccumulator.length >= effectiveLimit) {
          appendLog(`🎯 Limite de ${effectiveLimit} exploitations éligibles atteinte.`);
          break;
        }

        const farm = farms[idx];
        const stepProgress = 50 + Math.round(((idx + 1) / farms.length) * 45);
        setProgressPercent(stepProgress);
        setCurrentStepText(`Évaluation BatiTech exploitation #${idx + 1}/${farms.length} (PACAGE ${farm.pacage})...`);

        // Reverse géocodage BAN pour obtenir l'adresse postale et la commune réelle
        const banAddress = await reverseGeocodeBAN(farm.centroid[0], farm.centroid[1]);
        farm.addressLabel = banAddress.addressLabel;
        farm.city = banAddress.city;
        farm.postalCode = banAddress.postalCode;

        // Simulation headless multi-modèles (BT-3.1.15, BT-6.2.15, BT-8.3.15)
        const prospect = simulateFarmHeadless({
          farm,
          departement: deptCode,
          targetRoi: Number(targetRoi),
          priorityStreams: selectedStreams,
          customFinancialParams: {},
          forcedModelId: selectedBuildingModel
        });

        // Contrôle strict du critère éliminatoire (ROI < 15 ans)
        if (!prospect) {
          appendLog(`⏩ PACAGE ${farm.pacage} écarté : ROI ≥ ${targetRoi} ans ou gisement insuffisant.`);
          continue;
        }

        // Prospect retenu !
        resultsAccumulator.push(prospect);
        setProcessedResults([...resultsAccumulator]);

        appendLog(
          `✅ Offre éligible retenue #${resultsAccumulator.length} : PACAGE ${farm.pacage} (${prospect.commune || 'Agricole'}) ` +
          `• Modèle : ${prospect.bestModelId} (${prospect.model.puissanceKwc} kWc) ` +
          `• Séchage : ${prospect.totalDryingVolumeUsed} t/an ` +
          `• ROI : ${prospect.simulation.roi} ans (Strictement < ${targetRoi} ans) ` +
          `• Gain net : +${prospect.simulation.gainNetAnnuel?.toLocaleString('fr-FR')} €/an.`
        );

        // Sauvegarde automatique directe si un dossier local est lié
        if (directoryHandle) {
          try {
            const { blob } = await generateSechoirProspectingPdfBlob(prospect);
            await savePdfToLocalDestination({
              filename: prospect.filename,
              blob,
              directoryHandle
            });
            appendLog(`💾 Offre PDF enregistrée dans "${directoryHandle.name}" : ${prospect.filename}`);
          } catch (pdfErr) {
            appendLog(`⚠️ Échec enregistrement PDF pour PACAGE ${farm.pacage}: ${pdfErr.message}`);
          }
        }
      }

      if (abortControllerRef.current) return;

      setProgressPercent(100);
      setStatus('completed');
      const durationSec = Math.round((Date.now() - startTime) / 1000);
      setCurrentStepText(`Prospection terminée en ${durationSec}s : ${resultsAccumulator.length} exploitations rentables identifiées.`);
      appendLog(`🎉 Prospection terminée avec succès ! ${resultsAccumulator.length} exploitations rentables (ROI < ${targetRoi} ans) générées.`);
    } catch (error) {
      console.error('Erreur automate prospection séchoirs:', error);
      setStatus('completed');
      setCurrentStepText(`Erreur : ${error.message}`);
      appendLog(`❌ Erreur critique : ${error.message}`);
    }
  };

  // ═══ TÉLÉCHARGEMENT D'UN PDF UNIQUE ═══════════════════════════════════════════
  const handleDownloadSinglePdf = async (prospect) => {
    try {
      appendLog(`📄 Génération du dossier d'étude pour PACAGE ${prospect.pacage}...`);
      const { blob, filename } = await generateSechoirProspectingPdfBlob(prospect);

      if (directoryHandle) {
        await savePdfToLocalDestination({ filename, blob, directoryHandle });
        appendLog(`💾 Offre PDF sauvegardée dans "${directoryHandle.name}".`);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        appendLog(`📥 Téléchargement lancé : ${filename}`);
      }
    } catch (err) {
      appendLog(`❌ Erreur génération PDF : ${err.message}`);
    }
  };

  // ═══ TÉLÉCHARGEMENT GROUPÉ EN ARCHIVE ZIP ══════════════════════════════════════
  const handleDownloadZipBundle = async () => {
    if (processedResults.length === 0) return;
    setIsExportingZip(true);
    appendLog(`📦 Préparation de l’archive ZIP pour ${processedResults.length} offres BatiTech...`);

    try {
      const zipItems = [];
      for (let i = 0; i < processedResults.length; i++) {
        const prospect = processedResults[i];
        setCurrentStepText(`Génération PDF ${i + 1}/${processedResults.length} : PACAGE ${prospect.pacage}...`);
        const { blob, filename } = await generateSechoirProspectingPdfBlob(prospect);
        zipItems.push({ filename, blob });
      }

      const zipFilename = `Prospection_Sechoirs_BatiTech_${geoMode === 'commune' ? selectedCommune?.nom || 'Commune' : `Dept_${selectedDeptCode}`}_${processedResults.length}_offres.zip`;
      await exportResultsAsZip(zipItems, zipFilename);
      appendLog(`✅ Archive ZIP générée et téléchargée : ${zipFilename}`);
      setCurrentStepText('Archive ZIP téléchargée avec succès.');
    } catch (err) {
      appendLog(`❌ Erreur export ZIP : ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  // ═══ INJECTION INTERACTIVE DANS LE SIMULATEUR ═════════════════════════════════
  const handleInjectIntoSimulator = (prospect) => {
    appendLog(`⚡ Injection du prospect PACAGE ${prospect.pacage} dans le simulateur Séchoir BatiTech...`);

    // Callback externe prioritaire
    if (onSelectProspect) {
      onSelectProspect(prospect);
      onClose();
      return;
    }

    // Injection directe dans Zustand store
    const store = useSechoirStore.getState();
    store.setClientName(prospect.clientName);
    store.setAddress({
      address: prospect.address,
      label: prospect.addressLabel,
      latitude: prospect.latitude,
      longitude: prospect.longitude,
      departement: prospect.departement,
      commune: prospect.commune,
      codePostal: prospect.codePostal,
    });
    store.setModel(prospect.bestModelId);
    store.setMapCenter(prospect.coords);

    // Mettre à jour les matières configurées
    if (Array.isArray(prospect.materials)) {
      prospect.materials.forEach((mat) => {
        store.updateMaterialParams(mat.id, {
          enabled: mat.enabled,
          volume: mat.volume,
          plusValueQualite: mat.plusValueQualite,
          economieEnergie: mat.economieEnergie,
        });
      });
    }

    // Aller directement à l'étape Résultats (étape 4)
    store.setStep(4);
    onClose();
  };

  // Cumuls KPI en direct
  const totalTonnageCumul = useMemo(() => {
    return processedResults.reduce((acc, r) => acc + (r.totalDryingVolumeUsed || 0), 0);
  }, [processedResults]);

  const totalKwcCumul = useMemo(() => {
    return Math.round(
      processedResults.reduce((acc, r) => acc + (r.model?.puissanceKwc || 0), 0) * 10
    ) / 10;
  }, [processedResults]);

  const totalGainAnnuelCumul = useMemo(() => {
    return processedResults.reduce((acc, r) => acc + (r.simulation?.gainNetAnnuel || 0), 0);
  }, [processedResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-[50px] bottom-0 z-[9990] flex items-center justify-center p-2 sm:p-3.5 bg-black/85 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-[98vw] max-w-[1720px] 2xl:max-w-[2050px] h-[calc(100vh-70px)] max-h-[calc(100vh-70px)] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* ═══ 1. EN-TÊTE MODALE ════════════════════════════════════════════════ */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Automate Séchoirs BatiTech<sup className="text-amber-400 text-xs">®</sup>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  IGN RPG 2024 • PACAGE
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ROI &lt; 15 ans
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Prospection foncière &amp; agronomique automatisée • Évaluation multi-modèles (BT-3.1.15, 6.2.15, 8.3.15) • Injection en 1 clic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={status === 'running' || status === 'sourcing'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all disabled:opacity-40 cursor-pointer"
              title="Réinitialiser l'automate"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white border border-slate-700 hover:border-rose-600 transition-all cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══ 2. CORPS EN 2 COLONNES (5 COLS GAUCHE / 7 COLS DROITE) ═══════════ */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 overflow-hidden">

          {/* ─── COLONNE GAUCHE (5 cols) : PARAMÈTRES DE PROSPECTION ──────────── */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-900/70 rounded-3xl p-5 border border-slate-800 space-y-4 overflow-y-auto">

            {/* 1. Mode de sélection géographique */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Zone Géographique de Prospection
              </label>

              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setGeoMode('commune')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    geoMode === 'commune'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Par Commune
                </button>

                <button
                  type="button"
                  onClick={() => setGeoMode('departement')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    geoMode === 'departement'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  Par Département
                </button>
              </div>

              {/* Champ Commune */}
              {geoMode === 'commune' ? (
                <div className="relative space-y-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={communeSearch}
                      onChange={(e) => setCommuneSearch(e.target.value)}
                      placeholder="Tapez le nom ou le code postal..."
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    {isSearchingCommune && (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3 top-3" />
                    )}
                  </div>

                  {/* Suggestions autocomplétion */}
                  {communeSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-slate-950 border border-slate-700 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                      {communeSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCommune(c);
                            setCommuneSearch(c.nom);
                            setCommuneSuggestions([]);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-800/80 flex items-center justify-between text-xs border-b border-slate-800/60 last:border-0"
                        >
                          <span className="font-bold text-white">{c.nom}</span>
                          <span className="text-[11px] text-slate-400">
                            {c.postalCode} ({c.departmentCode}) • {(c.population || 0).toLocaleString('fr-FR')} hab.
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCommune && (
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-200">
                          {selectedCommune.nom} ({selectedCommune.postalCode || selectedCommune.departmentCode})
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-black">
                        INSEE {selectedCommune.codeInsee}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Sélecteur de Département */
                <div className="space-y-1.5">
                  <select
                    value={selectedDeptCode}
                    onChange={(e) => setSelectedDeptCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  >
                    {DEPARTEMENTS_FRANCE.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} — {d.nom} ({d.region})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    L’automate explorera les principales zones agricoles du département sélectionné via l'IGN RPG 2024.
                  </p>
                </div>
              )}
            </div>

            {/* 2. SÉLECTEUR DE TYPE DE BÂTIMENT BATITECH */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-amber-400" />
                  Type de Bâtiment BatiTech®
                </label>
                {(detectedFarms.length > 0 || processedResults.length > 0) && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Recalcul immédiat
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'auto', label: '🌟 Auto (Optimal)', sub: 'Meilleur ROI / VAN' },
                  { id: 'BT-3.1.15', label: 'BT-3.1.15 (30 kWc)', sub: '90 mod. • 18×20m' },
                  { id: 'BT-6.2.15', label: 'BT-6.2.15 (63 kWc)', sub: '189 mod. • 36×20m' },
                  { id: 'BT-8.3.15', label: 'BT-8.3.15 (94 kWc)', sub: '280 mod. • 48×20m' },
                ].map((bld) => {
                  const isSelected = selectedBuildingModel === bld.id;
                  return (
                    <button
                      key={bld.id}
                      type="button"
                      onClick={() => handleBuildingModelChange(bld.id)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 border-amber-500/60 text-amber-200 shadow-sm'
                          : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-[11px] truncate flex items-center justify-between">
                        <span>{bld.label}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />}
                      </div>
                      <div className={`text-[9px] mt-0.5 truncate ${isSelected ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                        {bld.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[9.5px] text-slate-500 leading-tight">
                Changez le type de bâtiment à tout moment pour recalculer instantanément les résultats.
              </p>
            </div>

            {/* 3. Filières de Séchage Valorisables */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wheat className="w-3.5 h-3.5 text-amber-400" />
                  Filières Agricoles Valorisables
                </span>
                <span className="text-[10px] font-bold text-amber-400">
                  {selectedStreams.length}/5 actives
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {Object.values(RPG_BATITECH_CROP_MAPPING).map((stream) => {
                  const isActive = selectedStreams.includes(stream.id);
                  return (
                    <button
                      key={stream.id}
                      type="button"
                      onClick={() => toggleStream(stream.id)}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{stream.icon}</span>
                        <div className="truncate text-[11px] font-bold">
                          {stream.label}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                        isActive ? 'bg-amber-500 text-black font-black' : 'border border-slate-700'
                      }`}>
                        {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Critère de Rentabilité & Limite */}
            <div className="space-y-3 pt-1 border-t border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Critère Éliminatoire : ROI Max
                  </label>
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    &lt; {targetRoi} ans
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="15"
                  step="0.5"
                  value={targetRoi}
                  onChange={(e) => setTargetRoi(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Strictement inférieur à 15 ans. Tout projet dépassant ce seuil est éliminé.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                  Nombre d’exploitations cibles à qualifier
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 25, 50, 'Tout'].map((lim) => (
                    <button
                      key={lim}
                      type="button"
                      onClick={() => setTargetLimit(lim)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        targetLimit === lim
                          ? 'bg-amber-500 text-black font-black shadow'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {lim === 'Tout' ? 'Tout' : `${lim}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Export Local & Dossier de destination */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  Dossier d’Export des Offres PDF
                </span>
                {bridgeStatus.online && (
                  <span className="text-[9px] font-black text-emerald-400">Daemon Local Prêt</span>
                )}
              </label>

              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isSelectingFolder}
                className="w-full py-2 px-3 rounded-2xl bg-slate-950 border border-slate-700/80 hover:border-cyan-500 text-left flex items-center justify-between text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate text-slate-300 font-semibold">
                    {selectedFolderName || 'Choisir un dossier local... (Optionnel)'}
                  </span>
                </div>
                <span className="text-[10px] text-cyan-400 font-bold shrink-0">Parcourir</span>
              </button>

              {folderFeedback && (
                <div className={`p-2 rounded-xl text-[10px] font-bold ${
                  folderFeedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                }`}>
                  {folderFeedback.message}
                </div>
              )}
            </div>

            {/* GRAND BOUTON D'ACTION PRINCIPAL */}
            <div className="pt-2">
              {status === 'running' || status === 'sourcing' ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white shrink-0" />
                  <span>Interrompre la Prospection</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartProspecting}
                  disabled={geoMode === 'commune' && !selectedCommune}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black shrink-0" />
                  <span>
                    Lancer la Prospection Séchoirs
                    {geoMode === 'commune'
                      ? ` (${selectedCommune?.nom || 'Commune'})`
                      : ` (Dépt ${selectedDeptCode})`}
                  </span>
                </button>
              )}
            </div>

          </div>

          {/* ═══ COLONNE DROITE (7 cols) : DASHBOARD TEMPS RÉEL & RÉSULTATS ═══ */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4">

            {/* 1. GRILLE KPI EN TEMPS RÉEL */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Warehouse className="w-3 h-3 text-amber-400" /> Exploitations Cibles
                </span>
                <strong className="text-xl font-black text-white">{processedResults.length}</strong>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Leaf className="w-3 h-3 text-emerald-400" /> Tonnage Valorisé
                </span>
                <strong className="text-xl font-black text-emerald-400">
                  {totalTonnageCumul.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">t/an</span>
                </strong>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Puissance Solaire
                </span>
                <strong className="text-xl font-black text-amber-400">
                  {totalKwcCumul} <span className="text-xs font-normal text-slate-400">kWc</span>
                </strong>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Euro className="w-3 h-3 text-cyan-400" /> Gain Net Annuel
                </span>
                <strong className="text-xl font-black text-cyan-400">
                  +{totalGainAnnuelCumul.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">€/an</span>
                </strong>
              </div>
            </div>

            {/* 2. BARRE DE PROGRESSION & STATUT */}
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {status === 'running' || status === 'sourcing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : status === 'aborted' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="font-bold text-slate-200 truncate max-w-sm sm:max-w-md">
                    {currentStepText || 'En attente de lancement de la prospection.'}
                  </span>
                </div>
                <span className="font-mono font-black text-amber-400">{progressPercent}%</span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* 3. EN-TÊTE D'ONGLETS DU PANNEAU DE RÉSULTATS */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('results')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    rightPanelTab === 'results'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Offres BatiTech Éligibles ({processedResults.length})
                </button>

                <button
                  type="button"
                  onClick={() => setRightPanelTab('logs')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    rightPanelTab === 'logs'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Journal en direct ({logs.length})
                </button>
              </div>

              {processedResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadZipBundle}
                  disabled={isExportingZip}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="Télécharger l'ensemble des études au format ZIP"
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

            {/* BARRE DE CHANGEMENT RAPIDE DE TYPE DE BÂTIMENT */}
            {processedResults.length > 0 && rightPanelTab === 'results' && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/90 rounded-2xl border border-slate-800 shrink-0">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-bold text-slate-300 flex items-center gap-1 shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    Type de Bâtiment :
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'auto', label: 'Auto (Optimal)' },
                      { id: 'BT-3.1.15', label: 'BT-3.1.15 (30 kWc)' },
                      { id: 'BT-6.2.15', label: 'BT-6.2.15 (63 kWc)' },
                      { id: 'BT-8.3.15', label: 'BT-8.3.15 (94 kWc)' },
                    ].map((bld) => (
                      <button
                        key={bld.id}
                        type="button"
                        onClick={() => handleBuildingModelChange(bld.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                          selectedBuildingModel === bld.id
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm scale-105'
                            : 'bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {bld.label}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-amber-400/90 font-semibold hidden md:inline">
                  ⚡ Recalcul instantané de toutes les exploitations
                </span>
              </div>
            )}

            {/* 4. CONTENU DE L'ONGLET SÉLECTIONNÉ */}
            <div className="flex-1 min-h-0 bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col">

              {/* VUE 1 : LISTE DES OFFRES ÉLIGIBLES */}
              {rightPanelTab === 'results' && (
                <div className="overflow-y-auto flex-1 p-2 divide-y divide-slate-800/80">
                  {processedResults.length === 0 ? (
                    <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <Leaf className="w-10 h-10 stroke-1 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-400">
                        Aucune offre de séchoir BatiTech® qualifiée pour le moment.
                      </p>
                      <p className="text-[11px] text-slate-600 max-w-sm">
                        Sélectionnez une commune ou un département, puis cliquez sur <strong>"Lancer la Prospection Séchoirs"</strong>.
                      </p>
                    </div>
                  ) : (
                    processedResults.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 hover:bg-slate-900/60 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs shrink-0">
                            #{idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-2 truncate">
                              <span>Exploitation PACAGE {item.pacage}</span>
                              <span className="text-[11px] text-slate-400 font-normal truncate">
                                — {item.addressLabel}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                              {/* Sélecteur direct de modèle sur la carte */}
                              <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-700/80">
                                <span className="text-[9px] font-bold text-slate-400">Modèle :</span>
                                {['BT-3.1.15', 'BT-6.2.15', 'BT-8.3.15'].map((mId) => (
                                  <button
                                    key={mId}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSwitchFarmModel(item.pacage, mId);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[8.5px] font-black transition-all cursor-pointer ${
                                      item.bestModelId === mId
                                        ? 'bg-amber-500 text-black shadow-xs scale-105'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                    title={`Simuler avec le modèle ${mId}`}
                                  >
                                    {mId.replace('BT-', '')}
                                  </button>
                                ))}
                                <span className="text-[9px] font-bold text-amber-300 ml-0.5">
                                  ({item.model?.puissanceKwc} kWc)
                                </span>
                              </div>

                              {/* Badge ROI strict */}
                              <span className="px-1.5 py-0.5 text-[9.5px] font-black rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                ⚡ ROI : {item.simulation?.roi} ans
                              </span>

                              <span>•</span>
                              <span>🌾 {item.totalAreaHa} ha déclarés</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">
                                ⚖️ Séchage : {item.totalDryingVolumeUsed} t/an
                              </span>
                              <span>•</span>
                              <span className="text-cyan-400 font-bold">
                                💶 Gain : +{item.simulation?.gainNetAnnuel?.toLocaleString('fr-FR')} €/an
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Bouton d'injection instantanée dans le simulateur */}
                          <button
                            type="button"
                            onClick={() => handleInjectIntoSimulator(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all flex items-center gap-1 shadow cursor-pointer hover:scale-105 active:scale-95"
                            title="Injecter cette exploitation dans le simulateur Séchoir BatiTech"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Simuler</span>
                          </button>

                          {/* Bouton téléchargement PDF */}
                          <button
                            type="button"
                            onClick={() => handleDownloadSinglePdf(item)}
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 transition-colors cursor-pointer"
                            title={`Télécharger l'offre : ${item.filename}`}
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

        {/* ═══ 3. PIED DE PAGE MODALE ═══════════════════════════════════════════ */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Séchoirs solaires thermovoltaïques Cogen'Air® • Prime CEE AGRI-EQ-110 déduite • Modèles BatiTech 3.1.15, 6.2.15, 8.3.15 • Critère d’éligibilité contractuel : ROI &lt; {targetRoi} ans.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
