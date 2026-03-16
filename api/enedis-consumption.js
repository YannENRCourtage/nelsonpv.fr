
import axios from 'axios';

export default async function handler(req, res) {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    // 1. Get IRIS code from coordinates using Etalab/Pyris API
    const pyrisUrl = `https://pyris.datajazz.io/iris?lat=${lat}&lon=${lng}`;
    const irisResponse = await axios.get(pyrisUrl, { timeout: 5000 });
    const irisCode = irisResponse.data?.complete_code;

    if (!irisCode) {
      return res.status(404).json({ error: 'Code IRIS non trouvé pour ces coordonnées' });
    }

    // 2. Fetch consumption data from Enedis Open Data
    // Dataset: consommation-electrique-par-secteur-dactivite-a-la-maille-iris
    const enedisUrl = `https://data.enedis.fr/api/records/1.0/search/?dataset=consommation-electrique-par-secteur-dactivite-a-la-maille-iris&q=code_iris:${irisCode}&rows=10`;
    const consumptionResponse = await axios.get(enedisUrl, { timeout: 5000 });

    res.status(200).json({
      iris: {
        code: irisCode,
        name: irisResponse.data?.name,
        commune: irisResponse.data?.commune_name
      },
      records: consumptionResponse.data.records.map(r => ({
        year: r.fields.annee,
        sector: r.fields.nom_secteur,
        conso_totale: r.fields.conso_totale_mwh,
        conso_moyenne: r.fields.conso_moyenne_mwh,
        nb_sites: r.fields.nombre_de_points_de_livraison
      }))
    });

  } catch (error) {
    const status = error.code === 'ECONNABORTED' ? 504 : 500;
    const message = error.code === 'ECONNABORTED' ? 'Le service Enedis met trop de temps à répondre' : error.message;
    console.error('Enedis Consumption Error:', error.message);
    res.status(status).json({ 
      error: 'Impossible de récupérer les données Enedis', 
      details: message 
    });
  }
}
