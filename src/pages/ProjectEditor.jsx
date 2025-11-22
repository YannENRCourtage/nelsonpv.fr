import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, DoorOpen, Home, Flame, Zap, Plug, Users, ImagePlus, Camera, Building, X, FolderHeart as HomeIcon, Map as MapIcon } from 'lucide-react';
import MapEditor from "../components/MapEditor";
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
      onClick={(e) => { e.preventDefault(); onSelect({ type, label, emoji }); }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border bg-white p-4 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
        isSelected && "ring-2 ring-blue-500 border-blue-500"
      )}
      title={label}
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
  const { projects, setProject, project, updateProject, saveProjectToLS } = useProjects();
  const { users: allUsers } = useAuth();
  const [captures, setCaptures] = useState([null, null, null, null]);
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef(null);
  const rightColumnRef = useRef(null);
  const [mapHeight, setMapHeight] = useState(800);
  const [symbolToPlace, setSymbolToPlace] = useState(null);

  useEffect(() => {
    const foundProject = projects.find(p => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
    } else if (projectId === 'new') {
      setProject({ id: `proj_${Date.now()}`, name: '', status: 'Nouveau', createdAt: new Date().toISOString() });
    }
  }, [projectId, projects, setProject]);

  const projectUsers = Object.values(allUsers).filter(u => u.role !== 'admin');

  useEffect(() => {
    if (project?.captures) setCaptures(project.captures);
    if (project?.photos) setPhotos(project.photos);
  }, [project]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setMapHeight(entry.contentRect.height);
      }
    });

    const currentRef = rightColumnRef.current;
    if (currentRef) {
      resizeObserver.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
    };
  }, []);

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
      window.dispatchEvent(new CustomEvent("map:capture-request", { detail: { slotIndex: emptySlot } }));
    } else {
      window.dispatchEvent(new CustomEvent("map:capture-request", { detail: { slotIndex: 0 } }));
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
    const handleSave = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProjectToLS();
        toast({ title: "Projet sauvegardé !", description: "Vos modifications ont été enregistrées." });
      }
    };
    window.addEventListener('keydown', handleSave);
    return () => window.removeEventListener('keydown', handleSave);
  }, [saveProjectToLS]);

  const p = project || {};

  return (
    <div className="w-full px-4 py-6 bg-gray-50">
      <div className="grid grid-cols-12 gap-6 mb-6">
        <section className="col-span-9 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Client & Projet</h2>
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
            <div className="col-span-3"><label className="text-sm font-medium">Nom*</label><Input value={p.name || ''} onChange={e => updateProject({ name: e.target.value })} className="mt-1" placeholder="Nom" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Prénom</label><Input value={p.firstName || ''} onChange={e => updateProject({ firstName: e.target.value })} className="mt-1" placeholder="Prénom" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Téléphone</label><Input value={p.phone || ''} onChange={e => updateProject({ phone: e.target.value })} className="mt-1" placeholder="Téléphone" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Email</label><Input value={p.email || ''} onChange={e => updateProject({ email: e.target.value })} className="mt-1" placeholder="Email" /></div>

            <div className="col-span-12 flex gap-4 items-end">
              <div className="flex-grow-[3]"><label className="text-sm font-medium">Adresse du projet</label><Input value={p.address || ''} onChange={e => updateProject({ address: e.target.value })} className="mt-1" placeholder="Adresse du projet" /></div>
              <div className="flex-grow-[1]"><label className="text-sm font-medium">Code postal</label><Input value={p.zip || ''} onChange={e => updateProject({ zip: e.target.value })} className="mt-1" placeholder="Code postal" /></div>
              <div className="flex-grow-[2]"><label className="text-sm font-medium">Ville</label><Input value={p.city || ''} onChange={e => updateProject({ city: e.target.value })} className="mt-1" placeholder="Ville" /></div>
            </div>

            <div className="col-span-3"><label className="text-sm font-medium">Coordonnées GPS</label><Input value={p.gps || ''} onChange={e => updateProject({ gps: e.target.value })} className="mt-1" placeholder="Ex: 45.24, 4.36" /></div>
            <div className="col-span-3"><label className="text-sm font-medium">Type de projet</label><select value={p.type || 'Construction'} onChange={e => updateProject({ type: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 h-10 bg-background"><option>Construction</option><option>Rénovation</option></select></div>
            <div className="col-span-6"><label className="text-sm font-medium">Projet</label><Input value={p.projectSize || ''} onChange={e => updateProject({ projectSize: e.target.value })} className="mt-1" placeholder="Ex: 150m² ou 9kWc" /></div>

            <div className="col-span-12"><label className="text-sm font-medium">Commentaires</label><textarea value={p.comments || ''} onChange={e => updateProject({ comments: e.target.value })} className="mt-1 h-24 w-full rounded-lg border px-3 py-2" placeholder="Commentaires" /></div>
          </div>
        </section>

        <aside className="col-span-3">
          <ChatBox />
        </aside>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9 relative">
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden h-full">
            <MapEditor
              style={{ height: `${mapHeight}px` }}
              onAddressFound={handleAddressFound}
              onAddressSearched={handleAddressSearched}
              project={project}
              symbolToPlace={symbolToPlace}
              setSymbolToPlace={setSymbolToPlace}
              photos={photos}
              setPhotos={setPhotos}
            />
          </div>
          <Button onClick={goToProjectAddress} className="absolute top-3 right-3 z-[1000] bg-white text-gray-800 hover:bg-gray-100 shadow-md">
            <HomeIcon size={16} className="mr-2" />
            Adresse Projet
          </Button>
        </div>

        <aside className="col-span-3 flex flex-col gap-6" ref={rightColumnRef}>
          <SymbolsPanel onSymbolSelect={handleSymbolSelect} selectedSymbol={symbolToPlace} />
          <PredefinedBuildingsPanel onBuildingSelect={handleBuildingSelect} />
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Capturer la vue</h3>
              <Button onClick={captureNow} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Camera size={16} className="mr-2" />
                Prendre une capture
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {captures.map((c, i) => (
                <div key={i} className="group relative w-full overflow-hidden rounded-xl border bg-gray-100 aspect-video">
                  {c ? (
                    <>
                      <img src={c} alt={`capture-${i + 1}`} className="h-full w-full object-cover" />
                      <button onClick={() => deleteCapture(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <Button onClick={() => fileRef.current?.click()} className="bg-orange-500 hover:bg-orange-600 text-white">
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
                      <Button size="sm" onClick={() => placePhotoOnMap(photo, i)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-auto">
                        <MapIcon size={14} className="mr-1" />
                        Placer
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deletePhoto(photo.id)} className="text-xs px-2 py-1 h-auto">
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
    </div>
  );
}