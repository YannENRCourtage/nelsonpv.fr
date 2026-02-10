import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, DoorOpen, Home, Flame, Zap, Plug, Users, ImagePlus, Camera, Building, X, FolderHeart as HomeIcon, Map as MapIcon, ExternalLink, RotateCcw, RotateCw, Type } from 'lucide-react';
import html2canvas from 'html2canvas';
import MapEditor from "../components/MapEditor";
import StreetViewTab from "../components/StreetViewTab";
import ShadowMapTab from "../components/ShadowMapTab.jsx";
import ChatBox from "../components/editor/ChatBox.jsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/contexts/ProjectContext.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Input } from "@/components/ui/input.jsx";
import { toast } from "@/components/ui/use-toast.js";
import { cn } from "@/lib/utils";
import PredefinedBuildingsPanel from "@/components/editor/PredefinedBuildingsPanel.jsx";
import znzvData from "@/data/znzv.json";
import { apiService } from "@/services/api";

const INCLINATION_OPTIONS = [
  { value: "5", label: "5° (8.75%)" },
  { value: "10", label: "10° (17.63%)" },
  { value: "15", label: "15° (26.79%)" },
  { value: "20", label: "20° (36.40%)" },
  { value: "25", label: "25° (46.63%)" },
  { value: "30", label: "30° (57.74%)" },
  { value: "35", label: "35° (70.02%)" },
  { value: "40", label: "40° (83.91%)" },
  { value: "45", label: "45° (100.00%)" },
];

function SymbolBtn({ icon, label, type, emoji, onSelect, isSelected }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect({ type, label, emoji });
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border bg-white p-4 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
        isSelected && "ring-2 ring-blue-500 border-blue-500"
      )}
      title={label}
      tabIndex={-1}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}



function SymbolsPanel({ onSymbolSelect, selectedSymbol }) {
  const symbols = [
    { type: "project", label: "Lieu Projet", icon: <MapPin className="h-6 w-6 text-red-500" />, emoji: "📍" },
    { type: "access", label: "Accès", icon: <DoorOpen className="h-6 w-6 text-slate-700" />, emoji: "🚪" },
    { type: "house", label: "Maison", icon: <Home className="h-6 w-6 text-slate-700" />, emoji: "🏠" },
    { type: "sdis", label: "SDIS", icon: <Flame className="h-6 w-6 text-slate-700" />, emoji: "🚒" },
    { type: "transfo", label: "Transfo", icon: <Zap className="h-6 w-6 text-slate-700" />, emoji: "⚡" },
    { type: "pdl", label: "PDL", icon: <Plug className="h-6 w-6 text-slate-700" />, emoji: "🔌" },
    { type: "neighbor", label: "Voisin", icon: <Users className="h-6 w-6 text-slate-700" />, emoji: "👥" },
    { type: "building", label: "Bâtiment", icon: <Building className="h-6 w-6 text-slate-700" />, emoji: "🏢" },
    { type: "photo", label: "Photo", icon: <Camera className="h-6 w-6 text-slate-700" />, emoji: "📷" },
    { type: "text", label: "Texte", icon: <Type className="h-6 w-6 text-slate-700" />, emoji: "T" },
  ];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Symboles</h3>
      <div className="grid grid-cols-2 gap-3">
        {symbols.map((s) => (
          <SymbolBtn
            key={s.type}
            {...s}
            onSelect={onSymbolSelect}
            isSelected={selectedSymbol?.type === s.type}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProjectEditor() {
  const { projectId } = useParams();
  const { projects, setProject, project, updateProject, saveProject } = useProjects();

  // ...

  const { user: currentUser } = useAuth();
  const [projectUsers, setProjectUsers] = useState([]);

  useEffect(() => {
    // Fetch users for the select dropdown
    const fetchUsers = async () => {
      try {
        // Import dynamically to avoid circular dependencies if any, or just use the global apiService
        const { apiService } = await import('@/services/api');
        const data = await apiService.getUsers();
        if (data) {
          setProjectUsers(data.filter(u => u.role !== 'admin'));
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const [captures, setCaptures] = useState([null, null, null, null]);


  const [symbolToPlace, setSymbolToPlace] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [streetViewUrl, setStreetViewUrl] = useState('');
  const [activeLayers, setActiveLayers] = useState(new Set());
  const [remountKey, setRemountKey] = useState(0);
  const [isAngleDefaulted, setIsAngleDefaulted] = useState(false);
  const [isAzimuthDefaulted, setIsAzimuthDefaulted] = useState(false);
  const [isWeightingDefaulted, setIsWeightingDefaulted] = useState(false);

  useEffect(() => {
    const handleForceReset = () => {
      setCaptures([null, null, null, null]);


      setSymbolToPlace(null);
      setActiveTab('map');
      setRemountKey(k => k + 1);
      window.dispatchEvent(new CustomEvent('map:reset'));
    };
    window.addEventListener('project:editor-reset', handleForceReset);
    return () => window.removeEventListener('project:editor-reset', handleForceReset);
  }, []);


  useEffect(() => {
    const loadProject = async () => {
      // If creating new project, set init state
      if (projectId === 'new') {
        const emptyProject = {
          id: `proj_${Date.now()}`,
          name: '',
          firstName: '',
          email: '',
          phone: '',
          address: '',
          zip: '',
          city: '',
          gps: '',
          type: 'Construction',
          status: 'Nouveau',
          user: project?.user || '',
          projectSize: '',
          comments: '',
          captures: [null, null, null, null],

          features: null,
          chatLines: [],
          seismicZone: '',
          snowZone: '',
          windZone: '',
          panelAspect: 0,
          roofWeighting: 50,
          createdAt: new Date().toISOString()
        };
        setProject(() => emptyProject);
        setRemountKey(k => k + 1);
        return;
      }

      try {
        // Load fresh project data directly from API (bypassing potentially stale list)
        const { apiService } = await import('@/services/api');
        const freshProject = await apiService.getProject(projectId);

        if (freshProject) {
          setProject(freshProject);
          setRemountKey(k => k + 1);
        } else {
          // Fallback to list if API fails or returns null (unlikely if exists)
          const foundInList = projects && Array.isArray(projects) ? projects.find(p => p.id === projectId) : null;
          if (foundInList) {
            setProject(foundInList);
            setRemountKey(k => k + 1);
          }
        }
      } catch (error) {
        console.error("Failed to load project details:", error);
        // Fallback to list
        const foundInList = projects && Array.isArray(projects) ? projects.find(p => p.id === projectId) : null;
        if (foundInList) {
          setProject(foundInList);
          setRemountKey(k => k + 1);
        }
      }
    };

    loadProject();
  }, [projectId, setProject]);

  useEffect(() => {
    if (project?.captures) setCaptures(project.captures);
  }, [project]);


  // ZNZV Lookup Effect (Robust Version)
  useEffect(() => {
    if (!project?.zip || project.zip.length < 2) return;

    // Normalize zip: string, trim matches
    const zip = String(project.zip).trim();

    function applyData(data) {
      if (!data) return;
      if (
        project.seismicZone !== data.seisme ||
        project.snowZone !== data.neige ||
        project.windZone !== data.vent
      ) {
        updateProject({
          seismicZone: data.seisme,
          snowZone: data.neige,
          windZone: data.vent
        });
      }
    }

    // Try direct match
    if (znzvData[zip]) {
      applyData(znzvData[zip]);
    } else {
      // Try padded with 0 (e.g. 1000 -> 01000)
      if (zip.length === 4) {
        const padded = '0' + zip;
        if (znzvData[padded]) {
          applyData(znzvData[padded]);
        }
      }
    }
  }, [project?.zip, updateProject]);



  const captureNow = () => {
    const emptySlot = captures.findIndex(c => c === null);
    if (emptySlot !== -1) {
      captureTab(emptySlot);
    } else {
      captureTab(0); // Replace first if all full
    }
  };

  const captureWithDisplayMedia = async (slotIndex) => {
    try {
      toast({ title: "Capture d'écran requise", description: "Veuillez sélectionner 'Cet onglet' ou la fenêtre entière pour capturer le contenu externe.", duration: 5000 });
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "never" },
        audio: false,
        preferCurrentTab: true
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve);
        };
      });

      // Petit délai pour s'assurer que le rendu est complet
      await new Promise(r => setTimeout(r, 300));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Arrêter le stream immédiatement
      stream.getTracks().forEach(track => track.stop());

      const dataUrl = canvas.toDataURL('image/png');
      const next = [...captures];
      next[slotIndex] = dataUrl;
      setCaptures(next);
      updateProject({ captures: next });
      toast({ title: "Capture réussie !", description: `La vue a été enregistrée dans l'emplacement ${slotIndex + 1}.` });

    } catch (err) {
      console.error("Capture annulée ou échouée", err);
      // Fallback silencieux ou notification
    }
  };

  const captureTab = async (slotIndex) => {
    // For map tab, use the map capture event
    if (activeTab === 'map') {
      window.dispatchEvent(new CustomEvent("map:capture-request", { detail: { slotIndex } }));
      return;
    }

    // Liste des onglets utilisant des iframes externes
    const iframeTabs = ['owners', 'capareseau', 'terravisu', 'geoportail', 'dvf', 'windy'];
    if (iframeTabs.includes(activeTab)) {
      await captureWithDisplayMedia(slotIndex);
      return;
    }

    // For other tabs (StreetView, etc.), capture what's visible
    const tabContainer = document.querySelector('.aspect-video');
    if (!tabContainer) {
      toast({ title: "Erreur", description: "Impossible de capturer cet onglet.", variant: "destructive" });
      return;
    }

    try {
      // Use html2canvas to capture the visible content
      const canvas = await html2canvas(tabContainer, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1,
        width: tabContainer.offsetWidth,
        height: tabContainer.offsetHeight,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        x: window.scrollX,
        y: window.scrollY
      });

      const dataUrl = canvas.toDataURL('image/png');
      const next = [...captures];
      next[slotIndex] = dataUrl;
      setCaptures(next);
      updateProject({ captures: next });
      toast({ title: "Capture réussie !", description: `La vue a été enregistrée dans l'emplacement ${slotIndex + 1}.` });
    } catch (error) {
      console.error('Capture error:', error);
      // Fallback to display media if html2canvas fails
      await captureWithDisplayMedia(slotIndex);
    }
  };

  const deleteCapture = (index) => {
    const next = [...captures];
    next[index] = null;
    setCaptures(next);
    updateProject({ captures: next });
  };

  useEffect(() => {
    const handleCaptureDone = (e) => {
      const { slotIndex, dataUrl } = e.detail;
      const next = [...captures];
      next[slotIndex] = dataUrl;
      setCaptures(next);
      updateProject({ captures: next });
      toast({ title: "Capture réussie !", description: `La vue a été enregistrée dans l'emplacement ${slotIndex + 1}.` });
    };
    window.addEventListener("map:capture-done", handleCaptureDone);
    return () => window.removeEventListener("map:capture-done", handleCaptureDone);
  }, [captures, updateProject]);

  const handleAddressFound = (location) => {
    const { label, y, x } = location;
    updateProject({ address: label, gps: `${y}, ${x}` });
  };

  const handleAddressSearched = (location) => {
    const { y, x } = location;
    updateProject({ gps: `${y}, ${x}` });
  };

  const handleReset = () => {
    // Confirm with user
    if (!window.confirm('Êtes-vous sûr de vouloir tout réinitialiser ? Toutes les données non sauvegardées seront perdues.')) {
      return;
    }

    // Create a new empty project
    const newProject = {
      id: `proj_${Date.now()}`,
      name: '',
      firstName: '',
      email: '',
      phone: '',
      address: '',
      zip: '',
      city: '',
      gps: '',
      type: 'Construction',
      status: 'Nouveau',
      user: project?.user || '',
      projectSize: '',
      comments: '',
      captures: [null, null, null, null],
      photos: [],
      features: null,
      chatLines: [],
      seismicZone: '',
      snowZone: '',
      windZone: '',
      createdAt: new Date().toISOString()
    };

    // Reset all state
    setProject(() => newProject);
    setCaptures([null, null, null, null]);
    setPhotos([]);
    setSymbolToPlace(null);
    setRemountKey(k => k + 1);

    // Reset the map
    window.dispatchEvent(new CustomEvent('map:reset'));

    toast({
      title: "Réinitialisation effectuée",
      description: "Tous les champs et la carte ont été réinitialisés."
    });
  };

  const handleSymbolSelect = (symbol) => {
    setSymbolToPlace(prev => prev?.type === symbol.type ? null : symbol);
  };

  const handleBuildingConfigChange = (buildingData) => {
    // 1. Update project weighting
    // RE-ENABLED: Ponderation must update when extensions are added/removed
    const val = Number(buildingData.roofWeighting);

    if (!isNaN(val)) {
      // FIX: Determine which building we are targeting (Building 1 or Building 2)
      // Logic: The panel updates the "last" building or the one being prepared.
      // If we already have >= 2 buildings, we assume we are editing the 2nd one (the last one).
      // If we have 1, we edit the 1st.
      const predefinedBuildings = (project?.features || []).filter(f => f.type === 'rectangle' && f.isPredefinedBuilding);
      const isSecondBuilding = predefinedBuildings.length >= 2;
      let targetBuilding = null;
      let shouldUpdate = false;

      if (isSecondBuilding) {
        // We are targeting the 2nd building
        targetBuilding = predefinedBuildings[1];
        // Only update if the type matches (editing existing) OR if we are just starting
        if (targetBuilding && targetBuilding.buildingName === buildingData.code) {
          shouldUpdate = true;
        }

        if (shouldUpdate && project?.roofWeighting2 !== val) {
          updateProject({ roofWeighting2: val });
        }
      } else {
        // We are targeting the 1st building (or preparing it)
        targetBuilding = predefinedBuildings[0];

        // FIX: Prevent overwriting B1 if selecting a NEW building type (preparing B2)
        // If B1 exists and has different code, we are likely preparing B2, so DOT NOT touch B1 params.
        if (targetBuilding) {
          if (targetBuilding.buildingName === buildingData.code) {
            shouldUpdate = true;
          }
        } else {
          // No building exists yet, allowed to update defaults
          shouldUpdate = true;
        }

        if (shouldUpdate && project?.roofWeighting !== val) {
          updateProject({ roofWeighting: val });
          setIsWeightingDefaulted(true);
        }
      }
    }
    // 2. Update map dimensions
    window.dispatchEvent(new CustomEvent('map:update-last-building', { detail: { building: buildingData } }));
  };

  const handleBuildingSelect = (building) => {
    // Auto-set inclination and weighting first (Priority to Data)
    if (building && building.code) {
      const code = building.code;
      let newAngle = null;
      const firstLetter = code.charAt(0).toUpperCase();

      if (['O', 'C', 'A'].includes(firstLetter)) {
        newAngle = "15";
      } else if (['K', 'H', 'Y', 'S'].includes(firstLetter)) {
        newAngle = "10";
      }

      const updates = {};

      // Determine if we are adding the second building (if 1 already exists)
      const predefinedBuildings = (project?.features || []).filter(f => f.type === 'rectangle' && f.isPredefinedBuilding);
      const isNextBuildingSecond = predefinedBuildings.length >= 1;

      if (newAngle) {
        if (isNextBuildingSecond) {
          updates.panelAngle2 = newAngle;
        } else {
          updates.panelAngle = newAngle;
          setIsAngleDefaulted(true);
        }
      }

      // Auto-set weighting if provided by the building panel logic
      // RE-ENABLED per user request: "Uniquement sur les polygones créés par le bouton insérer"
      if (building.roofWeighting !== undefined && building.roofWeighting !== null) {
        if (isNextBuildingSecond) {
          updates.roofWeighting2 = Number(building.roofWeighting);
        } else {
          updates.roofWeighting = Number(building.roofWeighting);
        }
      }

      if (Object.keys(updates).length > 0) {
        updateProject(updates);

        let msg = "";
        if (updates.panelAngle || updates.panelAngle2) msg += `Inclinaison: ${newAngle}°`;

        toast({ title: "Configuration appliquée", description: `${msg} pour le modèle ${code}.` });
      }
    }

    // Then try to place on map (safely, decoupled from form update)
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("map:place-building", { detail: { building } }));
      } catch (err) {
        console.error("Map placement error:", err);
        toast({ title: "Erreur Carte", description: "Le bâtiment n'a pas pu être placé sur la carte.", variant: "destructive" });
      }
    }, 100);
  };

  const goToProjectAddress = () => {
    window.dispatchEvent(new CustomEvent("map:goto-project-address"));
  };



  useEffect(() => {
    const handleSaveShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
        toast({ title: "Projet sauvegardé !", description: "Vos modifications ont été enregistrées." });
      }
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [saveProject]);

  const p = project || {};

  return (
    <div className="w-full px-4 py-6 bg-gray-50">
      <div className="grid grid-cols-12 gap-6 mb-6 items-stretch">
        <section className="col-span-9 rounded-2xl bg-white p-6 shadow-sm h-full flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Client & Projet</h2>
              <Button
                type="button"
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-red-600 hover:border-red-600"
                title="Réinitialiser tous les champs et la carte"
              >
                <RotateCcw size={16} className="mr-2" />
                Remise à zéro
              </Button>
            </div>
            <div className="flex gap-4 items-end">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Commercial</label>
                <Select
                  value={p.commercial || ''}
                  onValueChange={(v) => {
                    const oldVal = p.commercial;
                    updateProject({ commercial: v });
                    if (v && v !== oldVal) {
                      const assignedBy = currentUser?.firstName || currentUser?.displayName || 'Utilisateur';
                      apiService.createAssignmentNotification(p.id, p.name, v, assignedBy);
                      toast({ title: "Notification envoyée", description: `${v} a été notifié(e).` });
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yann">Yann</SelectItem>
                    <SelectItem value="Jack">Jack</SelectItem>
                    <SelectItem value="Nicolas">Nicolas</SelectItem>
                    <SelectItem value="NicolasNMD">NicolasNMD</SelectItem>
                    <SelectItem value="Laurent">Laurent</SelectItem>
                    <SelectItem value="Elodie">Elodie</SelectItem>
                    <SelectItem value="Véronique">Véronique</SelectItem>
                    <SelectItem value="Aurélien">Aurélien</SelectItem>
                    <SelectItem value="Contact">Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Chef de projet</label>
                <Select value={p.assignedUser || ''} onValueChange={(v) => {
                  const oldVal = p.assignedUser;
                  updateProject({ assignedUser: v });
                  if (v && v !== oldVal) {
                    const assignedBy = currentUser?.firstName || currentUser?.displayName || 'Utilisateur';
                    apiService.createAssignmentNotification(p.id, p.name, v, assignedBy);
                    toast({ title: "Notification envoyée", description: `${v} a été notifié(e).` });
                  }
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yann">Yann</SelectItem>
                    <SelectItem value="Jack">Jack</SelectItem>
                    <SelectItem value="Nicolas">Nicolas</SelectItem>
                    <SelectItem value="NicolasNMD">NicolasNMD</SelectItem>
                    <SelectItem value="Laurent">Laurent</SelectItem>
                    <SelectItem value="Elodie">Elodie</SelectItem>
                    <SelectItem value="Véronique">Véronique</SelectItem>
                    <SelectItem value="Aurélien">Aurélien</SelectItem>
                    <SelectItem value="Contact">Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Statut</label>
                <Select value={p.status || 'Nouveau'} onValueChange={(v) => updateProject({ status: v })}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nouveau">Nouveau</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                    <SelectItem value="Abandonné">Abandonné</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><label className="text-sm font-medium">Nom*</label><Input value={p.name || ''} onChange={e => updateProject({ name: e.target.value })} className="mt-1" placeholder="Nom" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Prénom</label><Input value={p.firstName || ''} onChange={e => updateProject({ firstName: e.target.value })} className="mt-1" placeholder="Prénom" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Téléphone</label><Input value={p.phone || ''} onChange={e => updateProject({ phone: e.target.value })} className="mt-1" placeholder="Téléphone" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Email</label><Input value={p.email || ''} onChange={e => updateProject({ email: e.target.value })} className="mt-1" placeholder="Email" /></div>

            <div className="col-span-12 flex gap-4 items-end">
              <div className="flex-grow-[3]"><label className="text-sm font-medium">Adresse du projet</label><Input value={p.address || ''} onChange={e => updateProject({ address: e.target.value })} className="mt-1" placeholder="Adresse du projet" /></div>
              <div className="flex-grow-[1]"><label className="text-sm font-medium">Code postal</label><Input value={p.zip || ''} onChange={e => updateProject({ zip: e.target.value })} className="mt-1" placeholder="Code postal" /></div>
              <div className="flex-grow-[2]"><label className="text-sm font-medium">Ville</label><Input value={p.city || ''} onChange={e => updateProject({ city: e.target.value })} className="mt-1" placeholder="Ville" /></div>
            </div>

            <div className="col-span-3">
              <label className="text-sm font-medium">Coordonnées GPS</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Latitude"
                  value={p.gps ? p.gps.split(',')[0] : ''}
                  onChange={e => {
                    const lat = e.target.value;
                    const lon = p.gps && p.gps.includes(',') ? p.gps.split(',')[1].trim() : '';
                    updateProject({ gps: `${lat}, ${lon}` });
                  }}
                  title="Latitude"
                />
                <Input
                  placeholder="Longitude"
                  value={p.gps && p.gps.includes(',') ? p.gps.split(',')[1].trim() : ''}
                  onChange={e => {
                    const lat = p.gps ? p.gps.split(',')[0].trim() : '';
                    const lon = e.target.value;
                    updateProject({ gps: `${lat}, ${lon}` });
                  }}
                  title="Longitude"
                />
              </div>
            </div>
            <div className="col-span-3"><label className="text-sm font-medium">Type de projet</label><select value={p.type || 'Construction'} onChange={e => updateProject({ type: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 h-10 bg-background"><option>Construction</option><option>Rénovation</option><option>Construction & Rénovation</option></select></div>
            <div className="col-span-6"><label className="text-sm font-medium">Projet</label><Input value={p.projectSize || ''} onChange={e => updateProject({ projectSize: e.target.value })} className="mt-1" placeholder="Ex: 150m² ou 9kWc" /></div>

            {/* ZNZV Fields & PVGIS */}
            {/* Technical Fields Grid */}
            <div className="col-span-12 grid grid-cols-7 gap-2 items-end">
              {/* --- ROW 1 --- */}
              {/* Séisme */}
              <div><label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Zone de séisme">Séisme</label><Input value={p.seismicZone || ''} onChange={e => updateProject({ seismicZone: e.target.value })} className="mt-1" placeholder="Séisme" /></div>

              {/* Neige */}
              <div><label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Zone de neige">Neige</label><Input value={p.snowZone || ''} onChange={e => updateProject({ snowZone: e.target.value })} className="mt-1" placeholder="Neige" /></div>

              {/* Vent */}
              <div><label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Zone de vent">Vent</label><Input value={p.windZone || ''} onChange={e => updateProject({ windZone: e.target.value })} className="mt-1" placeholder="Vent" /></div>

              {/* Shared Logic for determining presence of second building */}
              {(() => {
                const predefinedBuildings = (p.features || []).filter(f => f.type === 'rectangle' && f.isPredefinedBuilding);
                const hasSecondBuilding = predefinedBuildings.length >= 2;
                const hasFirstBuilding = predefinedBuildings.length >= 1;
                const labelPrefix1 = hasSecondBuilding ? "1/ " : "";
                const labelPrefix2 = "2/ ";

                return (
                  <>
                    {/* Inclinaison 1 */}
                    <div>
                      <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Inclinaison">{labelPrefix1}Inclinaison</label>
                      <Select
                        value={String(p.panelAngle || '15')}
                        onValueChange={v => {
                          updateProject({ panelAngle: v });
                          if (isAngleDefaulted) setIsAngleDefaulted(false);
                        }}
                      >
                        <SelectTrigger className={`mt-1 h-10 w-full ${hasFirstBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INCLINATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Azimut 1 */}
                    <div>
                      <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Azimut">{labelPrefix1}Azimut</label>
                      <Select
                        value={String(p.panelAspect || '0')}
                        onValueChange={v => {
                          updateProject({ panelAspect: v });
                          if (isAzimuthDefaulted) setIsAzimuthDefaulted(false);
                        }}
                      >
                        <SelectTrigger className={`mt-1 h-10 w-full ${hasFirstBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                        <SelectContent className="h-60">
                          {Array.from({ length: 72 }, (_, i) => -175 + i * 5).map(val => {
                            let label = `${val}°`;
                            if (val === 0) label += " (Sud)";
                            else if (val === -90) label += " (Est)";
                            else if (val === 90) label += " (Ouest)";
                            else if (val === 180) label += " (Nord)";
                            return (
                              <SelectItem key={val} value={String(val)}>{label}</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pondération 1 */}
                    <div>
                      <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Pondération">{labelPrefix1}Pondération</label>
                      <Select
                        key={`weight-${p.roofWeighting}`}
                        value={String(p.roofWeighting !== undefined ? p.roofWeighting : 50)}
                        onValueChange={v => {
                          updateProject({ roofWeighting: parseInt(v) });
                          if (isWeightingDefaulted) setIsWeightingDefaulted(false);
                        }}
                      >
                        <SelectTrigger className={`mt-1 h-10 w-full ${hasFirstBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                        <SelectContent className="h-60">
                          {Array.from({ length: 11 }, (_, i) => 50 + i * 5).map(val => (
                            <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Productible 1 */}
                    <div className="relative">
                      <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Productible">{labelPrefix1}Productible</label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          // Display Roof 1 productible only
                          value={p.solarYieldRoof1 || ''}
                          readOnly
                          placeholder="kWh/kWc"
                          className={`min-w-0 ${p.solarYieldRoof1
                            ? (parseFloat(p.solarYieldRoof1) >= 1120
                              ? "bg-green-100 text-green-900 border-green-500"
                              : "bg-red-100 text-red-900 border-red-500")
                            : "bg-gray-50"
                            }`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 aspect-square w-10 px-0"
                          title="Calculer le productible Toiture 1"
                          onClick={async () => {
                            if (!p.gps) return toast({ title: "Erreur", description: "Veuillez renseigner les coordonnées GPS.", variant: "destructive" });
                            const parts = p.gps ? p.gps.split(',') : [];
                            const lat = parseFloat(parts[0]?.trim());
                            const lon = parseFloat(parts[1]?.trim());
                            if (isNaN(lat) || isNaN(lon)) return toast({ title: "Erreur", description: "Coordonnées GPS invalides.", variant: "destructive" });

                            const angle = p.panelAngle || 15;
                            const aspect = parseFloat(p.panelAspect || 0);
                            const weighting = p.roofWeighting !== undefined ? p.roofWeighting : 50;

                            // Calculate opposite aspect (+180°, normalized to -180 to 180 range)
                            let oppositeAspect = aspect + 180;
                            if (oppositeAspect > 180) oppositeAspect -= 360;
                            if (oppositeAspect < -180) oppositeAspect += 360;

                            toast({ title: "Calcul en cours...", description: `PVGIS Ligne 1: T1 (${aspect}°) et T2 (${oppositeAspect}°)` });

                            try {
                              // Fetch PVGIS for Line 1 primary aspect (T1)
                              const pvgisUrl1 = `/api/pvgis-proxy?lat=${lat}&lon=${lon}&peakpower=1&loss=6&angle=${angle}&aspect=${aspect}&outputformat=json&mountingplace=free&pvtechchoice=crystSi`;
                              const res1 = await fetch(pvgisUrl1);
                              if (!res1.ok) throw new Error("Erreur PVGIS T1");
                              const data1 = await res1.json();
                              const getEy = (d) => d?.outputs?.totals?.fixed?.E_y || d?.outputs?.totals?.E_y;
                              const yieldT1 = parseFloat(getEy(data1));

                              // Fetch PVGIS for Line 1 opposite aspect (T2)
                              const pvgisUrl2 = `/api/pvgis-proxy?lat=${lat}&lon=${lon}&peakpower=1&loss=6&angle=${angle}&aspect=${oppositeAspect}&outputformat=json&mountingplace=free&pvtechchoice=crystSi`;
                              const res2 = await fetch(pvgisUrl2);
                              if (!res2.ok) throw new Error("Erreur PVGIS T2");
                              const data2 = await res2.json();
                              const yieldT2 = parseFloat(getEy(data2));

                              if (!isNaN(yieldT1) && !isNaN(yieldT2)) {
                                // Calculate weighted average for Line 1
                                const weightedYield = (yieldT1 * weighting + yieldT2 * (100 - weighting)) / 100;

                                // Store only in Line 1's field (solarYieldRoof1)
                                updateProject({
                                  solarYieldRoof1: weightedYield.toFixed(2)
                                });
                                toast({
                                  title: "Succès Ligne 1",
                                  description: `T1: ${yieldT1.toFixed(2)} (${weighting}%) | T2: ${yieldT2.toFixed(2)} (${100 - weighting}%) | Pondéré: ${weightedYield.toFixed(2)} kWh/kWc`
                                });
                              }
                            } catch (e) {
                              console.error(e);
                              toast({ title: "Erreur", description: "Échec calcul PVGIS", variant: "destructive" });
                            }
                          }}
                        >
                          <Zap size={16} />
                        </Button>
                      </div>
                    </div>

                    {/* --- ROW 2 (Conditional) --- */}
                    {hasSecondBuilding && (
                      <>
                        {/* Spacers for Env cols */}
                        <div className="hidden md:block"></div>
                        <div className="hidden md:block"></div>
                        <div className="hidden md:block"></div>

                        {/* Inclinaison 2 */}
                        <div>
                          <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Inclinaison">{labelPrefix2}Inclinaison</label>
                          <Select
                            value={String(p.panelAngle2 || '15')}
                            onValueChange={v => updateProject({ panelAngle2: v })}
                          >
                            <SelectTrigger className={`mt-1 h-10 w-full ${hasSecondBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {INCLINATION_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Azimut 2 */}
                        <div>
                          <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Azimut">{labelPrefix2}Azimut</label>
                          <Select
                            value={String(p.panelAspect2 || '0')}
                            onValueChange={v => updateProject({ panelAspect2: v })}
                          >
                            <SelectTrigger className={`mt-1 h-10 w-full ${hasSecondBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                            <SelectContent className="h-60">
                              {Array.from({ length: 72 }, (_, i) => -175 + i * 5).map(val => {
                                let label = `${val}°`;
                                if (val === 0) label += " (Sud)";
                                else if (val === -90) label += " (Est)";
                                else if (val === 90) label += " (Ouest)";
                                else if (val === 180) label += " (Nord)";
                                return <SelectItem key={val} value={String(val)}>{label}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Pondération 2 */}
                        <div>
                          <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Pondération">{labelPrefix2}Pondération</label>
                          <Select
                            key={`weight2-${p.roofWeighting2}`}
                            value={String(p.roofWeighting2 !== undefined ? p.roofWeighting2 : 50)}
                            onValueChange={v => updateProject({ roofWeighting2: parseInt(v) })}
                          >
                            <SelectTrigger className={`mt-1 h-10 w-full ${hasSecondBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                            <SelectContent className="h-60">
                              {Array.from({ length: 11 }, (_, i) => 50 + i * 5).map(val => (
                                <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Productible 2 */}
                        <div className="relative">
                          <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Productible">{labelPrefix2}Productible</label>
                          <div className="flex gap-1 mt-1">
                            <Input
                              value={p.solarYieldRoof2 || ''}
                              readOnly
                              placeholder="kWh/kWc"
                              className={`min-w-0 ${p.solarYieldRoof2
                                ? (parseFloat(p.solarYieldRoof2) >= 1120
                                  ? "bg-green-100 text-green-900 border-green-500"
                                  : "bg-red-100 text-red-900 border-red-500")
                                : "bg-gray-50"
                                }`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0 aspect-square w-10 px-0"
                              title="Calculer le productible Toiture 2"
                              onClick={async () => {
                                if (!p.gps) return toast({ title: "Erreur", description: "Veuillez renseigner les coordonnées GPS.", variant: "destructive" });
                                const parts = p.gps ? p.gps.split(',') : [];
                                const lat = parseFloat(parts[0]?.trim());
                                const lon = parseFloat(parts[1]?.trim());
                                if (isNaN(lat) || isNaN(lon)) return toast({ title: "Erreur", description: "Coordonnées GPS invalides.", variant: "destructive" });

                                const angle = p.panelAngle2 || 15;
                                const aspect = parseFloat(p.panelAspect2 || 0);
                                const weighting = p.roofWeighting2 !== undefined ? p.roofWeighting2 : 50;

                                // Calculate opposite aspect (+180°, normalized to -180 to 180 range)
                                let oppositeAspect = aspect + 180;
                                if (oppositeAspect > 180) oppositeAspect -= 360;
                                if (oppositeAspect < -180) oppositeAspect += 360;

                                toast({ title: "Calcul en cours...", description: `PVGIS Ligne 2: T1 (${aspect}°) et T2 (${oppositeAspect}°)` });

                                try {
                                  // Fetch PVGIS for Line 2 primary aspect (T1)
                                  const pvgisUrl1 = `/api/pvgis-proxy?lat=${lat}&lon=${lon}&peakpower=1&loss=6&angle=${angle}&aspect=${aspect}&outputformat=json&mountingplace=free&pvtechchoice=crystSi`;
                                  const res1 = await fetch(pvgisUrl1);
                                  if (!res1.ok) throw new Error("Erreur PVGIS T1");
                                  const data1 = await res1.json();
                                  const getEy = (d) => d?.outputs?.totals?.fixed?.E_y || d?.outputs?.totals?.E_y;
                                  const yieldT1 = parseFloat(getEy(data1));

                                  // Fetch PVGIS for Line 2 opposite aspect (T2)
                                  const pvgisUrl2 = `/api/pvgis-proxy?lat=${lat}&lon=${lon}&peakpower=1&loss=6&angle=${angle}&aspect=${oppositeAspect}&outputformat=json&mountingplace=free&pvtechchoice=crystSi`;
                                  const res2 = await fetch(pvgisUrl2);
                                  if (!res2.ok) throw new Error("Erreur PVGIS T2");
                                  const data2 = await res2.json();
                                  const yieldT2 = parseFloat(getEy(data2));

                                  if (!isNaN(yieldT1) && !isNaN(yieldT2)) {
                                    // Calculate weighted average for Line 2
                                    const weightedYield = (yieldT1 * weighting + yieldT2 * (100 - weighting)) / 100;

                                    // Store only in Line 2's field (solarYieldRoof2)
                                    updateProject({
                                      solarYieldRoof2: weightedYield.toFixed(2)
                                    });
                                    toast({
                                      title: "Succès Ligne 2",
                                      description: `T1: ${yieldT1.toFixed(2)} (${weighting}%) | T2: ${yieldT2.toFixed(2)} (${100 - weighting}%) | Pondéré: ${weightedYield.toFixed(2)} kWh/kWc`
                                    });
                                  }
                                } catch (e) {
                                  console.error(e);
                                  toast({ title: "Erreur", description: "Échec calcul PVGIS", variant: "destructive" });
                                }
                              }}
                            >
                              <Zap size={16} />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="col-span-12"><label className="text-sm font-medium">Commentaires</label><textarea value={p.comments || ''} onChange={e => updateProject({ comments: e.target.value })} className="mt-1 h-24 w-full rounded-lg border px-3 py-2" placeholder="Commentaires" /></div>
          </div>
        </section>

        <aside className="col-span-3 h-full">
          <ChatBox className="h-full" />
        </aside>
      </div >

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9 relative flex flex-col">
          {/* Tab Bar */}
          <div className="flex gap-2 border-b border-gray-700">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('map'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'map'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Carte
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('streetview'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'streetview'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Street View
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('urbanisme'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'urbanisme'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Urbanisme
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('nv65'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'nv65'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              ZN / ZV
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('owners'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'owners'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Propriétaires
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('capareseau'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'capareseau'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Caparéseau
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('terravisu'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'terravisu'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              TERRAVISU
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('dvf'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'dvf'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              DVF
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('windy'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'windy'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Windy
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('shadowmap'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'shadowmap'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              ShadowMap
            </button>


          </div>

          <div className="rounded-2xl bg-white shadow-sm overflow-hidden flex-1">
            {/* Onglet Carte & Urbanisme */}
            <div className={(activeTab === 'map' || activeTab === 'urbanisme') ? 'w-full flex flex-col h-full' : 'hidden'}>
              <div className="flex-1">
                <MapEditor
                  isUrbanismeMode={activeTab === 'urbanisme'}
                  key={`${projectId}-${remountKey}`}
                  onAddressFound={handleAddressFound}
                  onAddressSearched={handleAddressSearched}
                  project={project}
                  setProject={setProject}
                  setIsAzimuthDefaulted={setIsAzimuthDefaulted}
                  symbolToPlace={symbolToPlace}
                  setSymbolToPlace={setSymbolToPlace}


                />
              </div>

              {/* Layer Toggle Buttons - Inside map tab */}
              <div className="p-3 bg-gray-50 border-t flex flex-wrap gap-2">
                {[
                  { key: 'cadastre', label: 'Cadastre' },
                  { key: 'zoneInondable', label: 'Zone Inondable' },
                  { key: 'batiments', label: 'Bâtiments' },
                  { key: 'rpg', label: 'Parcelles agricoles' },
                  { key: 'hydro', label: 'Hydrographie' },
                  { key: 'routes', label: 'Routes' },
                  { key: 'voiesFerrees', label: 'Voies ferrées' },
                  { key: 'communes', label: 'Limites communales' },
                  { key: 'ZNIEFF 1', label: 'ZNIEFF 1' },
                  { key: 'ZNIEFF 2', label: 'ZNIEFF 2' },
                  { key: 'Natura 2000 Oiseaux', label: 'Natura 2000 Oiseaux' },
                  { key: 'Natura 2000 Habitat', label: 'Natura 2000 Habitat' },
                  { key: 'enedisHTA', label: 'Lignes HTA' },
                  { key: 'enedisPostes', label: 'Postes HTA/BT' },

                  { key: 'sdis', label: 'SDIS' },
                ].map(layer => (
                  <button
                    key={layer.key}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const newActiveLayers = new Set(activeLayers);
                      if (newActiveLayers.has(layer.key)) {
                        newActiveLayers.delete(layer.key);
                      } else {
                        newActiveLayers.add(layer.key);
                      }
                      setActiveLayers(newActiveLayers);
                      window.dispatchEvent(new CustomEvent('map:toggle-layer', { detail: { layerKey: layer.key } }));
                    }}
                    className={`px-3 py-1.5 text-sm border rounded transition-colors ${activeLayers.has(layer.key)
                      ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>


            {/* Onglet Street View */}
            <div className={activeTab === 'streetview' ? 'w-full h-full' : 'hidden'}>
              <StreetViewTab project={project} activeTab={activeTab} />
            </div>

            {/* Onglet ShadowMap */}
            <div className={activeTab === 'shadowmap' ? 'w-full h-full' : 'hidden'}>
              <ShadowMapTab project={project} />
            </div>

            {/* Onglet ZN / ZV (Neige et Vent) */}
            <div className={activeTab === 'nv65' ? 'w-full h-full' : 'hidden'}>
              <iframe
                src="https://nv65.nmoreaux.com/"
                className="w-full h-full border-0"
                title="Zones Neige et Vent NV65"
                allow="geolocation"
              />
            </div>



            {/* Onglet Propriétaires */}
            <div className={activeTab === 'owners' ? 'w-full h-full' : 'hidden'}>
              <iframe
                src="https://proprietaires.cadastre.io/"
                className="w-full h-full border-0"
                title="Propriétaires Cadastre"
                allow="geolocation"
              />
            </div>


            {/* Onglet Caparéseau */}
            <div className={activeTab === 'capareseau' ? 'w-full h-full' : 'hidden'}>
              <iframe
                src="https://www.capareseau.fr/"
                className="w-full h-full border-0"
                title="Caparéseau"
                allow="geolocation"
              />
            </div>

            {/* Onglet TERRAVISU */}
            <div className={activeTab === 'terravisu' ? 'w-full h-full' : 'hidden'}>
              <iframe
                src="https://demo-terravisu-territoires.makina-corpus.com/view/politiquespubliques#map=5.53%2F46.412%2F2.394&layers=cd68490d52c923f94830011da39cff36&basemap=8"
                className="w-full h-full border-0"
                title="TERRAVISU"
                allow="geolocation"
              />
            </div>

            {/* Onglet DVF */}
            <div className={activeTab === 'dvf' ? 'w-full h-full' : 'hidden'}>
              <iframe
                src="https://explore.data.gouv.fr/fr/immobilier?ordering=mutation_date&page=1"
                className="w-full h-full border-0"
                title="DVF Etalab"
                allow="geolocation"
              />
            </div>

            {/* Onglet Windy */}
            <div className={activeTab === 'windy' ? 'w-full h-full' : 'hidden'}>
              {(() => {
                // Parse GPS from project.gps (format "lat, lon")
                let lat = 44.8378;
                let lon = -0.5795;
                if (project?.gps) {
                  const parts = project.gps.split(',').map(s => parseFloat(s.trim()));
                  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    lat = parts[0];
                    lon = parts[1];
                  }
                }
                const windyUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=11&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;

                return (
                  <iframe
                    src={windyUrl}
                    className="w-full h-full border-0"
                    title="Météo Windy"
                    allow="geolocation"
                  />
                );
              })()}
            </div>



          </div>
        </div>

        <aside className="col-span-3 flex flex-col gap-6">
          <SymbolsPanel onSymbolSelect={handleSymbolSelect} selectedSymbol={symbolToPlace} />
          <PredefinedBuildingsPanel onBuildingSelect={handleBuildingSelect} onConfigChange={handleBuildingConfigChange} />
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Capturer la vue</h3>
              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); captureNow(); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={activeTab !== 'map'}
                title={activeTab !== 'map' ? "Captures disponibles uniquement sur l'onglet Carte" : "Prendre une capture"}
                tabIndex={-1}
              >
                <Camera size={16} className="mr-2" />
                Prendre une capture
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {captures.map((c, i) => (
                <div key={i} className="group relative w-full overflow-hidden rounded-xl border bg-gray-100 aspect-video">
                  {c ? (
                    <>
                      <img
                        src={c}
                        alt={`capture-${i + 1}`}
                        className="h-full w-full object-cover cursor-pointer transition-transform hover:scale-105"
                        onClick={() => window.open(c, '_blank')}
                        title="Cliquer pour agrandir"
                      />
                      <button type="button" onClick={() => deleteCapture(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </>
                  ) : <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">Vide</div>}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div >


    </div >
  );
}