async function run() {
  try {
    const res = await fetch('https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets?where=search(title, "contrainte") OR search(title, "satur")&limit=100');
    const json = await res.json();
    if (json.results) {
        json.results.forEach(r => {
            console.log(r.dataset_id, '|', r.title);
        });
    } else {
        console.log("No results");
    }
  } catch(e) {
    console.error(e);
  }
}
run();
