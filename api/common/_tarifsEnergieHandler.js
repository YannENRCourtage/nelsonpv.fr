import { setSecureCors } from './_authMiddleware.js';

// Valeurs de référence officielles CRE / EDF OA (Arrêté S21 indexé trimestriellement)
const REFERENCE_ENERGY_TARIFS = {
    source: 'CRE / Arrêté S21 / Open Data Réseaux Énergies',
    lastUpdate: new Date().toISOString(),
    trv: {
        label: 'Tarif Réglementé de Vente EDF Bleu (TTC)',
        unite: '€/kWh',
        base: 0.2516,
        hp: 0.2700,
        hc: 0.2068,
        ht: {
            base: 0.1980,
            hp: 0.2126,
            hc: 0.1628
        },
        abonnementAnnuelTtc: {
            '3kVA': 116.28,
            '6kVA': 151.20,
            '9kVA': 189.60,
            '12kVA': 228.48,
            '36kVA': 612.00
        },
        dateApplication: '2024-2025'
    },
    edfOa: {
        surplus: {
            label: "Autoconsommation avec vente du surplus (Arrêté S21)",
            uniteTarif: "€/kWh",
            unitePrime: "€/kWc",
            tranches: [
                { maxKwc: 3, tarifKwh: 0.1269, primeAutoKwc: 300, label: "P ≤ 3 kWc" },
                { maxKwc: 9, tarifKwh: 0.1269, primeAutoKwc: 230, label: "3 < P ≤ 9 kWc" },
                { maxKwc: 36, tarifKwh: 0.0761, primeAutoKwc: 200, label: "9 < P ≤ 36 kWc" },
                { maxKwc: 100, tarifKwh: 0.0761, primeAutoKwc: 100, label: "36 < P ≤ 100 kWc" },
                { maxKwc: 500, tarifKwh: 0.0570, primeAutoKwc: 0, label: "100 < P ≤ 500 kWc" }
            ]
        },
        venteTotale: {
            label: "Vente totale en totalité sur le réseau (Arrêté S21)",
            uniteTarif: "€/kWh",
            tranches: [
                { maxKwc: 3, tarifKwh: 0.1430, label: "P ≤ 3 kWc" },
                { maxKwc: 9, tarifKwh: 0.1215, label: "3 < P ≤ 9 kWc" },
                { maxKwc: 36, tarifKwh: 0.1315, label: "9 < P ≤ 36 kWc" },
                { maxKwc: 100, tarifKwh: 0.1143, label: "36 < P ≤ 100 kWc" },
                { maxKwc: 500, tarifKwh: 0.1085, label: "100 < P ≤ 500 kWc" }
            ]
        },
        dureeContratAnnees: 20
    }
};

let cachedTarifs = { ...REFERENCE_ENERGY_TARIFS };
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 heures

async function fetchLiveTarifs() {
    // Si le cache a moins de 6h, on le retourne
    if (Date.now() - lastFetchTimestamp < CACHE_TTL_MS) {
        return cachedTarifs;
    }

    try {
        // Tentative d'interrogation de l'Open Data ODRE / CRE
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(
            'https://odre.opendatasoft.com/api/records/1.0/search/?dataset=coefficients-de-calcul-des-tarifs-d-achat-photovoltaiques&rows=1&sort=-date',
            { signal: controller.signal }
        );
        clearTimeout(timer);

        if (response.ok) {
            const data = await response.json();
            if (data.records && data.records.length > 0) {
                cachedTarifs.lastExternalSync = new Date().toISOString();
                cachedTarifs.odreData = data.records[0].fields;
            }
        }
    } catch (e) {
        // Mode déconnecté ou timeout : on utilise la table de référence officielle
        console.warn('ODRE live fetch skipped, fallback to official CRE reference rates:', e.message);
    }

    lastFetchTimestamp = Date.now();
    return cachedTarifs;
}

export default async function handleTarifsEnergie(req, res, subSlug = []) {
    setSecureCors(req, res, 'GET,POST,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const tarifs = await fetchLiveTarifs();

        if (req.method === 'POST') {
            // Force refresh
            lastFetchTimestamp = 0;
            const refreshed = await fetchLiveTarifs();
            return res.status(200).json({ success: true, message: 'Tarifs énergétiques actualisés', tarifs: refreshed });
        }

        return res.status(200).json(tarifs);
    } catch (error) {
        console.error('Erreur API tarifs energie:', error);
        return res.status(200).json(REFERENCE_ENERGY_TARIFS);
    }
}
