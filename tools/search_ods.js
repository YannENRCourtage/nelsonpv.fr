import https from 'https';

const options = {
  hostname: 'data.enedis.fr',
  path: '/api/explore/v2.1/catalog/datasets?limit=100',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.results) {
        const datasets = json.results.map(r => ({ id: r.dataset_id, title: r.title }));
        const keywords = ['contrainte', 'capacité', 'satur', 'hta', 'projets', 'raccordement'];
        const filtered = datasets.filter(d => {
            const str = (d.id + ' ' + d.title).toLowerCase();
            return keywords.some(k => str.includes(k));
        });
        console.log(JSON.stringify(filtered, null, 2));
      } else {
        console.log("No results in json", json);
      }
    } catch(e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Raw response:', data.substring(0, 200));
    }
  });
}).on('error', (e) => {
  console.error(e);
});
