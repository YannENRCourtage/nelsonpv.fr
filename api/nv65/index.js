export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { cp } = req.query;

    if (!cp) {
        return res.status(400).json({
            error: 'Code postal requis',
            snowZone: 'N/A',
            windZone: 'N/A'
        });
    }

    try {
        const response = await fetch(`https://nv65.nmoreaux.com/?cp=${cp}`);

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des données NV65');
        }

        const html = await response.text();

        // Parser le HTML pour extraire les zones
        // La structure HTML est : <h4>Région NV65 Neige</h4><div class="circle">A2</div>
        const snowMatch = html.match(/Région NV65 Neige<\/h4>\s*<div class="circle">([A-Za-z0-9]+)<\/div>/i);
        const windMatch = html.match(/Région NV65 Vent<\/h4>\s*<div class="circle">([0-9]+)<\/div>/i);

        const snowZone = snowMatch ? snowMatch[1].trim() : 'N/A';
        const windZone = windMatch ? windMatch[1].trim() : 'N/A';

        return res.status(200).json({
            snowZone,
            windZone,
            success: true
        });
    } catch (error) {
        console.error('Erreur NV65:', error);
        return res.status(500).json({
            error: 'Erreur serveur',
            snowZone: 'N/A',
            windZone: 'N/A',
            success: false
        });
    }
}
