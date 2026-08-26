import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useConfiguratorStore, useConfiguratorValues } from '@/stores/useConfiguratorStore';
import { MapPin, DoorOpen, Home, Flame, Zap, Plug, Users, ImagePlus, Camera, Building, X, FolderHeart as HomeIcon, Map as MapIcon, ExternalLink, RotateCcw, RotateCw, Type, MessageCircle, Box, Layout, Search, ChevronDown, ChevronUp, Info, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import MapEditor from "../components/MapEditor";
import StreetViewTab from "../components/StreetViewTab";

import SubstationProximityCards from "../components/editor/SubstationProximityCards.jsx";

import ShadowMapTab from "../components/ShadowMapTab.jsx";
import ChatBox from "../components/editor/ChatBox.jsx";
import UrbanismeTab from "../components/editor/UrbanismeTab.jsx";

import { PlateSituation, PlateMasse, PlateNotice } from '../components/editor/DPPlates';
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
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { toast } from "@/components/ui/use-toast.js";
import { cn } from "@/lib/utils";
import PredefinedBuildingsPanel from "@/components/editor/PredefinedBuildingsPanel.jsx";
import znzvData from "@/data/znzv.json";
import { apiService } from "@/services/api";
import { ACAMA_PREDEFINED_BUILDINGS } from "@/data/simulatorPredefinedBuildings";
import { calculateRequiredResteACharge } from "@/lib/profitabilityCalculations";
import { formatGps, formatCoordinate } from "@/utils/formatGps";

import { BATTERY_MODELS } from "@/data/batteryModels.js";

const INCLINATION_OPTIONS = Array.from({ length: 91 }, (_, i) => {
  const percentage = Math.tan(i * Math.PI / 180) * 100;
  return {
    value: String(i),
    label: `${i}° (${percentage.toFixed(2)}%)`
  };
});

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
  const navigate = useNavigate();
  const { projects, setProject, project, updateProject, saveProject } = useProjects();

  const handleAddressSelect = (feature) => {
    const { name, postcode, city, label } = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;
    const latFmt = typeof lat === 'number' ? Number(lat.toFixed(6)) : parseFloat(lat)?.toFixed(6);
    const lngFmt = typeof lng === 'number' ? Number(lng.toFixed(6)) : parseFloat(lng)?.toFixed(6);
    updateProject({
      address: name || label.split(',')[0],
      zip: postcode || '',
      city: city || '',
      gps: `${latFmt}, ${lngFmt}`
    });
    window.dispatchEvent(new CustomEvent('map:goto-location', {
      detail: { lat, lng, zoom: 18 }
    }));
  };

  // ...

  const { user: currentUser, activeTenantId } = useAuth();
  const [projectUsers, setProjectUsers] = useState([]);

  useEffect(() => {
    // Fetch users for the select dropdown
    const fetchUsers = async () => {
      try {
        // Import dynamically to avoid circular dependencies if any, or just use the global apiService
        const { apiService } = await import('@/services/api');
        const data = await apiService.getUsers();
        if (data) {
          setProjectUsers(data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = React.useMemo(() => {
    return projectUsers.filter(u => {
      // Admins are visible everywhere
      const isAdmin = u.role === 'admin';
      const isSameTenant = u.tenantId === activeTenantId;
      const isAurélien = (u.firstName === 'Aurélien' || u.displayName === 'Aurélien' || u.lastName === 'Aurélien');
      return (isAdmin || isSameTenant) && !isAurélien;
    });
  }, [projectUsers, activeTenantId]);

  const [captures, setCaptures] = useState([null, null, null, null]);


  const [symbolToPlace, setSymbolToPlace] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [streetViewUrl, setStreetViewUrl] = useState('');
  const [activeLayers, setActiveLayers] = useState(new Set());
  const [remountKey, setRemountKey] = useState(0);

  // Reset layers when project changes
  useEffect(() => {
    setActiveLayers(new Set());
  }, [projectId]);
  const [isAngleDefaulted, setIsAngleDefaulted] = useState(false);
  const [isAzimuthDefaulted, setIsAzimuthDefaulted] = useState(false);
  const [isWeightingDefaulted, setIsWeightingDefaulted] = useState(false);
  const [isWeightingDefaulted2, setIsWeightingDefaulted2] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSymbolsOpen, setIsSymbolsOpen] = useState(false);
  const [isBuildingsOpen, setIsBuildingsOpen] = useState(false);
  const [isCapturesOpen, setIsCapturesOpen] = useState(false);
  const [isRoutingActive, setIsRoutingActive] = useState(false);
  const [routingPoints, setRoutingPoints] = useState([]);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isClientOpen, setIsClientOpen] = useState(false); // Client zone collapsed by default on mobile
  const [mobileAddressQuery, setMobileAddressQuery] = useState(''); // For mobile address search above map
  const [isochroneConfig, setIsochroneConfig] = useState({
    costType: 'duration', // 'duration' or 'distance'
    costValue: 5,         // minutes or meters
    profile: 'car'        // 'car' or 'pedestrian'
  });
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [activeConfigTab, setActiveConfigTab] = useState('buildings'); // 'buildings' or 'battery'
  const [selectedBatteryId, setSelectedBatteryId] = useState(BATTERY_MODELS[0].id);
  const [batteryQuantity, setBatteryQuantity] = useState(4);
  
  // Ecouteur pour basculer vers le calque propriétaires depuis la carte
  useEffect(() => {
    const handleShowOwners = () => {
      setActiveTab('map');
      setActiveLayers(prev => {
        const next = new Set(prev);
        next.add('ownersMoral');
        next.add('cadastre');
        return next;
      });
    };
    window.addEventListener('map:show-owners', handleShowOwners);
    return () => window.removeEventListener('map:show-owners', handleShowOwners);
  }, []);

  // Activation automatique du calque Cadastre si Propriétaires est activé
  useEffect(() => {
    if (activeLayers.has('ownersMoral') && !activeLayers.has('cadastre')) {
      setActiveLayers(prev => {
        const next = new Set(prev);
        next.add('cadastre');
        return next;
      });
    }
  }, [activeLayers]);



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
    // Reset project state on project change to avoid data leak from previous project
    setProject(null);

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
          kwc: '',
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
    const iframeTabs = ['capareseau', 'terravisu', 'geoportail', 'dvf', 'windy'];
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
    const { label, lat, lng } = location;
    updateProject({ address: label, gps: `${lat}, ${lng}` });
    // Force map to go to this address immediately by passing coords directly
    window.dispatchEvent(new CustomEvent("map:goto-address", { detail: { lat, lng } }));
  };

  const handleAddressSearched = (location) => {
    const { lat, lng } = location;
    updateProject({ gps: `${lat}, ${lng}` });
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
      kwc: '',
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
      const predefinedBuildings = (project?.features || []).filter(f => f.type === 'rectangle' && f.isPredefinedBuilding && !f.isBattery);
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
        // We have 0 or 1 building
        targetBuilding = predefinedBuildings[0];

        if (targetBuilding) {
          if (targetBuilding.buildingName === buildingData.code) {
            // Editing B1
            if (project?.roofWeighting !== val) {
              updateProject({ roofWeighting: val });
              setIsWeightingDefaulted(true);
            }
          } else {
            // Preparing B2
            if (project?.roofWeighting2 !== val) {
              updateProject({ roofWeighting2: val });
              if (typeof setIsWeightingDefaulted2 === 'function') setIsWeightingDefaulted2(true);
            }
          }
        } else {
          // No building exists yet, allowed to update defaults
          if (project?.roofWeighting !== val) {
            updateProject({ roofWeighting: val });
            setIsWeightingDefaulted(true);
          }
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

      if (building.angle !== undefined && building.angle !== null && (activeTenantId === 'acama' || building.isCustom)) {
        newAngle = String(Math.round(building.angle));
      } else if (['O', 'C', 'A'].includes(firstLetter)) {
        newAngle = "15";
      } else if (['K', 'H', 'Y', 'S'].includes(firstLetter)) {
        newAngle = "10";
      }

      const updates = {};

      // Determine if we are adding the second building (if 1 already exists)
      const predefinedBuildings = (project?.features || []).filter(f => f.type === 'rectangle' && f.isPredefinedBuilding && !f.isBattery);
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

      // ACAMA uniquement ou mode Sur-mesure : forcer la surface et la puissance
      // Ainsi que la longueur et la largeur
      if ((activeTenantId === 'acama' && building.isPredefinedAcama !== false) || building.isCustom) {
        if (building.length !== undefined && building.length !== null) {
          if (isNextBuildingSecond) updates.longueur2 = String(building.length);
          else updates.longueur = String(building.length);
        }
        if (building.width !== undefined && building.width !== null) {
          if (isNextBuildingSecond) updates.largeur2 = String(building.width);
          else updates.largeur = String(building.width);
        }
        if (building.surface !== undefined && building.surface !== null) {
          if (isNextBuildingSecond) {
            updates.surface2 = Number(building.surface);
          } else {
            updates.surface = Number(building.surface);
          }
        }
        if (building.power !== undefined && building.power !== null) {
          if (isNextBuildingSecond) {
            updates.puissance2 = Number(building.power);
          } else {
            updates.puissance = Number(building.power);
          }
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

  const [searchParams, setSearchParams] = useSearchParams();
  const configuratorValues = useConfiguratorValues();
  const configuratorState = useConfiguratorStore();

  useEffect(() => {
    if (searchParams.get('insertCustomBuilding') === 'true' && project?.id) {
      // ALWAYS use customParams for auto-insertion from configurator
      const params = configuratorState.customParams;
      
      const length = params.bayCount * params.baySpacing;
      let totalWidth = params.width;
      
      if (params.leftExtension !== 'none') totalWidth += params.leftExtWidth;
      if (params.rightExtension !== 'none') totalWidth += params.rightExtWidth;

      const customBldg = {
        code: 'SUR-MESURE',
        length: parseFloat(length.toFixed(2)),
        width: parseFloat(totalWidth.toFixed(2)),
        surface: parseFloat((length * totalWidth).toFixed(2)),
        power: parseFloat(configuratorValues.solarStats.power.toFixed(2)),
        angle: params.leftPitch,
        roofWeighting: 100,
        isCustom: true
      };

      handleBuildingSelect(customBldg);
      
      // Clear param
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('insertCustomBuilding');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, project?.id, configuratorState.customParams, configuratorValues, setSearchParams]);

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
    <div className="w-full px-2 lg:px-4 py-4 lg:py-6 bg-gray-50">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 mb-6 items-stretch">
        <section className="col-span-1 lg:col-span-9 rounded-2xl bg-white p-3 lg:p-6 shadow-sm h-full flex flex-col justify-between">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
            <div className="flex items-center justify-between lg:justify-start gap-3 w-full lg:w-auto">
              <Button
                type="button"
                onClick={() => navigate('/crm?tab=projects')}
                variant="outline"
                size="sm"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 font-bold flex items-center gap-1.5 shadow-sm transition-all"
                title="Retour à la liste des projets CRM"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700" />
                <span>Retour</span>
              </Button>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Client &amp; Projet</h2>
                <button
                  type="button"
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                  onClick={() => setIsClientOpen(v => !v)}
                  title={isClientOpen ? 'Replier' : 'Déplier la section client'}
                >
                  <Users size={14} />
                  <span>{isClientOpen ? 'Masquer Client' : 'Voir Client'}</span>
                  {isClientOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
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
            {/* Dropdowns: sur une ligne sur mobile */}
            <div className="flex flex-wrap gap-2 items-end w-full lg:w-auto mt-2 lg:mt-0 lg:grid lg:grid-cols-3 lg:gap-4">
              <div className="flex-1 min-w-[80px]">
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
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.map(u => {
                      const name = u.firstName || u.displayName || u.email;
                      return <SelectItem key={u.id || u.email} value={name}>{name}</SelectItem>;
                    })}
                    {/* Specialized options preserved if needed manually or if they don't exist as users */}
                    <SelectItem value="Contact">Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[80px]">
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
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.map(u => {
                      const name = u.firstName || u.displayName || u.email;
                      return <SelectItem key={u.id || u.email} value={name}>{name}</SelectItem>;
                    })}
                    <SelectItem value="Contact">Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[80px]">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Statut</label>
                <Select value={p.status || 'Nouveau'} onValueChange={(v) => updateProject({ status: v })}>
                  <SelectTrigger className="w-full lg:w-[180px]">
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



          {/* Mobile Toggle Button - Between Enedis and Client Details */}
          <div className="lg:hidden mt-6 mb-2 border-t pt-4">
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-all",
                isClientOpen 
                  ? "bg-slate-100 text-slate-700 border border-slate-200" 
                  : "bg-blue-600 text-white shadow-md shadow-blue-200"
              )}
              onClick={() => setIsClientOpen(v => !v)}
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>{isClientOpen ? "Masquer les données client" : "Voir les données client"}</span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-normal uppercase tracking-wider opacity-80">
                   {isClientOpen ? 'Fermer' : 'Ouvrir'}
                 </span>
                 {isClientOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>
          </div>

          {/* Body: collapsed on mobile by default, always visible on desktop */}
          <div className={`${isClientOpen ? 'block' : 'hidden'} lg:block`}>
            {/* ============================
                MOBILE/TABLET LAYOUT (lg:hidden)
                6 rows of grouped fields
                ============================ */}
            <div className="lg:hidden flex flex-col gap-2">

              {/* Ligne 1: Nom + Prénom + Type de projet */}
              <div className="flex gap-2">
                <div className="flex-1 min-w-[80px]"><label className="text-xs font-medium">Nom*</label><Input value={p.name || ''} onChange={e => updateProject({ name: e.target.value })} className="mt-0.5 h-8" placeholder="Nom" /></div>
                <div className="flex-1 min-w-[80px]"><label className="text-xs font-medium">Prénom</label><Input value={p.firstName || ''} onChange={e => updateProject({ firstName: e.target.value })} className="mt-0.5 h-8" placeholder="Prénom" /></div>
                <div className="flex-1 min-w-[90px]"><label className="text-xs font-medium">Type</label><select value={p.type || 'Construction'} onChange={e => updateProject({ type: e.target.value })} className="mt-0.5 w-full rounded-lg border px-1 py-1 h-8 bg-background text-xs"><option>Construction</option><option>Rénovation</option><option>Construction &amp; Rénovation</option><option>Sol 1Ha</option></select></div>
                <div className="flex-1 min-w-[90px] ml-2">
                  <label className="text-xs font-medium text-blue-600">Batterie SA</label>
                  <div className="flex gap-1 mt-0.5 h-8">
                    <button
                      type="button"
                      onClick={() => updateProject({ isBatteryStandAlone: 'Oui' })}
                      className={`flex-1 rounded-lg text-[10px] font-bold transition-colors ${
                        p.isBatteryStandAlone === 'Oui'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      OUI
                    </button>
                    <button
                      type="button"
                      onClick={() => updateProject({ isBatteryStandAlone: 'Non' })}
                      className={`flex-1 rounded-lg text-[10px] font-bold transition-colors ${
                        p.isBatteryStandAlone !== 'Oui'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      NON
                    </button>
                  </div>
                </div>
              </div>

              {/* Tél + Email on same line */}
              <div className="flex gap-2">
                <div className="flex-1 min-w-[90px]"><label className="text-xs font-medium">Tél.</label><Input value={p.phone || ''} onChange={e => updateProject({ phone: e.target.value })} className="mt-0.5 h-8" placeholder="Tél." /></div>
                <div className="flex-1 min-w-[130px]"><label className="text-xs font-medium">Email</label><Input value={p.email || ''} onChange={e => updateProject({ email: e.target.value })} className="mt-0.5 h-8" placeholder="Email" /></div>
              </div>

              {/* Ligne 2: Adresse */}
              <div>
                <label className="text-xs font-medium">Adresse</label>
                <AddressAutocomplete 
                  value={p.address || ''} 
                  onChange={e => updateProject({ address: e.target.value })} 
                  onSelect={handleAddressSelect}
                  className="mt-0.5 h-8" 
                  placeholder="Adresse du projet" 
                />
              </div>

              {/* Ligne 3: CP + Ville */}
              <div className="flex gap-2">
                <div className="w-[80px] shrink-0"><label className="text-xs font-medium">CP</label><Input value={p.zip || ''} onChange={e => updateProject({ zip: e.target.value })} className="mt-0.5 h-8" placeholder="CP" /></div>
                <div className="flex-1"><label className="text-xs font-medium">Ville</label><Input value={p.city || ''} onChange={e => updateProject({ city: e.target.value })} className="mt-0.5 h-8" placeholder="Ville" /></div>
              </div>

              {/* GPS + Projet on same line */}
              <div className="flex gap-2">
                <div className="flex-1 min-w-[120px]"><label className="text-xs font-medium">GPS</label><div className="flex gap-1 mt-0.5"><Input placeholder="Lat" value={p.gps ? formatCoordinate(p.gps.split(',')[0]) : ''} onChange={e => { const lat = e.target.value; const lon = p.gps && p.gps.includes(',') ? p.gps.split(',')[1].trim() : ''; updateProject({ gps: `${lat}, ${lon}` }); }} className="h-8 min-w-0 font-mono text-xs" /><Input placeholder="Lon" value={p.gps && p.gps.includes(',') ? formatCoordinate(p.gps.split(',')[1]) : ''} onChange={e => { const lat = p.gps ? p.gps.split(',')[0].trim() : ''; updateProject({ gps: `${lat}, ${e.target.value}` }); }} className="h-8 min-w-0 font-mono text-xs" /></div></div>
                <div className="w-[90px] shrink-0"><label className="text-xs font-medium">Projet</label><Input value={p.projectSize || ''} onChange={e => updateProject({ projectSize: e.target.value })} className="mt-0.5 h-8" placeholder="Ex: 9kWc" /></div>
              </div>

              {/* Technical fields - use the same IIFE for building logic */}
              {(() => {
                const predefinedBuildings = (p.features || []).filter(f => f.type === 'rectangle' && f.isPredefinedBuilding && !f.isBattery);
                const hasSecondBuilding = predefinedBuildings.length >= 2;
                const hasFirstBuilding = predefinedBuildings.length >= 1;
                const labelPrefix1 = hasSecondBuilding ? "1/ " : "";
                const labelPrefix2 = "2/ ";

                return (
                  <>
                    {/* Ligne 4: Séisme + Neige + Vent */}
                    <div className="flex gap-2">
                      <div className="flex-1"><label className="text-xs font-medium">Séisme</label><Input value={p.seismicZone || ''} onChange={e => updateProject({ seismicZone: e.target.value })} className="mt-0.5 h-8" placeholder="Séisme" /></div>
                      <div className="w-[56px] shrink-0"><label className="text-xs font-medium">Neige</label><Input value={p.snowZone || ''} onChange={e => updateProject({ snowZone: e.target.value })} className="mt-0.5 h-8" placeholder="" /></div>
                      <div className="w-[56px] shrink-0"><label className="text-xs font-medium">Vent</label><Input value={p.windZone || ''} onChange={e => updateProject({ windZone: e.target.value })} className="mt-0.5 h-8" placeholder="" /></div>
                    </div>

                    {/* Ligne 5: Inclinaison + Azimut */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium">{labelPrefix1}Inclinaison</label>
                        <Select value={String(p.panelAngle || '15')} onValueChange={v => { updateProject({ panelAngle: v }); if (isAngleDefaulted) setIsAngleDefaulted(false); }}>
                          <SelectTrigger className={`mt-0.5 h-8 w-full text-xs ${hasFirstBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{INCLINATION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium">{labelPrefix1}Azimut</label>
                        <Select value={String(p.panelAspect || '0')} onValueChange={v => { updateProject({ panelAspect: v }); if (isAzimuthDefaulted) setIsAzimuthDefaulted(false); }}>
                          <SelectTrigger className={`mt-0.5 h-8 w-full text-xs ${hasFirstBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                          <SelectContent className="h-60">{Array.from({ length: 72 }, (_, i) => -175 + i * 5).map(val => { let label = `${val}°`; if (val === 0) label += " (Sud)"; else if (val === -90) label += " (Est)"; else if (val === 90) label += " (Ouest)"; else if (val === 180) label += " (Nord)"; return <SelectItem key={val} value={String(val)}>{label}</SelectItem>; })}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Ligne 6: Pondération + Productible */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium">{labelPrefix1}Pondération</label>
                        <Select key={`weight-m-${p.roofWeighting}`} value={String(p.roofWeighting !== undefined ? p.roofWeighting : 50)} onValueChange={v => { updateProject({ roofWeighting: parseInt(v) }); if (isWeightingDefaulted) setIsWeightingDefaulted(false); }}>
                          <SelectTrigger className={`mt-0.5 h-8 w-full text-xs ${hasFirstBuilding ? 'bg-gray-200' : ''}`}><SelectValue /></SelectTrigger>
                          <SelectContent className="h-60">{Array.from({ length: 11 }, (_, i) => 50 + i * 5).map(val => <SelectItem key={val} value={String(val)}>{val}%</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium">{labelPrefix1}Productible</label>
                        <div className="flex gap-1 mt-0.5">
                          <Input value={p.solarYieldRoof1 || ''} readOnly placeholder="kWh/kWc" className={`min-w-0 h-8 text-xs ${p.solarYieldRoof1 ? (parseFloat(p.solarYieldRoof1) >= 1120 ? 'bg-green-100 text-green-900 border-green-500' : 'bg-red-100 text-red-900 border-red-500') : 'bg-gray-50'}`} />
                          <Button type="button" variant="outline" size="icon" className="shrink-0 h-8 w-8 px-0" title="Calculer PVGIS" onClick={async () => {
                            if (!p.gps) return toast({ title: 'Erreur', description: 'GPS manquant', variant: 'destructive' });
                            const parts = p.gps.split(',');
                            const lat = parseFloat(parts[0]?.trim());
                            const lon = parseFloat(parts[1]?.trim());
                            if (isNaN(lat) || isNaN(lon)) return;

                            const angle = p.panelAngle || 15;
                            const aspect = parseFloat(p.panelAspect || 0);
                            const weighting = p.roofWeighting !== undefined ? p.roofWeighting : 50;

                            // PVGIS Logic for ACAMA vs others
                            const pvgisLoss = activeTenantId === 'acama' ? 10 : 6;
                            const pvgisMounting = activeTenantId === 'acama' ? 'building' : 'free';

                            let opp = aspect + 180;
                            if (opp > 180) opp -= 360;
                            if (opp < -180) opp += 360;

                            try {
                              const [r1, r2] = await Promise.all([
                                fetch(`/api/pvgis?lat=${lat}&lon=${lon}&peakpower=1&loss=${pvgisLoss}&angle=${angle}&aspect=${aspect}&outputformat=json&mountingplace=${pvgisMounting}&pvtechchoice=crystSi`),
                                fetch(`/api/pvgis?lat=${lat}&lon=${lon}&peakpower=1&loss=${pvgisLoss}&angle=${angle}&aspect=${opp}&outputformat=json&mountingplace=${pvgisMounting}&pvtechchoice=crystSi`)
                              ]);
                              const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
                              const getEy = d => d?.outputs?.totals?.fixed?.E_y || d?.outputs?.totals?.E_y;
                              const y1 = parseFloat(getEy(d1));
                              const y2 = parseFloat(getEy(d2));
                              if (!isNaN(y1) && !isNaN(y2)) {
                                updateProject({ solarYieldRoof1: ((y1 * weighting + y2 * (100 - weighting)) / 100).toFixed(2) });
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}><Zap size={14} /></Button>
                        </div>
                      </div>
                    </div>

                    {/* Bâtiment 2 (si existant) */}
                    {hasSecondBuilding && (
                      <>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs font-medium">{labelPrefix2}Inclinaison</label>
                            <Select value={String(p.panelAngle2 || (activeTenantId === 'acama' ? '10' : '15'))} onValueChange={v => updateProject({ panelAngle2: v })}>
                              <SelectTrigger className="mt-0.5 h-8 w-full text-xs bg-gray-200"><SelectValue /></SelectTrigger>
                              <SelectContent>{INCLINATION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-medium">{labelPrefix2}Azimut</label>
                            <Select value={String(p.panelAspect2 || '0')} onValueChange={v => updateProject({ panelAspect2: v })}>
                              <SelectTrigger className="mt-0.5 h-8 w-full text-xs bg-gray-200"><SelectValue /></SelectTrigger>
                              <SelectContent className="h-60">{Array.from({ length: 72 }, (_, i) => -175 + i * 5).map(val => { let label = `${val}°`; if (val === 0) label += " (Sud)"; return <SelectItem key={val} value={String(val)}>{label}</SelectItem>; })}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs font-medium">{labelPrefix2}Pondération</label>
                            <Select key={`weight2-m-${p.roofWeighting2}`} value={String(p.roofWeighting2 !== undefined ? p.roofWeighting2 : 50)} onValueChange={v => { updateProject({ roofWeighting2: parseInt(v) }); if (isWeightingDefaulted2) setIsWeightingDefaulted2(false); }}>
                              <SelectTrigger className="mt-0.5 h-8 w-full text-xs bg-gray-200"><SelectValue /></SelectTrigger>
                              <SelectContent className="h-60">{Array.from({ length: 11 }, (_, i) => 50 + i * 5).map(val => <SelectItem key={val} value={String(val)}>{val}%</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-medium">{labelPrefix2}Productible</label>
                            <div className="flex gap-1 mt-0.5">
                              <Input value={p.solarYieldRoof2 || ''} readOnly placeholder="kWh/kWc" className={`min-w-0 h-8 text-xs ${p.solarYieldRoof2 ? (parseFloat(p.solarYieldRoof2) >= 1120 ? 'bg-green-100 text-green-900 border-green-500' : 'bg-red-100 text-red-900 border-red-500') : 'bg-gray-50'}`} />
                              <Button type="button" variant="outline" size="icon" className="shrink-0 h-8 w-8 px-0" title="Calculer PVGIS 2" onClick={async () => {
                                if (!p.gps) return;
                                const parts = p.gps.split(',');
                                const lat = parseFloat(parts[0]?.trim());
                                const lon = parseFloat(parts[1]?.trim());
                                if (isNaN(lat) || isNaN(lon)) return;

                                const angle = p.panelAngle2 || 15;
                                const aspect = parseFloat(p.panelAspect2 || 0);
                                const weighting = p.roofWeighting2 !== undefined ? p.roofWeighting2 : 50;

                                // PVGIS Logic for ACAMA vs others
                                const pvgisLoss = activeTenantId === 'acama' ? 10 : 6;
                                const pvgisMounting = activeTenantId === 'acama' ? 'building' : 'free';

                                let opp = aspect + 180;
                                if (opp > 180) opp -= 360;
                                if (opp < -180) opp += 360;

                                try {
                                  const [r1, r2] = await Promise.all([
                                    fetch(`/api/pvgis?lat=${lat}&lon=${lon}&peakpower=1&loss=${pvgisLoss}&angle=${angle}&aspect=${aspect}&outputformat=json&mountingplace=${pvgisMounting}&pvtechchoice=crystSi`),
                                    fetch(`/api/pvgis?lat=${lat}&lon=${lon}&peakpower=1&loss=${pvgisLoss}&angle=${angle}&aspect=${opp}&outputformat=json&mountingplace=${pvgisMounting}&pvtechchoice=crystSi`)
                                  ]);
                                  const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
                                  const getEy = d => d?.outputs?.totals?.fixed?.E_y || d?.outputs?.totals?.E_y;
                                  const y1 = parseFloat(getEy(d1));
                                  const y2 = parseFloat(getEy(d2));
                                  if (!isNaN(y1) && !isNaN(y2)) {
                                    updateProject({ solarYieldRoof2: ((y1 * weighting + y2 * (100 - weighting)) / 100).toFixed(2) });
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}><Zap size={14} /></Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              {/* Commentaires */}
              <div><label className="text-xs font-medium">Commentaires</label><textarea value={p.comments || ''} onChange={e => updateProject({ comments: e.target.value })} className="mt-0.5 h-16 w-full max-w-full rounded-lg border px-3 py-2 text-sm resize-y" placeholder="Commentaires" /></div>
            </div>

            {/* ============================
                DESKTOP LAYOUT (hidden on mobile)
                Original grid unchanged
                ============================ */}
            <div className="hidden lg:grid grid-cols-12 gap-4">
              {/* Desktop: Nom, Prénom, Tél, Email */}
              <div className="col-span-3"><label className="text-sm font-medium">Nom*</label><Input value={p.name || ''} onChange={e => updateProject({ name: e.target.value })} className="mt-1 h-10" placeholder="Nom" /></div>
              <div className="col-span-3"><label className="text-sm font-medium">Prénom</label><Input value={p.firstName || ''} onChange={e => updateProject({ firstName: e.target.value })} className="mt-1 h-10" placeholder="Prénom" /></div>
              <div className="col-span-3"><label className="text-sm font-medium">Téléphone</label><Input value={p.phone || ''} onChange={e => updateProject({ phone: e.target.value })} className="mt-1 h-10" placeholder="Téléphone" /></div>
              <div className="col-span-3"><label className="text-sm font-medium">Email</label><Input value={p.email || ''} onChange={e => updateProject({ email: e.target.value })} className="mt-1 h-10" placeholder="Email" /></div>
              {/* Desktop: Adresse, CP, Ville */}
              <div className="col-span-6">
                <label className="text-sm font-medium">Adresse du projet</label>
                <AddressAutocomplete 
                  value={p.address || ''} 
                  onChange={e => updateProject({ address: e.target.value })} 
                  onSelect={handleAddressSelect}
                  className="mt-1 h-10" 
                  placeholder="Adresse du projet" 
                />
              </div>
              <div className="col-span-2"><label className="text-sm font-medium">Code postal</label><Input value={p.zip || ''} onChange={e => updateProject({ zip: e.target.value })} className="mt-1 h-10" placeholder="Code postal" /></div>
              <div className="col-span-4"><label className="text-sm font-medium">Ville</label><Input value={p.city || ''} onChange={e => updateProject({ city: e.target.value })} className="mt-1 h-10" placeholder="Ville" /></div>

              {/* Desktop: GPS + Type + Projet */}
              <div className="col-span-3">
                <label className="text-sm font-medium">Coordonnées GPS</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Lat"
                    value={p.gps ? formatCoordinate(p.gps.split(',')[0]) : ''}
                    onChange={e => {
                      const lat = e.target.value;
                      const lon = p.gps && p.gps.includes(',') ? p.gps.split(',')[1].trim() : '';
                      updateProject({ gps: `${lat}, ${lon}` });
                    }}
                    title="Latitude"
                    className="font-mono text-xs"
                  />
                  <Input
                    placeholder="Lon"
                    value={p.gps && p.gps.includes(',') ? formatCoordinate(p.gps.split(',')[1]) : ''}
                    onChange={e => {
                      const lat = p.gps ? p.gps.split(',')[0].trim() : '';
                      const lon = e.target.value;
                      updateProject({ gps: `${lat}, ${lon}` });
                    }}
                    title="Longitude"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="col-span-2"><label className="text-sm font-medium">Type de projet</label><select value={p.type || 'Construction'} onChange={e => updateProject({ type: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 h-10 bg-background"><option>Construction</option><option>Rénovation</option><option>Construction &amp; Rénovation</option><option>Sol 1Ha</option></select></div>
              <div className="col-span-1">
                <label className="text-sm font-medium text-blue-600">Batterie SA</label>
                <div className="flex gap-1 mt-1 h-10">
                  <button
                    type="button"
                    onClick={() => updateProject({ isBatteryStandAlone: 'Oui' })}
                    className={`flex-1 rounded-lg text-xs font-bold transition-colors ${
                      p.isBatteryStandAlone === 'Oui'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    OUI
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProject({ isBatteryStandAlone: 'Non' })}
                    className={`flex-1 rounded-lg text-xs font-bold transition-colors ${
                      p.isBatteryStandAlone !== 'Oui'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    NON
                  </button>
                </div>
              </div>
              <div className="col-span-6">
                <div className="flex gap-2">
                  <div className="w-[88%]">
                    <label className="text-sm font-medium">Projet</label>
                    <Input value={p.projectSize || ''} onChange={e => updateProject({ projectSize: e.target.value })} className="mt-1 h-10" placeholder="Ex: T9 MAXI 75x32m + 4 batteries" />
                  </div>
                  <div className="w-[12%] min-w-[70px]">
                    <label className="text-sm font-medium text-blue-600 font-bold">kWc</label>
                    <Input value={p.kwc || ''} onChange={e => updateProject({ kwc: e.target.value })} className="mt-1 h-10 font-bold text-blue-900 border-blue-200 focus:border-blue-500" placeholder="kWc" />
                  </div>
                </div>
              </div>

              {/* Desktop: Technical Fields */}
              <div className="col-span-12 space-y-2">
                {/* --- ROW 1: Env + Building 1 --- */}
                <div className="flex gap-2 items-end">
                  {/* Séisme */}
                  <div className="flex-1">
                    <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Zone de séisme">Séisme</label>
                    <Input value={p.seismicZone || ''} onChange={e => updateProject({ seismicZone: e.target.value })} className="mt-1" placeholder="Séisme" />
                  </div>

                  {/* Neige */}
                  <div className="flex-1">
                    <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Zone de neige">Neige</label>
                    <Input value={p.snowZone || ''} onChange={e => updateProject({ snowZone: e.target.value })} className="mt-1" placeholder="Neige" />
                  </div>

                  {/* Vent */}
                  <div className="flex-1">
                    <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Zone de vent">Vent</label>
                    <Input value={p.windZone || ''} onChange={e => updateProject({ windZone: e.target.value })} className="mt-1" placeholder="Vent" />
                  </div>

                  {/* Shared Logic for determining presence of second building */}
                  {(() => {
                    const predefinedBuildings = (p.features || []).filter(f => f.type === 'rectangle' && (f.isPredefinedBuilding || f.buildingName) && !f.isBattery);
                    const hasSecondBuilding = predefinedBuildings.length >= 2;
                    const hasFirstBuilding = predefinedBuildings.length >= 1;
                    const labelPrefix1 = hasSecondBuilding ? "1/ " : "";

                    return (
                      <>
                        {/* Inclinaison 1 */}
                        <div className="flex-1">
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
                        <div className="flex-1">
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
                        <div className="flex-1">
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
                        <div className="flex-1">
                          <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Productible">{labelPrefix1}Productible</label>
                          <Input
                            value={p.solarYieldRoof1 || ''}
                            readOnly
                            placeholder="kWh/kWc"
                            className={`mt-1 w-full ${p.solarYieldRoof1
                              ? (parseFloat(p.solarYieldRoof1) >= 1120
                                ? "bg-green-100 text-green-900 border-green-500"
                                : "bg-red-100 text-red-900 border-red-500")
                              : "bg-gray-50"
                              }`}
                          />
                        </div>

                        <div className="flex-1 flex gap-1 items-end">
                          {activeTenantId !== 'green-invest' && activeTenantId !== 'enr-courtage-energie' && (
                            <div className="flex-1">
                              <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Reste à charge">{labelPrefix1}Reste à charge</label>
                              <Input
                                value={p.resteACharge !== undefined ? p.resteACharge : ''}
                                onChange={e => updateProject({ resteACharge: parseInt(e.target.value) || 0 })}
                                placeholder="Reste à charge"
                                className="mt-1 w-full bg-amber-50 border-amber-200"
                              />
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0 aspect-square w-10 px-0 h-10"
                            title="Calculer le productible Toiture 1"
                              onClick={async () => {
                                console.log("[PVGIS L1] Starting calculation for project:", p.id, "Params:", { panelAspect: p.panelAspect, panelAngle: p.panelAngle, gps: p.gps });
                                if (!p.gps) return toast({ title: "Erreur", description: "Veuillez renseigner les coordonnées GPS.", variant: "destructive" });
                                const parts = p.gps ? p.gps.split(',') : [];
                                const lat = parseFloat(parts[0]?.trim());
                                const lon = parseFloat(parts[1]?.trim());
                                if (isNaN(lat) || isNaN(lon)) return toast({ title: "Erreur", description: "Coordonnées GPS invalides.", variant: "destructive" });

                                const angle = parseFloat(p.panelAngle || 15) || 15;
                                const aspect = parseFloat(p.panelAspect || 0) || 0;
                                const weighting = parseFloat(p.roofWeighting !== undefined ? p.roofWeighting : 50) || 50;

                                // PVGIS Logic for ACAMA vs others
                                const pvgisLoss = activeTenantId === 'acama' ? 10 : 6;
                                const pvgisMounting = activeTenantId === 'acama' ? 'building' : 'free';

                                // Calculate opposite aspect (+180°, normalized to -180 to 180 range)
                                let oppositeAspect = aspect + 180;
                                if (oppositeAspect > 180) oppositeAspect -= 360;
                                if (oppositeAspect < -180) oppositeAspect += 360;

                                toast({ title: "Calcul en cours...", description: `PVGIS Ligne 1: T1 (${aspect}°) et T2 (${oppositeAspect}°)` });

                                try {
                                  const safeFetchPVGIS = async (url) => {
                                    let response;
                                    try {
                                      response = await fetch(url);
                                    } catch (fetchErr) {
                                      throw new Error(`Réseau: ${fetchErr.message}`);
                                    }

                                    const text = await response.text();
                                    try {
                                      const json = JSON.parse(text);
                                      if (!response.ok) throw new Error(json.details || json.error || `Erreur HTTP ${response.status}`);
                                      return json;
                                    } catch (err) {
                                      if (!response.ok) throw new Error(`Réponse non-JSON (${response.status}): ${text.slice(0, 100)}...`);
                                      throw new Error(`JSON Invalide: ${err.message}. Début: ${text.slice(0, 50)}`);
                                    }
                                  };

                                  // Fetch PVGIS for Line 1 primary aspect (T1)
                                  const pvgisUrl1 = `/api/pvgis?lat=${lat}&lon=${lon}&peakpower=1&loss=${pvgisLoss}&angle=${angle}&aspect=${aspect}&outputformat=json&mountingplace=${pvgisMounting}&pvtechchoice=crystSi`;
                                  console.log("[PVGIS] Fetching T1:", pvgisUrl1);
                                  const data1 = await safeFetchPVGIS(pvgisUrl1);
                                  const getEy = (d) => d?.outputs?.totals?.fixed?.E_y || d?.outputs?.totals?.E_y;
                                  const yieldT1 = parseFloat(getEy(data1));

                                  // Fetch PVGIS for Line 1 opposite aspect (T2)
                                  const pvgisUrl2 = `/api/pvgis?lat=${lat}&lon=${lon}&peakpower=1&loss=${pvgisLoss}&angle=${angle}&aspect=${oppositeAspect}&outputformat=json&mountingplace=${pvgisMounting}&pvtechchoice=crystSi`;
                                  console.log("[PVGIS] Fetching T2:", pvgisUrl2);
                                  const data2 = await safeFetchPVGIS(pvgisUrl2);
                                  const yieldT2 = parseFloat(getEy(data2));

                                  if (!isNaN(yieldT1) && !isNaN(yieldT2)) {
                                    // Calculate weighted average for Line 1
                                    const weightedYield = (yieldT1 * weighting + yieldT2 * (100 - weighting)) / 100;

                                    // Store only in Line 1's field (solarYieldRoof1)
                                    updateProject({
                                      solarYieldRoof1: weightedYield.toFixed(2)
                                    });

                                    // CALCUL AUTO RESTE A CHARGE SUPPRIME - Se base desormais sur le BP Acama

                                    toast({
                                      title: "Succès Ligne 1",
                                      description: `T1: ${yieldT1.toFixed(2)} (${weighting}%) | T2: ${yieldT2.toFixed(2)} (${100 - weighting}%) | Pondéré: ${weightedYield.toFixed(2)} kWh/kWc`
                                    });
                                  }
                                } catch (e) {
                                  console.error("[PVGIS L1 Error]", e);
                                  toast({
                                    title: "Erreur Ligne 1",
                                    description: `Échec calcul: ${e.message}`,
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <Zap size={16} />
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                {/* --- ROW 2: Building 2 (aligned vertically) --- */}
                {(() => {
                  const predefinedBuildings = (p.features || []).filter(f => f.type === 'rectangle' && (f.isPredefinedBuilding || f.buildingName) && !f.isBattery);
                  const hasSecondBuilding = predefinedBuildings.length >= 2;
                  if (!hasSecondBuilding) return null;
                  const labelPrefix2 = "2/ ";

                  return (
                    <div className="flex gap-2 items-end mt-2">
                      {/* Spacers for Env cols (Séisme, Neige, Vent) */}
                      <div className="flex-1"></div>
                      <div className="flex-1"></div>
                      <div className="flex-1"></div>

                      {/* Inclinaison 2 */}
                      <div className="flex-1">
                        <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Inclinaison">{labelPrefix2}Inclinaison</label>
                        <Select
                          value={String(p.panelAngle2 || (activeTenantId === 'acama' ? '10' : '15'))}
                          onValueChange={v => updateProject({ panelAngle2: v })}
                        >
                          <SelectTrigger className="mt-1 h-10 w-full bg-gray-200"><SelectValue /></SelectTrigger>
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
                      <div className="flex-1">
                        <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Azimut">{labelPrefix2}Azimut</label>
                        <Select
                          value={String(p.panelAspect2 || '0')}
                          onValueChange={v => updateProject({ panelAspect2: v })}
                        >
                          <SelectTrigger className="mt-1 h-10 w-full bg-gray-200"><SelectValue /></SelectTrigger>
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
                      <div className="flex-1">
                        <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Pondération">{labelPrefix2}Pondération</label>
                        <Select
                          key={`weight2-${p.roofWeighting2}`}
                          value={String(p.roofWeighting2 !== undefined ? p.roofWeighting2 : 50)}
                          onValueChange={v => { updateProject({ roofWeighting2: parseInt(v) }); if (isWeightingDefaulted2) setIsWeightingDefaulted2(false); }}
                        >
                          <SelectTrigger className="mt-1 h-10 w-full bg-gray-200"><SelectValue /></SelectTrigger>
                          <SelectContent className="h-60">
                            {Array.from({ length: 11 }, (_, i) => 50 + i * 5).map(val => (
                              <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Productible 2 */}
                      <div className="flex-1">
                        <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Productible">{labelPrefix2}Productible</label>
                        <Input
                          value={p.solarYieldRoof2 || ''}
                          readOnly
                          placeholder="kWh/kWc"
                          className={`mt-1 w-full ${p.solarYieldRoof2
                            ? (parseFloat(p.solarYieldRoof2) >= 1120
                              ? "bg-green-100 text-green-900 border-green-500"
                              : "bg-red-100 text-red-900 border-red-500")
                            : "bg-gray-50"
                            }`}
                        />
                      </div>

                      {/* Reste à charge 2 */}
                      <div className="flex-1 flex gap-1 items-end">
                        {activeTenantId !== 'green-invest' && activeTenantId !== 'enr-courtage-energie' && (
                          <div className="flex-1">
                            <label className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis block" title="Reste à charge">{labelPrefix2}Reste à charge</label>
                            <Input
                              value={p.resteACharge2 !== undefined ? p.resteACharge2 : ''}
                              onChange={e => updateProject({ resteACharge2: parseInt(e.target.value) || 0 })}
                              placeholder="Reste à charge"
                              className="mt-1 w-full bg-amber-50 border-amber-200"
                              title="Reste à charge calculé ou saisi pour Ligne 2"
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 aspect-square w-10 px-0 h-10"
                          title="Calculer le productible Toiture 2"
                            onClick={async () => {
                              console.log("[PVGIS L2] Starting calculation for project:", p.id, "Params:", { panelAspect2: p.panelAspect2, panelAngle2: p.panelAngle2, gps: p.gps });
                              if (!p.gps) return toast({ title: "Erreur", description: "Veuillez renseigner les coordonnées GPS.", variant: "destructive" });
                              const parts = p.gps ? p.gps.split(',') : [];
                              const lat = parseFloat(parts[0]?.trim());
                              const lon = parseFloat(parts[1]?.trim());
                              if (isNaN(lat) || isNaN(lon)) return toast({ title: "Erreur", description: "Coordonnées GPS invalides.", variant: "destructive" });

                              const angle = parseFloat(p.panelAngle2 || 15) || 15;
                              const aspect = parseFloat(p.panelAspect2 || 0) || 0;
                              const weighting = parseFloat(p.roofWeighting2 !== undefined ? p.roofWeighting2 : 50) || 50;

                              // PVGIS Logic for ACAMA vs others
                              const pvgisLoss = activeTenantId === 'acama' ? 10 : 6;
                              const pvgisMounting = activeTenantId === 'acama' ? 'building' : 'free';

                              // Calculate opposite aspect (+180°, normalized to -180 to 180 range)
                              let oppositeAspect = aspect + 180;
                              if (oppositeAspect > 180) oppositeAspect -= 360;
                              if (oppositeAspect < -180) oppositeAspect += 360;

                              toast({ title: "Calcul en cours...", description: `PVGIS Ligne 2: T1 (${aspect}°) et T2 (${oppositeAspect}°)` });

                              try {
                                const safeFetchPVGIS = async (url) => {
                                  let response;
                                  try {
                                    response = await fetch(url);
                                  } catch (fetchErr) {
                                    throw new Error(`Réseau: ${fetchErr.message}`);
                                  }

                                  const text = await response.text();
                                  try {
                                    const json = JSON.parse(text);
                                    if (!response.ok) throw new Error(json.details || json.error || `Erreur HTTP ${response.status}`);
                                    return json;
                                  } catch (err) {
                                    if (!response.ok) throw new Error(`Réponse non-JSON (${response.status}): ${text.slice(0, 100)}...`);
                                    throw new Error(`JSON Invalide: ${err.message}. Début: ${text.slice(0, 50)}`);
                                  }
                                };

                                // Fetch PVGIS for Line 2 primary aspect (T1)
                                const pvgisUrl1 = `/api/pvgis?lat=${lat}&lon=${lon}&peakpower=1&loss=${pvgisLoss}&angle=${angle}&aspect=${aspect}&outputformat=json&mountingplace=${pvgisMounting}&pvtechchoice=crystSi`;
                                console.log("[PVGIS] Fetching T1:", pvgisUrl1);
                                const data1 = await safeFetchPVGIS(pvgisUrl1);
                                const getEy = (d) => d?.outputs?.totals?.fixed?.E_y || d?.outputs?.totals?.E_y;
                                const yieldT1 = parseFloat(getEy(data1));

                                // Fetch PVGIS for Line 2 opposite aspect (T2)
                                const pvgisUrl2 = `/api/pvgis?lat=${lat}&lon=${lon}&peakpower=1&loss=${pvgisLoss}&angle=${angle}&aspect=${oppositeAspect}&outputformat=json&mountingplace=${pvgisMounting}&pvtechchoice=crystSi`;
                                console.log("[PVGIS] Fetching T2:", pvgisUrl2);
                                const data2 = await safeFetchPVGIS(pvgisUrl2);
                                const yieldT2 = parseFloat(getEy(data2));

                                if (!isNaN(yieldT1) && !isNaN(yieldT2)) {
                                  // Calculate weighted average for Line 2
                                  const weightedYield = (yieldT1 * weighting + yieldT2 * (100 - weighting)) / 100;

                                  // Store only in Line 2's field (solarYieldRoof2)
                                  updateProject({
                                    solarYieldRoof2: weightedYield.toFixed(2)
                                  });

                                  // CALCUL AUTO RESTE A CHARGE LIGNE 2 SUPPRIME - Se base desormais sur le BP Acama

                                  toast({
                                    title: "Succès Ligne 2",
                                    description: `T1: ${yieldT1.toFixed(2)} (${weighting}%) | T2: ${yieldT2.toFixed(2)} (${100 - weighting}%) | Pondéré: ${weightedYield.toFixed(2)} kWh/kWc`
                                  });
                                }
                              } catch (e) {
                                console.error("[PVGIS L2 Error]", e);
                                toast({
                                  title: "Erreur Ligne 2",
                                  description: `Échec calcul: ${e.message}`,
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Zap size={16} />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                {/* Desktop: Commentaires */}
                <div className="col-span-12"><label className="text-sm font-medium">Commentaires</label><textarea value={p.comments || ''} onChange={e => updateProject({ comments: e.target.value })} className="mt-1 h-24 w-full rounded-lg border px-3 py-2 text-sm resize-y" placeholder="Commentaires" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* Chat Box - Desktop only */}
        <aside className="col-span-1 lg:col-span-3 h-full hidden lg:block">
          <ChatBox className="h-full" />
        </aside>
      </div>

      {/* ============================
          BESS STANDALONE - Section préqualification
          Visible uniquement si Batterie SA = Oui, pour ACAMA et ENR Courtage Énergie
          ============================ */}


      {/* Floating Chat Bubble - Mobile only */}
      <div className="lg:hidden">
        {isChatOpen && (
          <div className="fixed inset-0 z-[25000] bg-black/50" onClick={() => setIsChatOpen(false)} />
        )}
        {isChatOpen && (
          <div className="fixed bottom-20 right-4 z-[26000] w-[90vw] max-w-sm h-[60vh] rounded-2xl shadow-2xl overflow-hidden">
            <ChatBox className="h-full" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsChatOpen(v => !v)}
          className="fixed bottom-4 right-4 z-[26001] bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-xl flex items-center justify-center transition-transform active:scale-95"
          title="Ouvrir le chat"
        >
          {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="col-span-1 lg:col-span-9 relative flex flex-col">
          {/* Tab Bar - On mobile: Carte only */}
          <div className="flex gap-2 border-b border-gray-700 overflow-x-auto">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('map'); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 whitespace-nowrap ${activeTab === 'map'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Carte
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('rpg'); }}
              className={`hidden lg:block px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 whitespace-nowrap ${activeTab === 'rpg'
                ? 'bg-green-100 text-green-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              🌾 RPG
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('streetview'); }}
              className={`hidden lg:block px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 whitespace-nowrap ${activeTab === 'streetview'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Street View
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('geoportail'); }}
              className={`hidden lg:block px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 whitespace-nowrap ${activeTab === 'geoportail'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              Géoportail Urbanisme
            </button>


            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('terravisu'); }}
              className={`hidden lg:block px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 whitespace-nowrap ${activeTab === 'terravisu'
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
              className={`hidden lg:block px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 whitespace-nowrap ${activeTab === 'dvf'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              DVF
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('shadowmap'); }}
              className={`hidden lg:block px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 whitespace-nowrap ${activeTab === 'shadowmap'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              ShadowMap
            </button>


          </div>

          {/* Champ de recherche d'adresse au-dessus de la carte (mobile/tablette) */}
          <div className="lg:hidden mb-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={mobileAddressQuery}
                onChange={e => setMobileAddressQuery(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && mobileAddressQuery.trim()) {
                    e.preventDefault();
                    try {
                      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(mobileAddressQuery)}&limit=1`);
                      if (res.ok) {
                        const data = await res.json();
                        const feature = data.features?.[0];
                        if (feature) {
                          const [lng, lat] = feature.geometry.coordinates;
                          const label = feature.properties.label;
                          handleAddressFound({ label, lat, lng });
                        }
                      }
                    } catch (err) { console.error('Address search error', err); }
                  }
                }}
                placeholder="Rechercher une adresse..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700 active:scale-95 transition-transform"
                onClick={async () => {
                  if (!mobileAddressQuery.trim()) return;
                  try {
                    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(mobileAddressQuery)}&limit=1`);
                    if (res.ok) {
                      const data = await res.json();
                      const feature = data.features?.[0];
                      if (feature) {
                        const [lng, lat] = feature.geometry.coordinates;
                        const label = feature.properties.label;
                        handleAddressFound({ label, lat, lng });
                      }
                    }
                  } catch (err) { console.error('Address search error', err); }
                }}
              >
                <Search size={16} />
              </button>
            </div>
          </div>
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden flex-1 min-h-[60vh] lg:h-[750px] relative">
            {/* Onglet Carte - On le garde monté si l'onglet DP est actif pour permettre les captures et la persistance du zoom */}
            {(activeTab === 'map' || activeTab === 'urbanisme_dp') && (
              <div className={`w-full h-full flex flex-col ${activeTab !== 'map' ? 'absolute inset-0 pointer-events-none opacity-0' : ''}`}>
                <div className="flex-1 min-h-[55vh] lg:min-h-0">
                  <MapEditor
                    key={`${projectId}-${remountKey}`}
                    onAddressFound={handleAddressFound}
                    onAddressSearched={handleAddressSearched}
                    project={project}
                    setProject={setProject}
                    setIsAzimuthDefaulted={setIsAzimuthDefaulted}
                    symbolToPlace={symbolToPlace}
                    setSymbolToPlace={setSymbolToPlace}
                    isochroneConfig={isochroneConfig}
                    activeLayers={activeLayers}
                    activeTab={activeTab}
                    companies={companies}
                    selectedCompany={selectedCompany}
                    setSelectedCompany={setSelectedCompany}
                    isRoutingActive={isRoutingActive}
                    setIsRoutingActive={setIsRoutingActive}
                    routingPoints={routingPoints}
                    setRoutingPoints={setRoutingPoints}
                  />
                </div>

                {/* Layer Toggle Buttons - Desktop: always visible */}
                <div className="hidden lg:flex p-3 bg-gray-50 border-t flex-wrap gap-2">
                  {/* Badge mode Propriétaires */}
                  {activeLayers.has('ownersMoral') && (
                    <div className="w-full flex items-center gap-2 mb-1.5 pb-1.5 border-b border-sky-200">
                      <div className="flex items-center gap-1.5 bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full text-xs font-bold">
                        <span>🏠</span>
                        <span>Mode Propriétaires — Calques Personnes Morales activés</span>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-sky-400 border-2 border-sky-600" style={{opacity: 0.8}}></div>
                        <span className="text-xs text-sky-600 font-medium">Parcelle avec propriétaire PM identifié</span>
                      </div>
                    </div>
                  )}
                  {activeLayers.has('filiationParcelle') && (
                    <div className="w-full flex items-center gap-2 mb-1.5 pb-1.5 border-b border-violet-200">
                      <div className="flex items-center gap-1.5 bg-violet-100 text-violet-800 px-2.5 py-1 rounded-full text-xs font-bold">
                        <span>🧬</span>
                        <span>Mode Filiation — Historique parcellaire actif</span>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-xs text-violet-600 font-medium">Cliquez sur une parcelle pour voir son histoire</span>
                      </div>
                    </div>
                  )}
                  {[
                    { key: 'cadastre', label: 'Cadastre' },
                    { key: 'ownersMoral', label: 'Propriétaires' },
                    { key: 'filiationParcelle', label: 'Filiation parcelle' },
                    { key: 'zoneInondable', label: 'Zone Inondable' },
                    { key: 'courbesNiveau', label: 'Courbes de niveau' },
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
                    { key: 'dgac', label: 'Servitude DGAC' },
                    { key: 'enedisHTA', label: 'Lignes HTA' },
                    { key: 'enedisLigneBT', label: 'Ligne BT' },
                    { key: 'enedisPostes', label: 'Postes HTA/BT' },
                    { key: 'gaz', label: 'GAZ' },
                    { key: 'abf', label: 'ABF' },
                    { key: 'sdis', label: 'SDIS' },
                    { key: 'lidarMNH', label: 'LiDAR Hauteur' },
                    { key: 'cartofriches', label: 'Cartofriches' },
                    { key: 'parkingSup500', label: 'Parking >500m²' },
                    { key: 'cadastreSolaire', label: 'Cadastre solaire' },
                    { key: 'zaer', label: 'ZAER' },
                    { key: 'loiLittoral', label: 'Loi littoral' },
                    { key: 'banPlus', label: 'BAN PLUS' },
                    { key: 'postesSourcesRTE', label: 'Postes Sources RTE' },
                    { key: 'consoElecCommune', label: 'Conso. élec.' },
                    { key: 'dpe', label: 'DPE' },
                    { key: 'distanceReglRoutes', label: 'Distances règl. routes' },
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

                {/* Mobile - collapsible */}
                <div className="lg:hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border-t text-sm font-medium text-gray-700"
                    onClick={() => setIsLayersOpen(v => !v)}
                  >
                    <span>{activeLayers.has('ownersMoral') ? '🏠 Propriétaires — Calques' : (activeLayers.has('filiationParcelle') ? '🧬 Filiation — Calques' : '🗺️ Calques')}</span>
                    <span>{isLayersOpen ? '▲' : '▼'}</span>
                  </button>
                  {isLayersOpen && (
                    <div className="p-2 bg-gray-50 flex flex-wrap gap-1.5">
                      {[
                        { key: 'cadastre', label: 'Cadastre' },
                        { key: 'ownersMoral', label: 'Propriétaires' },
                        { key: 'filiationParcelle', label: 'Filiation' },
                        { key: 'zoneInondable', label: 'Z. Inond.' },
                        { key: 'courbesNiveau', label: 'Courbes niv.' },
                        { key: 'batiments', label: 'Bâtiments' },
                        { key: 'rpg', label: 'Parcelles agr.' },
                        { key: 'hydro', label: 'Hydro.' },
                        { key: 'routes', label: 'Routes' },
                        { key: 'voiesFerrees', label: 'V. ferrées' },
                        { key: 'communes', label: 'Lim. comm.' },
                        { key: 'ZNIEFF 1', label: 'ZNIEFF 1' },
                        { key: 'ZNIEFF 2', label: 'ZNIEFF 2' },
                        { key: 'Natura 2000 Oiseaux', label: 'N2000 Ois.' },
                        { key: 'Natura 2000 Habitat', label: 'N2000 Hab.' },
                        { key: 'dgac', label: 'Serv. DGAC' },
                        { key: 'enedisHTA', label: 'L. HTA' },
                        { key: 'enedisLigneBT', label: 'L. BT' },
                        { key: 'enedisPostes', label: 'P. HTA/BT' },
                        { key: 'gaz', label: 'GAZ' },
                        { key: 'abf', label: 'ABF' },
                        { key: 'sdis', label: 'SDIS' },
                        { key: 'lidarMNH', label: 'LiDAR Haut.' },
                        { key: 'cartofriches', label: 'Cartofriches' },
                        { key: 'parkingSup500', label: 'Park. >500m²' },
                        { key: 'cadastreSolaire', label: 'Cadastre sol.' },
                        { key: 'zaer', label: 'ZAER' },
                        { key: 'loiLittoral', label: 'Loi lit.' },
                        { key: 'banPlus', label: 'BAN PLUS' },
                        { key: 'postesSourcesRTE', label: 'P. Sources RTE' },
                        { key: 'consoElecCommune', label: 'Conso. élec.' },
                        { key: 'dpe', label: 'DPE' },
                        { key: 'distanceReglRoutes', label: 'Dist. règl. routes' },
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
                          className={`px-2 py-1 text-xs border rounded transition-colors ${activeLayers.has(layer.key)
                            ? 'bg-blue-500 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300'
                            }`}
                        >
                          {layer.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Overlay d'information - Mode Propriétaires */}
            {activeLayers.has('ownersMoral') && (
              <div className="absolute bottom-[130px] left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-xl border border-sky-200 px-5 py-3 rounded-2xl flex items-center gap-3 pointer-events-none">
                <div className="bg-sky-100 p-2 rounded-full">
                  <span className="text-sky-600 text-base">🏠</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Mode Propriétaires Fonciers</p>
                  <p className="text-[11px] text-slate-500 font-medium">Parcelles <span className="text-sky-600 font-bold">bleu ciel</span> = propriétaire (PM) identifié • Cliquez pour voir les données • Zoom ≥ 13 requis</p>
                </div>
              </div>
            )}

            {/* Overlay d'information - Mode Filiation Parcelle */}
            {activeLayers.has('filiationParcelle') && (
              <div className="absolute bottom-[130px] left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-xl border border-violet-200 px-5 py-3 rounded-2xl flex items-center gap-3 pointer-events-none">
                <div className="bg-violet-100 p-2 rounded-full">
                  <span className="text-violet-600 text-base">🧬</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Mode Filiation Parcelle</p>
                  <p className="text-[11px] text-slate-500 font-medium">Cliquez sur une parcelle cadastrale sur la carte pour consulter son historique de filiation (divisions / fusions).</p>
                </div>
              </div>
            )}



            {/* Onglet Géoportail Urbanisme - Reverted to old behavior: show map in urbanisme mode */}
            {(activeTab === 'geoportail') && (
              <div className="w-full flex flex-col h-full relative">
                <div className="flex-1">
                  <MapEditor
                    isUrbanismeMode={true}
                    key={`geoportail-${projectId}-${remountKey}`}
                    onAddressFound={handleAddressFound}
                    onAddressSearched={handleAddressSearched}
                    project={project}
                    setProject={setProject}
                    setIsAzimuthDefaulted={setIsAzimuthDefaulted}
                    symbolToPlace={symbolToPlace}
                    setSymbolToPlace={setSymbolToPlace}
                    isochroneConfig={isochroneConfig}
                    activeLayers={activeLayers}
                    companies={companies}
                    selectedCompany={selectedCompany}
                    setSelectedCompany={setSelectedCompany}
                    isRoutingActive={isRoutingActive}
                    setIsRoutingActive={setIsRoutingActive}
                    routingPoints={routingPoints}
                    setRoutingPoints={setRoutingPoints}
                  />
                </div>
                {/* Instructions Overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur shadow-lg border border-blue-200 p-3 rounded-xl flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Mode Géoportail</p>
                    <p className="text-[11px] text-slate-600 italic">Cliquez sur une parcelle pour ouvrir sa fiche d'urbanisme en automatique.</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="ml-2 border-blue-200 text-blue-600"
                    onClick={() => {
                       const [lat, lng] = project?.gps?.split(',').map(v => v.trim()) || [48.8534, 2.3488];
                       window.open(`https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon=${lng}&lat=${lat}&zoom=16&labels=1`, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Ouvrir direct
                  </Button>
                </div>
              </div>
            )}

            {/* Onglet RPG — désactivé (composant supprimé) */}

            {/* Onglet Street View */}
            {activeTab === 'streetview' && (
              <div className='w-full h-full'>
                <StreetViewTab project={project} activeTab={activeTab} />
              </div>
            )}

            {activeTab === 'shadowmap' && (
              <div className='w-full h-full'>
                <ShadowMapTab project={project} />
              </div>
            )}




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
                src={project?.gps
                  ? `https://demo-terravisu-territoires.makina-corpus.com/view/politiquespubliques#layers=cd68490d52c923f94830011da39cff36&map=18.5/${project.gps.split(',').map(s => s.trim()).join('/')}`
                  : "https://demo-terravisu-territoires.makina-corpus.com/view/politiquespubliques#map=5.53/46.412/2.394&layers=cd68490d52c923f94830011da39cff36&basemap=8"}
                className="w-full h-full border-0"
                title="TERRAVISU"
                allow="geolocation"
              />
            </div>

            {/* Onglet DVF */}
            <div className={activeTab === 'dvf' ? 'w-full h-full' : 'hidden'}>
              <iframe
                src={project?.gps
                  ? `https://app.dvf.etalab.gouv.fr/#18.5/${project.gps.split(',').map(s => s.trim()).join('/')}`
                  : "https://explore.data.gouv.fr/fr/immobilier?ordering=mutation_date&page=1"}
                className="w-full h-full border-0"
                title="DVF Etalab"
                allow="geolocation"
              />
            </div>

          </div>
          
          {/* Substation Proximity Cards (RTE) - Moved outside fixed height container to push footer */}
          <SubstationProximityCards 
            gps={p.gps} 
            isVisible={activeLayers.has('postesSourcesRTE') && (activeTab === 'map' || activeTab === 'urbanisme')} 
          />
        </div>

        {/* Desktop Aside Panel */}
        <aside className="col-span-1 lg:col-span-3 hidden lg:flex flex-col gap-6">
          <SymbolsPanel onSymbolSelect={handleSymbolSelect} selectedSymbol={symbolToPlace} />

          {symbolToPlace?.type === 'isochrone' && (
            <div className="rounded-2xl bg-white p-4 shadow-sm border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3 text-blue-700">
                <MapIcon size={20} />
                <h3 className="font-semibold">Paramètres Isochrone</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsochroneConfig(prev => ({ ...prev, costType: 'duration' }))}
                      className={cn("px-3 py-2 text-sm rounded-lg border transition-colors",
                        isochroneConfig.costType === 'duration' ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600")}
                    >
                      Temps (min)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsochroneConfig(prev => ({ ...prev, costType: 'distance' }))}
                      className={cn("px-3 py-2 text-sm rounded-lg border transition-colors",
                        isochroneConfig.costType === 'distance' ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600")}
                    >
                      Distance (m)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                    {isochroneConfig.costType === 'duration' ? 'Durée' : 'Distance'}
                  </label>
                  <Input
                    type="number"
                    value={isochroneConfig.costValue}
                    onChange={(e) => setIsochroneConfig(prev => ({ ...prev, costValue: parseInt(e.target.value) || 0 }))}
                    className="h-9"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Transport</label>
                  <Select
                    value={isochroneConfig.profile}
                    onValueChange={(val) => setIsochroneConfig(prev => ({ ...prev, profile: val }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Mode de transport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Voiture</SelectItem>
                      <SelectItem value="pedestrian">Piéton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-2 bg-blue-50 rounded-lg text-xs text-blue-600 italic">
                  Cliquez sur la carte pour générer la zone.
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex gap-4 border-b mb-4 pb-2">
              <button
                type="button"
                onClick={() => setActiveConfigTab('buildings')}
                className={cn(
                  "px-2 py-1 text-sm font-bold transition-all border-b-2",
                  activeConfigTab === 'buildings' ? "text-blue-600 border-blue-600" : "text-gray-400 border-transparent hover:text-gray-600"
                )}
              >
                Bâtiments prédéfinis
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab('battery')}
                className={cn(
                  "px-2 py-1 text-sm font-bold transition-all border-b-2",
                  activeConfigTab === 'battery' ? "text-blue-600 border-blue-600" : "text-gray-400 border-transparent hover:text-gray-600"
                )}
              >
                Batterie
              </button>
            </div>

            {activeConfigTab === 'buildings' ? (
              <div className="-mx-4 -mb-4">
                <PredefinedBuildingsPanel 
                  onBuildingSelect={handleBuildingSelect} 
                  onConfigChange={handleBuildingConfigChange} 
                  tenantId={activeTenantId} 
                />
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const model = BATTERY_MODELS.find(m => m.id === selectedBatteryId);
                  if (!model) return null;
                  const totalPrice = model.price * batteryQuantity;
                  const totalPower = model.power * batteryQuantity;
                  const totalCapacity = model.capacity * batteryQuantity;
                  const ratio = totalPrice / totalPower;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Bâtiments prédéfinis</h3>
                        <Button 
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('map:place-battery', { 
                              detail: { 
                                model: model,
                                quantity: batteryQuantity
                              } 
                            }));
                          }}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Insérer
                        </Button>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Modèle</label>
                          <Select value={selectedBatteryId} onValueChange={setSelectedBatteryId}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BATTERY_MODELS.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.brand} - {m.model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[80px]">
                          <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Quantité</label>
                          <Input 
                            type="number" 
                            min="1" 
                            value={batteryQuantity} 
                            onChange={e => setBatteryQuantity(parseInt(e.target.value) || 1)} 
                            className="w-full"
                          />
                        </div>
                        <div className="flex flex-col items-end min-w-[80px]">
                          <span className="text-xs font-medium text-gray-500 uppercase mb-1 block">Ratio</span>
                          <span className="text-sm font-bold text-red-600">{ratio.toFixed(2)} €</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Prix Total:</span>
                          <span className="font-bold">{totalPrice.toLocaleString('fr-FR')} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Puissance:</span>
                          <span className="font-bold">{totalPower} kW</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Capacité:</span>
                          <span className="font-bold">{totalCapacity} kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ratio (€/kW):</span>
                          <span className="font-bold">{ratio.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
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

        {/* Mobile Collapsible Panels - Symbols, Buildings, Captures */}
        <div className="lg:hidden mt-3 flex flex-col gap-3">
          {/* Symbols Collapsible */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 font-semibold text-sm text-gray-700"
              onClick={() => setIsSymbolsOpen(v => !v)}
            >
              <span>📍 Symboles</span>
              <span className="text-lg">{isSymbolsOpen ? '▲' : '▼'}</span>
            </button>
            {isSymbolsOpen && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "project", label: "Lieu Projet", icon: <MapPin className="h-5 w-5 text-red-500" />, emoji: "📍" },
                    { type: "access", label: "Accès", icon: <DoorOpen className="h-5 w-5 text-slate-700" />, emoji: "🚪" },
                    { type: "house", label: "Maison", icon: <Home className="h-5 w-5" />, emoji: "🏠" },
                    { type: "sdis", label: "SDIS", icon: <Flame className="h-5 w-5" />, emoji: "🚒" },
                    { type: "transfo", label: "Transfo", icon: <Zap className="h-5 w-5" />, emoji: "⚡" },
                    { type: "pdl", label: "PDL", icon: <Plug className="h-5 w-5" />, emoji: "🔌" },
                    { type: "neighbor", label: "Voisin", icon: <Users className="h-5 w-5" />, emoji: "👥" },
                    { type: "building", label: "Bâtiment", icon: <Building className="h-5 w-5" />, emoji: "🏢" },
                    { type: "photo", label: "Photo", icon: <Camera className="h-5 w-5" />, emoji: "📷" },
                    { type: "text", label: "Texte", icon: <Type className="h-5 w-5" />, emoji: "T" },
                    { type: "isochrone", label: "Isochrone", icon: <MapIcon className="h-5 w-5 text-blue-500" />, emoji: "⌚" },
                  ].map(s => (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => handleSymbolSelect({ type: s.type, label: s.label, emoji: s.emoji })}
                      className={cn("flex flex-col items-center justify-center gap-1 rounded-lg border bg-white p-2 text-xs font-medium shadow-sm",
                        symbolToPlace?.type === s.type && "ring-2 ring-blue-500 border-blue-500"
                      )}
                      tabIndex={-1}
                    >
                      {s.icon}
                      <span className="truncate w-full text-center">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buildings Collapsible */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 font-semibold text-sm text-gray-700"
              onClick={() => setIsBuildingsOpen(v => !v)}
            >
              <div className="flex gap-3">
                <span 
                  className={cn("transition-colors", activeConfigTab === 'buildings' ? "text-blue-600" : "text-gray-400")}
                  onClick={(e) => { e.stopPropagation(); setActiveConfigTab('buildings'); setIsBuildingsOpen(true); }}
                >
                  🏗️ Bâtiments prédéfinis
                </span>
                <span className="text-gray-300">|</span>
                <span 
                  className={cn("transition-colors", activeConfigTab === 'battery' ? "text-blue-600" : "text-gray-400")}
                  onClick={(e) => { e.stopPropagation(); setActiveConfigTab('battery'); setIsBuildingsOpen(true); }}
                >
                  🔋 Batterie
                </span>
              </div>
              <span className="text-lg">{isBuildingsOpen ? '▲' : '▼'}</span>
            </button>
            {isBuildingsOpen && (
              <div className="px-3 pb-3">
                {activeConfigTab === 'buildings' ? (
                  <PredefinedBuildingsPanel 
                    onBuildingSelect={(b) => { handleBuildingSelect(b); setIsBuildingsOpen(false); }} 
                    onConfigChange={handleBuildingConfigChange} 
                    tenantId={activeTenantId} 
                  />
                ) : (
                  <div className="space-y-4 p-2">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Modèle</label>
                      <Select value={selectedBatteryId} onValueChange={setSelectedBatteryId}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BATTERY_MODELS.map(model => (
                            <SelectItem key={model.id} value={model.id} className="text-xs">
                              {model.brand} - {model.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Quantité</label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={batteryQuantity} 
                        onChange={e => setBatteryQuantity(parseInt(e.target.value) || 1)} 
                        className="h-9 text-xs"
                      />
                    </div>

                    {(() => {
                      const model = BATTERY_MODELS.find(m => m.id === selectedBatteryId);
                      if (!model) return null;
                      const totalPrice = model.price * batteryQuantity;
                      const totalPower = model.power * batteryQuantity;
                      const totalCapacity = model.capacity * batteryQuantity;
                      const ratio = totalPrice / totalPower;

                      return (
                        <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px]">
                          <div>
                            <div className="text-gray-500 uppercase font-bold">Prix</div>
                            <div className="font-bold">{totalPrice.toLocaleString('fr-FR')} €</div>
                          </div>
                          <div>
                            <div className="text-gray-500 uppercase font-bold">Puiss.</div>
                            <div className="font-bold">{totalPower} kW</div>
                          </div>
                          <div>
                            <div className="text-gray-500 uppercase font-bold">Cap.</div>
                            <div className="font-bold">{totalCapacity} kWh</div>
                          </div>
                          <div>
                            <div className="text-gray-500 uppercase font-bold">Ratio</div>
                            <div className="font-bold">{ratio.toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })()}

                    <Button 
                      onClick={() => {
                        const model = BATTERY_MODELS.find(m => m.id === selectedBatteryId);
                        window.dispatchEvent(new CustomEvent('map:place-battery', { 
                          detail: { 
                            model: model,
                            quantity: batteryQuantity
                          } 
                        }));
                        setIsBuildingsOpen(false);
                      }}
                      className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Insérer sur la carte
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Captures Collapsible */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 font-semibold text-sm text-gray-700"
              onClick={() => setIsCapturesOpen(v => !v)}
            >
              <span>📸 Captures</span>
              <span className="text-lg">{isCapturesOpen ? '▲' : '▼'}</span>
            </button>
            {isCapturesOpen && (
              <div className="px-3 pb-3 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); captureNow(); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                  disabled={activeTab !== 'map'}
                  tabIndex={-1}
                >
                  <Camera size={16} className="mr-2" />
                  Prendre une capture
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  {captures.map((c, i) => (
                    <div key={i} className="group relative rounded-lg border bg-gray-100 aspect-video overflow-hidden">
                      {c ? (
                        <>
                          <img src={c} alt={`capture-${i + 1}`} className="h-full w-full object-cover" onClick={() => window.open(c, '_blank')} />
                          <button type="button" onClick={() => deleteCapture(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5">
                            <X size={12} />
                          </button>
                        </>
                      ) : <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">Vide</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div >
      {/* Hidden container for actual rendering of DP plates */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        {project && (
          <>
            <PlateSituation project={project} captures={project.urbanisme_captures || captures} />
            <PlateMasse project={project} captures={project.urbanisme_captures || captures} />
            <PlateNotice project={project} captures={project.urbanisme_captures || captures} />
          </>
        )}
      </div>
    </div >
  );
}