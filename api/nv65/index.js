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
        // Recherche des patterns "Région NV65 Neige: XX" et "Région NV65 Vent: X"
        const snowMatch = html.match(/Région NV65 Neige\s*[:：]\s*([A-Za-z0-9]+)/i);
        const windMatch = html.match(/Région NV65 Vent\s*[:：]\s*([0-9]+)/i);

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
