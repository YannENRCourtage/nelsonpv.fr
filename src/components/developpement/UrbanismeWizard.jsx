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
import { useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';
import { ControlPanel } from '../configurator/ui/ControlPanel.jsx';
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
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      ref={markerRef}
    />
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
  const [step, setStep] = useState(0); // 0=Déclarant, 1=Cartes PC1/PC2, 2=Configurateur 2D/3D, 3=Photos/3D, 4=Notice Descriptive, 5=Validation
  const [viewMode, setViewMode] = useState('3D'); // '3D' | '2D_FRONT'
  
  // Zustand Store du Configurateur Nelson
  const config = useConfiguratorValues();
  const configActions = useConfiguratorActions();

  // Multi-Bâtiments
  const [buildings, setBuildings] = useState([
    {
      id: 'bat-1',
      name: 'Bâtiment 1 (Principal)',
      length: 30,
      width: 20,
      eaveHeight: 4,
      roofPitch: 15,
      buildingType: 'asymetrique_1',
      leftSide: 'none',
      rightSide: 'none',
      bayCount: 5,
      baySpacing: 6,
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
    
    // Bâtiment 1
    const b1 = buildings[0] || {};
    const longueur1 = Number(b1.length || config.length || 30);
    const largeur1 = Number(b1.width || config.width || 20);
    const totalSurface1 = (largeur1 * longueur1).toFixed(2);
    const b1Type = b1.buildingType || config.buildingType || 'asymetrique_1';
    const isB1Ombriere = b1Type.includes('ombriere');
    const isB1Asym = b1Type.startsWith('asym');
    const isB1Sym = b1Type.startsWith('sym');
    const b1RoofLabel = isB1Ombriere ? 'monopente (10°)' : isB1Asym ? 'double pente asymétrique (15°)' : isB1Sym ? 'double pente symétrique (10°)' : 'photovoltaïque';
    const b1Eave = Number(b1.eaveHeight || config.eaveHeight || 4.0);
    const b1Pitch = Number(b1.roofPitch || config.roofPitch || 15);
    const b1Bays = Number(b1.bayCount || config.bayCount || 5);
    const b1Spacing = Number(b1.baySpacing || config.baySpacing || 6);
    const b1Auvent = Boolean(b1.rightSide === 'auvent' || b1.leftSide === 'auvent' || config.rightSide === 'auvent' || config.leftSide === 'auvent');
    
    const rawKwc = editedProject?.kwc || editedProject?.puissance || editedProject?.projectSize || project?.kwc || project?.puissance || project?.projectSize;
    const isValidKwc = rawKwc !== undefined && rawKwc !== null && rawKwc !== '' && rawKwc !== '0' && !isNaN(Number(rawKwc)) && Number(rawKwc) > 0;
    const displayKwc = isValidKwc ? String(Number(rawKwc)) : '';

    // Bâtiments secondaires
    const secondaryBuildings = buildings.slice(1);
    const hasMultiBuildings = secondaryBuildings.length > 0;

    let batimentDesc = isB1Ombriere
      ? `Le projet a pour objet l'implantation d'une ombrière de parking photovoltaïque${hasMultiBuildings ? ' (Bâtiment 1)' : ''} de dimensions ${longueur1}m × ${largeur1.toFixed(2)}m (surface couverte : ${totalSurface1} m²) à structure métallique autoportante en Y/V (RAL 7016) avec toiture monopente inclinée à 10°, permettant d'abriter les véhicules tout en produisant de l'électricité solaire.`
      : `Le projet a pour objet la construction d'un bâtiment agricole à charpente métallique${hasMultiBuildings ? ' principal (Bâtiment 1)' : ''} de forme rectangulaire (longueur : ${longueur1}m, largeur : ${largeur1.toFixed(2)}m${b1Auvent ? ' + Auvent 4.00m' : ''}, hauteur sablière : ${b1Eave.toFixed(2)}m) en structure métallique (RAL 7016 / 7005), composé de ${b1Bays} travées de ${b1Spacing}m d'entraxe. La toiture sera constituée d'une couverture ${b1RoofLabel} avec bac acier anti-condensation (RAL 7016) et panneaux solaires photovoltaïques intégrés (RAL 9005)${displayKwc ? `, développant une puissance installée de ${displayKwc} kWc` : ''}.`;

    if (hasMultiBuildings) {
      secondaryBuildings.forEach((b, idx) => {
        const bW = Number(b.width || 20);
        const bL = Number(b.length || 25);
        const bSurface = (bW * bL).toFixed(2);
        const bType = (b.buildingType || 'asymetrique_1').toLowerCase();
        const isOmb = bType.includes('ombriere');
        const bAuvent = b.rightSide === 'auvent' || b.leftSide === 'auvent';
        const bEave = Number(b.eaveHeight || 4.0);
        const bPitch = Number(b.roofPitch || (isOmb ? 10 : 15));

        if (isOmb) {
          batimentDesc += `\nIl comprend également l'implantation d'une ombrière photovoltaïque de parking (${b.name || `Bâtiment ${idx + 2}`}) de dimensions ${bL}m × ${bW.toFixed(2)}m (surface couverte : ${bSurface} m²) à structure métallique en Y/V avec toiture monopente inclinée à ${bPitch}°.`;
        } else {
          batimentDesc += `\nIl comprend également la construction d'un second bâtiment (${b.name || `Bâtiment ${idx + 2}`}) de dimensions ${bL}m × ${bW.toFixed(2)}m${bAuvent ? ' (+ Auvent)' : ''} d'une emprise au sol de ${bSurface} m² (hauteur sablière : ${bEave.toFixed(2)}m, pente : ${bPitch}°) en structure métallique similaire.`;
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
    let objetDemande = `La demande de permis de construire porte sur la réalisation d'un projet comprenant ${totalBuildingCount} structure${totalBuildingCount > 1 ? 's' : ''} (${totalGlobalSurface.toFixed(2)} m²)${additionalRoof.enabled ? ` et l'équipement d'une toiture existante de ${additionalRoof.surface} m²` : ''}${batteryStorage.enabled ? ` ainsi qu'un système de stockage batterie stationnaire de ${batteryStorage.capacityKwh} kWh` : ''}.`;

    return `NOTICE D'INSERTION & DESCRIPTIVE DU PROJET

1- OBJET DE LA DEMANDE
${objetDemande}

2- LE SITE
Le projet se situe sur la commune de ${projectCity} (${projectZip}) au ${projectAddress}. Le terrain concerné par le projet est cadastré sous le numéro ${projectCadastre} (surface : ${projectSurface}). Le terrain est globalement plat et se trouve à une altitude de ${projectAltitude} au-dessus du niveau de la mer. Le site s'inscrit dans un paysage à identité rurale. L'accès du site se fait par le Sud de la parcelle via la voie d'accès existante.

3- LE PROJET
${batimentDesc}
Ce bâtiment sera ouvert et non clos. Les façades Est, Ouest, Nord et Sud seront ouvertes.
Un terrassement sera réalisé pour la mise en oeuvre d'une plateforme en grave compactée.
Des tranchées drainantes seront réalisées tout autour du bâtiment projet afin d'évacuer les eaux pluviales par infiltration dans le sol.

4- RACCORDEMENT AUX RESEAUX
Le bâtiment ne sera pas raccordé aux réseaux d'eau, ni d'assainissement, ni d'électricité. Il n'y a donc pas de besoins en alimentation à ces niveaux là.
Seule l'électricité produite par la centrale photovoltaïque${batteryStorage.enabled ? ' et le système de stockage batterie' : ''} est renvoyée dans le réseau ENEDIS via un point de livraison situé sur la parcelle au Sud de la parcelle (PDL).
L'emplacement du point de livraison indiqué dans les pièces graphiques de l'autorisation d'urbanisme n'apparaît qu'à titre indicatif.
Le positionnement du point de livraison et d'un transformateur (le cas échéant) demeure à l'appréciation finale du gestionnaire de réseau en fonction du site et des équipements déjà existants.

5- SECURITE INCENDIE
Une bâche à eau de 120m³ sera installée à proximité immédiate au Nord du futur bâtiment. Une aire d'aspiration de 4x8m et une aire de retournement de 22m de diamètre seront aménagées (Cf PC 02 - Plan de masse).${batteryStorage.enabled ? `\nLe système de stockage batterie est équipé de ses dispositifs de sécurité autonomes conformes aux prescriptions SDIS (détection thermique, coupure automatique d'urgence, système d'extinction dédié et bac de rétention).` : ''}`;
  }, [editedProject, project, config, buildings, additionalRoof, batteryStorage]);

  // Synchronisation continue des paramètres de configuration vers le bâtiment actif
  // Uses activeBuildingIndex from closure (deps array) — NOT a ref — to avoid
  // stale-index race conditions when Zustand triggers intermediate renders.
  useEffect(() => {
    if (isSwitchingBuildingRef.current) return;
    setBuildings(prev => {
      if (!prev[activeBuildingIndex]) return prev;
      const cur = prev[activeBuildingIndex];
      if (
        cur.length === config.length &&
        cur.width === config.width &&
        cur.eaveHeight === config.eaveHeight &&
        cur.roofPitch === config.roofPitch &&
        cur.buildingType === config.buildingType &&
        cur.leftSide === config.leftSide &&
        cur.rightSide === config.rightSide &&
        cur.bayCount === config.bayCount &&
        cur.baySpacing === config.baySpacing
      ) {
        return prev;
      }
      const upd = [...prev];
      upd[activeBuildingIndex] = {
        ...cur,
        length: config.length,
        width: config.width,
        eaveHeight: config.eaveHeight,
        roofPitch: config.roofPitch,
        buildingType: config.buildingType,
        leftSide: config.leftSide,
        rightSide: config.rightSide,
        bayCount: config.bayCount,
        baySpacing: config.baySpacing,
      };
      return upd;
    });
  }, [
    activeBuildingIndex,
    config.length,
    config.width,
    config.eaveHeight,
    config.roofPitch,
    config.buildingType,
    config.leftSide,
    config.rightSide,
    config.bayCount,
    config.baySpacing
  ]);

  // Gestion des bâtiments multiples
  const handleAddBuilding = () => {
    // Save current building with live store values
    const currentList = [...buildings];
    if (currentList[activeBuildingIndex]) {
      currentList[activeBuildingIndex] = {
        ...currentList[activeBuildingIndex],
        length: config.length,
        width: config.width,
        eaveHeight: config.eaveHeight,
        roofPitch: config.roofPitch,
        buildingType: config.buildingType,
        leftSide: config.leftSide,
        rightSide: config.rightSide,
        bayCount: config.bayCount,
        baySpacing: config.baySpacing,
      };
    }

    const newIdx = currentList.length + 1;
    const newBuilding = {
      id: `bat-${newIdx}`,
      name: `Bâtiment ${newIdx} (Secondaire)`,
      length: 24,
      width: 9.1,
      eaveHeight: 3,
      roofPitch: 10,
      buildingType: 'ombriere_vl_double',
      leftSide: 'none',
      rightSide: 'none',
      bayCount: 4,
      baySpacing: 6,
      rotation: 0,
      captures: {},
      photos: {}
    };
    const updated = [...currentList, newBuilding];
    const newIdxPos = updated.length - 1;

    isSwitchingBuildingRef.current = true;
    setBuildings(updated);
    setActiveBuildingIndex(newIdxPos);
    useConfiguratorStore.getState().loadBuildingConfig(newBuilding);
    setTimeout(() => {
      isSwitchingBuildingRef.current = false;
    }, 500);
  };

  const handleSelectBuilding = (index) => {
    if (index === activeBuildingIndex) return;

    // 1. Save current building with live store values before switching
    const updated = [...buildings];
    if (updated[activeBuildingIndex]) {
      updated[activeBuildingIndex] = {
        ...updated[activeBuildingIndex],
        length: config.length,
        width: config.width,
        eaveHeight: config.eaveHeight,
        roofPitch: config.roofPitch,
        buildingType: config.buildingType,
        leftSide: config.leftSide,
        rightSide: config.rightSide,
        bayCount: config.bayCount,
        baySpacing: config.baySpacing,
      };
    }

    // 2. Load target building into the store
    const target = updated[index];
    if (target) {
      isSwitchingBuildingRef.current = true;
      setBuildings(updated);
      setActiveBuildingIndex(index);
      useConfiguratorStore.getState().loadBuildingConfig(target);
      setTimeout(() => {
        isSwitchingBuildingRef.current = false;
      }, 500);
    }
  };

  const handleRemoveBuilding = (index, e) => {
    e.stopPropagation();
    if (buildings.length <= 1) return;
    const updated = buildings.filter((_, i) => i !== index);
    setBuildings(updated);
    setActiveBuildingIndex(0);
    const first = updated[0];
    if (first && configActions.loadBuildingConfig) {
      configActions.loadBuildingConfig(first);
    }
  };

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
        configActions.setBuildingType('asymetrique_1');
      }

      const initialNotice = project?.noticeText || buildAutoNoticeText();
      setNoticeText(initialNotice);

      const clientKwc = project?.kwc || project?.puissance || project?.projectSize || '';
      const shortObjet = (type === 'pc' || type === 'dp')
        ? `Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque${clientKwc ? ` de ${clientKwc} kWc` : ''}`
        : `Certificat d'urbanisme opérationnel pour centrale photovoltaïque${clientKwc ? ` de ${clientKwc} kWc` : ''}`;

      const initProj = {
        ...project,
        type: isOmbriere ? 'ombriere' : 'batiment_solaire',
        buildingType: isOmbriere ? 'ombriere_vl_double' : 'asymetrique_1',
        lastName: cleanDemandeur,
        firstName: names.firstName || '',
        demandeur: cleanDemandeur,
        email: projEmail,
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
        objet_travaux: shortObjet,
        description: shortObjet,
        noticeText: initialNotice,
        longueur: String(config.length || 30.0),
        largeur: String(config.width || 20.0),
        hauteur_egout: String(config.buildingType?.startsWith('asymetrique') ? 4.0 : (config.eaveHeight || 4.0)),
        pente: String(config.buildingType?.startsWith('asymetrique') ? 15 : (config.roofPitch || 15)),
        leftSide: config.leftSide || 'none',
        rightSide: config.rightSide || 'none',
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

  // Synchronisation continue des valeurs du configurateur vers le projet (sans écraser le kWc du client)
  useEffect(() => {
    if (config) {
      const isOmbriere = (config.buildingType || '').startsWith('ombriere');
      const category = isOmbriere ? 'ombriere' : 'batiment_solaire';
      const kwcEstimate = config.solarStats?.power ? Math.round(config.solarStats.power) : Math.round((config.width * config.length * 0.22) / 5) * 5;

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
          kwc: clientKwc,
          projectSize: clientKwc,
          puissance: clientKwc,
        };
      });
    }
  }, [config.width, config.length, config.eaveHeight, config.roofPitch, config.buildingType, config.leftSide, config.rightSide, config.solarStats, project?.kwc, project?.puissance, project?.projectSize]);

  // Mise à jour automatique de la notice si elle contient encore l'ancien template ou si on arrive sur l'étape 5
  useEffect(() => {
    if (step === 5 && (noticeText.includes("SAINT ARAILLES") || !noticeText)) {
      const auto = buildAutoNoticeText();
      setNoticeText(auto);
      setEditedProject(prev => ({ ...prev, noticeText: auto }));
    }
  }, [step, buildAutoNoticeText, noticeText]);

  // Sauvegarde simulation 3D après projet (PC6)
  const handleSaveSimulation = (simulatedDataUrl) => {
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].photos = { ...updated[activeBuildingIndex].photos, apres: simulatedDataUrl };
      }
      return updated;
    });
  };

  // Sauvegarde des captures de façades pour PC5
  const handleCaptureSnapshotPC5 = (dataUrl, slotKey = 'facade_sud') => {
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].captures = {
          ...updated[activeBuildingIndex].captures,
          [slotKey]: dataUrl,
          facades_projet: dataUrl
        };
      }
      return updated;
    });
  };

  const handleCaptureAll5ViewsPC5 = (fiveViewsObj) => {
    if (!fiveViewsObj) return;
    setBuildings(prev => {
      const updated = [...prev];
      if (updated[activeBuildingIndex]) {
        updated[activeBuildingIndex].captures = {
          ...updated[activeBuildingIndex].captures,
          ...fiveViewsObj,
          facades_projet: fiveViewsObj.facade_sud || fiveViewsObj.vue_couverture || updated[activeBuildingIndex].captures?.facades_projet
        };
      }
      return updated;
    });
  };

  // Recadrage & Sélection Photo
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
    const clientKwc = project?.kwc || project?.puissance || project?.projectSize || editedProject?.kwc || '';
    
    // Objet synthétique pour Page 1
    const shortObjet = (type === 'pc' || type === 'dp')
      ? `Construction d'un bâtiment agricole à charpente métallique avec toiture photovoltaïque${clientKwc ? ` de ${clientKwc} kWc` : ''}`
      : `Certificat d'urbanisme opérationnel pour centrale photovoltaïque${clientKwc ? ` de ${clientKwc} kWc` : ''}`;

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
          bayCount: config.bayCount,
          baySpacing: config.baySpacing,
          captures: { ...(b.captures || {}) },
          photos: { ...(b.photos || {}) },
        };
      }
      return b;
    });

    const isMultiOrOmbriere = updatedBuildings.length > 1 || updatedBuildings.some(b => (b.buildingType || '').includes('ombriere'));
    const finalTypeLabel = isMultiOrOmbriere ? 'Bâtiment et Ombrière' : (editedProject.type || 'batiment_solaire');

    // Régénérer les cartes PC1 et PC2 avec le dernier GPS et les bâtiments orientés
    const gps = editedProject?.gps || `${editedProject?.lat || 43.5612},${editedProject?.lng || 0.9168}`;
    const [lat, lng] = gps.split(',').map(Number);
    const ignMap = await generateStaticMapImage(lat, lng, 'map', 16);
    const satMap = await generateStaticMapImage(lat, lng, 'satellite', 17);
    const masseMap = await generateStaticMapImage(lat, lng, 'map', 19, updatedBuildings);

    const finalCaptures = {
      ...captures,
      ...(ignMap ? { ign: ignMap } : {}),
      ...(satMap ? { satellite: satMap } : {}),
      ...(masseMap ? { masse_projet: masseMap } : {}),
    };

    const finalProject = {
      ...editedProject,
      ...fieldValues,
      buildingType: config.buildingType || 'asymetrique_1',
      type: finalTypeLabel,
      installationType: finalTypeLabel,
      largeur: String(config.width || 20.0),
      longueur: String(config.length || 30.0),
      hauteur_egout: String(config.buildingType?.startsWith('asymetrique') ? 4.0 : (config.eaveHeight || 4.0)),
      pente: String(config.buildingType?.startsWith('asymetrique') ? 15 : (config.roofPitch || 15)),
      leftSide: config.leftSide || 'none',
      rightSide: config.rightSide || 'none',
      bayCount: config.bayCount,
      baySpacing: config.baySpacing,
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
      pc_photos: photos,
      buildings: updatedBuildings,
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

  const summary = buildCerfaDataSummary({ ...editedProject, ...fieldValues, puissance: '0', kwc: '0', type: 'Bâtiment et Ombrière', buildings }, editedProject.type || 'batiment_solaire');
  const STEPS = ['Déclarant', 'Cartes PC1', 'Cotations & Côtes', 'Photos', 'Carte PC2', 'Notice Descriptive', 'Validation'];

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

              {/* ÉTAPE 1 — Cartes PC1 */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Étape 2 : Cartographie PC1 (Plan de Situation & Satellite)</h3>
                      <p className="text-xs text-gray-500">Déplacez le marqueur sur une des cartes pour ajuster l'emplacement du projet.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col">
                      <span className="text-xs font-bold text-gray-700 block mb-2">PC1 — Plan de Situation (IGN Cartographique)</span>
                      <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 z-10 flex-1 min-h-[260px]">
                        {(() => {
                          const gps = editedProject?.gps || `${editedProject?.lat || 43.5612},${editedProject?.lng || 0.9168}`;
                          const [lat, lng] = gps.split(',').map(Number);
                          return (
                            <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={true} style={{ height: '100%', minHeight: '260px', width: '100%' }}>
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

                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col">
                      <span className="text-xs font-bold text-gray-700 block mb-2">PC1 — Vue Aérienne Satellite</span>
                      <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 z-10 flex-1 min-h-[260px]">
                        {(() => {
                          const gps = editedProject?.gps || `${editedProject?.lat || 43.5612},${editedProject?.lng || 0.9168}`;
                          const [lat, lng] = gps.split(',').map(Number);
                          return (
                            <MapContainer center={[lat, lng]} zoom={17} scrollWheelZoom={true} style={{ height: '100%', minHeight: '260px', width: '100%' }}>
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
                </motion.div>
              )}

              {/* ÉTAPE 2 — Configurateur 2D/3D avec support Multi-Bâtiments */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-3 flex flex-col h-[64vh] overflow-hidden bg-slate-100/70 rounded-2xl gap-2">
                  
                  {/* Sélecteur multi-bâtiments */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" /> Bâtiments :
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
                          <span>{b.name || `Bâtiment ${idx + 1}`}</span>
                          <span className="text-[10px] opacity-75 font-normal">
                            ({(b.width || config.width).toFixed(1)}m × {(b.length || config.length).toFixed(1)}m)
                          </span>
                          {idx > 0 && (
                            <span
                              onClick={(e) => handleRemoveBuilding(idx, e)}
                              className="ml-1 p-0.5 hover:bg-red-500 hover:text-white rounded text-slate-400 transition-colors"
                              title="Supprimer ce bâtiment secondaire"
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
                        Ajouter un bâtiment
                      </button>
                    </div>
                  </div>

                  {/* Scène & Panneau */}
                  <div className="flex-1 flex flex-col lg:flex-row gap-3.5 min-h-0 overflow-hidden">
                    {/* Panneau de contrôle gauche */}
                    <div className="w-full lg:w-[410px] h-full overflow-y-auto pr-1">
                      <ControlPanel isAcama={false} selectedProject={editedProject} />
                    </div>

                    {/* Scène 3D droite */}
                    <div className="flex-1 relative h-full rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-200 shadow-sm isolate">
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

                      {/* Rendu Canvas BuildingScene */}
                      <div className="w-full h-full">
                        <BuildingScene viewMode={viewMode} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 3 — Visionneuse 3D (PC5 5 VUES) & Insertion Paysagère 3D (PC6) */}
              {step === 3 && (() => {
                const currentPhotos = buildings[activeBuildingIndex]?.photos || {};
                const currentCaptures = buildings[activeBuildingIndex]?.captures || {};
                return (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Étape 4 : Photos, Façades & Insertion Paysagère 3D</h3>
                      <p className="text-xs text-gray-500">Capturez les 5 vues de façades pour la PC5 et positionnez le modèle 3D sur votre photo de terrain pour la PC6.</p>
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
                            {b.name || `Bâtiment ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* PC5 — 5 Vues Façades & Toitures */}
                    <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 text-center flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-blue-600" /> PC5 — Plan des Façades & Toitures (5 Vues 3D)
                        </span>
                        {currentCaptures?.facade_sud ? (
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
                        {currentPhotos?.apres ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Simulation Prête</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">À ajuster</span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-center">
                        {currentPhotos?.avant ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Photo Avant */}
                              <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 group">
                                <img src={currentPhotos.avant} alt="Avant" className="w-full h-full object-cover" />
                                <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Avant</span>
                                
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                  <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                                    <Upload className="w-3.5 h-3.5" />
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'avant', 'Photo Terrain Avant', e)} />
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
                              <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 bg-gray-100 flex items-center justify-center group">
                                {currentPhotos?.apres ? (
                                  <>
                                    <img src={currentPhotos.apres} alt="Après" className="w-full h-full object-cover" />
                                    <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Après (3D)</span>
                                    
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
                        {currentPhotos?.proche ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {currentPhotos?.proche ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={currentPhotos.proche} alt="Env Proche" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                              <Upload className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'proche', 'Environnement Proche', e)} />
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
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'proche', 'Environnement Proche', e)} />
                        </label>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 text-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700">PC8 — Environnement Lointain</span>
                        {currentPhotos?.lointain ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Chargée</span> : <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>}
                      </div>
                      {currentPhotos?.lointain ? (
                        <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                          <img src={currentPhotos.lointain} alt="Env Lointain" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            <label title="Remplacer la photo" className="cursor-pointer p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-all hover:scale-105">
                              <Upload className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'lointain', 'Environnement Lointain', e)} />
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
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelectForCrop('photos', 'lointain', 'Environnement Lointain', e)} />
                        </label>
                      )}
                    </div>
                  </div>
                </motion.div>
                );
              })()}

              {/* ÉTAPE 4 — Carte PC2 (Plan de masse dynamique par bâtiment) */}
              {step === 4 && (
                <motion.div
                  key="step4-pc2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-4 overflow-y-auto max-h-[70vh]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">
                        Étape 5 : PC2 — Plan de Masse ({buildings.length} bâtiment{buildings.length > 1 ? 's' : ''})
                      </h3>
                      <p className="text-xs text-gray-500">
                        Visualisez et ajustez l'emprise au sol et l'orientation de chaque bâtiment à l'échelle sur le plan cadastral (OSM Zoom 19).
                      </p>
                    </div>
                  </div>

                  <div className={`grid ${buildings.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    {buildings.map((b, bIdx) => {
                      const gps = editedProject?.gps || `${editedProject?.lat || 43.5612},${editedProject?.lng || 0.9168}`;
                      const [lat, lng] = gps.split(',').map(Number);
                      const bLength = Number(b.length || config.length || 30);
                      const bWidth = Number(b.width || config.width || 20);
                      const currentRotation = Number(b.rotation || 0);

                      return (
                        <div key={b.id || bIdx} className="border border-gray-200 rounded-2xl p-4 bg-gray-50 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              PC2 — Plan de Masse : {b.name || `Bâtiment ${bIdx + 1}`}
                            </span>
                            <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {bLength.toFixed(1)}m × {bWidth.toFixed(1)}m ({Math.round(bLength * bWidth)} m²)
                            </span>
                          </div>

                          {/* Contrôle de Rotation libre du bâtiment sur la carte */}
                          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs shadow-2xs">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                              <Compass className="w-3.5 h-3.5 text-blue-600" />
                              <span>Rotation :</span>
                              <span className="text-blue-600 font-extrabold">{currentRotation}°</span>
                            </div>

                            <div className="flex items-center gap-2 flex-1 max-w-[180px]">
                              <input
                                type="range"
                                min="0"
                                max="360"
                                step="5"
                                value={currentRotation}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setBuildings(prev => {
                                    const upd = [...prev];
                                    if (upd[bIdx]) upd[bIdx] = { ...upd[bIdx], rotation: val };
                                    return upd;
                                  });
                                }}
                                className="w-full accent-blue-600 cursor-pointer"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              {[-90, 0, 45, 90, 180].map((deg) => (
                                <button
                                  key={deg}
                                  type="button"
                                  onClick={() => {
                                    const newRot = (deg + 360) % 360;
                                    setBuildings(prev => {
                                      const upd = [...prev];
                                      if (upd[bIdx]) upd[bIdx] = { ...upd[bIdx], rotation: newRot };
                                      return upd;
                                    });
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    currentRotation === ((deg + 360) % 360)
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {deg > 0 ? `+${deg}°` : `${deg}°`}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200 z-10 flex-1 min-h-[260px]">
                            <MapContainer center={[lat, lng]} zoom={19} scrollWheelZoom={true} style={{ height: '100%', minHeight: '260px', width: '100%' }}>
                              <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                                maxZoom={21}
                                maxNativeZoom={19}
                              />
                              <MapResizer />
                              <MapSyncCenter lat={lat} lng={lng} />
                              <DraggableLocationMarker lat={lat} lng={lng} setGps={handleGpsUpdate} />
                              <PC2ScaledBuildingOverlay
                                bLength={bLength}
                                bWidth={bWidth}
                                rotation={currentRotation}
                                label={`${b.name || `Bâtiment ${bIdx + 1}`} (${currentRotation}°)`}
                              />
                              <PC2MapScaleBar />
                            </MapContainer>
                          </div>
                          <p className="text-[10px] text-gray-500 text-center">
                            Zoom et dézoom libres • Déplacez le repère et pivotez l'emprise pour ajuster l'implantation
                          </p>
                        </div>
                      );
                    })}
                  </div>
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
                          Étape 6 : Notice d'insertion & Descriptive du projet (PC4)
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Complétez et personnalisez les 5 points de la notice. Ce texte est injecté dans la planche PC4 et restera modifiable dans le PDF final.
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
                          <span className="flex items-center gap-1 text-blue-600"><Building2 className="w-3.5 h-3.5" /> {buildings.length} Bâtiment(s)</span>
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
                        { id: 'section', code: 'DP3', title: 'Plan en coupe', desc: 'Coupe transversale du bâtiment', badge: 'Obligatoire', color: 'indigo' },
                        { id: 'facades', code: 'DP4', title: 'Façades & Toitures', desc: 'Vues des élévations et toiture', badge: '3D', color: 'emerald' },
                        { id: 'insertion', code: 'DP6', title: 'Insertion paysagère', desc: 'Simulation d\'intégration paysagère', badge: 'Photo 3D', color: 'emerald' },
                        { id: 'env', code: 'DP7+DP8', title: 'Env. Proche & Lointain', desc: 'Photographies d\'ambiance', badge: 'Optionnel', color: 'purple' },
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
