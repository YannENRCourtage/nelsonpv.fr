// src/lib/nomenclature.js

// Données de configuration centralisées pour la carte et les symboles.
// Ce module fournit un export nommé `mapData` attendu par les composants.

export const DEFAULT_CENTER = [46.6, 2.2]; // France
export const DEFAULT_ZOOM = 6;

export const mapData = {
  // Fonds de carte (LayersControl)
  layers: {
    // Fond "standard" OSM
    standard: {
      key: "standard",
      name: "Plan (OSM)",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      selected: true,
      minZoom: 2,
      maxZoom: 19
    },

    // Fond satellite (sans clé API) — Esri World Imagery
    satellite: {
      key: "satellite",
      name: "Satellite (Esri)",
      url:
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics',
      selected: false,
      minZoom: 2,
      maxZoom: 20
    },

    // Cadastre (tuile publique OSM France / DGFIP)
    cadastre: {
      key: "cadastre",
      name: "Cadastre",
      url: "https://tiles.osmfr.org/cadastre/{z}/{x}/{y}.png",
      attribution:
        'Cadastre &copy; <a href="https://www.data.gouv.fr/fr/datasets/cadastre/">DGFiP</a> — Tiles &copy; <a href="https://www.openstreetmap.fr/">OSM France</a>',
      selected: false,
      minZoom: 2,
      maxZoom: 20
    }
  },

  // Symboles proposés dans le panneau (tu peux adapter l’emoji / couleur si besoin)
  symbols: [
    { key: "site",       label: "Lieu Projet", emoji: "📍", color: "#ef4444" },
    { key: "access",     label: "Accès",       emoji: "🚪", color: "#8b5cf6" },
    { key: "house",      label: "Maison",      emoji: "🏠", color: "#059669" },
    { key: "sdis",       label: "SDIS",        emoji: "🚒", color: "#fb923c" },
    { key: "transformer",label: "Transfo",     emoji: "⚡", color: "#f59e0b" },
    { key: "pdl",        label: "PDL",         emoji: "📦", color: "#06b6d4" },
    { key: "neighbor",   label: "Voisin",      emoji: "👥", color: "#10b981" },
    { key: "measure",    label: "Ligne/Mesure",emoji: "📏", color: "#64748b" }
  ]
};

// Optionnel : helpers simples si tu veux t’en servir dans les composants
export const getBaseLayers = () => Object.values(mapData.layers);
export const getSymbols   = () => mapData.symbols;