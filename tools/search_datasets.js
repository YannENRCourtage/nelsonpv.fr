import https from 'https';
https.get('https://data.enedis.fr/api/explore/v2.1/catalog/datasets?limit=100', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const datasets = json.results.map(r => ({ id: r.dataset_id, title: r.title }));
      const keywords = ['contrainte', 'satur', 'raccordement', 'zone', 'capacité', 'accueil'];
      const filtered = datasets.filter(d => {
        const str = (d.id + ' ' + d.title).toLowerCase();
        return keywords.some(k => str.includes(k));
      });
      console.log(JSON.stringify(filtered, null, 2));
    } catch(e) {
      console.error(e);
    }
  });
});
