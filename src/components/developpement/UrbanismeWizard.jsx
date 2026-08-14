import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Home, Car, Building2, Battery, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, Pencil, FileCheck, Zap,
  MapPin, User, Hash, Ruler, Info, RefreshCw, Mail, Phone, FileText,
  Upload, Image as ImageIcon, Check, Camera, Eye, Sparkles, Layers,
  Crop, HelpCircle, ArrowRight, Box, Sliders
} from 'lucide-react';
import { getMissingFields, buildCerfaDataSummary, resolveDemandeurNames } from '@/services/SmartCerfaService';
import { cadastreService } from '@/services/CadastreService';
import { getOrGenerateProjectMaps } from '@/services/AutoMapService';
import ImageCropModal from './ImageCropModal';
import DimensionsModal from './DimensionsModal';
import LandscapeIntegrationModal from './LandscapeIntegrationModal';
import Building3DViewer from './Building3DViewer';

// ─── Modèles de bâtiments issus du configurateur ─────────────────────────────

const BUILDING_MODELS = [
  {
    id: 'asymetrique_1',
    label: 'Asymétrique 1 zone',
    widths: [16.4, 20.0],
    defaultPitch: 15,
    defaultEave: 4.0,
  },
  {
    id: 'asymetrique_2',
    label: 'Asymétrique 2 zones',
    widths: [25.5, 29.1],
    defaultPitch: 15,
    defaultEave: 4.5,
  },
  {
    id: 'symetrique',
    label: 'Bi-pente Symétrique',
    widths: [15.0, 18.6, 22.3, 26.0, 29.8, 33.5],
    defaultPitch: 15,
    defaultEave: 4.0,
  },
  {
    id: 'monopente',
    label: 'Monopente',
    widths: [12.7, 16.4],
    defaultPitch: 10,
    defaultEave: 4.0,
  },
  {
    id: 'ombriere',
    label: 'Ombrière de parking photovoltaïque',
    widths: [6.9, 9.1, 11.3, 15.8, 20.2],
    defaultPitch: 10,
    defaultEave: 3.2,
  },
];

// ─── Types d'installation ────────────────────────────────────────────────────

const INSTALL_TYPES = [
  {
    id: 'batiment_solaire',
    label: 'Bâtiment agricole solaire',
    sublabel: 'Construction neuve avec centrale PV',
    icon: Building2,
    color: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'ombriere',
    label: 'Ombrière photovoltaïque',
    sublabel: 'Structure parking / terrasse',
    icon: Car,
    color: 'from-amber-500 to-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'toiture',
    label: 'Toiture existante',
    sublabel: 'Ajout de panneaux sur toiture',
    icon: Home,
    color: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  {
    id: 'batterie',
    label: 'Batterie de stockage',
    sublabel: 'Système de stockage autonome',
    icon: Battery,
    color: 'from-purple-500 to-purple-700',
    bg: 'bg-purple-50 border-purple-200',
  },
];

const DOSSIER_INFO = {
  cu: {
    title: "Certificat d'Urbanisme opérationnel (CUo)",
    subtitle: 'Faisabilité réglementaire et informations cadastrales',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    accentColor: 'bg-sky-600',
  },
  dp: {
    title: 'Déclaration Préalable de Travaux (DP)',
    subtitle: 'Installations photovoltaïques et constructions annexes',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    accentColor: 'bg-emerald-600',
  },
  pc: {
    title: 'Permis de Construire (PC)',
    subtitle: 'Bâtiments agricoles solaires et projets d\'envergure',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    accentColor: 'bg-violet-600',
  },
};

export default function UrbanismeWizard({ isOpen, onClose, type, project, onGenerate }) {
  const [step, setStep] = useState(0); // 0=Déclarant, 1=Cartes PC1, 2=Configurateur/Cotations, 3=Photos/3D, 4=Validation
  const [selectedType, setSelectedType] = useState('batiment_solaire');
  const [editedProject, setEditedProject] = useState(project || {});
  const [captures, setCaptures] = useState(project?.urbanisme_captures || {});
  const [photos, setPhotos] = useState(project?.pc_photos || {});
  const [fetchingCadastre, setFetchingCadastre] = useState(false);
  const [generatingMaps, setGeneratingMaps] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Configurateur Bâtiment State
  const [buildingModelId, setBuildingModelId] = useState('asymetrique_1');
  const [bayCount, setBayCount] = useState(4);
  const [baySpacing, setBaySpacing] = useState(7.5); // 6.0 ou 7.5m

  // Modales
  const [cropModal, setCropModal] = useState({ open: false, src: null, category: null, key: null, title: '' });
  const [dimensionsModalOpen, setDimensionsModalOpen] = useState(false);
  const [landscapeModalOpen, setLandscapeModalOpen] = useState(false);

  // Callback sauvegarde vue 3D après projet (PC6)
  const handleSaveSimulation = (simulatedDataUrl) => {
    const updatedPhotos = { ...photos, apres: simulatedDataUrl };
    setPhotos(updatedPhotos);
    setEditedProject(prev => ({
      ...prev,
      pc_photos: updatedPhotos
    }));
  };

  // Callback capture vue 3D pour PC5 (Plan Façades & Toitures)
  const handleSnapshotPC5 = (dataUrl) => {
    const updated = { ...captures, facades_projet: dataUrl };
    setCaptures(updated);
    setEditedProject(prev => ({
      ...prev,
      urbanisme_captures: updated
    }));
  };

  const dossierInfo = DOSSIER_INFO[type] || DOSSIER_INFO.dp;

  // Initialisation à partir des données du projet CRM
  useEffect(() => {
    if (project && isOpen) {
      const names = resolveDemandeurNames(project);
      const cleanDemandeur = names.lastName || project.name || '';
      
      const projEmail = project.email || project.clientEmail || project.contactEmail || project.client_email || 'isabelle.dupond@gmail.com';
      const projAddress = project.address || project.clientAddress || project.projectAddress || project.siteAddress || project.street || project.adresse || '';
      const projZip = project.zip || project.postalCode || project.code_postal || project.clientZip || '';
      const projCity = project.city || project.commune || project.clientCity || project.cadastre_commune || '';

      // Type de projet
      const pType = (project.type || project.installationType || '').toLowerCase();
      let initType = 'batiment_solaire';
      if (pType.includes('ombriere')) initType = 'ombriere';
      else if (pType.includes('toiture')) initType = 'toiture';
      else if (pType.includes('batterie')) initType = 'batterie';
      setSelectedType(initType);

      const initProj = {
        ...project,
        type: initType,
        lastName: cleanDemandeur,
        firstName: names.firstName || '',
        demandeur: cleanDemandeur,
        email: projEmail,
        address: projAddress,
        zip: projZip,
        city: projCity,
        phone: project.phone || project.clientPhone || project.contactPhone || '06 00 00 00 00',
        birthDate: project.birthDate || '14/02/1970',
        birthCity: project.birthCity || projCity || 'AUCH',
        birthDept: project.birthDept || (projZip ? projZip.substring(0, 2) : '32'),
        description: project.description || `Construction d'un bâtiment agricole à charpente métallique avec centrale solaire photovoltaïque en toiture de ${project.kwc || project.projectSize || 100} kWc`,
        longueur: project.longueur || project.length || '30.0',
        largeur: project.largeur || project.width || '16.4',
        hauteur_egout: project.hauteur_egout || project.hauteur || '4.0',
        pente: project.pente || project.slope || '15',
        cotation_bati: project.cotation_bati || '12.50',
        cotation_voie: project.cotation_voie || '8.00',
      };
      setEditedProject(initProj);
      setCaptures(project?.urbanisme_captures || {});
      setPhotos(project?.pc_photos || {});

      // 1. Récupération automatique du cadastre IGN
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

      // 2. Génération automatique des cartes PC1 (IGN + Satellite) et PC2 (Plan de masse OSM zoom 19)
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

  // Recalcul des dimensions lorsque le modèle de bâtiment ou les travées changent
  const handleSelectBuildingModel = (modelId) => {
    setBuildingModelId(modelId);
    const m = BUILDING_MODELS.find(x => x.id === modelId);
    if (!m) return;
    const newWidth = m.widths[0];
    const newLength = (bayCount * baySpacing).toFixed(1);
    const newPitch = m.defaultPitch;
    const newEave = m.defaultEave;

    setEditedProject(prev => ({
      ...prev,
      largeur: String(newWidth),
      longueur: String(newLength),
      pente: String(newPitch),
      hauteur_egout: String(newEave),
    }));
  };

  const handleBayChange = (newCount, newSpacing) => {
    setBayCount(newCount);
    setBaySpacing(newSpacing);
    const newLength = (newCount * newSpacing).toFixed(1);
    setEditedProject(prev => ({
      ...prev,
      longueur: String(newLength)
    }));
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
      type: selectedType,
      installationType: selectedType,
      urbanisme_captures: captures,
      pc_photos: photos,
    };
    try {
      await onGenerate(type, selectedType, finalProject);
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentModel = BUILDING_MODELS.find(m => m.id === buildingModelId) || BUILDING_MODELS[0];
  const widthVal = parseFloat(editedProject?.largeur || 16.4);
  const lengthVal = parseFloat(editedProject?.longueur || 30.0);
  const surfaceM2 = Math.round(widthVal * lengthVal);
  const kwcEstimate = Math.round((surfaceM2 * 0.22) / 5) * 5; // ~220 W/m²

  const summary = buildCerfaDataSummary({ ...editedProject, ...fieldValues, type: selectedType }, selectedType);
  const STEPS = ['Déclarant', 'Cartes PC1', 'Cotations & Côtes', 'Photos (Crop)', 'Validation'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col"
          style={{ maxHeight: '96vh', height: '94vh' }}
        >
          {/* Header */}
          <div className={`${dossierInfo.bgColor} px-6 pt-4 pb-3 border-b ${dossierInfo.borderColor}`}>
            <div className="flex items-start justify-between mb-2.5">
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

            {/* Progress Steps */}
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
                    <p className="text-xs text-gray-500">Ces informations sont préremplies automatiquement depuis la fiche projet et restent modifiables.</p>
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

                  {/* Prévisualisation Cartes Automatiques PC1 & PC2 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Cartes automatiques PC1 (IGN / Satellite) & PC2 (Plan de masse OSM Zoom 19)
                      </p>
                      {generatingMaps && <span className="text-[11px] text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Génération automatique...</span>}
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
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 2 — Configurateur 2D/3D & Cotations exactes du Bâtiment */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Étape 3 : Configurateur Bâtiment & Cotations exactes</h3>
                      <p className="text-xs text-gray-500">Sélectionnez le type de projet et le modèle de bâtiment : les dimensions et cotations se mettent à jour automatiquement.</p>
                    </div>
                  </div>

                  {/* 1. Sélection du type de projet */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {INSTALL_TYPES.map(t => {
                      const Icon = t.icon;
                      const isSel = selectedType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedType(t.id);
                            setEditedProject(prev => ({ ...prev, type: t.id, installationType: t.id }));
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                            isSel
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className={`p-2 rounded-xl ${isSel ? 'bg-white/20' : 'bg-white border border-gray-200'}`}>
                            <Icon className={`w-4 h-4 ${isSel ? 'text-white' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{t.label}</p>
                            <p className={`text-[10px] ${isSel ? 'text-blue-100' : 'text-gray-400'}`}>{t.sublabel}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 2. Vue Configurateur 2D/3D intégrée */}
                  <div className="grid grid-cols-12 gap-4">
                    {/* Colonne Gauche : Paramètres du Configurateur */}
                    <div className="col-span-5 space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Type de bâtiment</label>
                        <select
                          value={buildingModelId}
                          onChange={e => handleSelectBuildingModel(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {BUILDING_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Largeur (m)</label>
                          <select
                            value={editedProject?.largeur || currentModel.widths[0]}
                            onChange={e => handleFieldChange('largeur', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 text-center"
                          >
                            {currentModel.widths.map(w => (
                              <option key={w} value={w}>{w} m</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Hauteur égout</label>
                          <select
                            value={editedProject?.hauteur_egout || '4.0'}
                            onChange={e => handleFieldChange('hauteur_egout', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 text-center"
                          >
                            <option value="4.0">4.0 m</option>
                            <option value="5.0">5.0 m</option>
                            <option value="6.0">6.0 m</option>
                          </select>
                        </div>
                      </div>

                      {/* Travées & Longueur */}
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Nombre de travées ({baySpacing}m)</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleBayChange(Math.max(2, bayCount - 1), baySpacing)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 font-bold hover:bg-gray-100 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="flex-1 text-center font-extrabold text-blue-700 bg-white py-1.5 rounded-lg border border-gray-200">
                            {bayCount} travées ({lengthVal} m)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBayChange(Math.min(12, bayCount + 1), baySpacing)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 font-bold hover:bg-gray-100 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Résumé structurel */}
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                        <div className="flex justify-between font-bold text-blue-900">
                          <span>Surface au sol :</span>
                          <span>{surfaceM2} m²</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-700">
                          <span>Puissance solaire :</span>
                          <span>~{kwcEstimate} kWc</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-500">
                          <span>Faîtage calculé :</span>
                          <span>{(parseFloat(editedProject?.hauteur_egout || 4) + widthVal * Math.tan(((editedProject?.pente || 15) * Math.PI) / 180)).toFixed(2)} m</span>
                        </div>
                      </div>

                      {/* Cotations aux limites */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">Dist. au bâti (m)</label>
                          <input
                            type="number" step="0.5"
                            value={editedProject?.cotation_bati || '12.50'}
                            onChange={e => handleFieldChange('cotation_bati', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-gray-200 text-center font-bold text-gray-800 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">Dist. à la voie (m)</label>
                          <input
                            type="number" step="0.5"
                            value={editedProject?.cotation_voie || '8.00'}
                            onChange={e => handleFieldChange('cotation_voie', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-gray-200 text-center font-bold text-gray-800 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Colonne Droite : Visualisation 3D temps réel du bâtiment */}
                    <div className="col-span-7 flex flex-col">
                      <div className="flex-1 min-h-[280px]">
                        <Building3DViewer
                          buildingConfig={{
                            longueur: lengthVal,
                            largeur: widthVal,
                            hauteur_egout: editedProject?.hauteur_egout || 4.0,
                            pente: editedProject?.pente || 15,
                            type: selectedType
                          }}
                          onCaptureSnapshot={handleSnapshotPC5}
                          height={280}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description courte pour Notice PC4 */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Notice descriptive courte des travaux (PC4 & CERFA)</label>
                    <input
                      type="text"
                      value={editedProject?.description || ''}
                      onChange={e => handleFieldChange('description', e.target.value)}
                      placeholder="Ex: Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 3 — Visionneuse 3D (PC5) & Incrustation Paysagère 3D (PC6) */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Étape 4 : Visionneuse 3D (PC5) & Insertion Paysagère 3D (PC6)</h3>
                    <p className="text-xs text-gray-500">Capturez la vue 3D de votre bâtiment pour la PC5 et tracez l'emprise sur votre photo de terrain pour la PC6.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* PC5 — Visionneuse 3D interactive & Capture instantanée */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-blue-600" /> PC5 — Visionneuse 3D & Façades
                        </span>
                        {captures?.facades_projet ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Vue 3D Prête</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À capturer</span>
                        )}
                      </div>

                      <div className="flex-1 mb-2">
                        <Building3DViewer
                          buildingConfig={{
                            longueur: lengthVal,
                            largeur: widthVal,
                            hauteur_egout: editedProject?.hauteur_egout || 4.0,
                            pente: editedProject?.pente || 15,
                            type: selectedType
                          }}
                          onCaptureSnapshot={handleSnapshotPC5}
                          height={200}
                        />
                      </div>

                      {/* Aperçu du snapshot capturé */}
                      {captures?.facades_projet && (
                        <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
                          <img src={captures.facades_projet} alt="Façades" className="w-12 h-8 object-cover rounded-lg border border-emerald-300" />
                          <div className="flex-1">
                            <p className="text-[11px] font-bold text-emerald-900">Vue 3D injectée dans PC5</p>
                            <p className="text-[10px] text-emerald-700">Vous pouvez recapturer à tout moment.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PC6 — Insertion paysagère interactive (Avant / Après) */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-600" /> PC6 — Insertion Paysagère 3D
                        </span>
                        {photos?.apres ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Simulation Prête</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À tracer</span>
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
                              <Box className="w-3.5 h-3.5" /> Tracer l'emprise & Rendu 3D sur photo
                            </button>
                          </div>
                        ) : (
                          <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-600 font-bold">1. Charger photo de terrain (Avant)</span>
                            <span className="text-[10px] text-gray-400">Puis tracer l'emprise 3D</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'avant', 'Photo Terrain Avant', e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PC7 & PC8 Environnement Proche et Lointain */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* PC7 — Env. Proche */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-gray-700">PC7 — Environnement Proche</span>
                        {photos?.proche ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {photos?.proche ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={photos.proche} alt="Env Proche" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setCropModal({ open: true, src: photos.proche, category: 'photos', key: 'proche', title: 'Recadrer Vue Proche' })}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                          >
                            <Crop className="w-4 h-4 mr-1" /> Recadrer
                          </button>
                        </div>
                      ) : (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500 font-semibold">Importer photo proche</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'proche', 'Environnement Proche', e)} />
                        </label>
                      )}
                    </div>

                    {/* PC8 — Env. Lointain */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-gray-700">PC8 — Environnement Lointain</span>
                        {photos?.lointain ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {photos?.lointain ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={photos.lointain} alt="Env Lointain" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setCropModal({ open: true, src: photos.lointain, category: 'photos', key: 'lointain', title: 'Recadrer Vue Lointaine' })}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                          >
                            <Crop className="w-4 h-4 mr-1" /> Recadrer
                          </button>
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

              {/* ÉTAPE 4 — Validation des pièces graphiques & CERFA interactif */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-sm text-emerald-950">Dossier prêt pour la génération PDF interactive !</h4>
                      <p className="text-xs text-emerald-800 mt-0.5">La page de garde architecte, les planches graphiques A4 et le CERFA pré-rempli seront inclus dans le dossier.</p>
                    </div>
                  </div>

                  {/* Aperçu des vignettes graphiques prêtes */}
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Vignettes des pièces graphiques prêtes</p>
                    <div className="grid grid-cols-4 gap-2.5">
                      {[
                        { title: 'PC1 - Situation (IGN)', ready: true },
                        { title: 'PC2 - Masse (OSM 19)', ready: true },
                        { title: 'PC3 - Coupe bâtiment', ready: true },
                        { title: 'PC4 - Notice descriptive', ready: true },
                        { title: 'PC5 - Façades / 3D', ready: !!captures?.facades_projet },
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
                  </div>

                  {/* Récapitulatif texte */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100 text-xs">
                    {Object.entries(summary).map(([key, val]) => {
                      const labels = {
                        demandeur: 'Demandeur',
                        email: 'Adresse email',
                        adresse: 'Adresse du terrain',
                        cadastre: 'Référence cadastrale',
                        commune: 'Commune',
                        puissance: 'Puissance estimée',
                        type: 'Type d\'installation',
                        siret: 'SIRET',
                        date: 'Date de génération',
                      };
                      return (
                        <div key={key} className="flex items-start gap-3 px-4 py-2">
                          <span className="text-gray-400 w-36 flex-shrink-0 pt-0.5">{labels[key] || key}</span>
                          <span className="font-semibold text-gray-800 flex-1">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Modales secondaires */}
          <ImageCropModal
            isOpen={cropModal.open}
            onClose={() => setCropModal(prev => ({ ...prev, open: false }))}
            imageSrc={cropModal.src}
            title={cropModal.title}
            onCropComplete={handleCropComplete}
          />

          <DimensionsModal
            isOpen={dimensionsModalOpen}
            onClose={() => setDimensionsModalOpen(false)}
            initialDimensions={editedProject}
            onSave={(dims) => {
              setEditedProject(prev => ({ ...prev, ...dims }));
              setStep(3);
            }}
          />

          <LandscapeIntegrationModal
            isOpen={landscapeModalOpen}
            onClose={() => setLandscapeModalOpen(false)}
            initialPhoto={photos?.avant}
            projectDimensions={editedProject}
            installationType={selectedType}
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
                  <><Loader2 className="w-4 h-4 animate-spin" /> Génération du PDF interactif...</>
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
