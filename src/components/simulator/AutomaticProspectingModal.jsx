import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Search, Building2, MapPin, FolderDown, FolderOpen,
  FileText, CheckCircle2, AlertCircle, Loader2, Play, Square,
  RotateCcw, SlidersHorizontal, ExternalLink, ShieldCheck, X,
  Check, HardDrive, Compass, Euro, TrendingUp, Info, Download,
  Archive, Eye, Layers, ArrowRight, Sliders, Pencil, Banknote, Mail
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

import ServicePostalModal from '@/components/simulator/ServicePostalModal';
import CommercialOfferConfigModal from '@/components/simulator/CommercialOfferConfigModal';
import { generateCommercialProposalPDF } from '@/services/CommercialProposalPdfGenerator';
import { toast } from '@/components/ui/use-toast';
import { getBuildingInsights, selectBestRoofSegment, boundingBoxToPolygon } from '@/services/googleSolar';
import { squarePolygon } from '@/utils/squarePolygon';


// Profil géométrique et cadastral par défaut : Bordeaux (33)
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

export default function AutomaticProspectingModal({
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
  const isTypingCommuneRef = useRef(false);

  // Rayon pour l'emprise carte (en mètres)
  const [mapRadius, setMapRadius] = useState(1000); // 500, 1000, 2000, 5000

  // Critères de filtrage, puissance et modèle économique
  const [minArea, setMinArea] = useState(400);
  const [maxArea, setMaxArea] = useState(50000);
  const [minTargetKwc, setMinTargetKwc] = useState(100);
  const [maxTargetKwc, setMaxTargetKwc] = useState(3000);
  const [economicModel, setEconomicModel] = useState('vente_totale'); // 'vente_totale' | 'autoconsommation' | 'autoconsommation_stockage'
  const [tarifEdfOa, setTarifEdfOa] = useState(0.085);
  const [targetLimit, setTargetLimit] = useState(10); // 10, 30, 50, 100, 'Tout'
  const [roofPitch, setRoofPitch] = useState(15);
  const [roofType, setRoofType] = useState('asymetrique');
  const [excludeThirdParty, setExcludeThirdParty] = useState(false);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modal d'envoi postal via ServicePostal
  const [postalModalItem, setPostalModalItem] = useState(null);
  const [isPostalModalOpen, setIsPostalModalOpen] = useState(false);

  // Modal de paramétrage de l'offre commerciale avant export PDF
  const [configModalItem, setConfigModalItem] = useState(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Gestion de la révision / édition individuelle des paramètres par ligne
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editingPitch, setEditingPitch] = useState(15);
  const [editingAzimuth, setEditingAzimuth] = useState(180);
  const [editingPolygon, setEditingPolygon] = useState(null);
  const [editingArea, setEditingArea] = useState(null);
  const [editingEconomicModel, setEditingEconomicModel] = useState('vente_totale');
  const [editingTarifEdfOa, setEditingTarifEdfOa] = useState(0.085);
  const [editingExcludeThirdParty, setEditingExcludeThirdParty] = useState(false);
  const [editingMaxKwc, setEditingMaxKwc] = useState('');
  const [isRecalculatingRow, setIsRecalculatingRow] = useState(false);
  const [isDetecting3D, setIsDetecting3D] = useState(false);
  const [isSquaringManual, setIsSquaringManual] = useState(false);

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
    setLogs(prev => [...prev.slice(-120), `[${time}] ${msg}`]);
  };

  // Autocomplétion commune
  const handleSearchCommunes = async (text) => {
    isTypingCommuneRef.current = true;
    setCommuneSearch(text);
    if (!text || text.trim().length < 2) {
      setCommuneSuggestions([]);
      return;
    }
    setIsSearchingCommune(true);
    try {
      const results = await searchCommunes(text);
      if (isTypingCommuneRef.current) {
        setCommuneSuggestions(results || []);
        if (results.length > 0 && !selectedCommune) {
          setSelectedCommune(results[0]);
        }
      }
    } catch (err) {
      if (isTypingCommuneRef.current) setCommuneSuggestions([]);
    } finally {
      setIsSearchingCommune(false);
    }
  };

  const handleSelectCommune = (c) => {
    isTypingCommuneRef.current = false;
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
      const zipName = `Offres_Solaires_${zoneName}_${dateStr}.zip`;
      addLog(`📦 Préparation de l'archive ZIP groupée (${list.length} fichiers)...`);
      await exportResultsAsZip(list, zipName);
      addLog(`✅ Archive ZIP "${zipName}" téléchargée avec succès.`);
    } catch (err) {
      addLog(`❌ Erreur export ZIP : ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Télécharger unitaire d'un PDF direct (fallback)
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

  // Ouverture de la modale de paramétrage avant export PDF Commercial
  const handleOpenOfferConfigModal = (item) => {
    setConfigModalItem(item);
    setIsConfigModalOpen(true);
  };

  // Validation et génération du PDF Commercial paramétré (4 à 5 pages)
  const handleConfirmGenerateOfferPdf = async (configOptions) => {
    if (!configModalItem) return;
    const simToUse = configModalItem.simulation || configModalItem;

    try {
      addLog(`📄 Génération du PDF commercial paramétré (${configOptions.economicModel})...`);
      const pdfResult = await generateCommercialProposalPDF({
        simulation: simToUse,
        options: configOptions,
        returnBlob: true
      });

      if (pdfResult?.blob) {
        const saveRes = await savePdfToLocalDestination({
          filename: pdfResult.filename,
          blob: pdfResult.blob,
          arrayBuffer: pdfResult.arrayBuffer,
          directoryHandle,
          preferBridge: true
        });

        if (saveRes.success) {
          addLog(`   💾 PDF Commercial enregistré : ${saveRes.filename} [${saveRes.method}]`);
          toast({
            title: 'PDF Commercial généré avec succès',
            description: `Le fichier ${saveRes.filename} a été enregistré.`,
            variant: 'success'
          });
        }
      }
    } catch (err) {
      console.error('Erreur génération PDF Commercial:', err);
      addLog(`   ❌ Échec génération PDF : ${err.message}`);
      toast({
        title: 'Erreur génération PDF',
        description: err.message || 'Impossible de générer le document.',
        variant: 'destructive'
      });
    }
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
      const effectiveLimit = targetLimit === 'Tout' ? 500 : Number(targetLimit);
      const limitLabel = targetLimit === 'Tout' ? 'toutes les toitures éligibles' : `${targetLimit} toitures cibles`;
      setCurrentStepText(`Interrogation cadastrale Overpass API (${limitLabel})...`);
      addLog(`🛰️ Recherche des bâtiments (Emprise : ${minArea} à ${maxArea} m² • Cible : ${minTargetKwc} à ${maxTargetKwc} kWc • Objectif : ${limitLabel})...`);

      const eligible = await fetchBuildingsInBbox({
        bbox: targetBbox,
        minArea,
        maxArea,
        limit: effectiveLimit,
        onProgress: (msg) => setCurrentStepText(msg)
      });

      setDetectedBuildings(eligible);
      addLog(`✅ ${eligible.length} bâtiments éligibles identifiés (${minTargetKwc} - ${maxTargetKwc} kWc).`);

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

        // B2. Interrogation & Filtrage de rentabilité Google Solar (buildingInsights:findClosest)
        let googleSolarData = null;
        try {
          const lat = Array.isArray(b.center) ? b.center[0] : (b.center.lat || b.center[0]);
          const lng = Array.isArray(b.center) ? b.center[1] : (b.center.lng || b.center.lon || b.center[1]);
          const solarInsights = await getBuildingInsights(lat, lng);

          if (solarInsights && solarInsights.available !== false && solarInsights.solarPotential) {
            const sp = solarInsights.solarPotential;
            const sunshineHours = Number(sp.maxSunshineHoursPerYear || 0);
            const usefulArea = Number(sp.maxArrayAreaMeters2 || 0);

            // Filtrage conditionnel 1 : Ensoleillement critique (< 1000 h/an)
            if (sunshineHours > 0 && sunshineHours < 1000) {
              addLog(`   ⚠️ Bâtiment ignoré (Google Solar) : Ensoleillement insuffisant (${Math.round(sunshineHours)} h/an < 1 000 h/an).`);
              continue;
            }

            // Filtrage conditionnel 2 : Surface utile réelle trop faible pour l'objectif de puissance
            const minUsefulAreaRequired = Math.round((minTargetKwc * 1000 / 465) * 1.4);
            if (usefulArea > 0 && (usefulArea < minUsefulAreaRequired || usefulArea < 180)) {
              addLog(`   ⚠️ Bâtiment ignoré (Google Solar) : Surface utile réelle insuffisante (${Math.round(usefulArea)} m² < ${minUsefulAreaRequired} m² requis pour ${minTargetKwc} kWc).`);
              continue;
            }

            const bestSeg = selectBestRoofSegment(sp.roofSegmentSummaries);
            const gPitch = bestSeg?.pitchDegrees !== undefined ? Math.round(bestSeg.pitchDegrees) : null;
            const gAzimuth = bestSeg?.azimuthDegrees !== undefined ? Math.round(bestSeg.azimuthDegrees) : null;

            googleSolarData = {
              maxSunshineHoursPerYear: sunshineHours,
              maxArrayAreaMeters2: usefulArea,
              pitch: gPitch,
              azimuth: gAzimuth,
              solarPotential: sp
            };

            addLog(`   ☀️ Google Solar 3D validé : ${Math.round(sunshineHours)} h/an • Surface utile ${Math.round(usefulArea)} m² • Pente ${gPitch !== null ? gPitch + '°' : 'auto'} • Azimut ${gAzimuth !== null ? gAzimuth + '°' : 'auto'}`);
          } else {
            addLog(`   ℹ️ Google Solar non disponible sur cette zone (3D rurale non couverte). Inférence géométrique Nelson appliquée.`);
          }
        } catch (errSolar) {
          console.warn('Erreur vérification Google Solar bâtiment:', errSolar);
        }

        // C. Simulation Toiture Headless avec Inférence Dynamique Toiture & Données Google Solar
        const sim = await simulateBuildingHeadless({
          building: b,
          addressInfo,
          cadastreInfo,
          customSettings: {
            costPerKwc: 920,
            minKwc: minTargetKwc,
            maxKwc: maxTargetKwc,
            economicModel,
            tarifEdfOa,
            excludeThirdParty,
            includeCoverLetter,
            googleSolarData
          }
        });

        if (!sim) {
          addLog(`   ⚠️ Bâtiment ignoré : toiture déjà équipée de panneaux ou puissance hors plage (${minTargetKwc}-${maxTargetKwc} kWc).`);
          continue;
        }

        if (sim.ownerName) {
          addLog(`   🏢 Propriétaire identifié : ${sim.ownerName}`);
        }
        addLog(`   🏠 Toiture : ${sim.orientationLabel}`);
        addLog(`   ⚡ Puissance : ${sim.installedKwc} kWc (${sim.panelCount} modules 465 Wc)`);
        if (economicModel === 'vente_totale') {
          addLog(`   💶 Production : ~${sim.annualProductionKwh?.toLocaleString('fr-FR')} kWh/an • CA EDF OA (${tarifEdfOa} €/kWh) : ~${sim.annualRevenueReventeTotale?.toLocaleString('fr-FR')} €/an`);
        } else if (economicModel === 'autoconsommation_stockage') {
          addLog(`   💶 Production : ~${sim.annualProductionKwh?.toLocaleString('fr-FR')} kWh/an • Gains Autoconso 100% + Stockage : ~${sim.annualBenefitYear1?.toLocaleString('fr-FR')} €/an`);
        } else {
          addLog(`   💶 Production : ~${sim.annualProductionKwh?.toLocaleString('fr-FR')} kWh/an • Gains Autoconso + Surplus : ~${sim.annualBenefitYear1?.toLocaleString('fr-FR')} €/an`);
        }

        // D. Génération de l'Offre Commerciale PDF (Modèle Synthétique 4-5 pages)
        setCurrentStepText(`Génération de l'offre PDF ${stepNum}/${total}...`);
        const pdfResult = await generateCommercialProposalPDF({
          simulation: sim,
          options: {
            economicModel,
            tarifEdfOa,
            financingChoices: excludeThirdParty ? ['credit_bancaire', 'abonnement'] : ['tiers_investisseur', 'credit_bancaire', 'abonnement'],
            includeCoverLetter,
            includeAmortizationTable: true
          },
          returnBlob: true
        });

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
        } else if (!directoryHandle && results.length > 0) {
          // Mode Firefox ou absence de dossier direct : téléchargement automatique de l'archive ZIP
          addLog(`📦 Mode Firefox : Téléchargement automatique de l'archive ZIP (${results.length} offres)...`);
          await handleDownloadZipBundle(results);
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

  // Ouverture du panneau de révision des paramètres d'une ligne
  const handleOpenEditRow = (idx, item) => {
    if (editingRowIndex === idx) {
      setEditingRowIndex(null);
      return;
    }
    setEditingRowIndex(idx);
    setEditingPitch(item.simulation?.pitch ?? 15);
    setEditingAzimuth(item.simulation?.azimuth ?? item.simulation?.orientation ?? 180);
    setEditingPolygon(item.building?.polygon || null);
    setEditingArea(item.building?.area || item.simulation?.surfaceToiture || null);
    setEditingEconomicModel(item.simulation?.economicModel || economicModel || 'vente_totale');
    setEditingTarifEdfOa(item.simulation?.tarifEdfOaKwh ?? tarifEdfOa ?? 0.085);
    setEditingExcludeThirdParty(item.simulation?.excludeThirdParty ?? excludeThirdParty ?? false);
    setEditingMaxKwc(item.simulation?.installedKwc ?? '');
  };

  // Détection 3D Auto via Google Solar pour CETTE toiture
  const handleSolar3DDetect = async (idx) => {
    const item = processedResults[idx];
    if (!item?.building) return;

    let lat = null, lng = null;
    if (item.building.center) {
      if (Array.isArray(item.building.center)) {
        [lat, lng] = item.building.center;
      } else if (item.building.center.lat !== undefined) {
        lat = item.building.center.lat;
        lng = item.building.center.lng;
      }
    }
    if ((lat == null || lng == null) && item.building.polygon?.[0]) {
      const p = item.building.polygon[0];
      if (Array.isArray(p)) {
        lat = Math.abs(p[0]) > 90 ? p[1] : p[0];
        lng = Math.abs(p[0]) > 90 ? p[0] : p[1];
      } else {
        lat = p.lat ?? p.latitude;
        lng = p.lng ?? p.lon ?? p.longitude;
      }
    }

    if (lat == null || lng == null) {
      toast({ title: 'Coordonnées introuvables', description: 'Impossible de localiser le bâtiment pour la détection 3D.', variant: 'destructive' });
      return;
    }

    setIsDetecting3D(true);
    try {
      const data = await getBuildingInsights(lat, lng);
      if (!data || data.available === false) {
        toast({
          title: 'Données 3D non disponibles',
          description: 'Données 3D non disponibles pour cette zone géographique. Veuillez utiliser le tracé manuel.',
          className: 'bg-amber-500 text-white border-amber-600',
        });
        return;
      }
      const segment = selectBestRoofSegment(data.roofSegmentSummaries || []);
      if (!segment) {
        toast({
          title: 'Données 3D non disponibles',
          description: 'Données 3D non disponibles pour cette zone géographique. Veuillez utiliser le tracé manuel.',
          className: 'bg-amber-500 text-white border-amber-600',
        });
        return;
      }

      const slope = Math.round(segment.pitchDegrees || 0);
      const azimuth = Math.round(segment.azimuthDegrees || 180);
      const solarPoly = boundingBoxToPolygon(segment.boundingBox);

      // Mise à jour de l'état de CETTE ligne uniquement
      setEditingPitch(slope);
      setEditingAzimuth(azimuth);
      if (solarPoly && solarPoly.length >= 4) {
        setEditingPolygon(solarPoly);
      }
      if (segment.stats?.areaMeters2) {
        const area = Math.round(segment.stats.areaMeters2);
        setEditingArea(area);
        const estKwc = Math.round((area * 0.9 * 0.465) / 2.05);
        if (estKwc > 0) {
          setEditingMaxKwc(estKwc);
        }
      }

      toast({
        title: 'Détection 3D Google Solar réussie !',
        description: `Pente : ${slope}° • Azimut : ${azimuth}°`,
        className: 'bg-emerald-600 text-white border-emerald-700'
      });
      addLog(`✨ Détection 3D Toiture #${idx + 1} : Pente ${slope}°, Azimut ${azimuth}°`);
    } catch (err) {
      console.warn('Erreur Solar 3D:', err);
      toast({
        title: 'Données 3D non disponibles',
        description: 'Données 3D non disponibles pour cette zone géographique. Veuillez utiliser le tracé manuel.',
        className: 'bg-amber-500 text-white border-amber-600',
      });
    } finally {
      setIsDetecting3D(false);
    }
  };

  // Optimisation 90° (OMBB) du tracé de CETTE toiture
  const handleSquareManual = (idx) => {
    const item = processedResults[idx];
    const poly = editingPolygon || item.building?.polygon;
    if (!poly || poly.length < 3) {
      toast({
        title: 'Tracé introuvable',
        description: 'Aucune coordonnée de toiture trouvée pour ce bâtiment.',
        variant: 'destructive'
      });
      return;
    }

    setIsSquaringManual(true);
    try {
      const squared = squarePolygon(poly);
      if (!squared || squared.length < 4) {
        toast({ title: 'Erreur d\'optimisation', description: 'Impossible d\'orthogonaliser ce polygone.', variant: 'destructive' });
        return;
      }

      // Calcul métrique surface et azimut sur le rectangle orthogonalisé
      const R = 6378137;
      const toRad = deg => (deg * Math.PI) / 180;
      const avgLat = squared.reduce((s, p) => s + p.lat, 0) / squared.length;
      const cosLat = Math.cos(toRad(avgLat));
      const cart = squared.map(p => ({
        x: R * toRad(p.lng) * cosLat,
        y: R * toRad(p.lat)
      }));

      let maxLen = 0;
      let dominantAngle = 0;
      for (let i = 0; i < cart.length; i++) {
        const p1 = cart[i];
        const p2 = cart[(i + 1) % cart.length];
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (len > maxLen) {
          maxLen = len;
          dominantAngle = Math.atan2(p2.x - p1.x, p2.y - p1.y) * (180 / Math.PI);
        }
      }
      let az = Math.round((dominantAngle + 360) % 360);

      let areaM2 = 0;
      for (let i = 0; i < cart.length; i++) {
        const p1 = cart[i];
        const p2 = cart[(i + 1) % cart.length];
        areaM2 += (p1.x * p2.y - p2.x * p1.y);
      }
      areaM2 = Math.round(Math.abs(areaM2) / 2);

      // Mise à jour de l'état de CETTE ligne uniquement
      setEditingPolygon(squared);
      setEditingAzimuth(az);
      setEditingArea(areaM2);
      const estKwc = Math.round((areaM2 * 0.9 * 0.465) / 2.05);
      if (estKwc > 0) {
        setEditingMaxKwc(estKwc);
      }

      toast({
        title: 'Angles optimisés à 90° (OMBB) !',
        description: `Rectangle parfait généré • Surface : ${areaM2} m² • Azimut : ${az}°`,
        className: 'bg-emerald-600 text-white border-emerald-700'
      });
      addLog(`📐 Toiture #${idx + 1} angles optimisés à 90° : ${areaM2} m² • Azimut ${az}°`);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Échec de l\'orthogonalisation.', variant: 'destructive' });
    } finally {
      setIsSquaringManual(false);
    }
  };

  // Recalcul d'une ligne de résultat avec de nouveaux paramètres (ex: pente, azimut, puissance, polygone)
  const handleRecalculateRow = async (idx) => {
    setIsRecalculatingRow(true);
    try {
      const item = processedResults[idx];
      const newPitch = Number(editingPitch);
      const newAzimuth = editingAzimuth !== undefined ? Number(editingAzimuth) : undefined;
      const isZeroPitch = newPitch === 0;
      const polyToUse = editingPolygon || item.building?.polygon;
      const areaToUse = editingArea || item.building?.area;

      addLog(`⚙️ Recalcul de la toiture #${idx + 1} (${item.addressLabel}) avec pente ${newPitch}°, azimut ${newAzimuth ?? 'auto'}°...`);

      const newSim = await simulateBuildingHeadless({
        building: {
          ...item.building,
          polygon: polyToUse,
          area: areaToUse,
          tags: {
            ...item.building.tags,
            'roof:shape': isZeroPitch ? 'flat' : item.building.tags?.['roof:shape']
          }
        },
        addressInfo: {
          label: item.addressLabel,
          departmentCode: item.simulation?.departmentCode
        },
        cadastreInfo: {
          parcelleRef: item.cadastreRef
        },
        customSettings: {
          costPerKwc: 920,
          minKwc: 10,
          maxKwc: 5000,
          targetMaxKwc: editingMaxKwc !== '' ? Number(editingMaxKwc) : undefined,
          pitch: newPitch,
          azimuth: newAzimuth,
          isTerrasse: isZeroPitch,
          roofType: isZeroPitch ? 'terrasse' : item.simulation?.roofType,
          economicModel: editingEconomicModel,
          tarifEdfOa: Number(editingTarifEdfOa),
          excludeThirdParty: editingExcludeThirdParty,
          includeCoverLetter
        }
      });

      if (!newSim) {
        alert('Impossible de recalculer cette toiture avec les paramètres indiqués.');
        return;
      }

      // Régénération du PDF avec les nouveaux paramètres
      const pdfResult = await generateProspectingPdfBlob(newSim);

      if (!pdfResult || (!pdfResult.blob && !pdfResult.arrayBuffer)) {
        alert('Erreur lors de la génération du nouveau PDF.');
        return;
      }

      // Sauvegarde dans le dossier sélectionné si actif
      let saveRes = item.saveResult;
      if (directoryHandle || bridgeStatus.online) {
        saveRes = await savePdfToLocalDestination({
          filename: pdfResult.filename,
          blob: pdfResult.blob,
          arrayBuffer: pdfResult.arrayBuffer,
          directoryHandle,
          preferBridge: true
        });
      }

      const updated = [...processedResults];
      updated[idx] = {
        ...item,
        building: {
          ...item.building,
          polygon: polyToUse,
          area: areaToUse
        },
        simulation: newSim,
        filename: pdfResult.filename,
        blob: pdfResult.blob,
        arrayBuffer: pdfResult.arrayBuffer,
        saveResult: saveRes
      };

      setProcessedResults(updated);
      setEditingRowIndex(null);
      addLog(`✨ Bâtiment #${idx + 1} recalculé avec succès : Pente ${newPitch}° (${isZeroPitch ? 'Toiture terrasse Plein Sud 0°' : newSim.orientationLabel}) • ${newSim.installedKwc} kWc.`);
    } catch (err) {
      console.error('Erreur lors du recalcul de la ligne :', err);
      alert('Une erreur est survenue lors du recalcul.');
    } finally {
      setIsRecalculatingRow(false);
    }
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
    <div className="fixed inset-x-0 top-[65px] bottom-0 z-[9990] flex items-center justify-center p-2 sm:p-3 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-[98vw] max-w-[1550px] 2xl:max-w-[1860px] h-[calc(100vh-85px)] max-h-[calc(100vh-85px)] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* ─── 1. EN-TÊTE SUPÉRIEUR COMPACT & ÉLÉGANT ────────────────────── */}
        <div className="bg-[#0e2b4d] text-white px-5 py-3 sm:py-3.5 border-b border-white/10 shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 shrink-0">
                <Zap className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
                    Recherche &amp; Prospection Automatique de Toitures Solaires
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Mode Headless
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    100 à 3 000 kWc+
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  Détection cadastrale IGN &amp; OSM (toitures de 400 à 50 000 m²), calepinage 465 Wc, tarification EDF OA et export PDF.
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
                  <span>Agent local : <code>{bridgeStatus.targetDir || 'C:\\Users\\Utilisateur\\PDF TOITURES'}</code></span>
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
        <div className="p-3 sm:p-4 overflow-hidden flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 bg-slate-100/70">

          {/* ═══ COLONNE GAUCHE (5 cols) : TOUT VISIBLE SANS SCROLL VERTICAL ════ */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5 overflow-y-auto overflow-x-hidden pr-0.5 min-w-0">

            {/* CARTE 1 : ZONE GÉOGRAPHIQUE */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  1. Zone Géographique de Prospection
                </label>

                {/* SELECTEUR D'ONGLET COMMUNE / EMPRISE CARTE */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setGeoMode('commune')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
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
                    className={`px-2.5 py-1 rounded-lg transition-all ${
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
                <div className="relative space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={communeSearch}
                      onChange={(e) => handleSearchCommunes(e.target.value)}
                      placeholder="Nom de la commune ou code postal (ex: Bordeaux, Mérignac...)"
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-xs"
                      disabled={status === 'running' || status === 'sourcing'}
                    />
                    {isSearchingCommune && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {isTypingCommuneRef.current && communeSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-44 overflow-y-auto divide-y divide-slate-100">
                      {communeSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCommune(c)}
                          className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                        >
                          <span>{c.nom} ({c.postalCode})</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{c.departmentCode} • pop: {c.population.toLocaleString('fr-FR')}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCommune && (
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
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
                <div className="space-y-1.5">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-slate-900 text-[11px]">
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        Position simulateur :
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
                          className={`py-1 px-1 rounded-lg text-center text-xs font-black transition-all ${
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

            {/* CARTE 2 : DOSSIER LOCAL DE DESTINATION (COMPACTE & SANS DOUBLON) */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                  2. Dossier Local d'Enregistrement PDF
                </label>

                <button
                  type="button"
                  onClick={handleSelectFolder}
                  disabled={isSelectingFolder}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                >
                  {isSelectingFolder ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FolderDown className="w-3 h-3" />
                  )}
                  <span>{directoryHandle ? 'Modifier' : 'Sélectionner le dossier'}</span>
                </button>
              </div>

              {/* Statut unifié et compact (zéro doublon de boîte verte) */}
              {directoryHandle ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Dossier lié : <code>{selectedFolderName || directoryHandle.name}</code></span>
                </div>
              ) : isFirefoxMode ? (
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-emerald-950 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">Mode Firefox actif : <code>{selectedFolderName || 'Téléchargements (Firefox)'}</code></span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md shrink-0">
                    Direct + ZIP
                  </span>
                </div>
              ) : bridgeStatus.online ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Écriture directe active : <code>{bridgeStatus.targetDir || 'C:\\Users\\Utilisateur\\PDF TOITURES'}</code></span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 py-0.5">
                  Cliquez sur <strong>"Sélectionner le dossier"</strong> pour choisir la destination locale.
                </p>
              )}

              {folderFeedback && folderFeedback.type === 'error' && (
                <div className="p-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                  <span>{folderFeedback.message}</span>
                </div>
              )}
            </div>

            {/* CARTE 3 : PARAMÈTRES TECHNIQUES & MODÈLE ÉCONOMIQUE */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                  3. Objectifs &amp; Modèle Économique
                </label>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  {showAdvanced ? 'Masquer m²' : 'Ajuster m²'}
                </button>
              </div>

              {/* SÉLECTEUR DU MODÈLE ÉCONOMIQUE (3 BOUTONS) */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black text-slate-800 flex items-center gap-1">
                    <Euro className="w-3.5 h-3.5 text-blue-600" />
                    Valorisation de l'électricité :
                  </span>
                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${
                    economicModel === 'vente_totale'
                      ? ((Number(maxTargetKwc) > 0 && Number(maxTargetKwc) <= 100) || (Number(minTargetKwc) < 100 && (!maxTargetKwc || Number(maxTargetKwc) <= 100)))
                        ? 'text-red-700 bg-red-100 border-red-300'
                        : 'text-blue-700 bg-blue-100/80 border-blue-300'
                      : economicModel === 'autoconsommation_stockage'
                      ? 'text-purple-700 bg-purple-100/80 border-purple-300'
                      : 'text-emerald-700 bg-emerald-100/80 border-emerald-300'
                  }`}>
                    {economicModel === 'vente_totale'
                      ? ((Number(maxTargetKwc) > 0 && Number(maxTargetKwc) <= 100) || (Number(minTargetKwc) < 100 && (!maxTargetKwc || Number(maxTargetKwc) <= 100)))
                        ? 'Vente Totale (Déconseillé < 100 kWc)'
                        : 'Vente Totale 100%'
                      : economicModel === 'autoconsommation_stockage'
                      ? 'Autoconso + Stockage'
                      : 'Autoconso + Surplus'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {(() => {
                    const isUnder100Kwc = (Number(maxTargetKwc) > 0 && Number(maxTargetKwc) <= 100) ||
                                          (Number(minTargetKwc) < 100 && (!maxTargetKwc || Number(maxTargetKwc) <= 100));
                    return (
                      <button
                        type="button"
                        onClick={() => setEconomicModel('vente_totale')}
                        className={`p-1.5 rounded-xl text-left transition-all border cursor-pointer ${
                          isUnder100Kwc
                            ? economicModel === 'vente_totale'
                              ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400'
                              : 'bg-red-500/15 text-red-900 border-red-300 hover:bg-red-500/25 ring-1 ring-red-200'
                            : economicModel === 'vente_totale'
                            ? 'bg-[#0e2b4d] text-white border-slate-900 shadow-sm ring-1 ring-blue-400'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="font-black text-[10px]">Revente totale</div>
                          {isUnder100Kwc ? (
                            <span className={`text-[7.5px] font-black uppercase px-1 py-0.5 rounded ${
                              economicModel === 'vente_totale' ? 'bg-white text-red-700' : 'bg-red-600 text-white'
                            }`}>
                              Déconseillé
                            </span>
                          ) : (
                            economicModel === 'vente_totale' && <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                          )}
                        </div>
                        <div className={`text-[8.5px] mt-0.5 leading-tight ${
                          economicModel === 'vente_totale'
                            ? isUnder100Kwc ? 'text-red-100 font-bold' : 'text-blue-200 font-medium'
                            : isUnder100Kwc ? 'text-red-700 font-bold' : 'text-slate-500'
                        }`}>
                          {isUnder100Kwc ? '⚠️ Déconseillé (< 100 kWc)' : `100% à ${tarifEdfOa} €/kWh`}
                        </div>
                      </button>
                    );
                  })()}

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
                      Écon. + surplus
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
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Puissance cible (kWc) :
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-slate-500 font-bold text-[8.5px]">Min (kWc)</label>
                      <input
                        type="number"
                        value={minTargetKwc}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setMinTargetKwc(raw === '' ? '' : Number(raw));
                          if (raw !== '' && Number(raw) > 0) {
                            setMinArea(Math.max(100, Math.round((Number(raw) * 1000 / 465) * 2.05 * 0.75)));
                          }
                        }}
                        onBlur={() => {
                          if (minTargetKwc === '' || isNaN(Number(minTargetKwc)) || Number(minTargetKwc) < 1) {
                            setMinTargetKwc(100);
                            setMinArea(Math.max(100, Math.round((100 * 1000 / 465) * 2.05 * 0.75)));
                          }
                        }}
                        className="w-full p-1 bg-white border border-slate-300 rounded-lg font-black text-slate-800 text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold text-[8.5px]">Max (kWc)</label>
                      <input
                        type="number"
                        value={maxTargetKwc}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setMaxTargetKwc(raw === '' ? '' : Number(raw));
                          if (raw !== '' && Number(raw) > 0) {
                            setMaxArea(Math.round((Number(raw) * 1000 / 465) * 2.05 * 1.6));
                          }
                        }}
                        onBlur={() => {
                          if (maxTargetKwc === '' || isNaN(Number(maxTargetKwc)) || Number(maxTargetKwc) < 1) {
                            setMaxTargetKwc(3000);
                            setMaxArea(50000);
                          }
                        }}
                        className="w-full p-1 bg-white border border-slate-300 rounded-lg font-black text-slate-800 text-xs text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                    <Euro className="w-3 h-3 text-blue-600" />
                    Tarif EDF OA (€/kWh) :
                  </span>
                  <div>
                    <label className="block text-slate-500 font-bold text-[8.5px]">Achat EDF OA libre</label>
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

              {/* SÉLECTEUR DU NOMBRE DE BÂTIMENTS CIBLES (10, 30, 50, 100, Tout) */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-emerald-600" />
                    Nombre de toitures cibles à trouver :
                  </span>
                  <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md border border-emerald-300">
                    {targetLimit === 'Tout' ? 'Toutes les toitures' : `${targetLimit} toitures`}
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

              {/* OPTION EXCLUSION TIERS-FINANCEMENT */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black text-slate-800 leading-tight">
                        Financement : Crédit &amp; Abonnement uniquement
                      </div>
                      <div className="text-[8.5px] text-slate-500 leading-tight">
                        {excludeThirdParty ? 'Tiers-investisseur exclu (2 colonnes dans le PDF)' : '3 solutions incluses (Tiers, Crédit, Abonnement)'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={excludeThirdParty}
                    onChange={(e) => setExcludeThirdParty(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </label>
              </div>

              {/* OPTION COURRIER DE PROSPECTION (PAGE 2) */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black text-slate-800 leading-tight">
                        Courrier de prospection nominatif AFNOR (Page 1)
                      </div>
                      <div className="text-[8.5px] text-slate-500 leading-tight">
                        {includeCoverLetter ? 'Page 1 Lettre AFNOR + Page 2 Fiche technique' : 'Offre commerciale 1 page seule'}
                      </div>
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

              {/* Grille des critères récapitulatifs */}
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase block">Surface toiture</span>
                  <strong className="text-slate-900 font-black text-[10.5px]">{minArea} à {maxArea} m²</strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase block">Puissance installable</span>
                  <strong className="text-emerald-700 font-black text-[10.5px]">{minTargetKwc} à {maxTargetKwc} kWc</strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase block">Modèle valorisation</span>
                  <strong className="text-blue-700 font-black text-[10.5px]">
                    {economicModel === 'vente_totale' ? `${tarifEdfOa} €/kWh OA` : economicModel === 'autoconsommation_stockage' ? 'Autoconso + Stockage' : 'Autoconso + Surplus'}
                  </strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase block">Courrier joint</span>
                  <strong className={`font-black text-[10.5px] ${includeCoverLetter ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {includeCoverLetter ? 'Oui (Page 1)' : 'Non (1 Page)'}
                  </strong>
                </div>
              </div>

              {showAdvanced && (
                <div className="pt-1.5 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold mb-0.5 text-[10px]">Surface min (m²) :</label>
                    <input
                      type="number"
                      value={minArea}
                      onChange={(e) => setMinArea(Number(e.target.value))}
                      className="w-full p-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-0.5 text-[10px]">Surface max (m²) :</label>
                    <input
                      type="number"
                      value={maxArea}
                      onChange={(e) => setMaxArea(Number(e.target.value))}
                      className="w-full p-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRAND BOUTON D'ACTION PRINCIPAL - ANTI SCROLL LATÉRAL */}
            <div className="pt-0.5 shrink-0 w-full min-w-0 flex justify-center">
              {status === 'running' || status === 'sourcing' ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="w-[96%] max-w-full min-w-0 py-3 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer overflow-hidden"
                >
                  <Square className="w-4 h-4 fill-white shrink-0" />
                  <span className="truncate">Interrompre la Prospection Automatique</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartProspecting}
                  disabled={geoMode === 'commune' && !selectedCommune}
                  className="w-[96%] max-w-full min-w-0 py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:brightness-105 active:scale-[0.99] cursor-pointer overflow-hidden"
                >
                  <Play className="w-4 h-4 fill-white shrink-0" />
                  <span className="truncate">
                    Lancer la Prospection Automatique
                    {geoMode === 'commune'
                      ? ` (${selectedCommune?.nom || communeSearch || 'Commune'} - ${targetLimit === 'Tout' ? 'Tout' : `${targetLimit} toitures`})`
                      : ` (Emprise Carte - ${targetLimit === 'Tout' ? 'Tout' : `${targetLimit} toitures`})`}
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
                        className="p-3 hover:bg-slate-900/60 rounded-xl transition-colors text-xs"
                      >
                        <div className="flex items-center justify-between gap-3">
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
                                <span className="text-teal-300 font-medium">
                                  📐 {Number(item.simulation?.pitch) === 0 ? 'Plein Sud (0°)' : `${item.simulation?.pitch ?? 15}°`}
                                </span>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold">💶 {item.simulation?.annualRevenueReventeTotale?.toLocaleString('fr-FR')} €/an</span>
                                {item.simulation?.googleSolar?.maxSunshineHoursPerYear && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30 text-[10px] flex items-center gap-1">
                                      ☀️ Google Solar : {Math.round(item.simulation.googleSolar.maxSunshineHoursPerYear)} h/an
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRow(idx, item)}
                              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                editingRowIndex === idx
                                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                                  : 'bg-white/10 hover:bg-white/20 text-white hover:text-amber-300'
                              }`}
                              title="Modifier la pente et les paramètres de cette toiture"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[11px]">Paramètres</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenOfferConfigModal(item)}
                              className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 hover:text-white transition-colors cursor-pointer border border-emerald-500/30"
                              title="Configurer et générer l'offre PDF commerciale"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPostalModalItem(item.simulation || item);
                                setIsPostalModalOpen(true);
                              }}
                              className="p-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/60 text-blue-200 hover:text-white transition-colors cursor-pointer"
                              title="Expédier ce courrier par La Poste (ServicePostal)"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* TIROIR D'ÉDITION INLINE DES PARAMÈTRES DE LA LIGNE */}
                        {editingRowIndex === idx && (
                          <div className="mt-3 p-3.5 bg-slate-900/90 border border-emerald-500/40 rounded-2xl space-y-3 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                                <Sliders className="w-4 h-4 text-emerald-400" />
                                <span>Révision des paramètres — Toiture #{idx + 1}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingRowIndex(null)}
                                className="text-slate-400 hover:text-white text-xs cursor-pointer px-2 py-0.5 rounded-lg hover:bg-slate-800"
                              >
                                ✕ Fermer
                              </button>
                            </div>

                            {/* Section 0 : Outils de dessin et de détection 3D (Google Solar & Orthogonalisation 90°) */}
                            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                  Outils toiture (Google Solar &amp; Orthogonalisation)
                                </span>
                                {editingPolygon && (
                                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                                    {editingPolygon.length} sommets • {editingArea ? `${editingArea} m²` : ''}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* Bouton 1 : Détection 3D Auto Google Solar */}
                                <button
                                  type="button"
                                  onClick={() => handleSolar3DDetect(idx)}
                                  disabled={isDetecting3D}
                                  className="p-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                  {isDetecting3D ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                      <span>Analyse 3D en cours...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4 text-amber-400" />
                                      <span>Détection 3D Auto (Google Solar)</span>
                                    </>
                                  )}
                                </button>

                                {/* Bouton 2 : Tracé manuel + Optimisation 90° (OMBB) */}
                                <button
                                  type="button"
                                  onClick={() => handleSquareManual(idx)}
                                  disabled={isSquaringManual}
                                  className="p-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 border border-blue-500/40 rounded-xl text-xs font-bold text-blue-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                  {isSquaringManual ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                      <span>Calcul OMBB 90°...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Square className="w-4 h-4 text-blue-400" />
                                      <span>Tracé manuel + Optimisation 90°</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Réglage de l'Azimut */}
                              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300 border-t border-slate-900">
                                <div className="flex items-center gap-2">
                                  <Compass className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="font-bold">Azimut toiture :</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="360"
                                    value={editingAzimuth}
                                    onChange={(e) => setEditingAzimuth(Math.round(Number(e.target.value)))}
                                    className="w-16 p-1 bg-slate-800 border border-slate-700 rounded-lg text-center text-xs font-black text-blue-400"
                                  />
                                  <span className="text-slate-400">° (180° = Plein Sud)</span>
                                </div>

                                {editingArea && (
                                  <span className="text-[10px] text-slate-400">
                                    Surface : <strong className="text-white">{editingArea} m²</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Section 1 : Pente de toiture & Règle Plein Sud 0° */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                                  <span>📐 Pente de toiture :</span>
                                  <span className="text-amber-400 font-black">
                                    {Number(editingPitch) === 0 ? '0° (Terrasse - Plein Sud)' : `${editingPitch}°`}
                                  </span>
                                </label>
                                <span className="text-[10px] text-slate-400">
                                  {Number(editingPitch) === 0 ? 'Toiture terrasse' : 'Toiture inclinée'}
                                </span>
                              </div>

                              <div className="grid grid-cols-5 gap-1">
                                {[
                                  { pitch: 0, label: '0° Terrasse (Sud)' },
                                  { pitch: 10, label: '10°' },
                                  { pitch: 15, label: '15°' },
                                  { pitch: 20, label: '20°' },
                                  { pitch: 30, label: '30°' }
                                ].map((p) => (
                                  <button
                                    key={p.pitch}
                                    type="button"
                                    onClick={() => setEditingPitch(p.pitch)}
                                    className={`py-1.5 px-1 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
                                      Number(editingPitch) === p.pitch
                                        ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                    }`}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>

                              {/* Saisie libre de la pente */}
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="text-[10.5px] text-slate-400 font-medium">Autre pente :</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  value={editingPitch}
                                  onChange={(e) => setEditingPitch(Math.max(0, Math.min(60, Number(e.target.value))))}
                                  className="w-16 p-1 bg-slate-800 border border-slate-700 rounded-lg text-center text-xs font-black text-emerald-400"
                                />
                                <span className="text-xs text-slate-400">degrés (°)</span>
                              </div>

                              {Number(editingPitch) === 0 && (
                                <div className="p-2 bg-blue-950/70 border border-blue-500/40 rounded-xl text-[10.5px] text-blue-200 flex items-center gap-2 leading-relaxed">
                                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                                  <span>
                                    <strong>Règle toiture terrasse (0°) :</strong> l'orientation est automatiquement fixée à <strong>Plein Sud (0°)</strong> avec calepinage sur bacs lestés inclinés pour un productible optimal.
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Section 1b : Puissance maximale à installer */}
                            <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                              <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1 whitespace-nowrap">
                                ⚡ Puissance max à installer :
                              </label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={editingMaxKwc}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setEditingMaxKwc(raw === '' ? '' : Number(raw));
                                  // Auto-ajuster le tarif EDF OA selon la puissance
                                  if (raw !== '' && Number(raw) > 0) {
                                    const kwc = Number(raw);
                                    if (kwc > 500) setEditingTarifEdfOa(0.078);
                                    else if (kwc >= 100) setEditingTarifEdfOa(0.085);
                                    else setEditingTarifEdfOa(0.011);
                                  }
                                }}
                                onBlur={() => {
                                  if (editingMaxKwc === '' || isNaN(Number(editingMaxKwc)) || Number(editingMaxKwc) < 1) {
                                    setEditingMaxKwc('');
                                  }
                                }}
                                placeholder="Auto"
                                className="w-20 p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-center text-xs font-black text-amber-400"
                              />
                              <span className="text-[10.5px] text-slate-400">kWc</span>
                              <span className="text-[9.5px] text-slate-500 italic">
                                (vide = puissance réelle de la toiture)
                              </span>
                            </div>

                            {/* Section 2 : Modèle économique & Tarif EDF OA */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10.5px]">
                              <div>
                                <label className="block text-slate-400 font-bold mb-1">Modèle de valorisation :</label>
                                <select
                                  value={editingEconomicModel}
                                  onChange={(e) => setEditingEconomicModel(e.target.value)}
                                  className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold"
                                >
                                  <option value="vente_totale">Revente totale (EDF OA)</option>
                                  <option value="autoconsommation">Autoconsommation + Vente surplus</option>
                                  <option value="autoconsommation_stockage">Autoconsommation + Stockage (100%)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-slate-400 font-bold mb-1">Tarif EDF OA (€/kWh) :</label>
                                <input
                                  type="number"
                                  step="0.001"
                                  value={editingTarifEdfOa}
                                  onChange={(e) => setEditingTarifEdfOa(parseFloat(e.target.value) || 0)}
                                  className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-blue-400 text-xs font-black text-center"
                                />
                              </div>
                            </div>

                            {/* Section 3 : Solutions de financement PDF (Option d'exclure le Tiers Financement) */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80">
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                  <span>Financement PDF :</span>
                                  <span className={editingExcludeThirdParty ? "text-purple-400 font-black" : "text-slate-300 font-semibold"}>
                                    {editingExcludeThirdParty ? 'Crédit bancaire & Abonnement uniquement' : '3 solutions (Tiers, Crédit, Abonnement)'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {editingExcludeThirdParty 
                                    ? 'La solution Tiers Financement sera retirée de l\'offre PDF (affichage 2 colonnes).' 
                                    : '3 solutions incluses : Tiers-investisseur, Crédit bancaire et Abonnement.'}
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                                <input
                                  type="checkbox"
                                  checked={editingExcludeThirdParty}
                                  onChange={(e) => setEditingExcludeThirdParty(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                              </label>
                            </div>

                            {/* Section 4 : Actions de recalcul & sauvegarde */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => setEditingRowIndex(null)}
                                disabled={isRecalculatingRow}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                              >
                                Annuler
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRecalculateRow(idx)}
                                disabled={isRecalculatingRow}
                                className="px-4 py-1.5 rounded-xl text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                              >
                                {isRecalculatingRow ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Recalcul de l'offre en cours...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Recalculer &amp; Mettre à jour l'Offre PDF</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
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
            <span>Offres commerciales conformes aux arrêtés tarifaires EDF OA (S21) et dimensionnées aux modules 465 Wc.</span>
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

        {/* Modal d'envoi postal La Poste via ServicePostal */}
        <ServicePostalModal
          isOpen={isPostalModalOpen}
          onClose={() => setIsPostalModalOpen(false)}
          prospect={postalModalItem}
          generatePdfFn={async (item) => {
            const simData = item.simulation || item;
            return await generateProspectingPdfBlob({
              ...simData,
              includeCoverLetter: true
            });
          }}
        />

        {/* Modale de paramétrage interactif de l'offre commerciale avant export PDF */}
        <CommercialOfferConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          item={configModalItem}
          onConfirmGenerate={handleConfirmGenerateOfferPdf}
        />

      </motion.div>
    </div>
  );
}
