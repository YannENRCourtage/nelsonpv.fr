async function run() {
  try {
    const res = await fetch('https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets?where=search(title, "desserte") OR search(title, "poste source")&limit=100');
    const json = await res.json();
    if (json.results) {
        json.results.forEach(r => {
            console.log(r.dataset_id, '|', r.title);
        });
    }
  } catch(e) { }
}
run();
