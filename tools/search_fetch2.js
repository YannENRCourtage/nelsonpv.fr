async function run() {
  try {
    const res = await fetch('https://data.enedis.fr/api/explore/v2.1/catalog/datasets?limit=100');
    const json = await res.json();
    console.log(Object.keys(json));
    if (json.datasets) {
       console.log(json.datasets.slice(0,2).map(d => d.dataset.dataset_id));
    }
    console.log(JSON.stringify(json).substring(0, 500));
  } catch(e) {
    console.error(e);
  }
}
run();
