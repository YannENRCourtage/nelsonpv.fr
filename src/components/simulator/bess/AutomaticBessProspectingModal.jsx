import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Zap, Search, BatteryCharging, MapPin, FolderOpen,
  FileText, CheckCircle2, AlertCircle, Loader2, Play, Square,
  RotateCcw, HardDrive, Compass, Euro, Download, Archive, X,
  ShieldCheck, ExternalLink, Mail, Building, MapPinned, Eye
} from 'lucide-react';

import {
  DEPARTEMENTS_FRANCE,
  searchCommunes,
  fetchDepartmentCommunes,
  reverseGeocodeBAN,
  detectGroundTransformers,
  fetchCadastralParcel,
  fetchNearbyCadastralParcels,
  fetchParcelOwners
} from '@/services/bessProspectingGisService.js';

import { generateBessProspectingPdfBlob } from './BessPDFGenerator.jsx';

import {
  checkLocalBridgeHealth,
  savePdfToLocalDestination,
  requestDirectoryPicker,
  exportResultsAsZip
} from '@/services/localPdfExportService.js';

import ServicePostalModal from '@/components/simulator/ServicePostalModal.jsx';

const DEFAULT_COMMUNE = {
  id: '24311',
  nom: 'Nontron',
  codeInsee: '24311',
  postalCode: '24470',
  departmentCode: '24',
  center: [45.529, 0.665],
  bbox: {
    minLat: 45.51,
    minLng: 0.64,
    maxLat: 45.56,
    maxLng: 0.71
  },
  population: 3050
};

export default function AutomaticBessProspectingModal({
  isOpen,
  onClose,
  defaultCommune = 'La Chapelle-Montmoreau',
  onSelectProspect = null
}) {
  const [geoMode, setGeoMode] = useState('commune'); // 'commune' | 'departement'

  const [communeSearch, setCommuneSearch] = useState(defaultCommune || 'La Chapelle-Montmoreau');
  const [communeSuggestions, setCommuneSuggestions] = useState([]);
  const [selectedCommune, setSelectedCommune] = useState(DEFAULT_COMMUNE);
  const [isSearchingCommune, setIsSearchingCommune] = useState(false);
  const isTypingCommuneRef = useRef(false);

  const [selectedDeptCode, setSelectedDeptCode] = useState('24');
  const [targetLimit, setTargetLimit] = useState(10); // 10, 25, 50, 'Tout'
  const [includeBrochure, setIncludeBrochure] = useState(true);

  // Modal ServicePostal
  const [postalModalItem, setPostalModalItem] = useState(null);
  const [isPostalModalOpen, setIsPostalModalOpen] = useState(false);

  // Export local
  const isFirefoxBrowser = typeof window !== 'undefined' && !window.showDirectoryPicker;
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState(
    isFirefoxBrowser ? 'Téléchargements (Dossier Firefox)' : ''
  );
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [folderFeedback, setFolderFeedback] = useState(null);

  // Panneau droit
  const [rightPanelTab, setRightPanelTab] = useState('results'); // 'results' | 'logs'
  const [status, setStatus] = useState('idle'); // 'idle' | 'sourcing' | 'running' | 'completed' | 'aborted'
  const [currentStepText, setCurrentStepText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  const [detectedGroundPostes, setDetectedGroundPostes] = useState([]);
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

  useEffect(() => {
    if (rightPanelTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, rightPanelTab]);

  useEffect(() => {
    if (geoMode !== 'commune' || !isTypingCommuneRef.current) return;
    if (!communeSearch || communeSearch.trim().length < 2) {
      setCommuneSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCommune(true);
      try {
        const results = await searchCommunes(communeSearch);
        if (isTypingCommuneRef.current) {
          setCommuneSuggestions(results || []);
        }
      } catch (err) {
        if (isTypingCommuneRef.current) setCommuneSuggestions([]);
      } finally {
        setIsSearchingCommune(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [communeSearch, geoMode]);

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

  const handleStop = () => {
    abortControllerRef.current = true;
    setStatus('aborted');
    setCurrentStepText('Prospection BESS interrompue par l’utilisateur.');
    appendLog('⚠️ Prospection interrompue manuellement.');
  };

  const handleReset = () => {
    abortControllerRef.current = false;
    setStatus('idle');
    setCurrentStepText('');
    setProgressPercent(0);
    setDetectedGroundPostes([]);
    setProcessedResults([]);
    setLogs([]);
  };

  const handleStartProspecting = async () => {
    abortControllerRef.current = false;
    setStatus('sourcing');
    setProgressPercent(5);
    setDetectedGroundPostes([]);
    setProcessedResults([]);
    setLogs([]);

    const startTime = Date.now();
    appendLog('🚀 Démarrage de l’Automate BESS (Batteries de Soutien Réseau)...');
    appendLog('🔍 Critère strict Enedis : Transformateurs HTA/BT au sol raccordés exclusivement par ligne souterraine (pointillés).');

    try {
      let bboxesToQuery = [];
      let deptCode = '24';

      if (geoMode === 'commune') {
        if (!selectedCommune || !selectedCommune.bbox) {
          throw new Error('Veuillez sélectionner une commune valide.');
        }
        deptCode = selectedCommune.departmentCode || '24';
        bboxesToQuery.push({
          nom: selectedCommune.nom,
          bbox: selectedCommune.bbox,
          code: selectedCommune.codeInsee
        });
        setCurrentStepText(`Interrogation du réseau Enedis sur ${selectedCommune.nom} (${deptCode})...`);
        appendLog(`📍 Zone ciblée : Commune de ${selectedCommune.nom} (${selectedCommune.postalCode || deptCode}).`);
      } else {
        deptCode = selectedDeptCode;
        const deptObj = DEPARTEMENTS_FRANCE.find((d) => d.code === deptCode);
        setCurrentStepText(`Sourcing des communes du département ${deptCode} (${deptObj?.nom || ''})...`);
        appendLog(`🗺️ Zone ciblée : Département ${deptCode} - ${deptObj?.nom || ''}.`);

        const communesInDept = await fetchDepartmentCommunes(deptCode, 25);
        if (communesInDept.length === 0) {
          throw new Error(`Aucune commune trouvée pour le département ${deptCode}.`);
        }
        bboxesToQuery = communesInDept.map((c) => ({
          nom: c.nom,
          bbox: c.bbox,
          code: c.codeInsee,
          population: c.population
        }));
        appendLog(`🔍 ${bboxesToQuery.length} communes principales sélectionnées pour l'exploration Enedis.`);
      }

      setProgressPercent(15);
      const allGroundTransformers = [];
      const targetCountNeeded = targetLimit === 'Tout' ? 100 : Number(targetLimit);

      for (let i = 0; i < bboxesToQuery.length; i++) {
        if (abortControllerRef.current) break;

        // Si on a déjà collecté assez de transformateurs au sol pour satisfaire le quota cible,
        // on passe à la qualification des dossiers pour un résultat rapide et pertinent
        if (targetLimit !== 'Tout' && allGroundTransformers.length >= targetCountNeeded * 2) {
          appendLog(`⚡ Quota de candidats atteint (${allGroundTransformers.length} transformateurs au sol identifiés).`);
          break;
        }

        const zone = bboxesToQuery[i];
        setCurrentStepText(`Détection des postes HTA/BT au sol : ${zone.nom} (${i + 1}/${bboxesToQuery.length})...`);

        const detection = await detectGroundTransformers(zone.bbox);
        appendLog(
          `⚡ ${zone.nom} : ${detection.allPostesCount || 0} postes recensés → ${detection.groundTransformers.length} qualifiés au sol (lignes souterraines HTA).`
        );

        allGroundTransformers.push(...detection.groundTransformers);
        const pct = 15 + Math.round(((i + 1) / bboxesToQuery.length) * 25);
        setProgressPercent(pct);
      }

      if (abortControllerRef.current) return;

      appendLog(`📊 Total transformateurs au sol identifiés : ${allGroundTransformers.length}`);
      setDetectedGroundPostes(allGroundTransformers);

      if (allGroundTransformers.length === 0) {
        setStatus('completed');
        setCurrentStepText('Aucun transformateur HTA/BT au sol (souterrain) identifié sur cette zone.');
        appendLog('⚠️ Aucun transformateur HTA/BT au sol répondant au critère souterrain.');
        return;
      }

      setStatus('running');
      setProgressPercent(45);
      const resultsAccumulator = [];
      const effectiveLimit = targetLimit === 'Tout' ? allGroundTransformers.length : Number(targetLimit);

      for (let idx = 0; idx < allGroundTransformers.length; idx++) {
        if (abortControllerRef.current) break;
        if (resultsAccumulator.length >= effectiveLimit) {
          appendLog(`🎯 Limite de ${effectiveLimit} sites cibles atteinte.`);
          break;
        }

        const transfo = allGroundTransformers[idx];
        const stepProgress = 45 + Math.round(((idx + 1) / allGroundTransformers.length) * 50);
        setProgressPercent(stepProgress);
        setCurrentStepText(`Qualification foncière & propriétaire #${idx + 1}/${allGroundTransformers.length}...`);

        // 1. Récupération de l'adresse postale BAN
        const banAddress = await reverseGeocodeBAN(transfo.lat, transfo.lng);

        // 2. Identification de la parcelle cadastrale (point exact)
        let parcel = await fetchCadastralParcel(transfo.lat, transfo.lng);

        // 3. Recherche des propriétaires fonciers (Personnes Morales via Koumoul / DGFiP)
        let owners = [];
        if (parcel && parcel.idu) {
          owners = await fetchParcelOwners(parcel.idu);
        }

        // 4. Si aucun propriétaire personne morale sur le point exact (ex: accotement ou voirie),
        // vérifier les parcelles immédiatement adjacentes (rayon 25m)
        if (owners.length === 0) {
          const nearbyParcels = await fetchNearbyCadastralParcels(transfo.lat, transfo.lng, 25);
          for (const np of nearbyParcels) {
            if (parcel && np.idu === parcel.idu) continue;
            const npOwners = await fetchParcelOwners(np.idu);
            if (npOwners && npOwners.length > 0) {
              parcel = np;
              owners = npOwners;
              break;
            }
          }
        }

        const primaryOwner = owners[0] || null;
        const ownerCompany = primaryOwner?.denomination || '';
        const ownerAddress = primaryOwner?.adresse || banAddress.street || '';
        const ownerCity = primaryOwner?.nomCommune || banAddress.city || transfo.nomCommune || '';
        const ownerPostalCode = primaryOwner?.codeCommune || banAddress.postalCode || '';

        const prospect = {
          id: transfo.id,
          transfoId: transfo.id,
          nomPoste: transfo.nomPoste,
          lat: transfo.lat,
          lng: transfo.lng,
          coords: transfo.coords,
          distSouterrain: transfo.distSouterrain,
          distAerien: transfo.distAerien,
          nom_societe: ownerCompany || (parcel ? `Bailleur Parcelle ${parcel.section} ${parcel.numero}` : 'Propriétaire Foncier'),
          denomination: ownerCompany,
          formeJuridique: primaryOwner?.formeJuridique || '',
          siren: primaryOwner?.siren || '',
          nom: primaryOwner ? '' : 'Madame, Monsieur le Propriétaire',
          contact: primaryOwner ? '' : 'Propriétaire',
          adresse_ligne1: ownerAddress || banAddress.label || 'Adresse en cours de qualification',
          adresse: ownerAddress || banAddress.label || '',
          code_postal: ownerPostalCode || (selectedCommune?.postalCode || ''),
          postalCode: ownerPostalCode,
          ville: ownerCity || selectedCommune?.nom || '',
          cityName: ownerCity,
          commune: transfo.nomCommune || selectedCommune?.nom || '',
          parcelId: parcel?.idu || '',
          section: parcel?.section || '',
          numero: parcel?.numero || '',
          contenanceM2: parcel?.contenance || 0,
          parcelGeometry: parcel?.geometry || null,
          loyerAnnuel: 2000,
          dureeBailAns: 20,
          surfaceEmpriseM2: 20,
          puissanceBatterieKw: 500,
          nbArmoires: 4,
          filename: `Courrier_BESS_Batterie_Soutien_Reseau_${(ownerCompany || parcel?.idu || `Transfo_${idx + 1}`).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        };

        resultsAccumulator.push(prospect);
        setProcessedResults([...resultsAccumulator]);

        appendLog(
          `✅ Site qualifié #${resultsAccumulator.length} : Transfo ${transfo.lat.toFixed(5)}, ${transfo.lng.toFixed(5)} ` +
          `• Parcelle : ${parcel ? `${parcel.section} ${parcel.numero}` : 'N/C'} ` +
          `• Propriétaire : ${ownerCompany || 'Personne Physique / Enquête foncière'}`
        );

        if (directoryHandle) {
          try {
            const { blob } = await generateBessProspectingPdfBlob(prospect, { includeBrochure });
            await savePdfToLocalDestination({
              filename: prospect.filename,
              blob,
              directoryHandle
            });
            appendLog(`💾 Courrier BESS sauvegardé : ${prospect.filename}`);
          } catch (pdfErr) {
            appendLog(`⚠️ Échec enregistrement PDF : ${pdfErr.message}`);
          }
        }
      }

      if (abortControllerRef.current) return;

      setProgressPercent(100);
      setStatus('completed');
      const durationSec = Math.round((Date.now() - startTime) / 1000);
      setCurrentStepText(`Prospection BESS terminée en ${durationSec}s : ${resultsAccumulator.length} sites et propriétaires identifiés.`);
      appendLog(`🎉 Prospection BESS terminée avec succès ! ${resultsAccumulator.length} dossiers prêts.`);
    } catch (error) {
      console.error('Erreur automate prospection BESS:', error);
      setStatus('completed');
      setCurrentStepText(`Erreur : ${error.message}`);
      appendLog(`❌ Erreur critique : ${error.message}`);
    }
  };

  const handleDownloadSinglePdf = async (prospect) => {
    try {
      appendLog(`📄 Génération du courrier BESS (${includeBrochure ? 'Lettre + Brochure' : 'Lettre seule'})...`);
      const { blob, filename } = await generateBessProspectingPdfBlob(prospect, { includeBrochure });

      if (directoryHandle) {
        await savePdfToLocalDestination({ filename, blob, directoryHandle });
        appendLog(`💾 Courrier BESS sauvegardé dans "${directoryHandle.name}".`);
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

  const handleDownloadZipBundle = async () => {
    if (processedResults.length === 0) return;
    setIsExportingZip(true);
    appendLog(`📦 Préparation de l’archive ZIP pour ${processedResults.length} courriers BESS...`);

    try {
      const zipItems = [];
      for (let i = 0; i < processedResults.length; i++) {
        const prospect = processedResults[i];
        setCurrentStepText(`Génération PDF ${i + 1}/${processedResults.length}...`);
        const { blob, filename } = await generateBessProspectingPdfBlob(prospect, { includeBrochure });
        zipItems.push({ filename, blob });
      }

      const zipFilename = `Prospection_BESS_Batteries_Soutien_Reseau_${geoMode === 'commune' ? selectedCommune?.nom || 'Commune' : `Dept_${selectedDeptCode}`}_${processedResults.length}_dossiers.zip`;
      await exportResultsAsZip(zipItems, zipFilename);
      appendLog(`✅ Archive ZIP générée : ${zipFilename}`);
      setCurrentStepText('Archive ZIP téléchargée avec succès.');
    } catch (err) {
      appendLog(`❌ Erreur export ZIP : ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

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
        {/* EN-TÊTE MODALE */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <BatteryCharging className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Automate BESS — Batterie de Soutien Réseau
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Enedis HTA Souterrain • Transfos Sol
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  2 000 €/an • 20 m² • 20 ans
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Détection automatique des postes HTA/BT au sol &bull; Qualification des propriétaires fonciers &bull; Courrier personnalisé AFNOR
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

        {/* CORPS DE L'AUTOMATE */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-5 overflow-y-auto lg:overflow-hidden">

          {/* COLONNE GAUCHE (5 cols) : PARAMÈTRES */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-900/70 rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-4 overflow-visible lg:overflow-y-auto shrink-0 lg:shrink">

            {/* 1. Zone géographique */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Zone Géographique de Prospection BESS
              </label>

              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setGeoMode('commune')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    geoMode === 'commune'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md font-black'
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
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  Par Département
                </button>
              </div>

              {geoMode === 'commune' ? (
                <div className="relative space-y-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={communeSearch}
                      onChange={(e) => {
                        isTypingCommuneRef.current = true;
                        setCommuneSearch(e.target.value);
                      }}
                      placeholder="Tapez le nom ou le code postal..."
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    {isSearchingCommune && (
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3 top-3" />
                    )}
                  </div>

                  {isTypingCommuneRef.current && communeSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-slate-950 border border-slate-700 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                      {communeSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            isTypingCommuneRef.current = false;
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
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-bold text-emerald-200">
                          {selectedCommune.nom} ({selectedCommune.postalCode || selectedCommune.departmentCode})
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-black">
                        INSEE {selectedCommune.codeInsee}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <select
                    value={selectedDeptCode}
                    onChange={(e) => setSelectedDeptCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  >
                    {DEPARTEMENTS_FRANCE.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} — {d.nom} ({d.region})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 2. Règle technique Transformateur au Sol */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Règle Technique de Qualification Enedis
              </span>
              <div className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <div>
                    <strong className="text-emerald-300">Transformateur au Sol Retenu :</strong>
                    <span className="text-slate-300"> Lignes HTA en pointillés (souterraines) arrivant directement au transformateur.</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0" />
                  <div>
                    <strong className="text-rose-300">Transformateur Poteau Écarté :</strong>
                    <span className="text-slate-400"> Lignes HTA pleines (aériennes) raccordant le transformateur.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Paramètres de l'Offre BESS */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Euro className="w-4 h-4 text-emerald-400" />
                Conditions du Bail Notarié
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Loyer Garanti</span>
                  <strong className="text-sm text-emerald-400 font-black">2 000 € / an</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Emprise Sol</span>
                  <strong className="text-sm text-white font-black">20 m²</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Durée Bail</span>
                  <strong className="text-sm text-amber-400 font-black">20 ans</strong>
                </div>
              </div>
            </div>

            {/* 4. Options & Brochure */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Format du Courrier &amp; Brochure
              </span>

              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-white leading-tight">
                        Joindre la Brochure ENR Courtage (V3)
                      </div>
                      <div className="text-[9px] text-slate-400 leading-tight mt-0.5">
                        Ajoute en page 2 le document officiel "Batterie de soutien réseau V3.pdf"
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeBrochure}
                    onChange={(e) => setIncludeBrochure(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-950 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                  Nombre de sites cibles
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 25, 50, 'Tout'].map((lim) => (
                    <button
                      key={lim}
                      type="button"
                      onClick={() => setTargetLimit(lim)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        targetLimit === lim
                          ? 'bg-emerald-500 text-black font-black shadow'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {lim === 'Tout' ? 'Tout' : `${lim}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Dossier d'export local */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isSelectingFolder}
                className="w-full py-2 px-3 rounded-2xl bg-slate-950 border border-slate-700/80 hover:border-emerald-500 text-left flex items-center justify-between text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate text-slate-300 font-semibold">
                    {selectedFolderName || 'Dossier d’export local... (Optionnel)'}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold shrink-0">Parcourir</span>
              </button>

              {folderFeedback && (
                <div className="p-2 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {folderFeedback.message}
                </div>
              )}
            </div>

            {/* BOUTON D'ACTION PRINCIPAL */}
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
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black shrink-0" />
                  <span>
                    Lancer la Prospection BESS
                    {geoMode === 'commune'
                      ? ` (${selectedCommune?.nom || 'Commune'})`
                      : ` (Dépt ${selectedDeptCode})`}
                  </span>
                </button>
              )}
            </div>

          </div>

          {/* COLONNE DROITE (7 cols) : RÉSULTATS & JOURNAL */}
          <div className="lg:col-span-7 flex flex-col min-h-[550px] lg:min-h-0 bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-4 shrink-0 lg:shrink lg:overflow-hidden">

            {/* KPI EN DIRECT */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" /> Transfos Sol
                </span>
                <strong className="text-xl font-black text-white">{detectedGroundPostes.length}</strong>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Building className="w-3 h-3 text-blue-400" /> Propriétaires
                </span>
                <strong className="text-xl font-black text-blue-400">
                  {processedResults.filter((p) => p.denomination).length}
                </strong>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3 h-3 text-amber-400" /> Courriers Prêts
                </span>
                <strong className="text-xl font-black text-amber-400">{processedResults.length}</strong>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Euro className="w-3 h-3 text-emerald-400" /> Volume Loyers
                </span>
                <strong className="text-xl font-black text-emerald-400">
                  {(processedResults.length * 2000).toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">€/an</span>
                </strong>
              </div>
            </div>

            {/* BARRE DE PROGRESSION */}
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {status === 'running' || status === 'sourcing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : status === 'aborted' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="font-bold text-slate-200 truncate max-w-sm sm:max-w-md">
                    {currentStepText || 'En attente de lancement de la prospection BESS.'}
                  </span>
                </div>
                <span className="font-mono font-black text-emerald-400">{progressPercent}%</span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* ONGLETS RÉSULTATS / LOGS */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('results')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    rightPanelTab === 'results'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dossiers BESS Qualifiés ({processedResults.length})
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
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="Télécharger l'ensemble des courriers en ZIP"
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

            {/* CONTENU DE L'ONGLET */}
            <div className="flex-1 min-h-0 bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col">
              {rightPanelTab === 'results' && (
                <div className="overflow-y-auto flex-1 p-2 divide-y divide-slate-800/80">
                  {processedResults.length === 0 ? (
                    <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <BatteryCharging className="w-10 h-10 stroke-1 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-400">
                        Aucun dossier BESS qualifié pour le moment.
                      </p>
                      <p className="text-[11px] text-slate-600 max-w-sm">
                        Sélectionnez une commune, puis cliquez sur <strong>"Lancer la Prospection BESS"</strong>.
                      </p>
                    </div>
                  ) : (
                    processedResults.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 hover:bg-slate-900/60 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xs shrink-0">
                            #{idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-2 truncate">
                              <span className="truncate">{item.nom_societe || item.denomination || 'Propriétaire Foncier'}</span>
                              {item.parcelId && (
                                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-600/40 px-1.5 py-0.5 rounded shrink-0">
                                  Parcelle {item.section} {item.numero}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-300 font-normal truncate">
                                — {item.adresse_ligne1} ({item.ville || item.commune})
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="px-1.5 py-0.5 text-[9.5px] font-black rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                Transfo Sol ({item.distSouterrain}m souterrain)
                              </span>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">
                                💶 Loyer : 2 000 €/an (20 ans)
                              </span>
                              <span>•</span>
                              <span className="text-cyan-400 font-bold">
                                ⚡ BESS 500 kW / 20 m²
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {onSelectProspect && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectProspect(item);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all flex items-center gap-1 shadow cursor-pointer hover:scale-105 active:scale-95"
                              title="Sélectionner ce site"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Sélectionner</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDownloadSinglePdf(item)}
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white hover:text-emerald-300 transition-colors cursor-pointer"
                            title={`Télécharger le courrier personnalisé : ${item.filename}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPostalModalItem(item);
                              setIsPostalModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/60 text-blue-200 hover:text-white transition-colors cursor-pointer"
                            title="Expédier ce courrier par La Poste"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

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

        {/* PIED DE PAGE */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Stockage BESS 500 kW &bull; Bail notarié 20 ans (2 000 €/an) &bull; Emprise 20 m² &bull; Délibération CRE 2025-227.
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

        {/* MODAL ENVOI POSTAL SERVICEPOSTAL */}
        <ServicePostalModal
          isOpen={isPostalModalOpen}
          onClose={() => setIsPostalModalOpen(false)}
          prospect={postalModalItem}
          generatePdfFn={async (item) => {
            return await generateBessProspectingPdfBlob(item, { includeBrochure });
          }}
        />

      </motion.div>
    </div>
  );
}
