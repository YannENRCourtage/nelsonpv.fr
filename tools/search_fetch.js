async function run() {
  try {
    const res = await fetch('https://data.enedis.fr/api/explore/v2.1/catalog/datasets?limit=100');
    const json = await res.json();
    const datasets = json.results.map(r => ({ id: r.dataset_id, title: r.title }));
    const keywords = ['contrainte', 'capacité', 'satur', 'hta', 'projets', 'raccordement'];
    const filtered = datasets.filter(d => {
        const str = (d.id + ' ' + d.title).toLowerCase();
        return keywords.some(k => str.includes(k));
    });
    console.log(JSON.stringify(filtered, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
