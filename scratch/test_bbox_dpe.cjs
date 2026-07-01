const fs = require('fs');

async function testBbox() {
  const id = 'meg-83tjwtg8dyz4vv7h1dqe';
  // Let's test Carcassonne bbox: lon is around 2.35, lat is around 43.21
  const bbox = '2.34,43.20,2.38,43.23';
  const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${id}/lines?size=5&bbox=${bbox}`;
  console.log(`Fetching from: ${url}`);
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`Success! Total lines in bbox: ${data.total}`);
      console.log(`Returned ${data.results.length} results:`);
      data.results.forEach((r, i) => {
        console.log(`[${i}] Address: ${r.adresse_ban || r.adresse_brut || 'N/A'}`);
        console.log(`    Geopoint: ${r._geopoint}`);
        console.log(`    DPE: ${r.etiquette_dpe}, GES: ${r.etiquette_ges}`);
        console.log(`    Date: ${r.date_etablissement_dpe}`);
      });
    } else {
      const text = await response.text();
      console.log(`Error body: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(`Fetch error:`, err);
  }
}

testBbox();
