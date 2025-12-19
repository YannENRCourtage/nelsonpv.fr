import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, DoorOpen, Home, Flame, Zap, Plug, Users, ImagePlus, Camera, Building, X, FolderHeart as HomeIcon, Map as MapIcon, ExternalLink, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';
import MapEditor from "../components/MapEditor";
import StreetViewTab from "../components/StreetViewTab";
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

function SymbolBtn({ icon, label, type, emoji, onSelect, isSelected }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const scrollY = window.scrollY;
        onSelect({ type, label, emoji });
        setTimeout(() => window.scrollTo(0, scrollY), 0);
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

  // Auto-save on unmount or periodic?
  // Actually, ClientForm handles auto-save.
  // But here we might have explicit save calls.

  // ...

  // If there are explicit calls:
  // saveProject();
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
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef(null);
  const [symbolToPlace, setSymbolToPlace] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [streetViewUrl, setStreetViewUrl] = useState('');

  useEffect(() => {
    const foundProject = projects.find(p => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
    } else if (projectId === 'new') {
      setProject({ id: `proj_${Date.now()}`, name: '', status: 'Nouveau', createdAt: new Date().toISOString() });
    }
  }, [projectId, projects, setProject]);

  useEffect(() => {
    if (project?.captures) setCaptures(project.captures);
    if (project?.photos) setPhotos(project.photos);
  }, [project]);

  const handlePickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(file => ({
      id: URL.createObjectURL(file),
      file: file,
      name: file.name,
    }));
    const updatedPhotos = [...photos, ...newPhotos].slice(0, 16);
    setPhotos(updatedPhotos);
    updateProject({ photos: updatedPhotos });
  };

  const deletePhoto = (idToDelete) => {
    const updatedPhotos = photos.filter(p => p.id !== idToDelete);
    setPhotos(updatedPhotos);
    updateProject({ photos: updatedPhotos });
    // Also remove from map if it exists
    window.dispatchEvent(new CustomEvent("map:delete-feature-by-prop", { detail: { prop: 'photoId', value: idToDelete } }));
  };

  const placePhotoOnMap = (photo, index) => {
    window.dispatchEvent(new CustomEvent("map:place-photo", { detail: { id: photo.id, number: index + 1 } }));
    toast({ title: "Placer la photo", description: `Cliquez sur la carte pour placer la photo n°${index + 1}.` });
  };

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
    const iframeTabs = ['owners', 'capareseau', 'terravisu', 'geoportail', 'dvf'];
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
        backgroundColor: '#ffffff'
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
      createdAt: new Date().toISOString()
    };

    // Reset all state
    setProject(newProject);
    setCaptures([null, null, null, null]);
    setPhotos([]);
    setSymbolToPlace(null);

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

  const handleBuildingSelect = (building) => {
    window.dispatchEvent(new CustomEvent("map:place-building", { detail: { building } }));
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
      <div className="grid grid-cols-12 gap-6 mb-6">
        <section className="col-span-9 rounded-2xl bg-white p-6 shadow-sm">
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
            <div className="flex gap-4">
              <Select value={p.user} onValueChange={(v) => updateProject({ user: v })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {projectUsers.map(u => <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={p.status} onValueChange={(v) => updateProject({ status: v })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
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

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><label className="text-sm font-medium">Nom*</label><Input value={p.name || ''} onChange={e => updateProject({ name: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Nom" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Prénom</label><Input value={p.firstName || ''} onChange={e => updateProject({ firstName: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Prénom" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Téléphone</label><Input value={p.phone || ''} onChange={e => updateProject({ phone: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Téléphone" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Email</label><Input value={p.email || ''} onChange={e => updateProject({ email: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Email" /></div>

            <div className="col-span-12 flex gap-4 items-end">
              <div className="flex-grow-[3]"><label className="text-sm font-medium">Adresse du projet</label><Input value={p.address || ''} onChange={e => updateProject({ address: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Adresse du projet" /></div>
              <div className="flex-grow-[1]"><label className="text-sm font-medium">Code postal</label><Input value={p.zip || ''} onChange={e => updateProject({ zip: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Code postal" /></div>
              <div className="flex-grow-[2]"><label className="text-sm font-medium">Ville</label><Input value={p.city || ''} onChange={e => updateProject({ city: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Ville" /></div>
            </div>

            <div className="col-span-3"><label className="text-sm font-medium">Coordonnées GPS</label><Input value={p.gps || ''} onChange={e => updateProject({ gps: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Ex: 45.24, 4.36" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Type de projet</label><select value={p.type || 'Construction'} onChange={e => updateProject({ type: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1 w-full rounded-lg border px-3 py-2 h-10 bg-background"><option>Construction</option><option>Rénovation</option></select></div>
            <div className="col-span-6"><label className="text-sm font-medium">Projet</label><Input value={p.projectSize || ''} onChange={e => updateProject({ projectSize: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1" placeholder="Ex: 150m² ou 9kWc" /></div>

            <div className="col-span-12"><label className="text-sm font-medium">Commentaires</label><textarea value={p.comments || ''} onChange={e => updateProject({ comments: e.target.value })} onFocus={(e) => { const scrollY = window.scrollY; setTimeout(() => window.scrollTo(0, scrollY), 0); }} className="mt-1 h-24 w-full rounded-lg border px-3 py-2" placeholder="Commentaires" /></div>
          </div>
        </section>

        <aside className="col-span-3">
          <ChatBox />
        </aside>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9 relative flex flex-col">
          {/* Tab Bar */}
          <div className="flex gap-2 border-b border-gray-700">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const scrollY = window.scrollY; setActiveTab('map'); setTimeout(() => window.scrollTo(0, scrollY), 0); }}
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const scrollY = window.scrollY; setActiveTab('streetview'); setTimeout(() => window.scrollTo(0, scrollY), 0); }}
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const scrollY = window.scrollY; setActiveTab('nv65'); setTimeout(() => window.scrollTo(0, scrollY), 0); }}
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const scrollY = window.scrollY; setActiveTab('owners'); setTimeout(() => window.scrollTo(0, scrollY), 0); }}
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const scrollY = window.scrollY; setActiveTab('capareseau'); setTimeout(() => window.scrollTo(0, scrollY), 0); }}
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const scrollY = window.scrollY; setActiveTab('terravisu'); setTimeout(() => window.scrollTo(0, scrollY), 0); }}
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const scrollY = window.scrollY; setActiveTab('dvf'); setTimeout(() => window.scrollTo(0, scrollY), 0); }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-t border-l border-r border-gray-700 ${activeTab === 'dvf'
                ? 'bg-blue-100 text-blue-700 border-b-0 z-10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b border-b-gray-700'
                }`}
              tabIndex={-1}
            >
              DVF
            </button>
          </div>

          <div className="rounded-2xl bg-white shadow-sm overflow-hidden flex-1">
            {/* Onglet Carte */}
            <div className={activeTab === 'map' ? 'w-full h-full' : 'hidden'}>
              <MapEditor
                onAddressFound={handleAddressFound}
                onAddressSearched={handleAddressSearched}
                project={project}
                symbolToPlace={symbolToPlace}
                setSymbolToPlace={setSymbolToPlace}
                photos={photos}
                setPhotos={setPhotos}
              />
            </div>


            {/* Onglet Street View */}
            <div className={activeTab === 'streetview' ? 'w-full h-full' : 'hidden'}>
              <StreetViewTab project={project} activeTab={activeTab} />
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
                src="https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous"
                className="w-full h-full border-0"
                title="DVF"
                allow="geolocation"
              />
            </div>

          </div>
        </div>

        <aside className="col-span-3 flex flex-col gap-6">
          <SymbolsPanel onSymbolSelect={handleSymbolSelect} selectedSymbol={symbolToPlace} />
          <PredefinedBuildingsPanel onBuildingSelect={handleBuildingSelect} />
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Capturer la vue</h3>
              <Button
                type="button"
                onClick={(e) => { captureNow(); }}
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
      </div>

      <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Photos</h3>
            <p className="text-sm text-gray-500">Jusqu’à 16 photos. Cliquez sur "Placer" pour les positionner sur la carte.</p>
          </div>
          <Button type="button" onClick={() => fileRef.current?.click()} className="bg-orange-500 hover:bg-orange-600 text-white">
            <ImagePlus size={16} className="mr-2" />
            Charger des photos
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePickPhotos} />
        </div>
        <div className="grid grid-cols-8 gap-3">
          {Array.from({ length: 16 }).map((_, i) => {
            const photo = photos[i];
            return (
              <div key={i} className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-gray-100">
                {photo ? (
                  <>
                    <img src={photo.id} className="h-full w-full object-cover" alt={photo.name || `photo-${i + 1}`} />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <Button type="button" size="sm" onClick={() => placePhotoOnMap(photo, i)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-auto">
                        <MapIcon size={14} className="mr-1" />
                        Placer
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => deletePhoto(photo.id)} className="text-xs px-2 py-1 h-auto">
                        <X size={14} className="mr-1" />
                        Suppr.
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">{photo.name}</div>
                    <div className="absolute top-1 left-1 bg-blue-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">Vide</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div >
  );
}