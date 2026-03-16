
import axios from 'axios';

export default async function handler(req, res) {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    // 1. Get IRIS code from coordinates using Etalab/Pyris API
    const pyrisUrl = `https://pyris.datajazz.io/iris?lat=${lat}&lon=${lng}`;
    const irisResponse = await axios.get(pyrisUrl, { timeout: 10000 });
    const irisCode = irisResponse.data?.complete_code;

    if (!irisCode) {
      return res.status(404).json({ error: 'Code IRIS non trouvé pour ces coordonnées' });
    }

    // 2. Fetch consumption data from Enedis Open Data (New Datafair Portal)
    const enedisUrl = `https://opendata.enedis.fr/data-fair/api/v1/datasets/consommation-electrique-par-secteur-dactivite-iris/lines?q=code_iris:${irisCode}&size=10`;
    const consumptionResponse = await axios.get(enedisUrl, { timeout: 10000 });
    
    // Datafair format: results array, flat structure
    const records = consumptionResponse.data?.results || [];

    res.status(200).json({
      iris: {
        code: irisCode,
        name: irisResponse.data?.name || 'Inconnu',
        commune: irisResponse.data?.commune_name || 'Inconnue'
      },
      records: records.map(r => ({
        year: r.annee,
        sector_code: r.code_grand_secteur, // e.g. "RESIDENTIEL"
        conso_totale: r.conso_totale_mwh,
        conso_moyenne: r.conso_moyenne_mwh,
        nb_sites: r.nombre_de_points_de_livraison
      }))
    });

  } catch (error) {
    const status = error.code === 'ECONNABORTED' ? 504 : 500;
    const message = error.code === 'ECONNABORTED' ? 'Le service Enedis met trop de temps à répondre' : error.message;
    console.error('Enedis Consumption Full Error:', error);
    console.error('Error Stack:', error.stack);
    res.status(status).json({ 
      error: 'Impossible de récupérer les données Enedis', 
      details: message,
      code: error.code || 'UNKNOWN'
    });
  }
}
