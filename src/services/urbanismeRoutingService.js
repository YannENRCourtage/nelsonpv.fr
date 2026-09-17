/**
 * Service d'aiguillage vers le téléservice d'urbanisme (SVE / AD'AU) et l'annuaire officiel de la mairie
 */

const clientCache = new Map();

function safeParseJson(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// Métropoles et portails connus (fallback client direct)
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

  // Grandes agglomérations
  '31555': { url: 'https://urbanisme.toulouse-metropole.fr', type: 'gnau', name: 'Guichet Urbanisme Toulouse Métropole' },
  '44109': { url: 'https://eservices.nantesmetropole.fr/urbanisme', type: 'gnau', name: 'Guichet Urbanisme Nantes Métropole' },
  '69123': { url: 'https://demarches.lyon.fr/urbanisme', type: 'gnau', name: 'Guichet Unique Ville de Lyon' },
  '13055': { url: 'https://demarches.marseille.fr', type: 'gnau', name: 'Guichet Urbanisme Ville de Marseille' },
  '34172': { url: 'https://montpellier3m.geosphere.fr/gnau/', type: 'gnau', name: 'GNAU Montpellier Méditerranée Métropole' },
  '35238': { url: 'https://metropole.rennes.fr/demarches-urbanisme', type: 'gnau', name: 'Guichet Urbanisme Rennes Métropole' },
  '67482': { url: 'https://strasbourg.eu/demarches-urbanisme', type: 'gnau', name: 'Guichet Urbanisme Ville et Eurométropole de Strasbourg' },
  '06088': { url: 'https://depot-permis.nicecotedazur.org', type: 'gnau', name: 'Guichet Unique Nice Côte d\'Azur' },
};

const NATIONAL_ADAU_URL = 'https://www.service-public.fr/particuliers/vosdroits/R52221';

/**
 * Résolution directe côté client via APIs publiques de l'État (CORS libre)
 */
async function fetchDirectClientFallback({ insee, postcode, city }) {
  let finalInsee = insee;
  let finalCity = city;
  let finalPostcode = postcode;

  // Résolution code INSEE si nécessaire
  if (!finalInsee || finalInsee.length !== 5) {
    try {
      const q = [city, postcode].filter(Boolean).join(' ');
      const addrRes = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&postcode=${encodeURIComponent(postcode || '')}&type=municipality&limit=1`
      );
      if (addrRes.ok) {
        const addrData = await addrRes.json();
        const feat = addrData.features?.[0];
        if (feat?.properties?.citycode) {
          finalInsee = feat.properties.citycode;
          if (!finalCity && feat.properties.city) finalCity = feat.properties.city;
          if (!finalPostcode && feat.properties.postcode) finalPostcode = feat.properties.postcode;
        }
      }
    } catch (e) {
      console.warn('[UrbanismeRouting] Échec résolution code INSEE client:', e);
    }
  }

  let mairieData = null;
  if (finalInsee) {
    try {
      const url = `https://api-lannuaire.service-public.gouv.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records?where=code_insee_commune%3D%22${encodeURIComponent(finalInsee)}%22%20and%20pivot%20like%20%22mairie%22&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        mairieData = json.results?.[0] || null;
      }
    } catch (e) {
      console.warn('[UrbanismeRouting] Échec appel api-lannuaire client:', e);
    }
  }

  const parsedAdresseList = safeParseJson(mairieData?.adresse);
  const addrObj = parsedAdresseList[0] || {};
  const communeName = addrObj.nom_commune || finalCity || 'Commune';
  const rawNom = mairieData?.nom || `Mairie de ${communeName}`;
  const cleanNom = rawNom.replace(/^Mairie\s*-\s*/i, 'Mairie de ');
  const codePostal = addrObj.code_postal || finalPostcode || '';

  const voie = addrObj.numero_voie || '';
  const comp1 = addrObj.complement1 || '';
  const comp2 = addrObj.complement2 || '';
  const bp = addrObj.service_distribution || '';

  const addressLines = [comp1, comp2, voie, bp].filter(Boolean);
  const fullAddress = addressLines.length > 0
    ? `${addressLines.join(' - ')}\n${codePostal} ${communeName}`
    : `${codePostal} ${communeName}`;

  const lrarLines = [
    `Mairie de ${communeName}`,
    'Service Urbanisme & Autorisations du Sol',
    ...addressLines,
    `${codePostal} ${communeName.toUpperCase()}`
  ];
  const adresseLrar = lrarLines.join('\n');

  const parsedTelephoneList = safeParseJson(mairieData?.telephone);
  const telephone = parsedTelephoneList[0]?.valeur || null;
  const email = mairieData?.adresse_courriel || null;
  const parsedSiteList = safeParseJson(mairieData?.site_internet);
  const siteInternet = parsedSiteList[0]?.valeur || null;

  let portal = null;
  if (finalInsee && KNOWN_PORTALS_BY_INSEE[finalInsee]) {
    const known = KNOWN_PORTALS_BY_INSEE[finalInsee];
    portal = {
      url: known.url,
      type: known.type,
      name: known.name,
      isNationalFallback: false,
      description: 'Guichet Numérique des Autorisations d\'Urbanisme officiel de la collectivité'
    };
  }

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

  if (!portal) {
    portal = {
      url: NATIONAL_ADAU_URL,
      type: 'adau',
      name: 'Téléservice National AD\'AU (Service-Public.fr)',
      isNationalFallback: true,
      description: 'Plateforme officielle de dépôt dématérialisé d\'urbanisme de l\'État français (AD\'AU / Plat\'AU)'
    };
  }

  return {
    success: true,
    insee: finalInsee || null,
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
}

/**
 * Point d'entrée principal pour la résolution de la mairie et de son guichet SVE
 */
export async function fetchUrbanismeMairiePortal({ insee, postcode, city, address }) {
  let finalInsee = insee ? String(insee).trim() : '';
  let finalPostcode = postcode ? String(postcode).trim() : '';
  let finalCity = city ? String(city).trim() : '';

  // Extraire le code postal depuis l'adresse si manquant
  if (!finalPostcode && address) {
    const cpMatch = String(address).match(/\b(0[1-9]|[1-8]\d|9[0-5]|97[1-8]|2[AB])\d{3}\b/);
    if (cpMatch) finalPostcode = cpMatch[0];
  }

  const cacheKey = finalInsee || `${finalPostcode}_${finalCity}`.toLowerCase();
  if (cacheKey && clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }

  // 1. Tenter la route backend Vercel
  try {
    const params = new URLSearchParams();
    if (finalInsee) params.set('insee', finalInsee);
    if (finalPostcode) params.set('postcode', finalPostcode);
    if (finalCity) params.set('city', finalCity);

    const res = await fetch(`/api/urbanisme/portal?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        if (cacheKey) clientCache.set(cacheKey, data);
        return data;
      }
    }
  } catch (err) {
    console.info('[UrbanismeRouting] Backend non disponible, bascule sur API publique cliente:', err.message);
  }

  // 2. Fallback direct client
  try {
    const directData = await fetchDirectClientFallback({
      insee: finalInsee,
      postcode: finalPostcode,
      city: finalCity
    });
    if (cacheKey) clientCache.set(cacheKey, directData);
    return directData;
  } catch (directErr) {
    console.error('[UrbanismeRouting] Erreur résolution mairie:', directErr);
    // Fallback minimal
    return {
      success: false,
      commune: finalCity || 'Commune',
      nom: `Mairie de ${finalCity || 'la Commune'}`,
      codePostal: finalPostcode || '',
      adresse: `${finalPostcode || ''} ${finalCity || ''}`.trim(),
      adresseLrar: `Mairie de ${finalCity || 'la Commune'}\nService Urbanisme\n${finalPostcode || ''} ${(finalCity || '').toUpperCase()}`,
      portal: {
        url: NATIONAL_ADAU_URL,
        type: 'adau',
        name: 'Téléservice National AD\'AU (Service-Public.fr)',
        isNationalFallback: true,
        description: 'Plateforme officielle de dépôt dématérialisé d\'urbanisme de l\'État français (AD\'AU / Plat\'AU)'
      }
    };
  }
}
