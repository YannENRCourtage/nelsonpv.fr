// Service client pour la gestion et le calcul des tarifs d'énergie (TRV & EDF OA)

const CACHE_KEY = 'nelson_energy_tarifs_cache';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

export const DEFAULT_ENERGY_TARIFS = {
    source: 'CRE / Arrêté S21 officiel',
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
        }
    },
    edfOa: {
        surplus: {
            label: "Autoconsommation avec vente du surplus (Arrêté S21)",
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

export async function fetchEnergyTariffs(forceRefresh = false) {
    if (!forceRefresh) {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS) {
                    return parsed.data;
                }
            }
        } catch (e) {
            console.warn('Erreur lecture cache tarifs energie', e);
        }
    }

    try {
        const response = await fetch('/api/tarifs-energie', {
            method: forceRefresh ? 'POST' : 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data
                }));
            } catch (err) {
                /* localStorage full or private browsing */
            }
            return data;
        }
    } catch (error) {
        console.warn('API /api/tarifs-energie inaccessible, utilisation des valeurs de référence', error);
    }

    return DEFAULT_ENERGY_TARIFS;
}

export function getTarifsForPower(powerKwc = 3, option = 'surplus', tariffsData = DEFAULT_ENERGY_TARIFS) {
    const p = Math.max(0.1, parseFloat(powerKwc) || 3);
    const edfData = tariffsData?.edfOa || DEFAULT_ENERGY_TARIFS.edfOa;
    const trvData = tariffsData?.trv || DEFAULT_ENERGY_TARIFS.trv;

    let trancheSurplus = edfData.surplus.tranches.find(t => p <= t.maxKwc) || edfData.surplus.tranches[edfData.surplus.tranches.length - 1];
    let trancheTotale = edfData.venteTotale.tranches.find(t => p <= t.maxKwc) || edfData.venteTotale.tranches[edfData.venteTotale.tranches.length - 1];

    const primeAutoKwc = trancheSurplus.primeAutoKwc;
    const primeTotal = Math.round(primeAutoKwc * p);
    const tarifAchatSurplus = trancheSurplus.tarifKwh;
    const tarifVenteTotale = trancheTotale.tarifKwh;

    return {
        powerKwc: p,
        option,
        primeAutoKwc,
        primeTotal,
        tarifAchatSurplus,
        tarifVenteTotale,
        tarifAchatRetenu: option === 'surplus' ? tarifAchatSurplus : tarifVenteTotale,
        trvBase: trvData.base,
        trvHp: trvData.hp,
        trvHc: trvData.hc,
        trvHtBase: trvData.ht.base,
        trancheLabel: trancheSurplus.label,
        dureeContratAnnees: edfData.dureeContratAnnees || 20
    };
}
