import https from 'https';

const LAT = 45.385;
const LNG = 0.95;

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error("Parse error", data.substring(0, 100));
                    resolve({ error: "Invalid JSON" });
                }
            });
        }).on('error', reject);
    });
}

async function test() {
    console.log(`Testing Geoportail Urbanisme API V1 for ${LAT}, ${LNG}`);

    // API used in the initial page implementation
    // https://www.geoportail-urbanisme.gouv.fr/api/v1/document?lat=${lat}&lon=${lon}
    const urlV1 = `https://www.geoportail-urbanisme.gouv.fr/api/v1/document?lat=${LAT}&lon=${LNG}`;

    console.log(`Fetching ${urlV1}...`);
    const data = await fetchJson(urlV1);

    console.log("V1 Data:", JSON.stringify(data, null, 2));

    // Check if we have links to regulations
    if (data.document && data.document.documentId) {
        // Maybe we can get details?
    }
}

test();
