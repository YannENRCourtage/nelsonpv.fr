import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, Car, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, FileCheck, Zap,
  Hash, Ruler, Info, RefreshCw, Mail, Phone, FileText,
  Upload, Image as ImageIcon, Check, Camera, Eye, Sparkles, Layers,
  Crop, HelpCircle, ArrowRight, Box, Sliders, Trash2, Battery, Sun, Plus,
  Compass
} from 'lucide-react';
import { getMissingFields, buildCerfaDataSummary, resolveDemandeurNames } from '@/services/SmartCerfaService';
import { cadastreService } from '@/services/CadastreService';
import { getOrGenerateProjectMaps, generateStaticMapImage } from '@/services/AutoMapService';
import { useConfiguratorStore, useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';
import { ControlPanel } from '../configurator/ui/ControlPanel.jsx';
import { BuildingSummaryCard } from '../configurator/ui/BuildingSummaryCard.jsx';
import BuildingScene from '../configurator/BuildingScene.jsx';
import ImageCropModal from './ImageCropModal';
import DimensionsModal from './DimensionsModal';
import LandscapeIntegrationModal from './LandscapeIntegrationModal';
import Building3DViewer from './Building3DViewer';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Dynamically scale the building rectangle to match ground truth at any zoom level
function PC2ScaledBuildingOverlay({ bLength, bWidth, rotation, label }) {
  const map = useMap();
  const [dims, setDims] = React.useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const metersPerPx = (40075016.686 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
      const pxPerMeter = 1 / metersPerPx;
      setDims({ w: bLength * pxPerMeter, h: bWidth * pxPerMeter });
    };
    update();
    map.on('zoom zoomend moveend', update);
    return () => map.off('zoom zoomend moveend', update);
  }, [map, bLength, bWidth]);

  if (dims.w < 2 || dims.h < 2) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
      <div
        className="border-2 border-red-500 border-dashed bg-red-500/20 rounded shadow-md flex items-center justify-center text-center p-1"
        style={{
          width: `${dims.w}px`,
          height: `${dims.h}px`,
          transform: `rotate(${rotation}deg)`,
          transition: 'width 0.15s, height 0.15s, transform 0.1s ease-out',
        }}
      >
        <span className="text-[10px] font-bold text-red-900 bg-white/80 px-1 py-0.5 rounded shadow-2xs whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}

// Scale bar that updates with zoom level
function PC2MapScaleBar() {
  const map = useMap();
  const [bar, setBar] = React.useState({ widthPx: 0, label: '' });

  useEffect(() => {
    const update = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const metersPerPx = (40075016.686 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
      const targets = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
      const maxBarPx = 100;
      const maxMeters = maxBarPx * metersPerPx;
      const best = targets.reduce((prev, cur) => (cur <= maxMeters ? cur : prev), 1);
      const pxWidth = best / metersPerPx;
      setBar({ widthPx: Math.round(pxWidth), label: best >= 1000 ? `${best / 1000} km` : `${best} m` });
    };
    update();
    map.on('zoom zoomend moveend', update);
    return () => map.off('zoom zoomend moveend', update);
  }, [map]);

  return (
    <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 border border-slate-300 shadow-sm">
      <div className="flex items-end gap-1">
        <div
          className="border-b-2 border-l-2 border-r-2 border-slate-700"
          style={{ width: `${bar.widthPx}px`, height: '6px' }}
        />
        <span className="text-[9px] font-bold text-slate-700 leading-none">{bar.label}</span>
      </div>
    </div>
  );
}

function MapSyncCenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({ setGps }) {
  useMapEvents({
    click(e) {
      if (setGps && e.latlng) {
        setGps(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

function DraggableLocationMarker({ lat, lng, setGps }) {
  const markerRef = React.useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setGps(newPos.lat, newPos.lng);
        }
      },
    }),
    [setGps],
  );

  return (
    <>
      <MapClickHandler setGps={setGps} />
      <Marker
        draggable={true}
        autoPan={true}
        eventHandlers={eventHandlers}
        position={[lat, lng]}
        ref={markerRef}
      />
    </>
  );
}

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
  const isDP = type === 'dp';
  const isPC = type === 'pc'; 
  const hasInitializedRef = React.useRef(false);
  const prevProjectIdRef = React.useRef(null);

  const getBuildingDisplayName = useCallback((b, idx) => {
    if (!b) return isDP ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`;
    let name = b.name || (isDP ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`);
    name = name
      .replace(/Bâtiment/gi, isDP ? 'Ombrière' : 'Bâtiment')
      .replace(/Ombrière/gi, isDP ? 'Ombrière' : 'Bâtiment')
      .replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '')
      .trim();
    return name || (isDP ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`);
  }, [isDP]);

  const [step, setStep] = useState(0); // 0=Déclarant, 1=Cartes DP1/PC1, 2=Configurateur 2D/3D, 3=Photos/3D, 4=Notice Descriptive, 5=Validation
  const [viewMode, setViewMode] = useState('3D'); // '3D' | '2D_FRONT'
  
  // Zustand Store du Configurateur Nelson
  const config = useConfiguratorValues();
  const configActions = useConfiguratorActions();

  // Multi-Bâtiments
  const [buildings, setBuildings] = useState([
    {
      id: 'bat-1',
      name: isDP ? 'Ombrière 1' : 'Bâtiment 1',
      length: 37.5,
      width: 16.4,
      eaveHeight: 4,
      roofPitch: 15,
      buildingType: 'asymetrique_1',
      leftSide: 'none',
      rightSide: 'none',
      bayCount: 5,
      baySpacing: 7.5,
      captures: {},
      photos: {}
    }
  ]);

  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);

  // Configuration additionnelle Toiture & Batterie
  const [additionalRoof, setAdditionalRoof] = useState({
    enabled: false,
    name: 'Toiture solaire existante',
    surface: 500,
    kwc: 100,
    roofType: 'Bac acier',
    pitch: 15,
    orientation: 'Sud'
  });

  const [batteryStorage, setBatteryStorage] = useState({
    enabled: false,
    name: 'Système de stockage par batterie',
    model: 'CESC Mercury 261',
    quantity: 1,
    capacityKwh: 261,
    powerKw: 125,
    footprint: '3.50m × 2.20m',
    fireSafety: 'Bâche à eau 120m³, rétention intégrée, distance de sécurité 5m'
  });

  const [showRoofModal, setShowRoofModal] = useState(false);
  const [showBatteryModal, setShowBatteryModal] = useState(false);
  const isSwitchingBuildingRef = React.useRef(false);

  const [editedProject, setEditedProject] = useState(project || {});
  const [captures, setCaptures] = useState(project?.urbanisme_captures || {});
  const [photos, setPhotos] = useState(project?.pc_photos || {});
  const [fetchingCadastre, setFetchingCadastre] = useState(false);
  const [generatingMaps, setGeneratingMaps] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [isNoticeUserModified, setIsNoticeUserModified] = useState(false);
  const [selectedPages, setSelectedPages] = useState({
    cover: true,
    situation: true,
    masse: true,
    section_notice: true,
    section: true,
    facades: true,
    insertion: true,
    env: true,
    cerfa: true,
  });

  // Helper pour générer automatiquement la notice structurée en 5 points
  const buildAutoNoticeText = useCallback(() => {
    const projectCity = editedProject?.city || editedProject?.cadastre_commune || editedProject?.commune || editedProject?.ville || project?.city || project?.cadastre_commune || project?.commune || project?.ville || 'SAINT AVIT SAINT NAZAIRE';
    const projectZip = editedProject?.zip || editedProject?.zipCode || editedProject?.postalCode || editedProject?.code_postal || project?.zip || project?.zipCode || project?.postalCode || project?.code_postal || '33220';
    const projectAddress = editedProject?.address || editedProject?.clientAddress || editedProject?.siteAddress || editedProject?.street || editedProject?.adresse || project?.address || project?.clientAddress || project?.siteAddress || project?.street || project?.adresse || '2069 Route de la Catine';
    const rawSection = editedProject?.cadastre_section || editedProject?.cadastreSection || project?.cadastre_section || '';
    const rawNumero = editedProject?.cadastre_numero || editedProject?.cadastreNumero || editedProject?.cadastre_parcel || editedProject?.parcelle || project?.cadastre_numero || '000 B 633';
    const projectCadastre = `${rawSection ? `${rawSection} ` : ''}${rawNumero}`.trim();
    const projectSurface = editedProject?.surface_terrain ? `${editedProject.surface_terrain} m²` : (editedProject?.cadastre_surface ? `${editedProject.cadastre_surface} m²` : (project?.surface_terrain ? `${project.surface_terrain} m²` : '18 384 m²'));
    const projectAltitude = editedProject?.altitude || project?.altitude || '140.62 m';
    
    // Bâtiment / Ombrière 1
    const b1 = buildings[0] || {};
    const longueur1 = Number(b1.length || config.length || 37.5);
    const largeur1 = Number(b1.width || config.width || 16.4);
    const totalSurface1 = (largeur1 * longueur1).toFixed(2);
    const b1Type = b1.buildingType || config.buildingType || 'asymetrique_1';
    const isB1Ombriere = isDP || b1Type.includes('ombriere');
    const isB1Asym = b1Type.startsWith('asym');
    const isB1Sym = b1Type.startsWith('sym');
    const b1RoofLabel = isB1Ombriere ? 'monopente (10°)' : isB1Asym ? 'double pente asymétrique (15°)' : isB1Sym ? 'double pente symétrique (10°)' : 'photovoltaïque';
    const b1Eave = Number(b1.eaveHeight || config.eaveHeight || (b1Type.startsWith('asym') ? 4.0 : 5.5));
    const b1Pitch = Number(b1.roofPitch || config.roofPitch || (b1Type.startsWith('asym') ? 15 : 10));
    const b1Bays = Number(b1.bayCount || config.bayCount || 5);
    const b1Spacing = Number(b1.baySpacing || config.baySpacing || 7.5);
    const b1Auvent = Boolean(b1.rightSide === 'auvent' || b1.leftSide === 'auvent' || config.rightSide === 'auvent' || config.leftSide === 'auvent');
    
    const rawKwc = editedProject?.kwc || editedProject?.puissance || editedProject?.projectSize || project?.kwc || project?.puissance || project?.projectSize;
    const isValidKwc = rawKwc !== undefined && rawKwc !== null && rawKwc !== '' && rawKwc !== '0' && !isNaN(Number(rawKwc)) && Number(rawKwc) > 0;
    const displayKwc = isValidKwc ? String(Number(rawKwc)) : '';

    // Structures secondaires
    const secondaryBuildings = buildings.slice(1);
    const hasMultiBuildings = secondaryBuildings.length > 0;

    let batimentDesc = isDP
      ? `Le projet a pour objet l'implantation d'une ombrière photovoltaïque${hasMultiBuildings ? ' (Ombrière 1)' : ''} de dimensions ${longueur1}m × ${largeur1.toFixed(2)}m (surface couverte : ${totalSurface1} m²) à structure métallique autoportante en Y/V (RAL 7016) avec toiture monopente inclinée à ${b1Pitch}°, permettant d'abriter les véhicules tout en produisant de l'électricité solaire${displayKwc ? `, développant une puissance installée de ${displayKwc} kWc` : ''}.`
      : (isB1Ombriere
        ? `Le projet a pour objet l'implantation d'une ombrière photovoltaïque${hasMultiBuildings ? ' (Bâtiment 1)' : ''} de dimensions ${longueur1}m × ${largeur1.toFixed(2)}m (surface couverte : ${totalSurface1} m²) à structure métallique autoportante en Y/V (RAL 7016) avec toiture monopente inclinée à 10°, permettant d'abriter les véhicules tout en produisant de l'électricité solaire.`
        : `Le projet a pour objet la construction d'un bâtiment agricole à charpente métallique${hasMultiBuildings ? ' principal (Bâtiment 1)' : ''} de forme rectangulaire (longueur : ${longueur1}m, largeur : ${largeur1.toFixed(2)}m${b1Auvent ? ' + Auvent 4.00m' : ''}, hauteur sablière : ${b1Eave.toFixed(2)}m) en structure métallique (RAL 7016 / 7005), composé de ${b1Bays} travées de ${b1Spacing}m d'entraxe. La toiture sera constituée d'une couverture ${b1RoofLabel} avec bac acier anti-condensation (RAL 7016) et panneaux solaires photovoltaïques intégrés (RAL 9005)${displayKwc ? `, développant une puissance installée de ${displayKwc} kWc` : ''}.`);

    if (hasMultiBuildings) {
      secondaryBuildings.forEach((b, idx) => {
        const bW = Number(b.width || 16.4);
        const bL = Number(b.length || 37.5);
        const bSurface = (bW * bL).toFixed(2);
        const bType = (b.buildingType || 'asymetrique_1').toLowerCase();
        const isOmb = isDP || bType.includes('ombriere');
        const bAuvent = b.rightSide === 'auvent' || b.leftSide === 'auvent';
        const bEave = Number(b.eaveHeight || (isDP ? 3.0 : 4.0));
        const bPitch = Number(b.roofPitch || 10);
        const displayName = getBuildingDisplayName(b, idx + 1);

        if (isOmb) {
          batimentDesc += `\nIl comprend également l'implantation d'une ombrière photovoltaïque (${displayName}) de dimensions ${bL}m × ${bW.toFixed(2)}m (surface couverte : ${bSurface} m²) à structure métallique en Y/V avec toiture monopente inclinée à ${bPitch}°.`;
        } else {
          batimentDesc += `\nIl comprend également la construction d'un second bâtiment (${displayName}) de dimensions ${bL}m × ${bW.toFixed(2)}m${bAuvent ? ' (+ Auvent)' : ''} d'une emprise au sol de ${bSurface} m² (hauteur sablière : ${bEave.toFixed(2)}m, pente : ${bPitch}°) en structure métallique similaire.`;
        }
      });
    }

    if (additionalRoof.enabled) {
      batimentDesc += `\nLe projet intègre par ailleurs l'équipement photovoltaïque d'une toiture existante (${additionalRoof.name}) d'une surface de ${additionalRoof.surface} m² développant ${additionalRoof.kwc} kWc supplémentaires en couverture ${additionalRoof.roofType}.`;
    }

    if (batteryStorage.enabled) {
      batimentDesc += `\nLe site sera également équipé d'un système de stockage d'énergie par batterie stationnaire (${batteryStorage.quantity} unité(s) ${batteryStorage.model}) d'une capacité de ${batteryStorage.capacityKwh} kWh (${batteryStorage.powerKw} kW) implantée sur une dalle béton dédiée (${batteryStorage.footprint}).`;
    }

    let totalGlobalSurface = parseFloat(totalSurface1);
    secondaryBuildings.forEach(b => {
      totalGlobalSurface += (Number(b.width || 20) * Number(b.length || 25));
    });

    const totalBuildingCount = buildings.length;
    let objetDemande = isDP
      ? `La demande de déclaration préalable porte sur la réalisation d'un projet comprenant ${totalBuildingCount} ${totalBuildingCount > 1 ? 'ombrières photovoltaïques' : 'ombrière photovoltaïque'} (${totalGlobalSurface.toFixed(2)} m²)${additionalRoof.enabled ? ` et l'équipement d'une toiture existante de ${additionalRoof.surface} m²` : ''}${batteryStorage.enabled ? ` ainsi qu'un système de stockage batterie stationnaire de ${batteryStorage.capacityKwh} kWh` : ''}.`
      : `La demande de permis de construire porte sur la réalisation d'un projet comprenant ${totalBuildingCount} structure${totalBuildingCount > 1 ? 's' : ''} (${totalGlobalSurface.toFixed(2)} m²)${additionalRoof.enabled ? ` et l'équipement d'une toiture existante de ${additionalRoof.surface} m²` : ''}${batteryStorage.enabled ? ` ainsi qu'un système de stockage batterie stationnaire de ${batteryStorage.capacityKwh} kWh` : ''}.`;

    const p3Details = isDP
      ? `Cette ombrière sera ouverte et non close. Les façades Est, Ouest, Nord et Sud seront ouvertes.\nUn terrassement sera réalisé pour la mise en oeuvre d'une plateforme en grave compactée.\nDes tranchées drainantes seront réalisées tout autour de l'ombrière projet afin d'évacuer les eaux pluviales par infiltration dans le sol.`
      : `Ce bâtiment sera ouvert et non clos. Les façades Est, Ouest, Nord et Sud seront ouvertes.\nUn terrassement sera réalisé pour la mise en oeuvre d'une plateforme en grave compactée.\nDes tranchées drainantes seront réalisées tout autour du bâtiment projet afin d'évacuer les eaux pluviales par infiltration dans le sol.`;

    const p4Details = isDP
      ? `L'ombrière ne sera pas raccordée aux réseaux d'eau, ni d'assainissement, ni d'électricité. Il n'y a donc pas de besoins en alimentation à ces niveaux là.`
      : `Le bâtiment ne sera pas raccordé aux réseaux d'eau, ni d'assainissement, ni d'électricité. Il n'y a donc pas de besoins en alimentation à ces niveaux là.`;

    const p5Details = isDP
      ? `Une bâche à eau de 120m³ sera installée à proximité immédiate de la future ombrière. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées (Cf DP 02 - Plan de masse).`
      : `Une bâche à eau de 120m³ sera installée à proximité immédiate au Nord du futur bâtiment. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées (Cf PC 02 - Plan de masse).`;

    return `NOTICE D'INSERTION & DESCRIPTIVE DU PROJET

1- OBJET DE LA DEMANDE
${objetDemande}

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.

3- LE PROJET
${batimentDesc}
${p3Details}

4- RACCORDEMENT AUX RESEAUX
${p4Details}
Seule l'électricité produite par la centrale photovoltaïque${batteryStorage.enabled ? ' et le système de stockage batterie' : ''} est renvoyée dans le réseau ENEDIS via un point de livraison situé sur la parcelle au Sud de la parcelle (PDL).
L'emplacement du point de livraison indiqué dans les pièces graphiques de l'autorisation d'urbanisme n'apparaît qu'à titre indicatif.
Le positionnement du point de livraison et d'un transformateur (le cas échéant) demeure à l'appréciation finale du gestionnaire de réseau en fonction du site et des équipements déjà existants.

5- SECURITE INCENDIE
${p5Details}${batteryStorage.enabled ? `\nLe système de stockage batterie est équipé de ses dispositifs de sécurité autonomes conformes aux prescriptions SDIS (détection thermique, coupure automatique d'urgence, système d'extinction dédié et bac de rétention).` : ''}`;
  }, [editedProject, project, config, buildings, additionalRoof, batteryStorage, isDP, getBuildingDisplayName]);

  // Mise à jour explicite du bâtiment actif (Single Source of Truth par onglet)
  const updateActiveBuilding = useCallback((updates) => {
    setBuildings(prev => {
      if (!prev[activeBuildingIndex]) return prev;
      const next = [...prev];
      const cur = next[activeBuildingIndex];
      const merged = { ...cur, ...updates };
      if (updates.bayCount !== undefined || updates.baySpacing !== undefined) {
        const bc = updates.bayCount !== undefined ? updates.bayCount : (cur.bayCount || 5);
        const bs = updates.baySpacing !== undefined ? updates.baySpacing : (cur.baySpacing || 7.5);
        merged.length = bc * bs;
      }
      next[activeBuildingIndex] = merged;
      useConfiguratorStore.getState().loadBuildingConfig(merged);
      return next;
    });
  }, [activeBuildingIndex]);

  // Gestion des bâtiments / ombrières multiples avec isolation stricte des onglets
  const handleAddBuilding = () => {
    const newIdx = buildings.length + 1;
    const projLat = Number(editedProject?.lat || project?.lat || 43.5612);
    const projLng = Number(editedProject?.lng || project?.lng || 0.9168);
    const newBuilding = {
      id: `bat-${newIdx}`,
      name: isDP ? `Ombrière ${newIdx}` : `Bâtiment ${newIdx}`,
      length: 30,
      width: isDP ? 15.8 : 16.4,
      eaveHeight: isDP ? 5.08 : 4.0,
      roofPitch: isDP ? 10 : 15,
      buildingType: isDP ? 'ombriere_pl' : 'asymetrique_1',
      leftSide: 'none',
      rightSide: 'none',
      bayCount: 4,
      baySpacing: 7.5,
      leftWidth: 9.3,
      rightWidth: 9.3,
      hasSolar: true,
      lat: projLat,
      lng: projLng,
      gps: `${projLat},${projLng}`,
      rotation: 0,
      captures: {},
      photos: {}
    };
    const updated = [...buildings, newBuilding];
    const newIdxPos = updated.length - 1;

    isSwitchingBuildingRef.current = true;
    useConfiguratorStore.getState().loadBuildingConfig(newBuilding);
    setBuildings(updated);
    setActiveBuildingIndex(newIdxPos);
    setTimeout(() => {
      isSwitchingBuildingRef.current = false;
    }, 150);
  };

  const handleSelectBuilding = (index) => {
    if (index === activeBuildingIndex || !buildings[index]) return;

    isSwitchingBuildingRef.current = true;
    const target = buildings[index];
    useConfiguratorStore.getState().loadBuildingConfig(target);
    setActiveBuildingIndex(index);
    setTimeout(() => {
      isSwitchingBuildingRef.current = false;
    }, 150);
  };

  const handleRemoveBuilding = (index, e) => {
    e.stopPropagation();
    if (buildings.length <= 1) return;
    const updated = buildings.filter((_, i) => i !== index);
    isSwitchingBuildingRef.current = true;
    setBuildings(updated);
    setActiveBuildingIndex(0);
    const first = updated[0];
    if (first) {
      useConfiguratorStore.getState().loadBuildingConfig(first);
    }
    setTimeout(() => {
      isSwitchingBuildingRef.current = false;
    }, 150);
  };

  // Modales
  const [cropModal, setCropModal] = useState({ open: false, src: null, category: null, key: null, title: '' });
  const [landscapeModalOpen, setLandscapeModalOpen] = useState(false);

  const dossierInfo = DOSSIER_INFO[type] || DOSSIER_INFO.pc;

  // Synchronisation du projet initial à l'ouverture (exécutée uniquement à l'ouverture ou changement de projet)
  useEffect(() => {
    if (!isOpen || !project) {
      if (!isOpen) {
        hasInitializedRef.current = false;
      }
      return;
    }

    if (hasInitializedRef.current && prevProjectIdRef.current === project.id) {
      return;
    }
    hasInitializedRef.current = true;
    prevProjectIdRef.current = project.id;

    const names = resolveDemandeurNames(project);
    const cleanDemandeur = names.lastName || project.name || '';
    const projEmail = project.email || project.clientEmail || project.contactEmail || project.client_email || 'isabelle.dupond@gmail.com';
    const projAddress = project.address || project.clientAddress || project.projectAddress || project.siteAddress || project.street || project.adresse || '';
    const projZip = project.zip || project.postalCode || project.code_postal || project.clientZip || '';
    const projCity = project.city || project.commune || project.clientCity || project.cadastre_commune || '';

    const isOmbriere = (project.type || '').toLowerCase().includes('ombriere') || (project.buildingType || '').toLowerCase().includes('ombriere');
    const pGps = project.gps || (project.lat && project.lng ? `${project.lat},${project.lng}` : '43.5612,0.9168');
    const [defLat, defLng] = pGps.split(',').map(Number);

    // Restaurer fidèlement les bâtiments existants ou initialiser le Bâtiment 1 avec les paramètres précis du projet
    let initialBuildings = [];
    if (project.buildings && Array.isArray(project.buildings) && project.buildings.length > 0) {
      initialBuildings = project.buildings.map((b, idx) => {
        let cleanName = b.name || (isDP ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`);
        cleanName = cleanName
          .replace(/Bâtiment/gi, isDP ? 'Ombrière' : 'Bâtiment')
          .replace(/Ombrière/gi, isDP ? 'Ombrière' : 'Bâtiment')
          .replace(/\s*\((Principale|Secondaire|Principal)\)/gi, '')
          .trim();
        if (!cleanName) cleanName = isDP ? `Ombrière ${idx + 1}` : `Bâtiment ${idx + 1}`;

        const bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null) || defLat);
        const bLng = Number(b.lng || (b.gps ? b.gps.split(',')[1] : null) || defLng);

        const bType = b.buildingType || 'asymetrique_1';
        const bIsAsym = bType.startsWith('asymetrique');
        const bIsMono = bType === 'monopente';
        const bIsPL = bType === 'ombriere_pl';
        const bIsVL = bType.startsWith('ombriere');
        const defEave = (bIsAsym || bIsMono) ? 4.0 : (bIsPL ? 5.08 : (bIsVL ? 3.0 : 5.5));
        const defPitch = (bIsAsym || bIsMono) ? 15 : 10;

        return {
          ...b,
          id: b.id || `bat-${idx + 1}`,
          name: cleanName,
          lat: bLat,
          lng: bLng,
          gps: `${bLat},${bLng}`,
          rotation: Number(b.rotation || 0),
          length: Number(b.length || (b.bayCount || 5) * (b.baySpacing || 7.5) || 37.5),
          width: Number(b.width || (bIsAsym ? 20.0 : 16.4)),
          eaveHeight: Number(b.eaveHeight !== undefined && !isNaN(Number(b.eaveHeight)) ? b.eaveHeight : defEave),
          roofPitch: Number(b.roofPitch !== undefined && !isNaN(Number(b.roofPitch)) ? b.roofPitch : defPitch),
          buildingType: bType,
          leftSide: b.leftSide || 'none',
          rightSide: b.rightSide || 'none',
          leftWidth: b.leftWidth !== undefined ? Number(b.leftWidth) : (b.leftSide === 'appentis' ? 9.3 : (b.leftSide === 'auvent' ? 4.0 : 0)),
          rightWidth: b.rightWidth !== undefined ? Number(b.rightWidth) : (b.rightSide === 'appentis' ? 9.3 : (b.rightSide === 'auvent' ? 4.0 : 0)),
          bayCount: Number(b.bayCount || 5),
          baySpacing: Number(b.baySpacing || 7.5),
          captures: b.captures || {},
          photos: b.photos || {}
        };
      });
    } else {
      const pLen = Number(project.longueur || 37.5);
      const pW = Number(project.largeur || 16.4);
      const pBc = Number(project.bayCount) || Math.max(1, Math.round(pLen / 7.5)) || 5;
      const pBs = Number(project.baySpacing) || 7.5;
      const pType = project.buildingType || 'asymetrique_1';
      const pEave = Number(project.hauteur_egout) || (pType === 'ombriere_pl' ? 5.08 : (pType === 'ombriere_vl_double' ? 3.0 : (pType.startsWith('asymetrique') || pType === 'monopente' ? 4.0 : 5.5)));
      const pPitch = Number(project.pente) || ((pType.startsWith('asymetrique') || pType === 'monopente') ? 15 : 10);
      const pRightSide = project.rightSide || (project.appentis ? 'appentis' : project.auvent ? 'auvent' : 'none');
      const pLeftSide = project.leftSide || 'none';
      const pRightWidth = Number(project.rightWidth) || (pRightSide === 'appentis' ? 9.3 : 4.0);
      const pLeftWidth = Number(project.leftWidth) || (pLeftSide === 'appentis' ? 9.3 : 4.0);

      initialBuildings = [
        {
          id: 'bat-1',
          name: isDP ? 'Ombrière 1' : 'Bâtiment 1',
          length: pBc * pBs,
          width: pW,
          eaveHeight: pEave,
          roofPitch: pPitch,
          buildingType: pType,
          leftSide: pLeftSide,
          rightSide: pRightSide,
          leftWidth: pLeftWidth,
          rightWidth: pRightWidth,
          bayCount: pBc,
          baySpacing: pBs,
          hasSolar: true,
          lat: defLat,
          lng: defLng,
          gps: `${defLat},${defLng}`,
          captures: project.urbanisme_captures || {},
          photos: project.pc_photos || {},
          rotation: Number(project.rotation || 0)
        }
      ];
    }

    setBuildings(initialBuildings);
    setActiveBuildingIndex(0);

    // Charger immédiatement le premier bâtiment dans le store 3D
    const b1 = initialBuildings[0];
    if (b1) {
      useConfiguratorStore.getState().loadBuildingConfig(b1);
    }

      const initialNotice = project?.noticeText || buildAutoNoticeText();
      setNoticeText(initialNotice);
      const clientKwc = project?.kwc || project?.puissance || project?.projectSize || '';
      const shortObjet = isDP
        ? "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire"
        : (isPC
          ? "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"
          : "Certificat d'urbanisme opérationnel pour centrale photovoltaïque");

      const initProj = {
        ...project,
        type: isOmbriere ? 'ombriere' : (project.type || 'batiment_solaire'),
        buildingType: b1?.buildingType || project.buildingType || 'asymetrique_1',
        lastName: cleanDemandeur,
        firstName: names.firstName || '',
        demandeur: cleanDemandeur,
        email: projEmail,
        email2: project.email2 || '',
        cerfaEmailChoice: project.cerfaEmailChoice || 'email1',
        address: projAddress,
        zip: projZip,
        city: projCity,
        phone: project.phone || project.clientPhone || '06 00 00 00 00',
        birthDate: project.birthDate || '',
        birthCity: project.birthCity || '',
        birthDept: project.birthDept || (projZip ? projZip.substring(0, 2) : '32'),
        kwc: clientKwc,
        projectSize: clientKwc,
        puissance: clientKwc,
        objet_travaux: project.objet_travaux || project.objetTravaux || shortObjet,
        description: project.objet_travaux || project.objetTravaux || shortObjet,
        noticeText: initialNotice,
        longueur: String(b1?.length || 37.5),
        largeur: String(b1?.width || 20.0),
        hauteur_egout: String(b1?.eaveHeight || 4.0),
        pente: String(b1?.roofPitch || 10),
        leftSide: b1?.leftSide || 'none',
        rightSide: b1?.rightSide || 'none',
        leftWidth: b1?.leftWidth,
        rightWidth: b1?.rightWidth,
        bayCount: b1?.bayCount,
        baySpacing: b1?.baySpacing,
        pente_terrain: project.pente_terrain || '3',
        cotation_bati: project.cotation_bati || '12.50',
        cotation_voie: project.cotation_voie || '8.00',
        buildings: initialBuildings,
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
  }, [project, isOpen]);

  // Synchronisation continue des valeurs du configurateur vers le projet (sans écraser le kWc du client)
  useEffect(() => {
    if (isSwitchingBuildingRef.current) return;
    if (!config || !buildings[activeBuildingIndex]) return;

    const isOmbriere = (config.buildingType || '').startsWith('ombriere');
    const category = isOmbriere ? 'ombriere' : 'batiment_solaire';
    const kwcEstimate = config.solarStats?.power ? Math.round(config.solarStats.power) : Math.round((config.width * config.length * 0.22) / 5) * 5;

    setBuildings(prev => {
      const cur = prev[activeBuildingIndex];
      if (!cur) return prev;

      const hasChanged = 
        cur.buildingType !== config.buildingType ||
        cur.width !== config.width ||
        cur.length !== config.length ||
        cur.eaveHeight !== config.eaveHeight ||
        cur.roofPitch !== config.roofPitch ||
        cur.bayCount !== config.bayCount ||
        cur.baySpacing !== config.baySpacing ||
        cur.leftSide !== (config.leftSide || 'none') ||
        cur.rightSide !== (config.rightSide || 'none') ||
        cur.leftWidth !== config.leftWidth ||
        cur.rightWidth !== config.rightWidth;

      if (!hasChanged) return prev;

      const next = [...prev];
      next[activeBuildingIndex] = {
        ...cur,
        buildingType: config.buildingType,
        width: config.width,
        length: config.length,
        eaveHeight: config.eaveHeight,
        roofPitch: config.roofPitch,
        bayCount: config.bayCount,
        baySpacing: config.baySpacing,
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
        leftWidth: config.leftWidth,
        rightWidth: config.rightWidth,
        hasSolar: config.hasSolar,
        solarStats: config.solarStats,
      };
      return next;
    });

    setEditedProject(prev => {
      const clientKwc = project?.kwc || project?.puissance || project?.projectSize || prev?.kwc || kwcEstimate;
      return {
        ...prev,
        type: category,
        installationType: category,
        buildingType: config.buildingType,
        largeur: String(config.width.toFixed(2)),
        longueur: String(config.length.toFixed(2)),
        hauteur_egout: String(config.eaveHeight.toFixed(2)),
        pente: String(config.roofPitch),
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
        leftWidth: config.leftWidth,
        rightWidth: config.rightWidth,
        bayCount: config.bayCount,
        baySpacing: config.baySpacing,
        kwc: clientKwc,
        projectSize: clientKwc,
        puissance: clientKwc,
      };
    });
  }, [config.width, config.length, config.eaveHeight, config.roofPitch, config.buildingType, config.leftSide, config.rightSide, config.solarStats, config.bayCount, config.baySpacing, activeBuildingIndex]);

  // Mise à jour automatique de la notice selon les paramètres actuels et le nombre réel de bâtiments
  useEffect(() => {
    if (!isNoticeUserModified || !noticeText || noticeText.includes("SAINT ARAILLES")) {
      const auto = buildAutoNoticeText();
      setNoticeText(auto);
      setEditedProject(prev => ({ ...prev, noticeText: auto }));
    }
  }, [step, buildings, additionalRoof, batteryStorage, buildAutoNoticeText, isNoticeUserModified]);

  // Mise à jour de la position GPS individuelle d'un bâtiment (PC2 / DP2)
  const handleBuildingGpsUpdate = (bIdx, newLat, newLng) => {
    setBuildings(prev => {
      const next = [...prev];
      if (next[bIdx]) {
        next[bIdx] = {
          ...next[bIdx],
          lat: newLat,
          lng: newLng,
          gps: `${newLat},${newLng}`
        };
      }
      return next;
    });
    setEditedProject(prev => {
      const nextBuildings = [...(prev.buildings || buildings)];
      if (nextBuildings[bIdx]) {
        nextBuildings[bIdx] = {
          ...nextBuildings[bIdx],
          lat: newLat,
          lng: newLng,
          gps: `${newLat},${newLng}`
        };
      }
      return {
        ...prev,
        buildings: nextBuildings,
        ...(bIdx === 0 ? { lat: newLat, lng: newLng, gps: `${newLat},${newLng}` } : {})
      };
    });
  };

  // Sauvegarde simulation 3D après projet (DP6 / PC6)
  const handleSaveSimulation = (simulatedDataUrl) => {
    setPhotos(prev => ({ ...prev, apres: simulatedDataUrl }));
    setEditedProject(prev => ({
      ...prev,
      pc_photos: { ...(prev.pc_photos || {}), apres: simulatedDataUrl }
    }));
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].photos = { 
          ...(updated[activeBuildingIndex].photos || {}), 
          apres: simulatedDataUrl 
        };
      }
      return updated;
    });
  };

  // Sauvegarde des captures de façades pour DP4 / PC5
  const handleCaptureSnapshotPC5 = (dataUrl, slotKey = 'facade_sud') => {
    setCaptures(prev => ({ ...prev, [slotKey]: dataUrl, facades_projet: dataUrl }));
    setEditedProject(prev => ({
      ...prev,
      urbanisme_captures: { ...(prev.urbanisme_captures || {}), [slotKey]: dataUrl, facades_projet: dataUrl }
    }));
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].captures = {
          ...(updated[activeBuildingIndex].captures || {}),
          [slotKey]: dataUrl,
          facades_projet: dataUrl
        };
      }
      return updated;
    });
  };

  const handleCaptureAll5ViewsPC5 = (fiveViewsObj) => {
    if (!fiveViewsObj) return;
    setCaptures(prev => ({ ...prev, ...fiveViewsObj, facades_projet: fiveViewsObj.facade_sud || fiveViewsObj.vue_couverture }));
    setEditedProject(prev => ({
      ...prev,
      urbanisme_captures: { 
        ...(prev.urbanisme_captures || {}), 
        ...fiveViewsObj, 
        facades_projet: fiveViewsObj.facade_sud || fiveViewsObj.vue_couverture 
      }
    }));
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].captures = {
          ...(updated[activeBuildingIndex].captures || {}),
          ...fiveViewsObj,
          facades_projet: fiveViewsObj.facade_sud || fiveViewsObj.vue_couverture || updated[activeBuildingIndex].captures?.facades_projet
        };
      }
      return updated;
    });
  };

  // Chargement direct de photo (sans pop-up automatique de recadrage)
  const handleDirectPhotoUpload = (category, key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (category === 'photos') {
        setPhotos(prev => ({ ...prev, [key]: dataUrl }));
        setEditedProject(prev => ({
          ...prev,
          pc_photos: { ...(prev.pc_photos || {}), [key]: dataUrl }
        }));
        setBuildings(prev => {
          const updated = [...prev];
          if (updated[activeBuildingIndex]) {
            updated[activeBuildingIndex].photos = {
              ...(updated[activeBuildingIndex].photos || {}),
              [key]: dataUrl
            };
          }
          return updated;
        });
      } else if (category === 'captures') {
        if (key === 'situation_ign' || key === 'satellite' || key === 'masse_projet') {
          setCaptures(prev => ({ ...prev, [key]: dataUrl }));
          setEditedProject(prev => ({
            ...prev,
            urbanisme_captures: { ...(prev.urbanisme_captures || {}), [key]: dataUrl }
          }));
        } else {
          setBuildings(prev => {
            const updated = [...prev];
            if (updated[activeBuildingIndex]) {
              updated[activeBuildingIndex].captures = {
                ...(updated[activeBuildingIndex].captures || {}),
                [key]: dataUrl
              };
            }
            return updated;
          });
        }
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleOpenCrop = (src, category, key, title) => {
    setCropModal({ open: true, src, category, key, title });
  };

  const handleCropComplete = (croppedDataUrl) => {
    const { category, key } = cropModal;
    if (category === 'photos') {
      const updated = { ...photos, [key]: croppedDataUrl };
      setPhotos(updated);
      setEditedProject(prev => ({ ...prev, pc_photos: updated }));
      setBuildings(prev => {
        const updated = [...prev];
        if (updated[activeBuildingIndex]) {
          updated[activeBuildingIndex].photos = { ...updated[activeBuildingIndex].photos, [key]: croppedDataUrl };
        }
        return updated;
      });
    }
    if (category === 'captures') {
      if (key === 'situation_ign' || key === 'satellite' || key === 'masse_projet') {
        const updated = { ...captures, [key]: croppedDataUrl };
        setCaptures(updated);
        setEditedProject(prev => ({ ...prev, urbanisme_captures: updated }));
      } else {
        setBuildings(prev => {
          const updated = [...prev];
          if (updated[activeBuildingIndex]) {
            updated[activeBuildingIndex].captures = { ...updated[activeBuildingIndex].captures, [key]: croppedDataUrl };
          }
          return updated;
        });
      }
    }
  };

  const handleFieldChange = (field, value) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
    setEditedProject(prev => ({ ...prev, [field]: value }));
  };

  const handleGpsUpdate = useCallback((lat, lng) => {
    setEditedProject(prev => ({ ...prev, lat, lng, gps: `${lat},${lng}` }));
    setBuildings(prev => {
      if (prev.length > 0) {
        const next = [...prev];
        next[0] = { ...next[0], lat, lng, gps: `${lat},${lng}` };
        return next;
      }
      return prev;
    });
    generateStaticMapImage(lat, lng, 'map', 16).then(ign => {
      if (ign) {
        setCaptures(c => ({ ...c, ign }));
        setEditedProject(p => ({ ...p, urbanisme_captures: { ...(p.urbanisme_captures || {}), ign } }));
      }
    });
    generateStaticMapImage(lat, lng, 'satellite', 17).then(satellite => {
      if (satellite) {
        setCaptures(c => ({ ...c, satellite }));
        setEditedProject(p => ({ ...p, urbanisme_captures: { ...(p.urbanisme_captures || {}), satellite } }));
      }
    });
    generateStaticMapImage(lat, lng, 'map', 19, buildings).then(masse => {
      if (masse) {
        setCaptures(c => ({ ...c, masse_projet: masse }));
        setEditedProject(p => ({ ...p, urbanisme_captures: { ...(p.urbanisme_captures || {}), masse_projet: masse } }));
      }
    });
  }, [buildings]);

  const handleGenerate = async () => {
    if (!onGenerate) return;
    setIsGenerating(true);
    
    // Objet synthétique pour Page 1
    const defaultObjet = isDP
      ? "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire"
      : (isPC
        ? "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"
        : "Certificat d'urbanisme opérationnel pour centrale photovoltaïque");
    const shortObjet = editedProject?.objet_travaux || defaultObjet;

    const effectiveNotice = noticeText || editedProject.noticeText || project?.noticeText || buildAutoNoticeText();

    // Mettre à jour la liste des bâtiments SANS écraser leurs photos et captures individuelles
    const updatedBuildings = buildings.map((b, idx) => {
      if (idx === activeBuildingIndex) {
        return {
          ...b,
          length: config.length,
          width: config.width,
          eaveHeight: config.eaveHeight,
          roofPitch: config.roofPitch,
          buildingType: config.buildingType,
          leftSide: config.leftSide,
          rightSide: config.rightSide,
          leftWidth: config.leftWidth,
          rightWidth: config.rightWidth,
          bayCount: config.bayCount,
          baySpacing: config.baySpacing,
          captures: { ...(b.captures || {}) },
          photos: { ...(b.photos || {}) },
        };
      }
      return b;
    });

    const isMultiOrOmbriere = updatedBuildings.length > 1 || updatedBuildings.some(b => (b.buildingType || '').includes('ombriere'));
    const finalTypeLabel = isDP
      ? (updatedBuildings.length > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque')
      : (isMultiOrOmbriere ? 'Bâtiment et Ombrière' : (editedProject.type || 'batiment_solaire'));

    // Régénérer les cartes DP1/PC1 et DP2/PC2 avec le dernier GPS et les structures orientées
    const gps = editedProject?.gps || `${editedProject?.lat || 43.5612},${editedProject?.lng || 0.9168}`;
    const [lat, lng] = gps.split(',').map(Number);
    const ignMap = await generateStaticMapImage(lat, lng, 'map', 16);
    const satMap = await generateStaticMapImage(lat, lng, 'satellite', 17);
    
    // Génération de la capture de plan de masse individuelle par bâtiment
    const buildingsWithMasse = await Promise.all(updatedBuildings.map(async (b) => {
      const bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null) || lat);
      const bLng = Number(b.lng || (b.gps ? b.gps.split(',')[1] : null) || lng);
      const bMasse = await generateStaticMapImage(bLat, bLng, 'map', 19, [b]);
      return {
        ...b,
        lat: bLat,
        lng: bLng,
        gps: `${bLat},${bLng}`,
        masse_capture: bMasse || null
      };
    }));

    const masseMap = buildingsWithMasse[0]?.masse_capture || await generateStaticMapImage(lat, lng, 'map', 19, updatedBuildings);

    const allBuildingsCaptures = updatedBuildings.reduce((acc, b) => ({
      ...acc,
      ...(b.captures || {}),
      ...(b.urbanisme_captures || {})
    }), {});

    const allBuildingsPhotos = updatedBuildings.reduce((acc, b) => ({
      ...acc,
      ...(b.photos || {}),
      ...(b.pc_photos || {})
    }), {});

    const finalCaptures = {
      ...captures,
      ...(editedProject.urbanisme_captures || {}),
      ...allBuildingsCaptures,
      ...(ignMap ? { ign: ignMap } : {}),
      ...(satMap ? { satellite: satMap } : {}),
      ...(masseMap ? { masse_projet: masseMap } : {}),
    };

    const finalPhotos = {
      ...photos,
      ...(editedProject.pc_photos || {}),
      ...allBuildingsPhotos,
    };

    // Propager toutes les captures et photos à chaque bâtiment pour garantir leur présence en DP4 et DP6
    const enrichedBuildings = buildingsWithMasse.map(b => ({
      ...b,
      captures: { ...finalCaptures, ...(b.captures || {}), ...(b.urbanisme_captures || {}) },
      urbanisme_captures: { ...finalCaptures, ...(b.captures || {}), ...(b.urbanisme_captures || {}) },
      photos: { ...finalPhotos, ...(b.photos || {}), ...(b.pc_photos || {}) },
      pc_photos: { ...finalPhotos, ...(b.photos || {}), ...(b.pc_photos || {}) },
    }));

    const b1 = enrichedBuildings[0] || {};
    const finalProject = {
      ...editedProject,
      ...fieldValues,
      cerfaEmailChoice: editedProject?.cerfaEmailChoice || 'email1',
      email2: editedProject?.email2 || '',
      buildingType: b1.buildingType || config.buildingType || 'asymetrique_1',
      type: finalTypeLabel,
      installationType: finalTypeLabel,
      largeur: String(b1.width || config.width || 16.4),
      longueur: String(b1.length || config.length || 37.5),
      hauteur_egout: String(b1.eaveHeight || (b1.buildingType === 'ombriere_pl' ? 5.08 : (b1.buildingType?.startsWith('asymetrique') ? 4.0 : (config.eaveHeight || 4.0)))),
      pente: String(b1.roofPitch || (b1.buildingType?.startsWith('asymetrique') ? 15 : (config.roofPitch || 10))),
      leftSide: b1.leftSide || config.leftSide || 'none',
      rightSide: b1.rightSide || config.rightSide || 'none',
      leftWidth: b1.leftWidth || config.leftWidth,
      rightWidth: b1.rightWidth || config.rightWidth,
      bayCount: b1.bayCount || config.bayCount,
      baySpacing: b1.baySpacing || config.baySpacing,
      kwc: '0',
      projectSize: '0',
      puissance: '0',
      objet_travaux: shortObjet,
      description: shortObjet,
      noticeText: effectiveNotice,
      noticeAgricole: effectiveNotice,
      pc_notice: effectiveNotice,
      notice_descriptive: effectiveNotice,
      urbanisme_captures: finalCaptures,
      captures: finalCaptures,
      pc_photos: finalPhotos,
      photos: finalPhotos,
      buildings: enrichedBuildings,
      additionalRoof: additionalRoof,
      batteryStorage: batteryStorage,
    };
    try {
      await onGenerate(type, finalTypeLabel, finalProject, selectedPages);
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const summary = buildCerfaDataSummary(
    {
      ...editedProject,
      ...fieldValues,
      puissance: '0',
      kwc: '0',
      type: isDP ? (buildings.length > 1 ? 'Ombrières photovoltaïques' : 'Ombrière photovoltaïque') : 'Bâtiment et Ombrière',
      docType: type,
      buildings
    },
    editedProject.type || (isDP ? 'ombriere' : 'batiment_solaire')
  );
  const STEPS = ['Déclarant', isDP ? 'Cartes DP1' : 'Cartes PC1', 'Cotations & Côtes', 'Photos', isDP ? 'Carte DP2' : 'Carte PC2', 'Notice Descriptive', 'Validation'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 pt-14 pb-3 overflow-hidden"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-[1450px] max-h-[85vh] h-[85vh] overflow-hidden flex flex-col mt-2"
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
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">

              {/* ÉTAPE 0 — Identité & Coordonnées du déclarant */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
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
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-gray-600 font-semibold truncate">Adresse email *</label>
                              {editedProject?.email2 && (
                                <label className="flex items-center gap-1 text-[10px] text-blue-700 font-bold cursor-pointer select-none" title="Faire apparaître cet email dans le CERFA (page 2/15)">
                                  <input
                                    type="radio"
                                    name="cerfaEmailSelection"
                                    checked={!editedProject?.cerfaEmailChoice || editedProject?.cerfaEmailChoice === 'email1'}
                                    onChange={() => handleFieldChange('cerfaEmailChoice', 'email1')}
                                    className="accent-blue-600 cursor-pointer w-3 h-3"
                                  />
                                  <span>CERFA</span>
                                </label>
                              )}
                            </div>
                            <input
                              type="email"
                              value={editedProject?.email || ''}
                              onChange={e => handleFieldChange('email', e.target.value)}
                              placeholder="Ex: isabelle.dupond@gmail.com"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-gray-600 font-semibold truncate">Email 2 <span className="text-gray-400 font-normal">(facultatif)</span></label>
                              {editedProject?.email2 && (
                                <label className="flex items-center gap-1 text-[10px] text-blue-700 font-bold cursor-pointer select-none" title="Faire apparaître cet email dans le CERFA (page 2/15)">
                                  <input
                                    type="radio"
                                    name="cerfaEmailSelection"
                                    checked={editedProject?.cerfaEmailChoice === 'email2'}
                                    onChange={() => handleFieldChange('cerfaEmailChoice', 'email2')}
                                    className="accent-blue-600 cursor-pointer w-3 h-3"
                                  />
                                  <span>CERFA</span>
                                </label>
                              )}
                            </div>
                            <input
                              type="email"
                              value={editedProject?.email2 || ''}
                              onChange={e => handleFieldChange('email2', e.target.value)}
                              placeholder="Ex: contact.societe@gmail.com"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        {editedProject?.email2 && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <span className="font-bold">Email CERFA (page 2/15) :</span>
                            <span className="font-semibold">{editedProject?.cerfaEmailChoice === 'email2' ? (editedProject.email2 || 'Email 2') : (editedProject.email || 'Email 1')}</span>
                          </div>
                        )}
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
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editedProject?.zip || ''}
                            onChange={e => handleFieldChange('zip', e.target.value)}
                            placeholder="32100"
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={editedProject?.city || ''}
                            onChange={e => handleFieldChange('city', e.target.value)}
                            placeholder="AUCH"
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Téléphone de contact</label>
                        <input
                          type="text"
                          value={editedProject?.phone || ''}
                          onChange={e => handleFieldChange('phone', e.target.value)}
                          placeholder="06 00 00 00 00"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Date et Lieu de Naissance</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editedProject?.birthDate || ''}
                            onChange={e => handleFieldChange('birthDate', e.target.value)}
                            placeholder="14/02/1970"
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={editedProject?.birthCity || ''}
                            onChange={e => handleFieldChange('birthCity', e.target.value)}
                            placeholder="AUCH (32)"
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 1 — Cartes DP1 / PC1 (PLEINE HAUTEUR) */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 h-full flex flex-col gap-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Étape 2 : Cartographie {isDP ? 'DP1' : 'PC1'} (Plan de Situation & Satellite)</h3>
                      <p className="text-xs text-gray-500">Déplacez le marqueur sur une des cartes pour ajuster l'emplacement du projet.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50 text-center flex flex-col min-h-0 shadow-xs">
                      <span className="text-xs font-bold text-gray-700 block mb-2 flex-shrink-0">{isDP ? 'DP1' : 'PC1'} — Plan de Situation (IGN Cartographique)</span>
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 z-10 flex-1 min-h-0 w-full shadow-inner">
                        {(() => {
                          const gps = editedProject?.gps || `${editedProject?.lat || 43.5612},${editedProject?.lng || 0.9168}`;
                          const [lat, lng] = gps.split(',').map(Number);
                          return (
                            <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                              <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                              />
                              <MapResizer />
                              <MapSyncCenter lat={lat} lng={lng} />
                              <DraggableLocationMarker lat={lat} lng={lng} setGps={handleGpsUpdate} />
                            </MapContainer>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50 text-center flex flex-col min-h-0 shadow-xs">
                      <span className="text-xs font-bold text-gray-700 block mb-2 flex-shrink-0">{isDP ? 'DP1' : 'PC1'} — Vue Aérienne Satellite</span>
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 z-10 flex-1 min-h-0 w-full shadow-inner">
                        {(() => {
                          const gps = editedProject?.gps || `${editedProject?.lat || 43.5612},${editedProject?.lng || 0.9168}`;
                          const [lat, lng] = gps.split(',').map(Number);
                          return (
                            <MapContainer center={[lat, lng]} zoom={17} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                              <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution="Tiles &copy; Esri"
                              />
                              <MapResizer />
                              <MapSyncCenter lat={lat} lng={lng} />
                              <DraggableLocationMarker lat={lat} lng={lng} setGps={handleGpsUpdate} />
                            </MapContainer>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center flex-shrink-0">
                    Déplacez le repère sur la carte cadastrale ou satellite pour synchroniser la position exacte du terrain.
                  </p>
                </motion.div>
              )}

              {/* ÉTAPE 2 — Configurateur 2D/3D avec support Multi-Bâtiments / Ombrières */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-3 flex flex-col h-[78vh] min-h-[620px] overflow-hidden bg-slate-100/70 rounded-2xl gap-2">
                  
                  {/* Sélecteur multi-bâtiments / ombrières */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" /> {isDP ? 'Ombrières :' : 'Bâtiments :'}
                      </span>
                      {buildings.map((b, idx) => (
                        <button
                          key={b.id || idx}
                          type="button"
                          onClick={() => handleSelectBuilding(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                            activeBuildingIndex === idx
                              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                          }`}
                        >
                          <span>{getBuildingDisplayName(b, idx)}</span>
                          <span className="text-[10px] opacity-75 font-normal">
                            ({(b.width || config.width).toFixed(1)}m × {(b.length || config.length).toFixed(1)}m)
                          </span>
                          {idx > 0 && (
                            <span
                              onClick={(e) => handleRemoveBuilding(idx, e)}
                              className="ml-1 p-0.5 hover:bg-red-500 hover:text-white rounded text-slate-400 transition-colors"
                              title={isDP ? "Supprimer cette ombrière secondaire" : "Supprimer ce bâtiment secondaire"}
                            >
                              <X className="w-3 h-3" />
                            </span>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddBuilding}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        {isDP ? 'Ajouter une ombrière' : 'Ajouter un bâtiment'}
                      </button>
                    </div>
                  </div>

                  {/* Scène & Panneau */}
                  <div className="flex-1 flex flex-col lg:flex-row gap-3.5 min-h-0 overflow-hidden">
                    {/* Panneau de contrôle gauche */}
                    <div className="w-full lg:w-[410px] h-full overflow-y-auto pr-1 space-y-3.5 pb-6">
                      <ControlPanel 
                        isAcama={false} 
                        selectedProject={editedProject} 
                        activeBuilding={buildings[activeBuildingIndex]}
                        onUpdateBuilding={updateActiveBuilding}
                      />
                      <BuildingSummaryCard isAcama={false} />
                    </div>

                    {/* Scène 3D droite */}
                    <div className="flex-1 relative h-full rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-200 shadow-sm isolate">
                      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-auto">
                        <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
                          {(() => {
                            const curB = buildings[activeBuildingIndex] || config;
                            const curW = Number(curB.width || config.width || 20);
                            const curL = Number(curB.length || (curB.bayCount || 5) * (curB.baySpacing || 7.5) || config.length || 37.5);
                            const curArea = Math.round(curW * curL);
                            return (
                              <span className="text-slate-800 font-bold text-sm whitespace-nowrap">
                                {curL.toFixed(2)}m × {curW.toFixed(2)}m — {curArea}m²
                              </span>
                            );
                          })()}
                        </div>

                        {config.hasSolar && (
                          <div className="bg-yellow-50/95 backdrop-blur px-3 py-1 rounded-lg shadow-sm border border-yellow-200">
                            <span className="text-yellow-800 font-bold text-xs whitespace-nowrap">
                              ⚡ {(() => {
                                const curB = buildings[activeBuildingIndex] || config;
                                const curW = Number(curB.width || config.width || 20);
                                const curL = Number(curB.length || (curB.bayCount || 5) * (curB.baySpacing || 7.5) || config.length || 37.5);
                                const curArea = Math.round(curW * curL);
                                return curB.solarStats?.power ? curB.solarStats.power.toFixed(2) : (curArea * 0.20).toFixed(2);
                              })()} kWc
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

                      {/* Toggles Vue 3D / 2D */}
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

                      {/* Rendu Canvas BuildingScene avec clé par onglet */}
                      <div className="w-full h-full">
                        <BuildingScene 
                          key={`bldg-scene-${activeBuildingIndex}`}
                          viewMode={viewMode} 
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 3 — Visionneuse 3D (DP4/PC5 5 VUES) & Insertion Paysagère 3D (DP6/PC6) */}
              {step === 3 && (() => {
                const currentPhotos = buildings[activeBuildingIndex]?.photos || {};
                const currentCaptures = buildings[activeBuildingIndex]?.captures || {};
                return (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Étape 4 : Photos, Façades & Insertion Paysagère 3D</h3>
                      <p className="text-xs text-gray-500">{isDP ? "Capturez les 5 vues de façades pour la DP4 et positionnez le modèle 3D sur votre photo de terrain pour la DP6." : "Capturez les 5 vues de façades pour la PC5 et positionnez le modèle 3D sur votre photo de terrain pour la PC6."}</p>
                    </div>

                    {buildings.length > 1 && (
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {buildings.map((b, idx) => (
                          <button
                            key={b.id || idx}
                            type="button"
                            onClick={() => handleSelectBuilding(idx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              activeBuildingIndex === idx ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            {getBuildingDisplayName(b, idx)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-stretch">
                    {/* DP4 / PC5 — 5 Vues Façades & Toitures */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col justify-between min-h-[340px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-blue-600" /> {isDP ? "DP4 — Plan des Façades & Toitures (5 Vues 3D)" : "PC5 — Plan des Façades & Toitures (5 Vues 3D)"}
                        </span>
                        {currentCaptures?.facade_sud ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ 5 Vues Prêtes</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À capturer</span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-center">
                        {(() => {
                          const activeB = buildings[activeBuildingIndex] || {};
                          return (
                            <Building3DViewer
                              buildingConfig={{
                                longueur: Number(activeB.length || config.length || 30),
                                largeur: Number(activeB.width || config.width || 20),
                                hauteur_egout: Number(activeB.eaveHeight || config.eaveHeight || (isDP ? 3 : 4)),
                                pente: Number(activeB.roofPitch || config.roofPitch || 10),
                                buildingType: activeB.buildingType || config.buildingType || 'asymetrique_1',
                                leftSide: activeB.leftSide || config.leftSide || 'none',
                                rightSide: activeB.rightSide || config.rightSide || 'none',
                                type: isDP ? 'dp' : editedProject.type
                              }}
                              onCaptureSnapshot={handleCaptureSnapshotPC5}
                              onCaptureAll5Views={handleCaptureAll5ViewsPC5}
                              height={270}
                              isDP={isDP}
                              docType={type}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* DP6 / PC6 — Insertion paysagère 3D (Avant / Après) */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col justify-between min-h-[340px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-600" /> {isDP ? "DP6 — Insertion Paysagère 3D" : "PC6 — Insertion Paysagère 3D"} ({config.width}m × {config.length}m)
                        </span>
                        {currentPhotos?.apres ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Simulation Prête</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À ajuster</span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-h-[270px]">
                        {currentPhotos?.avant ? (
                          <div className="space-y-2 flex-1 flex flex-col justify-between">
                            <div className="grid grid-cols-2 gap-2 flex-1 items-center">
                              {/* Photo Avant */}
                              <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 group h-[190px] bg-black/5">
                                <img src={currentPhotos.avant} alt="Avant" className="w-full h-full object-cover" />
                                <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">Avant</span>
                                
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                  <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                                    <Upload className="w-3.5 h-3.5" />
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'avant', e)} />
                                  </label>
                                  <button
                                    type="button"
                                    title="Recadrer la photo"
                                    onClick={() => setCropModal({ open: true, src: currentPhotos.avant, category: 'photos', key: 'avant', title: 'Recadrer Photo Terrain Avant' })}
                                    className="p-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                  >
                                    <Crop className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Supprimer la photo"
                                    onClick={() => setBuildings(prev => {
                                      const upd = [...prev];
                                      if (upd[activeBuildingIndex]) {
                                        const newPhotos = { ...upd[activeBuildingIndex].photos };
                                        delete newPhotos.avant;
                                        upd[activeBuildingIndex].photos = newPhotos;
                                      }
                                      return upd;
                                    })}
                                    className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Photo Après */}
                              <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 bg-gray-100 flex items-center justify-center group h-[190px]">
                                {currentPhotos?.apres ? (
                                  <>
                                    <img src={currentPhotos.apres} alt="Après" className="w-full h-full object-cover" />
                                    <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">Après (3D)</span>
                                    
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                      <button
                                        type="button"
                                        title="Recadrer l'insertion"
                                        onClick={() => setCropModal({ open: true, src: currentPhotos.apres, category: 'photos', key: 'apres', title: 'Recadrer Simulation 3D' })}
                                        className="p-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                      >
                                        <Crop className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Réinitialiser l'incrustation"
                                        onClick={() => setBuildings(prev => {
                                          const upd = [...prev];
                                          if (upd[activeBuildingIndex]) {
                                            const newPhotos = { ...upd[activeBuildingIndex].photos };
                                            delete newPhotos.apres;
                                            upd[activeBuildingIndex].photos = newPhotos;
                                          }
                                          return upd;
                                        })}
                                        className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400 font-semibold">En attente d'incrustation</span>
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
                          <label className="w-full h-full min-h-[260px] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-700 font-bold">1. Charger photo de terrain (Avant)</span>
                            <span className="text-xs text-gray-400 mt-0.5">Puis ajustez la position du modèle 3D</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'avant', e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DP7/PC7 & DP8/PC8 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700">{isDP ? 'DP7 — Environnement Proche' : 'PC7 — Environnement Proche'}</span>
                        {currentPhotos?.proche ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {currentPhotos?.proche ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={currentPhotos.proche} alt="Env Proche" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                              <Upload className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'proche', e)} />
                            </label>
                            <button
                              type="button"
                              title="Recadrer"
                              onClick={() => setCropModal({ open: true, src: currentPhotos.proche, category: 'photos', key: 'proche', title: 'Recadrer Environnement Proche' })}
                              className="p-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => setBuildings(prev => {
                                const upd = [...prev];
                                if (upd[activeBuildingIndex]) {
                                  const newPhotos = { ...upd[activeBuildingIndex].photos };
                                  delete newPhotos.proche;
                                  upd[activeBuildingIndex].photos = newPhotos;
                                }
                                return upd;
                              })}
                              className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500 font-semibold">Importer photo proche</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'proche', e)} />
                        </label>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700">{isDP ? 'DP8 — Environnement Lointain' : 'PC8 — Environnement Lointain'}</span>
                        {currentPhotos?.lointain ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {currentPhotos?.lointain ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={currentPhotos.lointain} alt="Env Lointain" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                              <Upload className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'lointain', e)} />
                            </label>
                            <button
                              type="button"
                              title="Recadrer"
                              onClick={() => setCropModal({ open: true, src: currentPhotos.lointain, category: 'photos', key: 'lointain', title: 'Recadrer Environnement Lointain' })}
                              className="p-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => setBuildings(prev => {
                                const upd = [...prev];
                                if (upd[activeBuildingIndex]) {
                                  const newPhotos = { ...upd[activeBuildingIndex].photos };
                                  delete newPhotos.lointain;
                                  upd[activeBuildingIndex].photos = newPhotos;
                                }
                                return upd;
                              })}
                              className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-white transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500 font-semibold">Importer photo lointaine</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleDirectPhotoUpload('photos', 'lointain', e)} />
                        </label>
                      )}
                    </div>
                  </div>
                </motion.div>
                );
              })()}

              {/* ÉTAPE 4 — Carte DP2 / PC2 (Plan de masse dynamique par bâtiment / ombrière — PLEINE HAUTEUR) */}
              {step === 4 && (
                <motion.div
                  key="step4-masse"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 h-full flex flex-col gap-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">
                        Étape 5 : {isDP ? 'DP2' : 'PC2'} — Plan de Masse ({buildings.length} {isDP ? 'ombrière' : 'bâtiment'}{buildings.length > 1 ? 's' : ''})
                      </h3>
                      <p className="text-xs text-gray-500">
                        Visualisez et ajustez l'emprise au sol et l'orientation de chaque {isDP ? 'ombrière' : 'bâtiment'} à l'échelle sur le plan cadastral (OSM Zoom 19).
                      </p>
                    </div>

                    {buildings.length > 1 && (
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {buildings.map((b, idx) => (
                          <button
                            key={b.id || idx}
                            type="button"
                            onClick={() => setActiveBuildingIndex(idx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              activeBuildingIndex === idx ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            {getBuildingDisplayName(b, idx)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const bIdx = activeBuildingIndex >= buildings.length ? 0 : activeBuildingIndex;
                    const b = buildings[bIdx] || buildings[0] || {};
                    const bLat = Number(b.lat || (b.gps ? b.gps.split(',')[0] : null) || editedProject?.lat || 43.5612);
                    const bLng = Number(b.lng || (b.gps ? b.gps.split(',')[1] : null) || editedProject?.lng || 0.9168);
                    const bLength = Number(b.length || config.length || 30);
                    const bWidth = Number(b.width || config.width || 20);
                    const currentRotation = Number(b.rotation || 0);

                    return (
                      <div className="flex-1 flex flex-col min-h-0 bg-gray-50 border border-gray-200 rounded-2xl p-3.5 shadow-xs overflow-hidden gap-2.5">
                        <div className="flex items-center justify-between flex-shrink-0">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            {isDP ? 'DP2' : 'PC2'} — Plan de Masse : {getBuildingDisplayName(b, bIdx)}
                          </span>
                          <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {bLength.toFixed(1)}m × {bWidth.toFixed(1)}m ({Math.round(bLength * bWidth)} m²)
                          </span>
                        </div>

                        {/* Contrôle de Rotation du bâtiment / de l'ombrière */}
                        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs shadow-2xs space-y-2 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <Compass className="w-4 h-4 text-blue-600" />
                              Orientation ({getBuildingDisplayName(b, bIdx)})
                            </span>
                            <span className="text-blue-600 font-black text-sm">
                              {currentRotation}°
                            </span>
                          </div>

                          <input
                            type="range"
                            min="-90"
                            max="90"
                            step="1"
                            value={currentRotation}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setBuildings(prev => {
                                const upd = [...prev];
                                if (upd[bIdx]) upd[bIdx] = { ...upd[bIdx], rotation: val };
                                return upd;
                              });
                            }}
                            className="w-full h-3.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 my-1"
                          />

                          <div className="bg-blue-50 border border-blue-200 rounded-xl py-1 px-2 text-center text-xs font-bold text-blue-900 shadow-2xs">
                            {(() => {
                              const r = Number(currentRotation) || 0;
                              const norm = ((((r + 180) % 360) + 360) % 360) - 180;
                              if (norm === 0) return 'Plein Sud (0°)';
                              if (Math.abs(norm) >= 135) return `Nord (${r > 0 ? `+${r}` : r}°)`;
                              if (norm > 45) {
                                if (norm >= 85 && norm <= 95) return `Plein Ouest (+${r}°)`;
                                return `Ouest (+${r}°)`;
                              }
                              if (norm > 0 && norm <= 45) return `Sud-Ouest (+${r}°)`;
                              if (norm < -45) {
                                if (norm <= -85 && norm >= -95) return `Plein Est (${r}°)`;
                                return `Est (${r}°)`;
                              }
                              if (norm < 0 && norm >= -45) return `Sud-Est (${r}°)`;
                              return `Plein Sud (0°)`;
                            })()}
                          </div>

                          <div className="grid grid-cols-5 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setBuildings(prev => {
                                  const upd = [...prev];
                                  if (upd[bIdx]) upd[bIdx] = { ...upd[bIdx], rotation: 90 };
                                  return upd;
                                });
                              }}
                              className={`py-1 rounded-xl text-[11px] font-black transition-all border ${
                                currentRotation === 90 ? 'bg-[#0e2b4d] text-white shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Ouest (90°)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBuildings(prev => {
                                  const upd = [...prev];
                                  if (upd[bIdx]) upd[bIdx] = { ...upd[bIdx], rotation: 45 };
                                  return upd;
                                });
                              }}
                              className={`py-1 rounded-xl text-[11px] font-black transition-all border ${
                                currentRotation === 45 ? 'bg-[#0e2b4d] text-white shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Sud-Ouest (45°)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBuildings(prev => {
                                  const upd = [...prev];
                                  if (upd[bIdx]) upd[bIdx] = { ...upd[bIdx], rotation: 0 };
                                  return upd;
                                });
                              }}
                              className={`py-1 rounded-xl text-[11px] font-black transition-all border ${
                                currentRotation === 0 ? 'bg-[#0e2b4d] text-white shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Sud (0°)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBuildings(prev => {
                                  const upd = [...prev];
                                  if (upd[bIdx]) upd[bIdx] = { ...upd[bIdx], rotation: -45 };
                                  return upd;
                                });
                              }}
                              className={`py-1 rounded-xl text-[11px] font-black transition-all border ${
                                currentRotation === -45 ? 'bg-[#0e2b4d] text-white shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Sud-Est (-45°)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBuildings(prev => {
                                  const upd = [...prev];
                                  if (upd[bIdx]) upd[bIdx] = { ...upd[bIdx], rotation: -90 };
                                  return upd;
                                });
                              }}
                              className={`py-1 rounded-xl text-[11px] font-black transition-all border ${
                                currentRotation === -90 ? 'bg-[#0e2b4d] text-white shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Est (-90°)
                            </button>
                          </div>
                        </div>

                        {/* Visionneuse Carte occupant 100% de la hauteur disponible */}
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 z-10 flex-1 min-h-0 w-full shadow-inner">
                          <MapContainer center={[bLat, bLng]} zoom={19} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution="&copy; OpenStreetMap contributors"
                              maxZoom={21}
                              maxNativeZoom={19}
                            />
                            <MapResizer />
                            <MapSyncCenter lat={bLat} lng={bLng} />
                            <DraggableLocationMarker lat={bLat} lng={bLng} setGps={(newLat, newLng) => handleBuildingGpsUpdate(bIdx, newLat, newLng)} />
                            <PC2ScaledBuildingOverlay
                              bLength={bLength}
                              bWidth={bWidth}
                              rotation={currentRotation}
                              label={`${getBuildingDisplayName(b, bIdx)} (${currentRotation}°)`}
                            />
                            <PC2MapScaleBar />
                          </MapContainer>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* ÉTAPE 5 — Notice d'insertion & Descriptive du projet (PLEINE HAUTEUR) */}
              {step === 5 && (
                <motion.div
                  key="step5-notice"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 h-full flex flex-col gap-3 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs flex-shrink-0">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          Étape 6 : Notice d'insertion & Descriptive du projet ({isDP ? 'DP' : 'PC4'})
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Complétez et personnalisez les 5 points de la notice. Ce texte est injecté dans {isDP ? 'le dossier DP' : 'la planche PC4'} et restera modifiable dans le PDF final.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowRoofModal(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
                          additionalRoof.enabled ? 'bg-amber-500 text-white' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        {additionalRoof.enabled ? `⚡ Toiture (${additionalRoof.kwc} kWc)` : '+ Ajouter une Toiture'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowBatteryModal(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
                          batteryStorage.enabled ? 'bg-purple-600 text-white' : 'bg-white border border-purple-300 text-purple-800 hover:bg-purple-50'
                        }`}
                      >
                        <Battery className="w-3.5 h-3.5" />
                        {batteryStorage.enabled ? `🔋 Batterie (${batteryStorage.capacityKwh} kWh)` : '+ Ajouter une Batterie'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsNoticeUserModified(false);
                          const auto = buildAutoNoticeText();
                          setNoticeText(auto);
                          setEditedProject(prev => ({ ...prev, noticeText: auto }));
                        }}
                        className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                        title="Régénérer le texte selon les paramètres actuels du projet"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Réinitialiser
                      </button>
                    </div>
                  </div>

                  {/* Éditeur de Notice prenant TOUTE la hauteur du cadre */}
                  <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 flex-shrink-0">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <Sparkles className="w-4 h-4" />
                        Texte de la notice descriptive (5 points structurés)
                      </span>
                      <span className="text-slate-400 text-[11px] font-semibold">
                        {noticeText.length} caractères • {noticeText.split(/\s+/).filter(Boolean).length} mots
                      </span>
                    </div>

                    <textarea
                      value={noticeText}
                      onChange={(e) => {
                        setIsNoticeUserModified(true);
                        setNoticeText(e.target.value);
                        setEditedProject(prev => ({ ...prev, noticeText: e.target.value }));
                      }}
                      placeholder="Rédigez ou personnalisez la notice descriptive du projet..."
                      className="flex-1 w-full min-h-0 p-3.5 mt-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 6 — Validation & Sélection des pages du PDF */}
              {step === 6 && (
                <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-extrabold text-sm text-emerald-950">Dossier prêt pour la génération PDF !</h4>
                      <p className="text-xs text-emerald-800 mt-0.5">Cochez les pages et pièces graphiques que vous souhaitez inclure dans le fichier PDF final.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPages({
                          cover: true,
                          situation: true,
                          masse: true,
                          section_notice: true,
                          section: true,
                          facades: true,
                          insertion: true,
                          env: true,
                          dp_notice: true,
                          dp8: true,
                          cerfa: true,
                        })}
                        className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
                      >
                        Tout cocher
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPages({
                          cover: false,
                          situation: false,
                          masse: false,
                          section_notice: false,
                          section: false,
                          facades: false,
                          insertion: false,
                          env: false,
                          dp_notice: false,
                          dp8: false,
                          cerfa: false,
                        })}
                        className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
                      >
                        Tout décocher
                      </button>
                    </div>
                  </div>

                  {/* Modules d'Ajout Optionnel Toiture & Batterie avant validation */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Composants du projet configurés
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRoofModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Sun className="w-3.5 h-3.5" />
                          {additionalRoof.enabled ? 'Modifier Toiture' : '+ Toiture'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBatteryModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-purple-300 text-purple-800 hover:bg-purple-50 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Battery className="w-3.5 h-3.5" />
                          {batteryStorage.enabled ? 'Modifier Batterie' : '+ Batterie'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                          <span className="flex items-center gap-1 text-blue-600"><Building2 className="w-3.5 h-3.5" /> {buildings.length} {isDP ? 'Ombrière(s)' : 'Bâtiment(s)'}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Configuré</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {config.length.toFixed(1)}m × {config.width.toFixed(1)}m ({Math.round(config.length * config.width)} m²)
                          {buildings.length > 1 && ` + ${buildings.length - 1} secondaire(s)`}
                        </p>
                      </div>

                      <div className={`p-2.5 rounded-xl border transition-all ${additionalRoof.enabled ? 'bg-amber-50/70 border-amber-200 shadow-2xs' : 'bg-white/60 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="flex items-center gap-1 text-amber-800"><Sun className="w-3.5 h-3.5" /> Toiture existante</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${additionalRoof.enabled ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'}`}>
                            {additionalRoof.enabled ? `${additionalRoof.kwc} kWc` : 'Non ajouté'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {additionalRoof.enabled ? `${additionalRoof.surface} m² • ${additionalRoof.roofType}` : 'Centrale en toiture existante optionnelle'}
                        </p>
                      </div>

                      <div className={`p-2.5 rounded-xl border transition-all ${batteryStorage.enabled ? 'bg-purple-50/70 border-purple-200 shadow-2xs' : 'bg-white/60 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="flex items-center gap-1 text-purple-800"><Battery className="w-3.5 h-3.5" /> Stockage Batterie</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${batteryStorage.enabled ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-600'}`}>
                            {batteryStorage.enabled ? `${batteryStorage.capacityKwh} kWh` : 'Non ajouté'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {batteryStorage.enabled ? `${batteryStorage.model} (${batteryStorage.powerKw} kW)` : 'Armoires de stockage stationnaire optionnelles'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sélection interactive des planches */}
                  <div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Sélection des pièces et planches du dossier ({type.toUpperCase()})
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {(type === 'pc' ? [
                        { id: 'cover', code: 'GARDE', title: 'Page de Garde', desc: 'Présentation architecte & synthèse', badge: 'Recommandé', color: 'blue' },
                        { id: 'situation', code: 'PC1', title: 'Plan de situation', desc: 'IGN cartographique & Satellite', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'masse', code: 'PC2', title: 'Plan de masse', desc: 'Emprise de la construction', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'section_notice', code: 'PC3+PC4', title: 'Coupe & Notice', desc: 'Coupe transversale & notice descriptive', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'facades', code: 'PC5', title: 'Façades & Toitures', desc: '5 vues 3D (Sud, Nord, Est, Ouest, Toit)', badge: !!captures?.facade_sud ? 'Prêt' : '3D', color: 'emerald' },
                        { id: 'insertion', code: 'PC6', title: 'Insertion paysagère', desc: 'Vue avant / simulation 3D après', badge: (photos?.avant || photos?.apres) ? 'Prêt' : 'Photo 3D', color: 'emerald' },
                        { id: 'env', code: 'PC7+PC8', title: 'Env. Proche & Lointain', desc: 'Photos dans le paysage proche et lointain', badge: (photos?.proche || photos?.lointain) ? 'Prêt' : 'Optionnel', color: 'purple' },
                        { id: 'cerfa', code: 'CERFA', title: 'Formulaire CERFA', desc: 'CERFA 13404 officiel pré-rempli', badge: 'Administratif', color: 'amber' },
                      ] : type === 'dp' ? [
                        { id: 'cover', code: 'GARDE', title: 'Page de Garde', desc: 'Présentation architecte & synthèse', badge: 'Recommandé', color: 'blue' },
                        { id: 'situation', code: 'DP1', title: 'Plan de situation', desc: 'IGN cartographique & Satellite', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'masse', code: 'DP2', title: 'Plan de masse', desc: 'Plan de masse des constructions', badge: 'Obligatoire', color: 'indigo' },
                        { 
                          id: 'section', 
                          code: selectedPages.dp_notice !== false ? 'DP3+NOTICE' : 'DP3', 
                          title: 'Plan en coupe', 
                          desc: selectedPages.dp_notice !== false ? "Coupe transversale & notice descriptive" : "Coupe transversale de l'ombrière", 
                          badge: 'Obligatoire', 
                          color: 'indigo',
                          subOption: {
                            key: 'dp_notice',
                            label: '+ Notice descriptive sous la coupe',
                            checked: selectedPages.dp_notice !== false
                          }
                        },
                        { id: 'facades', code: 'DP4', title: 'Façades & Toitures', desc: "5 vues 3D de l'ombrière", badge: '3D', color: 'emerald' },
                        { id: 'insertion', code: 'DP6', title: 'Insertion paysagère', desc: 'Simulation d\'intégration paysagère', badge: (photos?.avant || photos?.apres) ? 'Prêt' : 'Photo 3D', color: 'emerald' },
                        { 
                          id: 'env', 
                          code: selectedPages.dp8 !== false ? 'DP7+DP8' : 'DP7', 
                          title: 'Environnement proche', 
                          desc: selectedPages.dp8 !== false ? "Photographies dans le paysage proche et lointain" : "Photographie dans le paysage proche", 
                          badge: (photos?.proche || photos?.lointain) ? 'Prêt' : 'Optionnel', 
                          color: 'purple',
                          subOption: {
                            key: 'dp8',
                            label: '+ Photo paysage lointain (DP8)',
                            checked: selectedPages.dp8 !== false
                          }
                        },
                        { id: 'cerfa', code: 'CERFA', title: 'Formulaire CERFA DP', desc: 'Déclaration préalable officielle', badge: 'Administratif', color: 'amber' },
                      ] : [
                        { id: 'cover', code: 'GARDE', title: 'Page de Garde', desc: 'Présentation architecte', badge: 'Recommandé', color: 'blue' },
                        { id: 'situation', code: 'CU1', title: 'Plan de situation', desc: 'Localisation du terrain', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'masse', code: 'CU2', title: 'Plan de masse', desc: 'Plan d\'emprise', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'cerfa', code: 'CERFA', title: 'Formulaire CERFA CU', desc: 'Certificat d\'urbanisme', badge: 'Administratif', color: 'amber' },
                      ]).map(item => {
                        const isChecked = selectedPages[item.id] !== false;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedPages(prev => ({ ...prev, [item.id]: !isChecked }))}
                            className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                              isChecked
                                ? 'bg-white border-blue-600 shadow-sm ring-2 ring-blue-500/10'
                                : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-80'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  isChecked ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {item.code}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                                />
                              </div>
                              <h6 className="text-xs font-black text-slate-900 leading-tight">{item.title}</h6>
                              <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                              
                              {/* Sous-option facultative intégrée dans la carte */}
                              {item.subOption && isChecked && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPages(prev => ({ ...prev, [item.subOption.key]: !item.subOption.checked }));
                                  }}
                                  className="mt-2 pt-1.5 border-t border-slate-200/80 flex items-center justify-between gap-1.5 bg-blue-50/70 -mx-1 px-2 py-1 rounded-lg cursor-pointer hover:bg-blue-100/80 transition-colors"
                                >
                                  <span className="text-[10px] font-bold text-blue-900 leading-tight">
                                    {item.subOption.label}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={item.subOption.checked}
                                    onChange={() => {}}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[9.5px] font-bold text-slate-400">{item.badge}</span>
                              <span className={`text-[10px] font-extrabold ${isChecked ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isChecked ? '✓ Inclus' : '✕ Exclu'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Synthèse et Objet des travaux (2 colonnes 50% / 50%) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                    {/* Colonne Gauche : Lignes Demandeur à Type */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100 text-xs flex flex-col justify-between">
                      {['demandeur', 'email', 'adresse', 'cadastre', 'commune', 'puissance', 'type'].map((k) => (
                        <div key={k} className="flex items-start gap-3 px-4 py-2">
                          <span className="text-gray-400 w-28 flex-shrink-0 pt-0.5 capitalize">{k}</span>
                          <span className="font-semibold text-gray-800 flex-1">{summary[k] || '—'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Colonne Droite : Objet des travaux prenant toute la hauteur cumulée */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3.5 text-xs flex flex-col shadow-2xs h-full">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <label className="font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          Objet des travaux (Page de garde PDF)
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">Modifiable</span>
                      </div>
                      <textarea
                        value={editedProject?.objet_travaux !== undefined ? editedProject.objet_travaux : (
                          isDP
                            ? "Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire"
                            : (isPC
                              ? "Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"
                              : "Certificat d'urbanisme opérationnel pour centrale photovoltaïque")
                        )}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedProject(prev => ({ ...prev, objet_travaux: val, description: val }));
                          handleFieldChange('objet_travaux', val);
                        }}
                        placeholder={isDP ? "Ex: Installation d'une ombrière photovoltaïque en structure métallique avec toiture solaire" : "Ex: Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque"}
                        className="w-full flex-1 min-h-[160px] p-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-medium leading-relaxed resize-none outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Modal Configuration Toiture */}
          {showRoofModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-amber-200 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-amber-100">
                  <h4 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                    Configuration Toiture Solaire
                  </h4>
                  <button onClick={() => setShowRoofModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Désignation / Nom de la toiture</label>
                    <input
                      type="text"
                      value={additionalRoof.name}
                      onChange={(e) => setAdditionalRoof(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Toiture Hangar Nord existante"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Surface toiture (m²)</label>
                      <input
                        type="number"
                        value={additionalRoof.surface}
                        onChange={(e) => setAdditionalRoof(prev => ({ ...prev, surface: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Puissance (kWc)</label>
                      <input
                        type="number"
                        value={additionalRoof.kwc}
                        onChange={(e) => setAdditionalRoof(prev => ({ ...prev, kwc: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Type de couverture</label>
                      <input
                        type="text"
                        value={additionalRoof.roofType}
                        onChange={(e) => setAdditionalRoof(prev => ({ ...prev, roofType: e.target.value }))}
                        placeholder="Bac acier, tuiles..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Orientation</label>
                      <input
                        type="text"
                        value={additionalRoof.orientation}
                        onChange={(e) => setAdditionalRoof(prev => ({ ...prev, orientation: e.target.value }))}
                        placeholder="Sud, Est-Ouest..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {additionalRoof.enabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdditionalRoof(prev => ({ ...prev, enabled: false }));
                        setShowRoofModal(false);
                      }}
                      className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      Désactiver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAdditionalRoof(prev => ({ ...prev, enabled: true }));
                      setShowRoofModal(false);
                    }}
                    className="ml-auto px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-sm"
                  >
                    Valider la Toiture
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Configuration Batterie */}
          {showBatteryModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-purple-200 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-purple-100">
                  <h4 className="text-sm font-extrabold text-purple-900 flex items-center gap-2">
                    <Battery className="w-5 h-5 text-purple-600" />
                    Configuration Système Batterie
                  </h4>
                  <button onClick={() => setShowBatteryModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Modèle / Fabricant batterie</label>
                    <input
                      type="text"
                      value={batteryStorage.model}
                      onChange={(e) => setBatteryStorage(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Ex: CESC Mercury 261, Tesla..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Capacité de stockage (kWh)</label>
                      <input
                        type="number"
                        value={batteryStorage.capacityKwh}
                        onChange={(e) => setBatteryStorage(prev => ({ ...prev, capacityKwh: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Puissance onduleur (kW)</label>
                      <input
                        type="number"
                        value={batteryStorage.powerKw}
                        onChange={(e) => setBatteryStorage(prev => ({ ...prev, powerKw: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nombre d'armoires</label>
                      <input
                        type="number"
                        value={batteryStorage.quantity}
                        onChange={(e) => setBatteryStorage(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Emprise au sol (dalle)</label>
                      <input
                        type="text"
                        value={batteryStorage.footprint}
                        onChange={(e) => setBatteryStorage(prev => ({ ...prev, footprint: e.target.value }))}
                        placeholder="3.50m × 2.20m"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {batteryStorage.enabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setBatteryStorage(prev => ({ ...prev, enabled: false }));
                        setShowBatteryModal(false);
                      }}
                      className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      Désactiver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setBatteryStorage(prev => ({ ...prev, enabled: true }));
                      setShowBatteryModal(false);
                    }}
                    className="ml-auto px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm"
                  >
                    Valider la Batterie
                  </button>
                </div>
              </div>
            </div>
          )}

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
            initialPhoto={buildings[activeBuildingIndex]?.photos?.avant || photos?.avant}
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
          <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 flex-shrink-0">
            <button
              onClick={step === 0 ? onClose : () => setStep(s => Math.max(0, s - 1))}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 0 ? 'Annuler' : 'Précédent'}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
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
                  <><FileCheck className="w-4 h-4" /> Générer le dossier PDF</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
