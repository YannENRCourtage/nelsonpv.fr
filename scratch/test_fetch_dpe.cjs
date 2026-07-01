const fs = require('fs');

async function getApiDocs() {
  const id = 'meg-83tjwtg8dyz4vv7h1dqe';
  const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${id}/api-docs.json`;
  console.log(`Fetching from: ${url}`);
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`Success! Title:`, data.info.title);
      // Let's find /lines endpoint parameters
      const linesPath = data.paths['/lines'];
      if (linesPath && linesPath.get) {
        const params = linesPath.get.parameters;
        console.log(`Parameters for /lines:`);
        params.forEach(p => {
          console.log(`- Name: ${p.name}, Type: ${p.type || (p.schema ? p.schema.type : 'N/A')}, Desc: ${p.description || ''}`);
        });
      } else {
        console.log('No /lines endpoint found in paths:', Object.keys(data.paths));
      }
    } else {
      const text = await response.text();
      console.log(`Error body: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(`Fetch error:`, err);
  }
}

getApiDocs();
