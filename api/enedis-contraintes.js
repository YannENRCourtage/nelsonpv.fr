export default async function handler(req, res) {
  // CORS Headers for NelsonPV
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { lat1, lng1, lat2, lng2 } = req.query;

  try {
    // 1. Tenter d'abord d'appeler l'API officielle Enedis (OpenDataSoft / Koumoul)
    // L'ID 'carte-zones-contrainte-projets-enr' ou le endpoint Koumoul
    const enedisUrl = `https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/carte-zones-contrainte-projets-enr/records?limit=100&where=within_box(geo_shape,${lat1},${lng1},${lat2},${lng2})`;
    
    let fetchSuccess = false;
    let data = null;

    try {
        const enedisRes = await fetch(enedisUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        if (enedisRes.ok) {
            data = await enedisRes.json();
            fetchSuccess = true;
        }
    } catch (e) {
        console.warn("L'API officielle Enedis est inaccessible (WAF ou 404).");
    }

    // 2. Fallback local : Si l'API Enedis est protégée par Cloudflare ou désactivée,
    // on renvoie les polygones générés à partir des données Caparéseau (officielles RTE/Enedis)
    if (!fetchSuccess) {
        // En production sur Vercel, on peut lire un fichier local ou faire un fetch sur l'host local
        const host = req.headers.host || 'www.nelsonpv.fr';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        
        const fallbackRes = await fetch(`${protocol}://${host}/datas/capareseau_voronoi.json`);
        
        if (!fallbackRes.ok) {
             throw new Error("Erreur lors de la lecture du dataset de secours Capareseau");
        }
        
        const fallbackData = await fallbackRes.json();
        
        // Simuler la structure OpenDataSoft pour le front-end
        // On renvoie un FeatureCollection GeoJSON directement
        data = fallbackData;
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Erreur Vercel Serverless proxy Enedis:", error);
    return res.status(500).json({ error: "Erreur interne lors de la récupération des données Enedis." });
  }
}
