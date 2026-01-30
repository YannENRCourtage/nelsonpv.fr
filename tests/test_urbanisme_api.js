import https from 'https';

const LAT = 45.385;
const LNG = 0.95;
const BASE_URL = 'https://apicarto.ign.fr/api/gpu';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: "Invalid JSON", raw: data });
                }
            });
        }).on('error', reject);
    });
}

async function test() {
    const geom = JSON.stringify({ type: "Point", coordinates: [LNG, LAT] });
    const docUrl = `${BASE_URL}/document?geom=${encodeURIComponent(geom)}`;

    console.log("Fetching documents...");
    const docs = await fetchJson(docUrl);

    if (docs.features && docs.features.length > 0) {
        console.log("Full Properties of first doc:");
        console.dir(docs.features[0].properties, { depth: null });

        // Also check partition endpoint if needed
        // /partition?partition=DU_24134
    } else {
        console.log("No documents.");
    }
}

test();
