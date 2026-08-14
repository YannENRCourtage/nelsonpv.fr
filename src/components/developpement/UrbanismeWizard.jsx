import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, Car, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, FileCheck, Zap,
  Hash, Ruler, Info, RefreshCw, Mail, Phone, FileText,
  Upload, Image as ImageIcon, Check, Camera, Eye, Sparkles, Layers,
  Crop, HelpCircle, ArrowRight, Box, Sliders
} from 'lucide-react';
import { getMissingFields, buildCerfaDataSummary, resolveDemandeurNames } from '@/services/SmartCerfaService';
import { cadastreService } from '@/services/CadastreService';
import { getOrGenerateProjectMaps } from '@/services/AutoMapService';
import { useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';
import { ControlPanel } from '../configurator/ui/ControlPanel.jsx';
import BuildingScene from '../configurator/BuildingScene.jsx';
import ImageCropModal from './ImageCropModal';
import DimensionsModal from './DimensionsModal';
import LandscapeIntegrationModal from './LandscapeIntegrationModal';
import Building3DViewer from './Building3DViewer';

const DOSSIER_INFO = {
  cu: {
    title: "Certificat d'Urbanisme opérationnel (CUo)",
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    accentColor: 'bg-sky-600',
  },
  dp: {
    title: 'Déclaration Préalable de Travaux (DP)',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    accentColor: 'bg-emerald-600',
  },
  pc: {
    title: 'Permis de Construire (PC)',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    accentColor: 'bg-violet-600',
  },
};

export default function UrbanismeWizard({ isOpen, onClose, type, project, onGenerate }) {
  const [step, setStep] = useState(0); // 0=Déclarant, 1=Cartes PC1/PC2, 2=Configurateur 2D/3D (Clone page Configurateur), 3=Photos/3D, 4=Validation
  const [viewMode, setViewMode] = useState('3D'); // '3D' | '2D_FRONT'
  
  // Zustand Store du Configurateur Nelson
  const config = useConfiguratorValues();
  const configActions = useConfiguratorActions();

  const [editedProject, setEditedProject] = useState(project || {});
  const [captures, setCaptures] = useState(project?.urbanisme_captures || {});
  const [photos, setPhotos] = useState(project?.pc_photos || {});
  const [fetchingCadastre, setFetchingCadastre] = useState(false);
  const [generatingMaps, setGeneratingMaps] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Modales
  const [cropModal, setCropModal] = useState({ open: false, src: null, category: null, key: null, title: '' });
  const [landscapeModalOpen, setLandscapeModalOpen] = useState(false);

  const dossierInfo = DOSSIER_INFO[type] || DOSSIER_INFO.pc;

  // Synchronisation du projet initial à l'ouverture
  useEffect(() => {
    if (project && isOpen) {
      const names = resolveDemandeurNames(project);
      const cleanDemandeur = names.lastName || project.name || '';
      const projEmail = project.email || project.clientEmail || project.contactEmail || project.client_email || 'isabelle.dupond@gmail.com';
      const projAddress = project.address || project.clientAddress || project.projectAddress || project.siteAddress || project.street || project.adresse || '';
      const projZip = project.zip || project.postalCode || project.code_postal || project.clientZip || '';
      const projCity = project.city || project.commune || project.clientCity || project.cadastre_commune || '';

      const isOmbriere = (project.type || '').toLowerCase().includes('ombriere');
      if (isOmbriere) {
        configActions.setBuildingType('ombriere_vl_double');
      } else {
        configActions.setBuildingType('symetrique');
      }

      const initProj = {
        ...project,
        type: isOmbriere ? 'ombriere' : 'batiment_solaire',
        lastName: cleanDemandeur,
        firstName: names.firstName || '',
        demandeur: cleanDemandeur,
        email: projEmail,
        address: projAddress,
        zip: projZip,
        city: projCity,
        phone: project.phone || project.clientPhone || '06 00 00 00 00',
        birthDate: project.birthDate || '14/02/1970',
        birthCity: project.birthCity || projCity || 'AUCH',
        birthDept: project.birthDept || (projZip ? projZip.substring(0, 2) : '32'),
        description: project.description || `Construction d'un bâtiment agricole à charpente métallique avec centrale photovoltaïque en toiture de ${project.kwc || 100} kWc`,
        longueur: String(config.length || 30.0),
        largeur: String(config.width || 18.6),
        hauteur_egout: String(config.eaveHeight || 5.5),
        pente: String(config.roofPitch || 10),
        pente_terrain: project.pente_terrain || '3',
        cotation_bati: project.cotation_bati || '12.50',
        cotation_voie: project.cotation_voie || '8.00',
      };
      setEditedProject(initProj);
      setCaptures(project?.urbanisme_captures || {});
      setPhotos(project?.pc_photos || {});

      // 1. Cadastre IGN automatique
      if ((initProj.gps || initProj.lat) && (!initProj.cadastre_section || !initProj.cadastre_numero)) {
        setFetchingCadastre(true);
        const gps = initProj.gps || `${initProj.lat},${initProj.lng}`;
        const [lat, lng] = gps.split(',').map(Number);
        cadastreService.getParcelle(lat, lng).then(data => {
          if (data) {
            setEditedProject(prev => ({
              ...prev,
              cadastre_section: prev.cadastre_section || data.section,
              cadastre_numero: prev.cadastre_numero || data.numero,
              cadastre_surface: prev.cadastre_surface || data.contenance,
              cadastre_commune: prev.cadastre_commune || data.nom_commune,
            }));
          }
        }).catch(e => console.error('Erreur auto cadastre:', e))
        .finally(() => setFetchingCadastre(false));
      }

      // 2. Génération automatique des cartes PC1 & PC2 (OSM Zoom 19)
      setGeneratingMaps(true);
      getOrGenerateProjectMaps(initProj).then(autoMaps => {
        setCaptures(prev => ({ ...prev, ...autoMaps }));
        setEditedProject(prev => ({
          ...prev,
          urbanisme_captures: { ...(prev.urbanisme_captures || {}), ...autoMaps }
        }));
        setGeneratingMaps(false);
      }).catch(() => setGeneratingMaps(false));
    }
  }, [project, isOpen]);

  // Synchronisation continue des valeurs du configurateur vers le projet
  useEffect(() => {
    if (config) {
      const isOmbriere = (config.buildingType || '').startsWith('ombriere');
      const category = isOmbriere ? 'ombriere' : 'batiment_solaire';
      const kwcCalc = config.solarStats?.power ? Math.round(config.solarStats.power) : Math.round((config.width * config.length * 0.22) / 5) * 5;

      setEditedProject(prev => ({
        ...prev,
        type: category,
        installationType: category,
        buildingType: config.buildingType,
        largeur: String(config.width.toFixed(2)),
        longueur: String(config.length.toFixed(2)),
        hauteur_egout: String(config.eaveHeight.toFixed(2)),
        pente: String(config.roofPitch),
        kwc: kwcCalc,
        projectSize: kwcCalc,
      }));
    }
  }, [config.width, config.length, config.eaveHeight, config.roofPitch, config.buildingType, config.solarStats]);

  // Sauvegarde simulation 3D après projet (PC6)
  const handleSaveSimulation = (simulatedDataUrl) => {
    const updatedPhotos = { ...photos, apres: simulatedDataUrl };
    setPhotos(updatedPhotos);
    setEditedProject(prev => ({ ...prev, pc_photos: updatedPhotos }));
  };

  // Sauvegarde des 5 captures de façades pour PC5
  const handleCaptureSnapshotPC5 = (dataUrl, slotKey = 'facade_sud') => {
    const updated = {
      ...captures,
      [slotKey]: dataUrl,
      facades_projet: dataUrl
    };
    setCaptures(updated);
    setEditedProject(prev => ({ ...prev, urbanisme_captures: updated }));
  };

  const handleCaptureAll5ViewsPC5 = (fiveViewsObj) => {
    const updated = {
      ...captures,
      ...fiveViewsObj,
      facades_projet: fiveViewsObj.facade_sud || fiveViewsObj.vue_couverture
    };
    setCaptures(updated);
    setEditedProject(prev => ({ ...prev, urbanisme_captures: updated }));
  };

  // Recadrage
  const handleFileSelectForCrop = (category, key, title, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCropModal({
        open: true,
        src: e.target.result,
        category,
        key,
        title: `Recadrer : ${title}`,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCropComplete = (croppedDataUrl) => {
    const { category, key } = cropModal;
    if (category === 'captures') {
      const updated = { ...captures, [key]: croppedDataUrl };
      setCaptures(updated);
      setEditedProject(prev => ({ ...prev, urbanisme_captures: updated }));
    } else if (category === 'photos') {
      const updated = { ...photos, [key]: croppedDataUrl };
      setPhotos(updated);
      setEditedProject(prev => ({ ...prev, pc_photos: updated }));
    }
  };

  const handleFieldChange = (field, value) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
    setEditedProject(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!onGenerate) return;
    setIsGenerating(true);
    const finalProject = {
      ...editedProject,
      ...fieldValues,
      urbanisme_captures: captures,
      pc_photos: photos,
    };
    try {
      await onGenerate(type, editedProject.type || 'batiment_solaire', finalProject);
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const summary = buildCerfaDataSummary({ ...editedProject, ...fieldValues }, editedProject.type || 'batiment_solaire');
  const STEPS = ['Déclarant', 'Cartes PC1', 'Cotations & Côtes', 'Photos (Crop)', 'Validation'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col"
          style={{ height: '95vh' }}
        >
          {/* Header */}
          <div className={`${dossierInfo.bgColor} px-6 pt-4 pb-3 border-b ${dossierInfo.borderColor}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  Tunnel de Déclaration — {editedProject?.lastName || editedProject?.name || 'Projet Solaire'}
                </p>
                <h2 className={`text-xl font-extrabold ${dossierInfo.color}`}>{dossierInfo.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/70 rounded-xl transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Progress */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {STEPS.map((label, i) => {
                const isDone = i < step;
                const isCurrent = i === step;
                return (
                  <React.Fragment key={label}>
                    <button
                      onClick={() => setStep(i)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isCurrent
                          ? `${dossierInfo.accentColor} text-white shadow-md`
                          : isDone
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-white/60 text-gray-400 border border-gray-200'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px]">
                        {isDone ? '✓' : i + 1}
                      </span>
                      <span>{label}</span>
                    </button>
                    {i < STEPS.length - 1 && <div className="h-px w-4 bg-gray-200 flex-shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">

              {/* ÉTAPE 0 — Identité & Coordonnées du déclarant */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Étape 1 : Identité & Coordonnées du déclarant</h3>
                    <p className="text-xs text-gray-500">Ces informations sont préremplies automatiquement et restent modifiables.</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Vos coordonnées</p>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Nom & Prénom du demandeur *</label>
                        <input
                          type="text"
                          value={editedProject?.lastName || ''}
                          onChange={e => handleFieldChange('lastName', e.target.value)}
                          placeholder="Ex: CASSAGNE Arnaud"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Adresse email *</label>
                        <input
                          type="email"
                          value={editedProject?.email || ''}
                          onChange={e => handleFieldChange('email', e.target.value)}
                          placeholder="Ex: isabelle.dupond@gmail.com"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Numéro & Voie du déclarant</label>
                        <input
                          type="text"
                          value={editedProject?.address || ''}
                          onChange={e => handleFieldChange('address', e.target.value)}
                          placeholder="Ex: 4 Rue victor hugo"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Code Postal & Ville</label>
                        <div className="flex gap-2">
                          <input
                            type="text" placeholder="32000"
                            value={editedProject?.zip || ''}
                            onChange={e => handleFieldChange('zip', e.target.value)}
                            className="w-24 px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white text-center"
                          />
                          <input
                            type="text" placeholder="AUCH"
                            value={editedProject?.city || ''}
                            onChange={e => handleFieldChange('city', e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Téléphone</label>
                        <input
                          type="text"
                          value={editedProject?.phone || ''}
                          onChange={e => handleFieldChange('phone', e.target.value)}
                          placeholder="Ex: 06 47 92 34 24"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Commune & Dép. de naissance</label>
                        <div className="flex gap-2">
                          <input
                            type="text" placeholder="AUCH"
                            value={editedProject?.birthCity || ''}
                            onChange={e => handleFieldChange('birthCity', e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white"
                          />
                          <input
                            type="text" placeholder="32"
                            value={editedProject?.birthDept || ''}
                            onChange={e => handleFieldChange('birthDept', e.target.value)}
                            className="w-16 px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 1 — Localisation & Cartes automatiques PC1 & PC2 */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Étape 2 : Cadastre & Cartographie PC1 / PC2 Automatique</h3>
                    <p className="text-xs text-gray-500">Les cartes IGN, Géoportail et le plan de masse OSM (zoom 19) sont générés automatiquement.</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        <Hash className="w-4 h-4 text-blue-600" /> Références cadastrales du terrain
                      </p>
                      {fetchingCadastre && (
                        <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Récupération cadastre IGN...
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-gray-400 block mb-0.5">Section (ex: AL)</label>
                        <input
                          type="text" placeholder="AL"
                          value={editedProject?.cadastre_section || ''}
                          onChange={e => handleFieldChange('cadastre_section', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 bg-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-0.5">Numéro parcelle (ex: 0026)</label>
                        <input
                          type="text" placeholder="0026"
                          value={editedProject?.cadastre_numero || ''}
                          onChange={e => handleFieldChange('cadastre_numero', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 bg-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-0.5">Surface parcelle (m²)</label>
                        <input
                          type="number"
                          value={editedProject?.cadastre_surface || ''}
                          onChange={e => handleFieldChange('cadastre_surface', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-800 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Carte IGN PC1 */}
                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center relative overflow-hidden">
                      <p className="text-[11px] font-bold text-gray-600 mb-1.5">PC1 — Plan Cartographique (IGN)</p>
                      {captures?.ign ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={captures.ign} alt="Plan IGN" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setCropModal({ open: true, src: captures.ign, category: 'captures', key: 'ign', title: 'Recadrer Plan IGN' })}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                          >
                            <Crop className="w-4 h-4 mr-1" /> Recadrer / Ajuster
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-white">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Vue Aérienne Satellite PC1 */}
                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center relative overflow-hidden">
                      <p className="text-[11px] font-bold text-gray-600 mb-1.5">PC1 — Vue Aérienne (Géoportail)</p>
                      {captures?.satellite ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={captures.satellite} alt="Vue Satellite" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setCropModal({ open: true, src: captures.satellite, category: 'captures', key: 'satellite', title: 'Recadrer Vue Satellite' })}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                          >
                            <Crop className="w-4 h-4 mr-1" /> Recadrer / Ajuster
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-white">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Plan de Masse OSM Zoom 19 PC2 */}
                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center relative overflow-hidden">
                      <p className="text-[11px] font-bold text-gray-600 mb-1.5">PC2 — Plan de Masse (OSM Zoom 19)</p>
                      {captures?.masse_projet ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={captures.masse_projet} alt="Plan de masse" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setCropModal({ open: true, src: captures.masse_projet, category: 'captures', key: 'masse_projet', title: 'Recadrer Plan de Masse' })}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                          >
                            <Crop className="w-4 h-4 mr-1" /> Recadrer / Ajuster
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-white">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 2 — Configurateur 2D/3D (Exact Clone de la page Configurateur - Directive 1) */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-4 flex flex-col lg:flex-row gap-4 h-[72vh] overflow-hidden bg-slate-100/70 rounded-2xl">
                  
                  {/* Panneau de contrôle gauche (Composant officiel ControlPanel de la page Configurateur) */}
                  <div className="w-full lg:w-[410px] h-full overflow-y-auto pr-1">
                    <ControlPanel isAcama={false} selectedProject={editedProject} />
                  </div>

                  {/* Scène 3D droite (Composant officiel BuildingScene de la page Configurateur) */}
                  <div className="flex-1 relative h-full rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-200 shadow-sm isolate">
                    
                    {/* Badge dimensions top-left & bouton côtes */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-auto">
                      <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
                        <span className="text-slate-800 font-bold text-sm whitespace-nowrap">
                          {config.length.toFixed(2)}m × {config.width.toFixed(2)}m — {Math.round(config.width * config.length)}m²
                        </span>
                      </div>

                      {config.hasSolar && (
                        <div className="bg-yellow-50/95 backdrop-blur px-3 py-1 rounded-lg shadow-sm border border-yellow-200">
                          <span className="text-yellow-800 font-bold text-xs whitespace-nowrap">
                            ⚡ {config.solarStats?.power?.toFixed(2)} kWc
                          </span>
                        </div>
                      )}

                      <button
                        onClick={configActions.toggleDimensions}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm border transition-all flex items-center justify-between gap-2.5 ${
                          config.showDimensions ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>Afficher les côtes</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${config.showDimensions ? 'bg-white/30' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${config.showDimensions ? 'left-4' : 'left-0.5'}`} />
                        </div>
                      </button>
                    </div>

                    {/* Vue 3D / 2D Toggles top-right */}
                    <div className="absolute top-3 right-3 z-20 flex gap-1.5 bg-white/90 backdrop-blur p-1 rounded-xl border border-slate-200 shadow-sm pointer-events-auto">
                      <button
                        onClick={() => setViewMode('3D')}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                          viewMode === '3D' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Vue 3D
                      </button>
                      <button
                        onClick={() => setViewMode('2D_FRONT')}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                          viewMode === '2D_FRONT' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Vue 2D
                      </button>
                    </div>

                    {/* Rendu Canvas BuildingScene */}
                    <div className="w-full h-full">
                      <BuildingScene viewMode={viewMode} />
                    </div>

                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 3 — Visionneuse 3D (PC5 5 VUES) & Insertion Paysagère 3D (PC6) */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Étape 4 : PC5 (5 vues Façades & Toiture) & PC6 (Insertion paysagère 3D)</h3>
                    <p className="text-xs text-gray-500">Capturez les 5 vues de façades pour la PC5 (fond neutre) et positionnez le modèle 3D sur votre photo de terrain pour la PC6.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* PC5 — 5 Vues Façades & Toitures */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-blue-600" /> PC5 — Plan des Façades & Toitures (5 Vues 3D)
                        </span>
                        {captures?.facade_sud ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ 5 Vues Prêtes</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À capturer</span>
                        )}
                      </div>

                      <div className="flex-1 mb-2">
                        <Building3DViewer
                          buildingConfig={{
                            longueur: config.length,
                            largeur: config.width,
                            hauteur_egout: config.eaveHeight,
                            pente: config.roofPitch,
                            buildingType: config.buildingType,
                            leftSide: config.leftSide,
                            rightSide: config.rightSide,
                            type: editedProject.type
                          }}
                          onCaptureSnapshot={handleCaptureSnapshotPC5}
                          onCaptureAll5Views={handleCaptureAll5ViewsPC5}
                          height={220}
                        />
                      </div>
                    </div>

                    {/* PC6 — Insertion paysagère 3D (Avant / Après) */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-600" /> PC6 — Insertion Paysagère 3D ({config.width}m × {config.length}m)
                        </span>
                        {photos?.apres ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Simulation Prête</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À ajuster</span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-center">
                        {photos?.avant ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Photo Avant */}
                              <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200">
                                <img src={photos.avant} alt="Avant" className="w-full h-full object-cover" />
                                <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Avant</span>
                              </div>
                              {/* Photo Après */}
                              <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 bg-gray-100 flex items-center justify-center">
                                {photos?.apres ? (
                                  <>
                                    <img src={photos.apres} alt="Après" className="w-full h-full object-cover" />
                                    <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Après (3D)</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-semibold">En attente d'incrustation</span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => setLandscapeModalOpen(true)}
                              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                            >
                              <Box className="w-3.5 h-3.5" /> Ajuster & Déplacer le modèle 3D sur la photo
                            </button>
                          </div>
                        ) : (
                          <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-600 font-bold">1. Charger photo de terrain (Avant)</span>
                            <span className="text-[10px] text-gray-400">Puis ajustez la position du modèle 3D</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'avant', 'Photo Terrain Avant', e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PC7 & PC8 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700">PC7 — Environnement Proche</span>
                        {photos?.proche ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {photos?.proche ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={photos.proche} alt="Env Proche" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500 font-semibold">Importer photo proche</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'proche', 'Environnement Proche', e)} />
                        </label>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700">PC8 — Environnement Lointain</span>
                        {photos?.lointain ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {photos?.lointain ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={photos.lointain} alt="Env Lointain" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500 font-semibold">Importer photo lointaine</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'lointain', 'Environnement Lointain', e)} />
                        </label>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 4 — Validation */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-sm text-emerald-950">Dossier prêt pour la génération PDF !</h4>
                      <p className="text-xs text-emerald-800 mt-0.5">La page de garde architecte, PC1, PC2, PC3+PC4 fusionnés, PC5 (5 vues), PC6 et le CERFA interactif sont configurés.</p>
                    </div>
                  </div>

                  {/* Vignettes */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { title: 'PC1 - Situation IGN', ready: true },
                      { title: 'PC2 - Masse OSM 19', ready: true },
                      { title: 'PC3+PC4 - Coupe & Notice', ready: true },
                      { title: 'PC5 - Façades & Toiture (5 vues)', ready: !!captures?.facade_sud },
                      { title: 'PC6 - Insertion (Avant/Après)', ready: !!(photos?.avant || photos?.apres) },
                      { title: 'PC7 - Env. Proche', ready: !!photos?.proche },
                      { title: 'PC8 - Env. Lointain', ready: !!photos?.lointain },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-xl p-2 border border-gray-200 text-center">
                        <div className="w-full h-10 bg-white rounded-lg border border-gray-200 mb-1 flex items-center justify-center text-gray-400">
                          <Layers className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-800 truncate">{item.title}</p>
                        <span className={`text-[9px] font-bold inline-block px-1.5 py-0.2 rounded-full ${item.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                          {item.ready ? '✓ Prêt' : 'Optionnel'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Synthèse */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100 text-xs">
                    {Object.entries(summary).map(([k, val]) => (
                      <div key={k} className="flex items-start gap-3 px-4 py-2">
                        <span className="text-gray-400 w-36 flex-shrink-0 pt-0.5 capitalize">{k}</span>
                        <span className="font-semibold text-gray-800 flex-1">{val}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Modales */}
          <ImageCropModal
            isOpen={cropModal.open}
            onClose={() => setCropModal(prev => ({ ...prev, open: false }))}
            imageSrc={cropModal.src}
            title={cropModal.title}
            onCropComplete={handleCropComplete}
          />

          <LandscapeIntegrationModal
            isOpen={landscapeModalOpen}
            onClose={() => setLandscapeModalOpen(false)}
            initialPhoto={photos?.avant}
            projectDimensions={{
              longueur: config.length,
              largeur: config.width,
              hauteur_egout: config.eaveHeight,
              pente: config.roofPitch,
              buildingType: config.buildingType,
              leftSide: config.leftSide,
              rightSide: config.rightSide,
              type: editedProject.type
            }}
            installationType={editedProject.type}
            onSaveSimulation={handleSaveSimulation}
          />

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/80">
            <button
              onClick={step === 0 ? onClose : () => setStep(s => Math.max(0, s - 1))}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 0 ? 'Annuler' : 'Précédent'}
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(s => Math.min(4, s + 1))}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm ${dossierInfo.accentColor} hover:opacity-90`}
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-60"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Génération du PDF...</>
                ) : (
                  <><FileCheck className="w-4 h-4" /> Générer le dossier PDF (Interactif)</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
