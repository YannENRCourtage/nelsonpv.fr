// API Serverless Vercel - Résolution Téléservice Mairie & Guichet SVE

const portalCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function safeParseJson(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// Portails intercommunaux connus / plateformes régionales
const KNOWN_PORTALS_BY_INSEE = {
  // Bordeaux Métropole
  '33063': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole' },
  '33318': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Pessac)' },
  '33281': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Mérignac)' },
  '33039': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Bègles)' },
  '33522': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Talence)' },
  '33119': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Cenon)' },
  '33550': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Villenave-d\'Ornon)' },
  '33449': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Saint-Médard-en-Jalles)' },
  '33075': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Le Bouscat)' },
  '33192': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Gradignan)' },
  '33162': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Eysines)' },
  '33167': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Floirac)' },
  '33004': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Ambarès-et-Lagrave)' },
  '33056': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Blanquefort)' },
  '33032': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Bassens)' },
  '33249': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Lormont)' },
  '33434': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Saint-Louis-de-Montferrand)' },
  '33487': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Saint-Vincent-de-Paul)' },
  '33514': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Le Taillan-Médoc)' },
  '33519': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Ambès)' },
  '33528': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Le Haillan)' },
  '33535': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Parempuyre)' },
  '33199': { url: 'https://gnau.bordeaux-metropole.fr', type: 'gnau', name: 'GNAU Bordeaux Métropole (Martignas-sur-Jalle)' },

  // Toulouse Métropole
  '31555': { url: 'https://urbanisme.toulouse-metropole.fr', type: 'gnau', name: 'Guichet Urbanisme Toulouse Métropole' },
  // Nantes Métropole
  '44109': { url: 'https://eservices.nantesmetropole.fr/urbanisme', type: 'gnau', name: 'Guichet Urbanisme Nantes Métropole' },
  // Lyon
  '69123': { url: 'https://demarches.lyon.fr/urbanisme', type: 'gnau', name: 'Guichet Unique Ville de Lyon' },
  // Marseille
  '13055': { url: 'https://demarches.marseille.fr', type: 'gnau', name: 'Guichet Urbanisme Ville de Marseille' },
  // Montpellier
  '34172': { url: 'https://montpellier3m.geosphere.fr/gnau/', type: 'gnau', name: 'GNAU Montpellier Méditerranée Métropole' },
  // Rennes
  '35238': { url: 'https://metropole.rennes.fr/demarches-urbanisme', type: 'gnau', name: 'Guichet Urbanisme Rennes Métropole' },
  // Strasbourg
  '67482': { url: 'https://strasbourg.eu/demarches-urbanisme', type: 'gnau', name: 'Guichet Urbanisme Ville et Eurométropole de Strasbourg' },
  // Nice
  '06088': { url: 'https://depot-permis.nicecotedazur.org', type: 'gnau', name: 'Guichet Unique Nice Côte d\'Azur' },
};

const NATIONAL_ADAU_URL = 'https://www.service-public.fr/particuliers/vosdroits/R52221';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { insee, postcode, city } = req.query;
    insee = insee ? String(insee).trim() : '';
    postcode = postcode ? String(postcode).trim() : '';
    city = city ? String(city).trim() : '';

    // 1. Résolution INSEE si manquant
    if (!insee || insee.length !== 5) {
      if (postcode || city) {
        try {
          const query = [city, postcode].filter(Boolean).join(' ');
          const addrUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&postcode=${encodeURIComponent(postcode)}&type=municipality&limit=1`;
          const addrRes = await fetch(addrUrl, { headers: { 'Accept': 'application/json' } });
          if (addrRes.ok) {
            const addrData = await addrRes.json();
            const feat = addrData.features?.[0];
            if (feat?.properties?.citycode) {
              insee = feat.properties.citycode;
              if (!city && feat.properties.city) city = feat.properties.city;
              if (!postcode && feat.properties.postcode) postcode = feat.properties.postcode;
            }
          }
        } catch (e) {
          console.warn('[UrbanismePortal] Erreur résolution code INSEE:', e.message);
        }
      }
    }

    if (!insee && !city && !postcode) {
      return res.status(400).json({
        error: 'Paramètres insee, postcode ou city requis pour localiser la commune'
      });
    }

    // 2. Vérification Cache
    const cacheKey = insee || `${postcode}_${city}`.toLowerCase();
    const cached = portalCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return res.status(200).json({ ...cached.data, cached: true });
    }

    // 3. Interrogation Annuaire de l'Administration (DILA / Service-Public)
    let mairieData = null;
    if (insee) {
      try {
        const annuaireUrl = `https://api-lannuaire.service-public.gouv.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records?where=code_insee_commune%3D%22${encodeURIComponent(insee)}%22%20and%20pivot%20like%20%22mairie%22&limit=1`;
        const annuaireRes = await fetch(annuaireUrl, { headers: { 'Accept': 'application/json' } });
        if (annuaireRes.ok) {
          const json = await annuaireRes.json();
          mairieData = json.results?.[0] || null;
        }
      } catch (e) {
        console.warn('[UrbanismePortal] Erreur appel api-lannuaire:', e.message);
      }
    }

    // 4. Décodage et extraction des données
    const parsedAdresseList = safeParseJson(mairieData?.adresse);
    const addrObj = parsedAdresseList[0] || {};

    const communeName = addrObj.nom_commune || city || 'Commune';
    const rawNom = mairieData?.nom || `Mairie de ${communeName}`;
    const cleanNom = rawNom.replace(/^Mairie\s*-\s*/i, 'Mairie de ');
    const codePostal = addrObj.code_postal || postcode || '';

    // Décomposition de l'adresse
    const voie = addrObj.numero_voie || '';
    const comp1 = addrObj.complement1 || '';
    const comp2 = addrObj.complement2 || '';
    const bp = addrObj.service_distribution || '';

    const addressLines = [
      comp1,
      comp2,
      voie,
      bp
    ].filter(Boolean);

    const fullAddress = addressLines.length > 0
      ? `${addressLines.join(' - ')}\n${codePostal} ${communeName}`
      : `${codePostal} ${communeName}`;

    // Formatage officiel LRAR (Lettre Recommandée avec Accusé de Réception)
    const lrarLines = [
      `Mairie de ${communeName}`,
      'Service Urbanisme & Autorisations du Sol',
      ...addressLines,
      `${codePostal} ${communeName.toUpperCase()}`
    ];
    const adresseLrar = lrarLines.join('\n');

    // Téléphone & Email & Site
    const parsedTelephoneList = safeParseJson(mairieData?.telephone);
    const telephone = parsedTelephoneList[0]?.valeur || null;
    const email = mairieData?.adresse_courriel || null;
    const parsedSiteList = safeParseJson(mairieData?.site_internet);
    const siteInternet = parsedSiteList[0]?.valeur || null;

    // 5. Détermination du Portail SVE / Urbanisme
    let portal = null;

    // A. Intercommunalité ou Métropole connue
    if (insee && KNOWN_PORTALS_BY_INSEE[insee]) {
      const known = KNOWN_PORTALS_BY_INSEE[insee];
      portal = {
        url: known.url,
        type: known.type,
        name: known.name,
        isNationalFallback: false,
        description: 'Guichet Numérique des Autorisations d\'Urbanisme officiel de la collectivité'
      };
    }

    // B. SVE déclaré dans l'annuaire officiel
    if (!portal && mairieData?.sve) {
      const sveVal = String(mairieData.sve).trim();
      if (sveVal.startsWith('http://') || sveVal.startsWith('https://')) {
        portal = {
          url: sveVal,
          type: 'communal',
          name: `Portail SVE - ${cleanNom}`,
          isNationalFallback: false,
          description: 'Portail officiel de Saisine par Voie Électronique de la commune'
        };
      }
    }

    // C. Déduction à partir du site communal ou AD'AU
    if (!portal) {
      portal = {
        url: NATIONAL_ADAU_URL,
        type: 'adau',
        name: 'Téléservice National AD\'AU (Service-Public.fr)',
        isNationalFallback: true,
        description: 'Plateforme officielle de dépôt dématérialisé d\'urbanisme de l\'État français (AD\'AU / Plat\'AU)'
      };
    }

    const result = {
      success: true,
      insee: insee || null,
      commune: communeName,
      nom: cleanNom,
      codePostal: codePostal,
      adresse: fullAddress,
      adresseLrar: adresseLrar,
      telephone: telephone,
      email: email,
      siteInternet: siteInternet,
      portal: portal
    };

    // Mettre en cache
    portalCache.set(cacheKey, { data: result, timestamp: Date.now() });
    if (insee && cacheKey !== insee) {
      portalCache.set(insee, { data: result, timestamp: Date.now() });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[UrbanismePortal] Erreur interne:', error);
    return res.status(500).json({
      error: 'Erreur lors de la résolution du portail d\'urbanisme',
      message: error.message
    });
  }
}
