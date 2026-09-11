/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECHOIR PROSPECTING GIS SERVICE
 * Sourcing géospatial et agronomique pour la prospection automatique de séchoirs BatiTech®
 * 1. Recherche géographique : par Commune ou par Département (geo.api.gouv.fr)
 * 2. Extraction des parcelles agricoles officielles IGN RPG 2024 (IGN Géoplateforme WFS)
 * 3. Regroupement par exploitation agricole via le numéro PACAGE officiel
 * 4. Agronomie : Mapping des codes cultures RPG vers les 5 filières BatiTech
 *    (Fourrage vrac, Bottes carrées, Blé tendre, Maïs grain, Plaquettes bois)
 *    et conversion en tonnages annuels de matière sèche (t MS/an)
 * 5. Qualification géographique & postale : BAN (Base Adresse Nationale) et Cadastre
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── 1. LISTE OFFICIELLE DES DÉPARTEMENTS FRANÇAIS ─────────────────────────────
export const DEPARTEMENTS_FRANCE = [
  { code: '01', nom: 'Ain', region: 'Auvergne-Rhône-Alpes' },
  { code: '02', nom: 'Aisne', region: 'Hauts-de-France' },
  { code: '03', nom: 'Allier', region: 'Auvergne-Rhône-Alpes' },
  { code: '04', nom: 'Alpes-de-Haute-Provence', region: "Provence-Alpes-Côte d'Azur" },
  { code: '05', nom: 'Hautes-Alpes', region: "Provence-Alpes-Côte d'Azur" },
  { code: '06', nom: 'Alpes-Maritimes', region: "Provence-Alpes-Côte d'Azur" },
  { code: '07', nom: 'Ardèche', region: 'Auvergne-Rhône-Alpes' },
  { code: '08', nom: 'Ardennes', region: 'Grand Est' },
  { code: '09', nom: 'Ariège', region: 'Occitanie' },
  { code: '10', nom: 'Aube', region: 'Grand Est' },
  { code: '11', nom: 'Aude', region: 'Occitanie' },
  { code: '12', nom: 'Aveyron', region: 'Occitanie' },
  { code: '13', nom: 'Bouches-du-Rhône', region: "Provence-Alpes-Côte d'Azur" },
  { code: '14', nom: 'Calvados', region: 'Normandie' },
  { code: '15', nom: 'Cantal', region: 'Auvergne-Rhône-Alpes' },
  { code: '16', nom: 'Charente', region: 'Nouvelle-Aquitaine' },
  { code: '17', nom: 'Charente-Maritime', region: 'Nouvelle-Aquitaine' },
  { code: '18', nom: 'Cher', region: 'Centre-Val de Loire' },
  { code: '19', nom: 'Corrèze', region: 'Nouvelle-Aquitaine' },
  { code: '21', nom: "Côte-d'Or", region: 'Bourgogne-Franche-Comté' },
  { code: '22', nom: "Côtes-d'Armor", region: 'Bretagne' },
  { code: '23', nom: 'Creuse', region: 'Nouvelle-Aquitaine' },
  { code: '24', nom: 'Dordogne', region: 'Nouvelle-Aquitaine' },
  { code: '25', nom: 'Doubs', region: 'Bourgogne-Franche-Comté' },
  { code: '26', nom: 'Drôme', region: 'Auvergne-Rhône-Alpes' },
  { code: '27', nom: 'Normandie', region: 'Normandie' },
  { code: '28', nom: 'Eure-et-Loir', region: 'Centre-Val de Loire' },
  { code: '29', nom: 'Finistère', region: 'Bretagne' },
  { code: '2A', nom: 'Corse-du-Sud', region: 'Corse' },
  { code: '2B', nom: 'Haute-Corse', region: 'Corse' },
  { code: '30', nom: 'Gard', region: 'Occitanie' },
  { code: '31', nom: 'Haute-Garonne', region: 'Occitanie' },
  { code: '32', nom: 'Gers', region: 'Occitanie' },
  { code: '33', nom: 'Gironde', region: 'Nouvelle-Aquitaine' },
  { code: '34', nom: 'Hérault', region: 'Occitanie' },
  { code: '35', nom: 'Ille-et-Vilaine', region: 'Bretagne' },
  { code: '36', nom: 'Indre', region: 'Centre-Val de Loire' },
  { code: '37', nom: 'Indre-et-Loire', region: 'Centre-Val de Loire' },
  { code: '38', nom: 'Isère', region: 'Auvergne-Rhône-Alpes' },
  { code: '39', nom: 'Jura', region: 'Bourgogne-Franche-Comté' },
  { code: '40', nom: 'Landes', region: 'Nouvelle-Aquitaine' },
  { code: '41', nom: 'Loir-et-Cher', region: 'Centre-Val de Loire' },
  { code: '42', nom: 'Loire', region: 'Auvergne-Rhône-Alpes' },
  { code: '43', nom: 'Haute-Loire', region: 'Auvergne-Rhône-Alpes' },
  { code: '44', nom: 'Loire-Atlantique', region: 'Pays de la Loire' },
  { code: '45', nom: 'Loiret', region: 'Centre-Val de Loire' },
  { code: '46', nom: 'Lot', region: 'Occitanie' },
  { code: '47', nom: 'Lot-et-Garonne', region: 'Nouvelle-Aquitaine' },
  { code: '48', nom: 'Lozère', region: 'Occitanie' },
  { code: '49', nom: 'Maine-et-Loire', region: 'Pays de la Loire' },
  { code: '50', nom: 'Manche', region: 'Normandie' },
  { code: '51', nom: 'Marne', region: 'Grand Est' },
  { code: '52', nom: 'Haute-Marne', region: 'Grand Est' },
  { code: '53', nom: 'Mayenne', region: 'Pays de la Loire' },
  { code: '54', nom: 'Meurthe-et-Moselle', region: 'Grand Est' },
  { code: '55', nom: 'Meuse', region: 'Grand Est' },
  { code: '56', nom: 'Morbihan', region: 'Bretagne' },
  { code: '57', nom: 'Moselle', region: 'Grand Est' },
  { code: '58', nom: 'Nièvre', region: 'Bourgogne-Franche-Comté' },
  { code: '59', nom: 'Nord', region: 'Hauts-de-France' },
  { code: '60', nom: 'Oise', region: 'Hauts-de-France' },
  { code: '61', nom: 'Orne', region: 'Normandie' },
  { code: '62', nom: 'Pas-de-Calais', region: 'Hauts-de-France' },
  { code: '63', nom: 'Puy-de-Dôme', region: 'Auvergne-Rhône-Alpes' },
  { code: '64', nom: 'Pyrénées-Atlantiques', region: 'Nouvelle-Aquitaine' },
  { code: '65', nom: 'Hautes-Pyrénées', region: 'Occitanie' },
  { code: '66', nom: 'Pyrénées-Orientales', region: 'Occitanie' },
  { code: '67', nom: 'Bas-Rhin', region: 'Grand Est' },
  { code: '68', nom: 'Haut-Rhin', region: 'Grand Est' },
  { code: '69', nom: 'Rhône', region: 'Auvergne-Rhône-Alpes' },
  { code: '70', nom: 'Haute-Saône', region: 'Bourgogne-Franche-Comté' },
  { code: '71', nom: 'Saône-et-Loire', region: 'Bourgogne-Franche-Comté' },
  { code: '72', nom: 'Sarthe', region: 'Pays de la Loire' },
  { code: '73', nom: 'Savoie', region: 'Auvergne-Rhône-Alpes' },
  { code: '74', nom: 'Haute-Savoie', region: 'Auvergne-Rhône-Alpes' },
  { code: '75', nom: 'Paris', region: 'Île-de-France' },
  { code: '76', nom: 'Seine-Maritime', region: 'Normandie' },
  { code: '77', nom: 'Seine-et-Marne', region: 'Île-de-France' },
  { code: '78', nom: 'Yvelines', region: 'Île-de-France' },
  { code: '79', nom: 'Deux-Sèvres', region: 'Nouvelle-Aquitaine' },
  { code: '80', nom: 'Somme', region: 'Hauts-de-France' },
  { code: '81', nom: 'Tarn', region: 'Occitanie' },
  { code: '82', nom: 'Tarn-et-Garonne', region: 'Occitanie' },
  { code: '83', nom: 'Var', region: "Provence-Alpes-Côte d'Azur" },
  { code: '84', nom: 'Vaucluse', region: "Provence-Alpes-Côte d'Azur" },
  { code: '85', nom: 'Vendée', region: 'Pays de la Loire' },
  { code: '86', nom: 'Vienne', region: 'Nouvelle-Aquitaine' },
  { code: '87', nom: 'Haute-Vienne', region: 'Nouvelle-Aquitaine' },
  { code: '88', nom: 'Vosges', region: 'Grand Est' },
  { code: '89', nom: 'Yonne', region: 'Bourgogne-Franche-Comté' },
  { code: '90', nom: 'Territoire de Belfort', region: 'Bourgogne-Franche-Comté' },
  { code: '91', nom: 'Essonne', region: 'Île-de-France' },
  { code: '92', nom: 'Hauts-de-Seine', region: 'Île-de-France' },
  { code: '93', nom: 'Seine-Saint-Denis', region: 'Île-de-France' },
  { code: '94', nom: 'Val-de-Marne', region: 'Île-de-France' },
  { code: '95', nom: "Val-d'Oise", region: 'Île-de-France' },
];

// ─── 2. MAPPING CODES CULTURES RPG -> 5 FILIÈRES BATITECH ───────────────────────
export const RPG_BATITECH_CROP_MAPPING = {
  // 1. Fourrage en vrac (Luzerne, trèfle, sainfoin, prairies permanentes, etc.)
  fourrage_vrac: {
    id: 'fourrage_vrac',
    label: 'Fourrage vrac (Herbe/Luzerne)',
    icon: '🌿',
    yieldPerHa: 6.0, // t MS / ha
    plusValueQualite: 55, // € / t
    economieEnergie: 10,  // € / t
    codes: [
      'PPH', 'PTR', 'LUZ', 'TRF', 'SAI', 'LOT', 'MLG', 'VES', 'J6P', 'J6S', 'LEG', 'PRA', 'VRP'
    ]
  },

  // 2. Bottes carrées (Foin haute densité)
  bottes_carrees: {
    id: 'bottes_carrees',
    label: 'Bottes carrées (Foin HD)',
    icon: '📦',
    yieldPerHa: 6.0,
    plusValueQualite: 50,
    economieEnergie: 12,
    codes: [
      'MLC', 'PRL', 'SNE', 'SPL', 'J5M'
    ]
  },

  // 3. Blé tendre & Céréales à paille
  cereales_ble: {
    id: 'cereales_ble',
    label: 'Blé tendre & Céréales à paille',
    icon: '🌾',
    yieldPerHa: 7.5,
    plusValueQualite: 25,
    economieEnergie: 10,
    codes: [
      'BTH', 'BTP', 'EPE', 'BDH', 'BDP', 'SEI', 'TRT', 'AVH', 'AVP', 'ORH', 'ORP', 'CWH', 'CWP'
    ]
  },

  // 4. Maïs grain
  cereales_mais: {
    id: 'cereales_mais',
    label: 'Maïs grain',
    icon: '🌽',
    yieldPerHa: 7.0,
    plusValueQualite: 35,
    economieEnergie: 15,
    codes: [
      'MIS', 'MID', 'MIE', 'MSD', 'SOG'
    ]
  },

  // 5. Plaquettes bois & Biomasse forestière
  plaquettes_bois: {
    id: 'plaquettes_bois',
    label: 'Plaquettes bois & Biomasse',
    icon: '🪵',
    yieldPerHa: 10.0,
    plusValueQualite: 30,
    economieEnergie: 8,
    codes: [
      'TCR', 'BOD', 'BOP', 'FRT', 'MHG', 'CHA'
    ]
  }
};

// Map inversée pour recherche O(1) : codeCulture -> streamId
const CROP_CODE_TO_STREAM = {};
Object.entries(RPG_BATITECH_CROP_MAPPING).forEach(([streamId, stream]) => {
  stream.codes.forEach(code => {
    CROP_CODE_TO_STREAM[code.toUpperCase()] = streamId;
  });
});

// ─── 3. CALCULS GÉOMÉTRIQUES ───────────────────────────────────────────────────

export function calculateCentroid(points) {
  if (!points || points.length === 0) return [44.8412, -0.5805];
  let sumLat = 0;
  let sumLng = 0;
  points.forEach(p => {
    sumLat += p[0];
    sumLng += p[1];
  });
  return [sumLat / points.length, sumLng / points.length];
}

// ─── 4. RECHERCHE DE COMMUNES & DÉPARTEMENTS ───────────────────────────────────

export async function searchCommunes(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const isCodePostal = /^\d{2,5}$/.test(q);
  const url = isCodePostal
    ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(q)}&fields=nom,code,codesPostaux,centre,contour,bbox,departement,population&limit=8`
    : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codesPostaux,centre,contour,bbox,departement,population&boost=population&limit=8`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const communes = await res.json();
    return communes.map(c => {
      let bbox = null;
      if (c.bbox && c.bbox.coordinates && c.bbox.coordinates[0]) {
        const ring = c.bbox.coordinates[0];
        const lngs = ring.map(pt => pt[0]);
        const lats = ring.map(pt => pt[1]);
        bbox = {
          minLat: Math.min(...lats),
          minLng: Math.min(...lngs),
          maxLat: Math.max(...lats),
          maxLng: Math.max(...lngs)
        };
      }
      return {
        id: c.code,
        nom: c.nom,
        codeInsee: c.code,
        postalCode: c.codesPostaux?.[0] || '',
        departmentCode: c.departement?.code || (c.code ? c.code.substring(0, 2) : '33'),
        center: c.centre ? [c.centre.coordinates[1], c.centre.coordinates[0]] : [44.8412, -0.5805],
        bbox,
        population: c.population || 0
      };
    });
  } catch (err) {
    console.error('Erreur recherche communes geo.api.gouv.fr:', err);
    return [];
  }
}

export async function fetchDepartmentCommunes(deptCode, limit = 20) {
  if (!deptCode) return [];
  const cleanCode = String(deptCode).padStart(2, '0');
  const url = `https://geo.api.gouv.fr/departements/${cleanCode}/communes?fields=nom,code,codesPostaux,centre,bbox,population&limit=${limit}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const communes = await res.json();
    return communes
      .map(c => {
        let bbox = null;
        if (c.bbox && c.bbox.coordinates && c.bbox.coordinates[0]) {
          const ring = c.bbox.coordinates[0];
          const lngs = ring.map(pt => pt[0]);
          const lats = ring.map(pt => pt[1]);
          bbox = {
            minLat: Math.min(...lats),
            minLng: Math.min(...lngs),
            maxLat: Math.max(...lats),
            maxLng: Math.max(...lngs)
          };
        }
        return {
          id: c.code,
          nom: c.nom,
          codeInsee: c.code,
          postalCode: c.codesPostaux?.[0] || '',
          departmentCode: cleanCode,
          center: c.centre ? [c.centre.coordinates[1], c.centre.coordinates[0]] : [44.8412, -0.5805],
          bbox,
          population: c.population || 0
        };
      })
      .filter(c => c.bbox !== null);
  } catch (err) {
    console.error(`Erreur fetch communes pour le département ${deptCode}:`, err);
    return [];
  }
}

// ─── 5. REVERSE GÉOCODAGE BAN ──────────────────────────────────────────────────

export async function reverseGeocodeBAN(lat, lng) {
  if (!lat || !lng) {
    return {
      addressLabel: 'Exploitation Agricole',
      street: '',
      postalCode: '',
      city: '',
      context: ''
    };
  }

  const url = `https://api-adresse.data.gouv.fr/reverse/?lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('BAN reverse failed');
    const data = await res.json();
    const features = data.features || [];
    const feature = features.find(f => f.properties?.type === 'housenumber')
      || features.find(f => f.properties?.type === 'street')
      || features[0];

    if (feature && feature.properties) {
      const p = feature.properties;
      const banLon = feature.geometry?.coordinates?.[0];
      const banLat = feature.geometry?.coordinates?.[1];
      const hasValidCoords = typeof banLat === 'number' && typeof banLon === 'number' && !isNaN(banLat) && !isNaN(banLon);
      const cleanLabel = (p.name && p.city)
        ? `${p.name}, ${p.postcode || ''} ${p.city}`.trim()
        : (p.label || `${p.name || ''}, ${p.postcode || ''} ${p.city || ''}`.trim());
      return {
        addressLabel: cleanLabel,
        street: p.name || '',
        postalCode: p.postcode || '',
        city: p.city || '',
        context: p.context || '',
        latitude: hasValidCoords ? banLat : lat,
        longitude: hasValidCoords ? banLon : lng,
        coordinates: hasValidCoords ? [banLat, banLon] : [lat, lng]
      };
    }
  } catch (err) {
    // Fallback
  }

  return {
    addressLabel: `Exploitation Agricole (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    street: '',
    postalCode: '',
    city: '',
    context: '',
    latitude: lat,
    longitude: lng,
    coordinates: [lat, lng]
  };
}

// ─── 6. EXTRACTION DES PARCELLES RPG (IGN GÉOPLATEFORME WFS) ─────────────────────

export async function fetchRpgParcelsInBbox(bbox, count = 250) {
  if (!bbox) return [];

  const bboxStr = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`;
  const layer = 'IGNF_RPG_PARCELLES-AGRICOLES-CATEGORISEES_2024:parcelles_agricole_categorisees_2024';
  const url = `https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${encodeURIComponent(layer)}&OUTPUTFORMAT=application/json&COUNT=${count}&BBOX=${bboxStr},urn:ogc:def:crs:EPSG::4326`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(18000) });
    if (!res.ok) {
      console.warn(`WFS RPG a répondu HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.features || [];
  } catch (err) {
    console.warn('Erreur interrogation WFS RPG 2024:', err.message);
    return [];
  }
}

// ─── 7. REGROUPEMENT PAR PACAGE & CALCUL DES TONNAGES AGRO ─────────────────────

export function groupParcelsByPacage(features = []) {
  if (!features || features.length === 0) return [];

  const farmsByPacage = {};

  for (const f of features) {
    const p = f.properties || {};
    const pacage = p.pacage || `PAC_${Math.floor(Math.random() * 9000000 + 1000000)}`;
    const surfaceHa = Number(p.sf_adm_de || p.sf_adm_co || 0);
    const cropCode = (p.code_cultu || 'AUTRE').toUpperCase();

    if (!farmsByPacage[pacage]) {
      farmsByPacage[pacage] = {
        pacage,
        parcelsCount: 0,
        totalAreaHa: 0,
        cropsSummary: {},
        streamsAreaHa: {
          fourrage_vrac: 0,
          bottes_carrees: 0,
          cereales_ble: 0,
          cereales_mais: 0,
          plaquettes_bois: 0,
        },
        streamTonnages: {
          fourrage_vrac: 0,
          bottes_carrees: 0,
          cereales_ble: 0,
          cereales_mais: 0,
          plaquettes_bois: 0,
        },
        totalDryTonnage: 0,
        coordinates: [],
        bioFlag: p.bio === 1 || p.bio === '1'
      };
    }

    const farm = farmsByPacage[pacage];
    farm.parcelsCount++;
    farm.totalAreaHa += surfaceHa;
    farm.cropsSummary[cropCode] = (farm.cropsSummary[cropCode] || 0) + surfaceHa;

    // Mapping filières BatiTech
    const streamId = CROP_CODE_TO_STREAM[cropCode];
    if (streamId && farm.streamsAreaHa[streamId] !== undefined) {
      farm.streamsAreaHa[streamId] += surfaceHa;
      const mapping = RPG_BATITECH_CROP_MAPPING[streamId];
      const yieldPerHa = mapping?.yieldPerHa || 6.0;
      const tonnage = surfaceHa * yieldPerHa;
      farm.streamTonnages[streamId] += tonnage;
      farm.totalDryTonnage += tonnage;
    }

    const geom = f.geometry;
    if (geom?.coordinates) {
      let samplePt = null;
      if (geom.type === 'MultiPolygon' && geom.coordinates[0]?.[0]?.[0]) {
        samplePt = [geom.coordinates[0][0][0][1], geom.coordinates[0][0][0][0]];
      } else if (geom.type === 'Polygon' && geom.coordinates[0]?.[0]) {
        samplePt = [geom.coordinates[0][0][1], geom.coordinates[0][0][0]];
      } else if (geom.type === 'Point' && geom.coordinates) {
        samplePt = [geom.coordinates[1], geom.coordinates[0]];
      }
      if (samplePt && !isNaN(samplePt[0]) && !isNaN(samplePt[1])) {
        farm.coordinates.push(samplePt);
      }
    }
  }

  const qualifiedFarms = Object.values(farmsByPacage).map(farm => {
    const centroid = farm.coordinates.length > 0
      ? calculateCentroid(farm.coordinates)
      : [44.8412, -0.5805];

    farm.totalAreaHa = Math.round(farm.totalAreaHa * 10) / 10;
    farm.totalDryTonnage = Math.round(farm.totalDryTonnage * 10) / 10;
    Object.keys(farm.streamsAreaHa).forEach(s => {
      farm.streamsAreaHa[s] = Math.round(farm.streamsAreaHa[s] * 10) / 10;
      farm.streamTonnages[s] = Math.round(farm.streamTonnages[s] * 10) / 10;
    });

    return {
      ...farm,
      centroid
    };
  });

  return qualifiedFarms
    .filter(f => f.totalDryTonnage >= 10 || f.totalAreaHa >= 3)
    .sort((a, b) => b.totalDryTonnage - a.totalDryTonnage);
}
