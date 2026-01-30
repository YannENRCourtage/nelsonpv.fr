import https from 'https';

const BASE_URL = 'https://apicarto.ign.fr/api/gpu';
const PARTITION = 'DU_24134';

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
    const url = `${BASE_URL}/municipality?insee=24134`; // Check municipality
    console.log(`Fetching Municipality info for ${PARTITION}...`);
    // NOTE: GPU API documentation says /partition is not a standard endpoint? 
    // Docs: https://apicarto.ign.fr/api/doc/gpu
    // It has /document, /zone-urba, /prescription, /municipality...

    // Let's try to query /document using 'partition' parameter if possible? No.

    // Let's try to fetch details from another source if possible.
    // However, the object has `id` "2bc674af16e954df7e9e845395397277".
    // GPU Geoportail direct link: https://www.geoportail-urbanisme.gouv.fr/document/2bc674af16e954df7e9e845395397277
    // This page usually contains the download links.

    // Also, there is an Atom feed or WFS service.

    // Let's try the direct GPU (not apicarto) file download pattern:
    // https://www.geoportail-urbanisme.gouv.fr/api/v1/document/download-by-id/2bc674af16e954df7e9e845395397277
    const downloadTestUrl = `https://www.geoportail-urbanisme.gouv.fr/api/v1/document/download-by-id/2bc674af16e954df7e9e845395397277`;
    console.log("Testing download URL:", downloadTestUrl);

    // We can't easily test download here without downloading binary, but let's check headers.

    // Let's try fetching the 'details' from V1 API again with headers, maybe it helps.
    const v1Details = `https://www.geoportail-urbanisme.gouv.fr/api/v1/document/2bc674af16e954df7e9e845395397277`;

    // We need real headers to look like a browser.
}

test();
